import { createHmac } from "crypto";
import {
  webhookEndpointRepository,
  webhookDeliveryRepository,
  userRepository,
} from "./repositories";
import type { WebhookEndpoint } from "@/domain/models/webhookEndpoint";
import type { WebhookEventType, WebhookPayload, WebhookEventData } from "@/domain/models/webhookEvent";

// Bun runtime global — available when running under Bun
declare const Bun: { sleep: (ms: number) => Promise<void> };

export function computeSignature(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export const MAX_ATTEMPTS = 4;
export const BASE_DELAY_MS = 1000;

async function deliverToEndpoint(
  endpoint: WebhookEndpoint,
  payload: WebhookPayload
): Promise<void> {
  const jsonPayload = JSON.stringify(payload);
  const signature = computeSignature(endpoint.secret, jsonPayload);

  const delivery = await webhookDeliveryRepository.create({
    endpointId: endpoint.id,
    event: payload.event,
    payload,
  });

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      const delay = BASE_DELAY_MS * Math.pow(4, attempt - 2);
      await Bun.sleep(delay);
    }

    let response: Response | undefined;
    try {
      response = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Clearflow-Signature": "sha256=" + signature,
        },
        body: jsonPayload,
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        await webhookDeliveryRepository.updateStatus(delivery.id, {
          status: "delivered",
          statusCode: response.status,
          attempts: attempt,
          lastAttemptAt: new Date(),
          nextRetryAt: null,
        });
        return;
      } else {
        if (attempt < MAX_ATTEMPTS) {
          const nextRetryAt = new Date(Date.now() + BASE_DELAY_MS * Math.pow(4, attempt - 1));
          await webhookDeliveryRepository.updateStatus(delivery.id, {
            status: "pending",
            statusCode: response.status,
            attempts: attempt,
            lastAttemptAt: new Date(),
            nextRetryAt,
          });
        } else {
          await webhookDeliveryRepository.updateStatus(delivery.id, {
            status: "failed",
            statusCode: response.status,
            attempts: attempt,
            lastAttemptAt: new Date(),
            nextRetryAt: null,
          });
        }
      }
    } catch {
      if (attempt < MAX_ATTEMPTS) {
        const nextRetryAt = new Date(Date.now() + BASE_DELAY_MS * Math.pow(4, attempt - 1));
        await webhookDeliveryRepository.updateStatus(delivery.id, {
          status: "pending",
          statusCode: response?.status ?? null,
          attempts: attempt,
          lastAttemptAt: new Date(),
          nextRetryAt,
        });
      } else {
        await webhookDeliveryRepository.updateStatus(delivery.id, {
          status: "failed",
          statusCode: response?.status ?? null,
          attempts: attempt,
          lastAttemptAt: new Date(),
          nextRetryAt: null,
        });
      }
    }
  }
}

export async function deliverSingleAttempt(
  endpoint: WebhookEndpoint,
  payload: WebhookPayload,
  deliveryId: string
): Promise<void> {
  const jsonPayload = JSON.stringify(payload);
  const signature = computeSignature(endpoint.secret, jsonPayload);

  const current = await webhookDeliveryRepository.findById(deliveryId);
  const currentAttempts = current?.attempts ?? 0;

  let response: Response | undefined;
  try {
    response = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Clearflow-Signature": "sha256=" + signature,
      },
      body: jsonPayload,
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      await webhookDeliveryRepository.updateStatus(deliveryId, {
        status: "delivered",
        statusCode: response.status,
        attempts: currentAttempts + 1,
        lastAttemptAt: new Date(),
        nextRetryAt: null,
      });
    } else {
      await webhookDeliveryRepository.updateStatus(deliveryId, {
        status: "failed",
        statusCode: response.status,
        attempts: currentAttempts + 1,
        lastAttemptAt: new Date(),
        nextRetryAt: null,
      });
    }
  } catch {
    await webhookDeliveryRepository.updateStatus(deliveryId, {
      status: "failed",
      statusCode: response?.status ?? null,
      attempts: currentAttempts + 1,
      lastAttemptAt: new Date(),
      nextRetryAt: null,
    });
  }
}

export async function deliverWebhookEvent(params: {
  organizationId: string;
  event: WebhookEventType;
  data: Omit<WebhookEventData, "actorName"> & { actorId: string };
}): Promise<void> {
  try {
    const actor = await userRepository.findById(
      params.data.actorId,
      params.organizationId
    );
    const actorName = actor?.name ?? "Unknown";

    const webhookPayload: WebhookPayload = {
      event: params.event,
      timestamp: new Date().toISOString(),
      organizationId: params.organizationId,
      data: {
        ...params.data,
        actorName,
      },
    };

    const endpoints = await webhookEndpointRepository.findActiveByOrganizationAndEvent(
      params.organizationId,
      params.event
    );

    await Promise.allSettled(
      endpoints.map((endpoint) => deliverToEndpoint(endpoint, webhookPayload))
    );
  } catch (err) {
    console.error("[webhookDelivery] Failed to deliver webhook event:", err);
  }
}
