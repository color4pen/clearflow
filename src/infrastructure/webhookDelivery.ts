import { createHmac } from "crypto";
import {
  webhookEndpointRepository,
  webhookDeliveryRepository,
  userRepository,
} from "./repositories";
import type { WebhookEndpoint } from "@/domain/models/webhookEndpoint";
import type { WebhookEventType, WebhookPayload, WebhookEventData } from "@/domain/models/webhookEvent";

export function computeSignature(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

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
        attempts: 1,
        lastAttemptAt: new Date(),
      });
    } else {
      await webhookDeliveryRepository.updateStatus(delivery.id, {
        status: "failed",
        statusCode: response.status,
        attempts: 1,
        lastAttemptAt: new Date(),
      });
    }
  } catch {
    await webhookDeliveryRepository.updateStatus(delivery.id, {
      status: "failed",
      statusCode: response?.status ?? null,
      attempts: 1,
      lastAttemptAt: new Date(),
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
