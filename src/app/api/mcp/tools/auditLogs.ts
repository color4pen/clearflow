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
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  action: z.string().optional(),
  actorId: z.string().uuid().optional(),
  targetType: z.string().optional(),
  limit: z.number().int().min(1).max(1000).optional().default(100),
  offset: z.number().int().min(0).optional(),
});

const auditLogsInputSchema = z.discriminatedUnion("operation", [searchSchema]);

const auditLogsAdvertisementSchema = buildAdvertisementSchema([searchSchema]);

export function registerAuditLogsTools(server: McpServer): void {
  server.registerTool(
    "audit_logs",
    {
      description:
        "監査ログの検索を行います（読み取り専用）。operation 引数で操作を切り替えます。",
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
