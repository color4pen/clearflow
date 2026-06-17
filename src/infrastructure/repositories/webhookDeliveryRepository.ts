import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { webhookDeliveries, webhookEndpoints } from "../schema";
import type { WebhookDelivery, WebhookDeliveryStatus } from "@/domain/models/webhookDelivery";
import type { WebhookPayload } from "@/domain/models/webhookEvent";

function mapRow(row: typeof webhookDeliveries.$inferSelect): WebhookDelivery {
  return {
    id: row.id,
    endpointId: row.endpointId,
    event: row.event,
    payload: row.payload as WebhookPayload,
    status: row.status as WebhookDeliveryStatus,
    statusCode: row.statusCode ?? null,
    attempts: row.attempts,
    lastAttemptAt: row.lastAttemptAt ?? null,
    nextRetryAt: row.nextRetryAt ?? null,
    createdAt: row.createdAt,
  };
}

export async function create(data: {
  endpointId: string;
  event: string;
  payload: WebhookPayload;
}): Promise<WebhookDelivery> {
  const result = await db
    .insert(webhookDeliveries)
    .values({
      endpointId: data.endpointId,
      event: data.event,
      payload: data.payload,
      status: "pending",
      attempts: 0,
    })
    .returning();
  return mapRow(result[0]);
}

export async function updateStatus(
  id: string,
  data: {
    status: WebhookDeliveryStatus;
    statusCode?: number | null;
    attempts: number;
    lastAttemptAt: Date | null;
    nextRetryAt?: Date | null;
  }
): Promise<void> {
  await db
    .update(webhookDeliveries)
    .set({
      status: data.status,
      statusCode: data.statusCode ?? null,
      attempts: data.attempts,
      lastAttemptAt: data.lastAttemptAt,
      ...(data.nextRetryAt !== undefined ? { nextRetryAt: data.nextRetryAt } : {}),
    })
    .where(eq(webhookDeliveries.id, id));
}

export async function findById(
  id: string,
  organizationId: string
): Promise<WebhookDelivery | null> {
  const result = await db
    .select({ delivery: webhookDeliveries })
    .from(webhookDeliveries)
    .innerJoin(
      webhookEndpoints,
      and(
        eq(webhookDeliveries.endpointId, webhookEndpoints.id),
        eq(webhookEndpoints.organizationId, organizationId)
      )
    )
    .where(eq(webhookDeliveries.id, id))
    .limit(1);
  return result[0] ? mapRow(result[0].delivery) : null;
}

export async function resetForRetry(id: string): Promise<void> {
  await db
    .update(webhookDeliveries)
    .set({
      status: "pending",
      nextRetryAt: null,
    })
    .where(eq(webhookDeliveries.id, id));
}

export async function findByEndpointId(
  endpointId: string,
  organizationId: string,
  options?: { limit?: number; offset?: number }
): Promise<WebhookDelivery[]> {
  // Verify that the endpoint belongs to the given organization
  const endpoint = await db
    .select()
    .from(webhookEndpoints)
    .where(
      and(
        eq(webhookEndpoints.id, endpointId),
        eq(webhookEndpoints.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!endpoint[0]) return [];

  let query = db
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.endpointId, endpointId))
    .orderBy(desc(webhookDeliveries.createdAt));

  if (options?.limit !== undefined) {
    query = query.limit(options.limit) as typeof query;
  }
  if (options?.offset !== undefined) {
    query = query.offset(options.offset) as typeof query;
  }

  const result = await query;
  return result.map(mapRow);
}
