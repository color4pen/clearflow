import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { canPerform } from "@/domain/authorization";
import { checkRateLimit, RATE_LIMITS } from "@/infrastructure/rateLimit";
import { setRevenueTarget } from "@/application/usecases/setRevenueTarget";
import { updateRevenueTarget } from "@/application/usecases/updateRevenueTarget";
import { deleteRevenueTarget } from "@/application/usecases/deleteRevenueTarget";
import { toToolError, toToolSuccess, handleToolError } from "../errors";
import { buildAdvertisementSchema, validateAndParse } from "../schemaHelpers";
import type { Role } from "@/domain/models/user";

function getAuthInfo(extra: RequestHandlerExtra<ServerRequest, ServerNotification>) {
  const authExtra = extra.authInfo?.extra as
    | { userId: string; organizationId: string; role: Role }
    | undefined;
  return authExtra ?? null;
}

const setSchema = z.object({
  operation: z.literal("set"),
  periodStart: z.string().describe("対象期間開始日"),
  periodEnd: z.string().describe("対象期間終了日"),
  targetAmount: z.number().int().positive("目標金額は正の整数を指定してください").describe("目標金額（正の整数、円）"),
});

const updateSchema = z.object({
  operation: z.literal("update"),
  id: z.string().uuid("売上目標IDが不正です").describe("売上目標ID（UUID）"),
  periodStart: z.string().optional().describe("対象期間開始日"),
  periodEnd: z.string().optional().describe("対象期間終了日"),
  targetAmount: z.number().int().positive().optional().describe("目標金額（正の整数、円）"),
});

const deleteSchema = z.object({
  operation: z.literal("delete"),
  id: z.string().uuid("売上目標IDが不正です").describe("売上目標ID（UUID）"),
});

const revenueTargetsInputSchema = z.discriminatedUnion("operation", [
  setSchema,
  updateSchema,
  deleteSchema,
]);

const revenueTargetsAdvertisementSchema = buildAdvertisementSchema([
  setSchema,
  updateSchema,
  deleteSchema,
]);

export function registerRevenueTargetsTools(server: McpServer): void {
  server.registerTool(
    "revenue_targets",
    {
      description:
        "売上目標管理。売上目標（RevenueTarget）・売上予算（target/KPI）の設定・更新・削除。期間・目標金額を管理する。operation: set/update/delete",
      inputSchema: revenueTargetsAdvertisementSchema,
    },
    async (args, extra) => {
      try {
        const auth = getAuthInfo(extra);
        if (!auth) {
          return toToolError("認証情報が取得できません");
        }
        const { userId, organizationId, role } = auth;

        const parseResult = validateAndParse(revenueTargetsInputSchema, args);
        if (parseResult) return parseResult;
        const typedArgs = args as z.infer<typeof revenueTargetsInputSchema>;

        switch (typedArgs.operation) {
          case "set": {
            if (!canPerform(role, "revenue", "setTarget")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:setRevenueTarget:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await setRevenueTarget({
              organizationId,
              actorId: userId,
              periodStart: new Date(typedArgs.periodStart),
              periodEnd: new Date(typedArgs.periodEnd),
              targetAmount: typedArgs.targetAmount,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess(result.target);
          }

          case "update": {
            if (!canPerform(role, "revenue", "setTarget")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:updateRevenueTarget:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await updateRevenueTarget({
              id: typedArgs.id,
              organizationId,
              actorId: userId,
              periodStart:
                typedArgs.periodStart !== undefined ? new Date(typedArgs.periodStart) : undefined,
              periodEnd:
                typedArgs.periodEnd !== undefined ? new Date(typedArgs.periodEnd) : undefined,
              targetAmount: typedArgs.targetAmount,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess(result.target);
          }

          case "delete": {
            if (!canPerform(role, "revenue", "setTarget")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:deleteRevenueTarget:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await deleteRevenueTarget({
              id: typedArgs.id,
              organizationId,
              actorId: userId,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess({ deleted: true, id: typedArgs.id });
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
