import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { canPerform } from "@/domain/authorization";
import { checkRateLimit, RATE_LIMITS } from "@/infrastructure/rateLimit";
import { listDelegations } from "@/application/usecases/listDelegations";
import { createDelegation } from "@/application/usecases/createDelegation";
import { deactivateDelegation } from "@/application/usecases/deactivateDelegation";
import * as approvalDelegationRepository from "@/infrastructure/repositories/approvalDelegationRepository";
import { toToolError, toToolSuccess, handleToolError } from "../errors";
import type { Role } from "@/domain/models/user";

function getAuthInfo(extra: RequestHandlerExtra<ServerRequest, ServerNotification>) {
  const authExtra = extra.authInfo?.extra as
    | { userId: string; organizationId: string; role: Role }
    | undefined;
  return authExtra ?? null;
}

const listSchema = z.object({
  operation: z.literal("list"),
});

const createSchema = z.object({
  operation: z.literal("create"),
  fromUserId: z.string().uuid(),
  toUserId: z.string().uuid(),
  startDate: z.string(),
  endDate: z.string(),
});

const deactivateSchema = z.object({
  operation: z.literal("deactivate"),
  delegationId: z.string().uuid(),
});

const delegationsInputSchema = z.discriminatedUnion("operation", [
  listSchema,
  createSchema,
  deactivateSchema,
]);

export function registerDelegationsTools(server: McpServer): void {
  server.registerTool(
    "delegations",
    {
      description:
        "承認委任の一覧取得・作成・無効化を行います。operation 引数で操作を切り替えます。",
      inputSchema: delegationsInputSchema,
    },
    async (args, extra) => {
      try {
        const auth = getAuthInfo(extra);
        if (!auth) {
          return toToolError("認証情報が取得できません");
        }
        const { userId, organizationId, role } = auth;

        switch (args.operation) {
          case "list": {
            if (!canPerform(role, "approvalSettings", "listDelegations")) {
              return toToolError("権限がありません");
            }
            const delegations = await listDelegations({ organizationId });

            // admin 以外は自身の委任のみ参照可能
            const filtered =
              role === "admin"
                ? delegations
                : delegations.filter((d) => d.fromUserId === userId);

            return toToolSuccess(filtered);
          }

          case "create": {
            if (!canPerform(role, "approvalSettings", "createDelegation")) {
              return toToolError("権限がありません");
            }

            // admin 以外は自分自身からの委任のみ作成可能
            if (role !== "admin" && args.fromUserId !== userId) {
              return toToolError("この操作を実行する権限がありません");
            }

            const rateCheck = await checkRateLimit({
              key: `mcp:createDelegation:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await createDelegation({
              fromUserId: args.fromUserId,
              toUserId: args.toUserId,
              organizationId,
              startDate: new Date(args.startDate),
              endDate: new Date(args.endDate),
              actorId: userId,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess(result.delegation);
          }

          case "deactivate": {
            if (!canPerform(role, "approvalSettings", "deactivateDelegation")) {
              return toToolError("権限がありません");
            }

            // admin 以外は自身の委任のみ無効化可能（Server Action と同一ロジック）
            if (role !== "admin") {
              const allDelegations = await approvalDelegationRepository.findByOrganization(
                organizationId
              );
              const delegation = allDelegations.find((d) => d.id === args.delegationId);
              if (!delegation) {
                return toToolError("委任が見つかりません");
              }
              if (delegation.fromUserId !== userId) {
                return toToolError("この操作を実行する権限がありません");
              }
            }

            const result = await deactivateDelegation({
              delegationId: args.delegationId,
              organizationId,
              actorId: userId,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess({ deactivated: true, delegationId: args.delegationId });
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
