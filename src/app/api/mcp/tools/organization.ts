import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { canPerform } from "@/domain/authorization";
import { checkRateLimit, RATE_LIMITS } from "@/infrastructure/rateLimit";
import { organizationRepository } from "@/infrastructure/repositories";
import { updateOrganization } from "@/application/usecases/updateOrganization";
import { toToolError, toToolSuccess, handleToolError } from "../errors";
import type { Role } from "@/domain/models/user";

function getAuthInfo(extra: RequestHandlerExtra<ServerRequest, ServerNotification>) {
  const authExtra = extra.authInfo?.extra as
    | { userId: string; organizationId: string; role: Role }
    | undefined;
  return authExtra ?? null;
}

const getSchema = z.object({
  operation: z.literal("get"),
});

const updateSchema = z.object({
  operation: z.literal("update"),
  name: z.string().min(1, "組織名は必須です"),
});

const organizationInputSchema = z.discriminatedUnion("operation", [
  getSchema,
  updateSchema,
]);

export function registerOrganizationTools(server: McpServer): void {
  server.registerTool(
    "organization",
    {
      description:
        "組織情報の取得・更新を行います。operation 引数で操作を切り替えます。",
      inputSchema: organizationInputSchema,
    },
    async (args, extra) => {
      try {
        const auth = getAuthInfo(extra);
        if (!auth) {
          return toToolError("認証情報が取得できません");
        }
        const { userId, organizationId, role } = auth;

        switch (args.operation) {
          case "get": {
            const organization = await organizationRepository.findById(
              organizationId,
              organizationId
            );
            if (!organization) {
              return toToolError("組織が見つかりません");
            }
            return toToolSuccess(organization);
          }

          case "update": {
            if (!canPerform(role, "organization", "updateOrganization")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:updateOrganization:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await updateOrganization({
              organizationId,
              actorId: userId,
              name: args.name,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess({ updated: true });
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
