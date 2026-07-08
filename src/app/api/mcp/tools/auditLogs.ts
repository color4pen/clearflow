import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { canPerform } from "@/domain/authorization";
import { checkRateLimit, RATE_LIMITS } from "@/infrastructure/rateLimit";
import { listAuditLogs } from "@/application/usecases/listAuditLogs";
import { toToolError, toToolSuccess, handleToolError } from "../errors";
import { buildAdvertisementSchema, validateAndParse } from "../schemaHelpers";
import type { Role } from "@/domain/models/user";

function getAuthInfo(extra: RequestHandlerExtra<ServerRequest, ServerNotification>) {
  const authExtra = extra.authInfo?.extra as
    | { userId: string; organizationId: string; role: Role }
    | undefined;
  return authExtra ?? null;
}

const searchSchema = z.object({
  operation: z.literal("search"),
  startDate: z.string().datetime().optional().describe("検索開始日時（ISO 8601）"),
  endDate: z.string().datetime().optional().describe("検索終了日時（ISO 8601）"),
  action: z.string().optional().describe("操作種別"),
  actorId: z.string().uuid().optional().describe("操作者ID（UUID）"),
  targetType: z.string().optional().describe("操作対象の種別"),
  limit: z.number().int().min(1).max(1000).optional().default(100).describe("取得件数上限（1〜1000、デフォルト100）"),
  offset: z.number().int().min(0).optional().describe("取得開始位置"),
});

const auditLogsInputSchema = z.discriminatedUnion("operation", [searchSchema]);

const auditLogsAdvertisementSchema = buildAdvertisementSchema([searchSchema]);

export function registerAuditLogsTools(server: McpServer): void {
  server.registerTool(
    "audit_logs",
    {
      description:
        "監査ログ検索。監査ログ（AuditLog）・操作履歴・証跡（audit trail）の検索（読み取り専用）。日時範囲・アクション・操作者・対象タイプでの絞り込みに対応。operation: search",
      inputSchema: auditLogsAdvertisementSchema,
    },
    async (args, extra) => {
      try {
        const auth = getAuthInfo(extra);
        if (!auth) {
          return toToolError("認証情報が取得できません");
        }
        const { userId, organizationId, role } = auth;

        const parseResult = validateAndParse(auditLogsInputSchema, args);
        if (parseResult) return parseResult;
        const typedArgs = args as z.infer<typeof auditLogsInputSchema>;

        switch (typedArgs.operation) {
          case "search": {
            if (!canPerform(role, "organization", "exportAuditLog")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:auditLogs:${userId}`,
              limit: RATE_LIMITS.search.limit,
              windowMs: RATE_LIMITS.search.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const startDate = typedArgs.startDate ? new Date(typedArgs.startDate) : undefined;
            const endDate = typedArgs.endDate ? new Date(typedArgs.endDate) : undefined;

            if (startDate && endDate && startDate > endDate) {
              return toToolError("startDate は endDate 以前を指定してください");
            }

            const logs = await listAuditLogs({
              organizationId,
              filters: {
                startDate,
                endDate,
                action: typedArgs.action,
                actorId: typedArgs.actorId,
                targetType: typedArgs.targetType,
                limit: typedArgs.limit,
                offset: typedArgs.offset,
              },
            });

            return toToolSuccess({ logs, count: logs.length });
          }

          default: {
            return toToolError("不明な operation です");
          }
        }
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
