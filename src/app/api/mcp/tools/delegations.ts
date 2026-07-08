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
import { buildAdvertisementSchema, validateAndParse } from "../schemaHelpers";
import type { Role } from "@/domain/models/user";

function getAuthInfo(extra: RequestHandlerExtra<ServerRequest, ServerNotification>) {
  const authExtra = extra.authInfo?.extra as
    | { userId: string; organizationId: string; role: Role }
    | undefined;
  return authExtra ?? null;
}

/** パース可能な日時文字列（不正な日付を new Date() 前に明確なエラーで弾く）。 */
const dateString = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "日時の形式が不正です");

const listSchema = z.object({
  operation: z.literal("list"),
});

const createSchema = z.object({
  operation: z.literal("create"),
  fromUserId: z.string().uuid().describe("委任元ユーザーID（UUID）"),
  toUserId: z.string().uuid().describe("委任先ユーザーID（UUID）"),
  startDate: dateString.describe("委任開始日"),
  endDate: dateString.describe("委任終了日"),
});

const deactivateSchema = z.object({
  operation: z.literal("deactivate"),
  delegationId: z.string().uuid().describe("委任ID（UUID）"),
});

const delegationsInputSchema = z.discriminatedUnion("operation", [
  listSchema,
  createSchema,
  deactivateSchema,
]);

const delegationsAdvertisementSchema = buildAdvertisementSchema([
  listSchema,
  createSchema,
  deactivateSchema,
]);

export function registerDelegationsTools(server: McpServer): void {
  server.registerTool(
    "delegations",
    {
      description:
        "承認委任管理。承認委任（Delegation）・代理承認・代行の一覧・作成・無効化。期間指定と委任元/委任先のユーザーを管理する。operation: list/create/deactivate",
      inputSchema: delegationsAdvertisementSchema,
    },
    async (args, extra) => {
      try {
        const auth = getAuthInfo(extra);
        if (!auth) {
          return toToolError("認証情報が取得できません");
        }
        const { userId, organizationId, role } = auth;

        const parseResult = validateAndParse(delegationsInputSchema, args);
        if (parseResult) return parseResult;
        const typedArgs = args as z.infer<typeof delegationsInputSchema>;

        switch (typedArgs.operation) {
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
            if (role !== "admin" && typedArgs.fromUserId !== userId) {
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
              fromUserId: typedArgs.fromUserId,
              toUserId: typedArgs.toUserId,
              organizationId,
              startDate: new Date(typedArgs.startDate),
              endDate: new Date(typedArgs.endDate),
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
            const rateCheck = await checkRateLimit({
              key: `mcp:deactivateDelegation:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            // admin 以外は自身の委任のみ無効化可能（Server Action と同一ロジック）
            if (role !== "admin") {
              const allDelegations = await approvalDelegationRepository.findByOrganization(
                organizationId
              );
              const delegation = allDelegations.find((d) => d.id === typedArgs.delegationId);
              if (!delegation) {
                return toToolError("委任が見つかりません");
              }
              if (delegation.fromUserId !== userId) {
                return toToolError("この操作を実行する権限がありません");
              }
            }

            const result = await deactivateDelegation({
              delegationId: typedArgs.delegationId,
              organizationId,
              actorId: userId,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess({ deactivated: true, delegationId: typedArgs.delegationId });
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
