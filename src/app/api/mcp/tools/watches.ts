import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { checkRateLimit, RATE_LIMITS } from "@/infrastructure/rateLimit";
import { watchDeal } from "@/application/usecases/watchDeal";
import { unwatchDeal } from "@/application/usecases/unwatchDeal";
import { toToolError, toToolSuccess, handleToolError } from "../errors";
import { buildAdvertisementSchema, validateAndParse } from "../schemaHelpers";
import type { Role } from "@/domain/models/user";

function getAuthInfo(extra: RequestHandlerExtra<ServerRequest, ServerNotification>) {
  const authExtra = extra.authInfo?.extra as
    | { userId: string; organizationId: string; role: Role }
    | undefined;
  return authExtra ?? null;
}

const watchSchema = z.object({
  operation: z.literal("watch"),
  dealId: z.string().uuid("案件IDが不正です").describe("案件ID（UUID）"),
});

const unwatchSchema = z.object({
  operation: z.literal("unwatch"),
  dealId: z.string().uuid("案件IDが不正です").describe("案件ID（UUID）"),
});

const watchesInputSchema = z.discriminatedUnion("operation", [
  watchSchema,
  unwatchSchema,
]);

const watchesAdvertisementSchema = buildAdvertisementSchema([
  watchSchema,
  unwatchSchema,
]);

export function registerWatchesTools(server: McpServer): void {
  server.registerTool(
    "watches",
    {
      description:
        "ウォッチ管理。案件（Deal）のウォッチ（Watch）・フォロー・お気に入り（bookmark）の登録・解除。案件の変更通知を購読する。operation: watch/unwatch",
      inputSchema: watchesAdvertisementSchema,
    },
    async (args, extra) => {
      try {
        const auth = getAuthInfo(extra);
        if (!auth) {
          return toToolError("認証情報が取得できません");
        }
        const { userId, organizationId } = auth;

        const parseResult = validateAndParse(watchesInputSchema, args);
        if (parseResult) return parseResult;
        const typedArgs = args as z.infer<typeof watchesInputSchema>;

        const rateCheck = await checkRateLimit({
          key: `mcp:watches:${userId}`,
          limit: RATE_LIMITS.createRequest.limit,
          windowMs: RATE_LIMITS.createRequest.windowMs,
        });
        if (!rateCheck.allowed) {
          return toToolError("レート制限超過。しばらく待ってから再試行してください");
        }

        switch (typedArgs.operation) {
          case "watch": {
            const result = await watchDeal({
              userId,
              dealId: typedArgs.dealId,
              organizationId,
            });

            if (!result.ok) {
              return toToolError("ウォッチの登録に失敗しました");
            }
            return toToolSuccess(result.watch);
          }

          case "unwatch": {
            const result = await unwatchDeal({
              userId,
              dealId: typedArgs.dealId,
              organizationId,
            });

            if (!result.ok) {
              return toToolError("ウォッチの解除に失敗しました");
            }
            return toToolSuccess({ unwatched: true, dealId: typedArgs.dealId });
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
