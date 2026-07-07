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
import type { Role } from "@/domain/models/user";

function getAuthInfo(extra: RequestHandlerExtra<ServerRequest, ServerNotification>) {
  const authExtra = extra.authInfo?.extra as
    | { userId: string; organizationId: string; role: Role }
    | undefined;
  return authExtra ?? null;
}

const setSchema = z.object({
  operation: z.literal("set"),
  periodStart: z.string(),
  periodEnd: z.string(),
  targetAmount: z.number().int().positive("目標金額は正の整数を指定してください"),
});

const updateSchema = z.object({
  operation: z.literal("update"),
  id: z.string().uuid("売上目標IDが不正です"),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  targetAmount: z.number().int().positive().optional(),
});

const deleteSchema = z.object({
  operation: z.literal("delete"),
  id: z.string().uuid("売上目標IDが不正です"),
});

const revenueTargetsInputSchema = z.discriminatedUnion("operation", [
  setSchema,
  updateSchema,
  deleteSchema,
]);

export function registerRevenueTargetsTools(server: McpServer): void {
  server.registerTool(
    "revenue_targets",
    {
      description:
        "売上目標（RevenueTarget）の設定・更新・削除を行います。operation 引数で操作を切り替えます。",
      inputSchema: revenueTargetsInputSchema,
    },
    async (args, extra) => {
      try {
        const auth = getAuthInfo(extra);
        if (!auth) {
          return toToolError("認証情報が取得できません");
        }
        const { userId, organizationId, role } = auth;

        switch (args.operation) {
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
              periodStart: new Date(args.periodStart),
              periodEnd: new Date(args.periodEnd),
              targetAmount: args.targetAmount,
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
              id: args.id,
              organizationId,
              actorId: userId,
              periodStart:
                args.periodStart !== undefined ? new Date(args.periodStart) : undefined,
              periodEnd:
                args.periodEnd !== undefined ? new Date(args.periodEnd) : undefined,
              targetAmount: args.targetAmount,
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
              id: args.id,
              organizationId,
              actorId: userId,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess({ deleted: true, id: args.id });
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
