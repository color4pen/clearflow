import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { canPerform } from "@/domain/authorization";
import { checkRateLimit, RATE_LIMITS } from "@/infrastructure/rateLimit";
import { listOrganizationUsers } from "@/application/usecases/listOrganizationUsers";
import { createUser } from "@/application/usecases/createUser";
import { updateUserRole } from "@/application/usecases/updateUserRole";
import { deactivateUser } from "@/application/usecases/deactivateUser";
import { reactivateUser } from "@/application/usecases/reactivateUser";
import { toToolError, toToolSuccess, handleToolError } from "../errors";
import { buildAdvertisementSchema, validateAndParse } from "../schemaHelpers";
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
  email: z.string().email().describe("メールアドレス"),
  name: z.string().min(1).describe("ユーザー名"),
  role: z
    .enum(["admin", "member", "manager", "finance"])
    .describe("admin=管理者, member=一般メンバー, manager=マネージャー, finance=経理"),
  password: z.string().min(8).describe("初期パスワード（8文字以上）"),
});

const updateRoleSchema = z.object({
  operation: z.literal("update_role"),
  userId: z.string().uuid().describe("ユーザーID（UUID）"),
  role: z
    .enum(["admin", "member", "manager", "finance"])
    .describe("admin=管理者, member=一般メンバー, manager=マネージャー, finance=経理"),
});

const deactivateSchema = z.object({
  operation: z.literal("deactivate"),
  userId: z.string().uuid().describe("ユーザーID（UUID）"),
});

const reactivateSchema = z.object({
  operation: z.literal("reactivate"),
  userId: z.string().uuid().describe("ユーザーID（UUID）"),
});

const usersInputSchema = z.discriminatedUnion("operation", [
  listSchema,
  createSchema,
  updateRoleSchema,
  deactivateSchema,
  reactivateSchema,
]);

const usersAdvertisementSchema = buildAdvertisementSchema([
  listSchema,
  createSchema,
  updateRoleSchema,
  deactivateSchema,
  reactivateSchema,
]);

export function registerUsersTools(server: McpServer): void {
  server.registerTool(
    "users",
    {
      description:
        "ユーザー管理。ユーザー（User）・メンバー・アカウント（member）の一覧・作成・ロール変更・有効化/無効化。ロール（admin/member/manager/finance）を管理する。operation: list/create/update_role/deactivate/reactivate",
      inputSchema: usersAdvertisementSchema,
    },
    async (args, extra) => {
      try {
        const auth = getAuthInfo(extra);
        if (!auth) {
          return toToolError("認証情報が取得できません");
        }
        const { userId, organizationId, role } = auth;

        const parseResult = validateAndParse(usersInputSchema, args);
        if (parseResult) return parseResult;
        const typedArgs = args as z.infer<typeof usersInputSchema>;

        switch (typedArgs.operation) {
          case "list": {
            if (!canPerform(role, "organization", "listUsers")) {
              return toToolError("権限がありません");
            }
            const users = await listOrganizationUsers({ organizationId });
            return toToolSuccess(users);
          }

          case "create": {
            if (!canPerform(role, "organization", "createUser")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:createUser:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await createUser({
              organizationId,
              actorId: userId,
              email: typedArgs.email,
              name: typedArgs.name,
              role: typedArgs.role,
              password: typedArgs.password,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess(result.user);
          }

          case "update_role": {
            if (!canPerform(role, "organization", "changeRole")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:updateUserRole:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await updateUserRole({
              targetUserId: typedArgs.userId,
              organizationId,
              actorId: userId,
              newRole: typedArgs.role,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess({ updated: true });
          }

          case "deactivate": {
            if (!canPerform(role, "organization", "deactivateUser")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:deactivateUser:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await deactivateUser({
              actorId: userId,
              targetUserId: typedArgs.userId,
              organizationId,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess({ deactivated: true });
          }

          case "reactivate": {
            if (!canPerform(role, "organization", "deactivateUser")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:reactivateUser:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await reactivateUser({
              actorId: userId,
              targetUserId: typedArgs.userId,
              organizationId,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess({ reactivated: true });
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
