import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { getNotifications } from "@/application/usecases/getNotifications";
import { markNotificationsAsRead } from "@/application/usecases/markNotificationsAsRead";
import * as userRepository from "@/infrastructure/repositories/userRepository";
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

const markAsReadSchema = z.object({
  operation: z.literal("mark_as_read"),
});

const notificationsInputSchema = z.discriminatedUnion("operation", [
  listSchema,
  markAsReadSchema,
]);

export function registerNotificationsTools(server: McpServer): void {
  server.registerTool(
    "notifications",
    {
      description:
        "通知の一覧取得と既読化を行います。operation 引数で操作を切り替えます。",
      inputSchema: notificationsInputSchema,
    },
    async (args, extra) => {
      try {
        const auth = getAuthInfo(extra);
        if (!auth) {
          return toToolError("認証情報が取得できません");
        }
        const { userId, organizationId } = auth;

        switch (args.operation) {
          case "list": {
            const user = await userRepository.findById(userId, organizationId);
            const notificationsLastSeenAt = user?.notificationsLastSeenAt ?? null;

            const result = await getNotifications({
              userId,
              organizationId,
              notificationsLastSeenAt,
            });

            return toToolSuccess(result);
          }

          case "mark_as_read": {
            const result = await markNotificationsAsRead({
              userId,
              organizationId,
            });

            if (!result.ok) {
              return toToolError("既読化に失敗しました");
            }
            return toToolSuccess({ marked: true });
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
