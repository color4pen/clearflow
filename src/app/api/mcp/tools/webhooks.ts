import { randomBytes } from "crypto";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { canPerform } from "@/domain/authorization";
import { checkRateLimit, RATE_LIMITS } from "@/infrastructure/rateLimit";
import {
  webhookEndpointRepository,
  webhookDeliveryRepository,
} from "@/infrastructure/repositories";
import { WEBHOOK_EVENT_TYPES } from "@/domain/models/webhookEvent";
import { deliverSingleAttempt } from "@/infrastructure/webhookDelivery";
import { validateWebhookUrl } from "@/domain/services/webhookUrlValidator";
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
  url: z.string().url().describe("配信先URL"),
  events: z.array(z.string()).min(1).describe("購読イベント種別の配列"),
});

const deleteSchema = z.object({
  operation: z.literal("delete"),
  endpointId: z.string().uuid().describe("WebhookエンドポイントID（UUID）"),
});

const toggleSchema = z.object({
  operation: z.literal("toggle"),
  endpointId: z.string().uuid().describe("WebhookエンドポイントID（UUID）"),
  isActive: z.boolean().describe("有効フラグ"),
});

const listDeliveriesSchema = z.object({
  operation: z.literal("list_deliveries"),
  endpointId: z.string().uuid().describe("WebhookエンドポイントID（UUID）"),
});

const retryDeliverySchema = z.object({
  operation: z.literal("retry_delivery"),
  deliveryId: z.string().uuid().describe("配信ID（UUID）"),
});

const webhooksInputSchema = z.discriminatedUnion("operation", [
  listSchema,
  createSchema,
  deleteSchema,
  toggleSchema,
  listDeliveriesSchema,
  retryDeliverySchema,
]);

const webhooksAdvertisementSchema = buildAdvertisementSchema([
  listSchema,
  createSchema,
  deleteSchema,
  toggleSchema,
  listDeliveriesSchema,
  retryDeliverySchema,
]);

export function registerWebhooksTools(server: McpServer): void {
  server.registerTool(
    "webhooks",
    {
      description:
        "Webhook管理。Webhook（Webフック）・通知連携・HTTP コールバックのエンドポイント管理・配信履歴確認・失敗配信リトライ。operation: list/create/delete/toggle/list_deliveries/retry_delivery",
      inputSchema: webhooksAdvertisementSchema,
    },
    async (args, extra) => {
      try {
        const auth = getAuthInfo(extra);
        if (!auth) {
          return toToolError("認証情報が取得できません");
        }
        const { userId, organizationId, role } = auth;

        const parseResult = validateAndParse(webhooksInputSchema, args);
        if (parseResult) return parseResult;
        const typedArgs = args as z.infer<typeof webhooksInputSchema>;

        if (!canPerform(role, "organization", "manageWebhooks")) {
          return toToolError("権限がありません");
        }

        switch (typedArgs.operation) {
          case "list": {
            const endpoints =
              await webhookEndpointRepository.findByOrganization(organizationId);
            // secret フィールドを除外して返す
            const endpointsWithoutSecret = endpoints.map(
              ({ secret: _secret, ...rest }) => rest
            );
            return toToolSuccess(endpointsWithoutSecret);
          }

          case "create": {
            const rateCheck = await checkRateLimit({
              key: `mcp:webhookManage:${userId}`,
              limit: RATE_LIMITS.webhookManage.limit,
              windowMs: RATE_LIMITS.webhookManage.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const urlValidation = validateWebhookUrl(typedArgs.url);
            if (!urlValidation.ok) {
              return toToolError(urlValidation.message);
            }

            const validEvents = typedArgs.events.filter((e) =>
              (WEBHOOK_EVENT_TYPES as readonly string[]).includes(e)
            );
            if (validEvents.length === 0) {
              return toToolError("購読するイベントを1つ以上選択してください");
            }

            const secret = "whsec_" + randomBytes(32).toString("hex");

            const endpoint = await webhookEndpointRepository.create({
              organizationId,
              url: typedArgs.url,
              secret,
              events: validEvents,
            });

            return toToolSuccess({ ...endpoint, secret });
          }

          case "delete": {
            const rateCheck = await checkRateLimit({
              key: `mcp:webhookManage:${userId}`,
              limit: RATE_LIMITS.webhookManage.limit,
              windowMs: RATE_LIMITS.webhookManage.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            await webhookEndpointRepository.deleteById(
              typedArgs.endpointId,
              organizationId
            );
            return toToolSuccess({ deleted: true });
          }

          case "toggle": {
            const rateCheck = await checkRateLimit({
              key: `mcp:webhookManage:${userId}`,
              limit: RATE_LIMITS.webhookManage.limit,
              windowMs: RATE_LIMITS.webhookManage.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            await webhookEndpointRepository.updateIsActive(
              typedArgs.endpointId,
              organizationId,
              typedArgs.isActive
            );
            return toToolSuccess({ updated: true });
          }

          case "list_deliveries": {
            const deliveries = await webhookDeliveryRepository.findByEndpointId(
              typedArgs.endpointId,
              organizationId,
              { limit: 50 }
            );
            return toToolSuccess(deliveries);
          }

          case "retry_delivery": {
            const rateCheck = await checkRateLimit({
              key: `mcp:webhookManage:${userId}`,
              limit: RATE_LIMITS.webhookManage.limit,
              windowMs: RATE_LIMITS.webhookManage.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const delivery = await webhookDeliveryRepository.findById(
              typedArgs.deliveryId,
              organizationId
            );
            if (!delivery) {
              return toToolError("配信レコードが見つかりません");
            }

            const endpoint = await webhookEndpointRepository.findById(
              delivery.endpointId,
              organizationId
            );
            if (!endpoint) {
              return toToolError("配信レコードが見つかりません");
            }

            if (delivery.status !== "failed") {
              return toToolError("failed 状態の配信のみリトライできます");
            }

            await webhookDeliveryRepository.resetForRetry(typedArgs.deliveryId);
            void deliverSingleAttempt(endpoint, delivery.payload, typedArgs.deliveryId);

            return toToolSuccess({ retried: true });
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
