import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { webhookEndpoints } from "../schema";
import type { WebhookEndpoint } from "@/domain/models/webhookEndpoint";
import type { WebhookEventType } from "@/domain/models/webhookEvent";

function mapRow(row: typeof webhookEndpoints.$inferSelect): WebhookEndpoint {
  return {
    id: row.id,
    organizationId: row.organizationId,
    url: row.url,
    secret: row.secret,
    isActive: row.isActive,
    events: row.events as WebhookEventType[],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function create(data: {
  organizationId: string;
  url: string;
  secret: string;
  isActive?: boolean;
  events: string[];
}): Promise<WebhookEndpoint> {
  const result = await db
    .insert(webhookEndpoints)
    .values({
      organizationId: data.organizationId,
      url: data.url,
      secret: data.secret,
      isActive: data.isActive ?? true,
      events: data.events,
    })
    .returning();
  return mapRow(result[0]);
}

export async function findById(
  id: string,
  organizationId: string
): Promise<WebhookEndpoint | null> {
  const result = await db
    .select()
    .from(webhookEndpoints)
    .where(
      and(
        eq(webhookEndpoints.id, id),
        eq(webhookEndpoints.organizationId, organizationId)
      )
    )
    .limit(1);
  return result[0] ? mapRow(result[0]) : null;
}

export async function findByOrganization(
  organizationId: string
): Promise<WebhookEndpoint[]> {
  const result = await db
    .select()
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.organizationId, organizationId))
    .orderBy(desc(webhookEndpoints.createdAt));
  return result.map(mapRow);
}

export async function findActiveByOrganizationAndEvent(
  organizationId: string,
  event: string
): Promise<WebhookEndpoint[]> {
  const result = await db
    .select()
    .from(webhookEndpoints)
    .where(
      and(
        eq(webhookEndpoints.organizationId, organizationId),
        eq(webhookEndpoints.isActive, true)
      )
    );
  return result.map(mapRow).filter((ep) => ep.events.includes(event as WebhookEventType));
}

export async function updateIsActive(
  id: string,
  organizationId: string,
  isActive: boolean
): Promise<WebhookEndpoint | null> {
  const result = await db
    .update(webhookEndpoints)
    .set({
      isActive,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(webhookEndpoints.id, id),
        eq(webhookEndpoints.organizationId, organizationId)
      )
    )
    .returning();
  return result[0] ? mapRow(result[0]) : null;
}

export async function deleteById(
  id: string,
  organizationId: string
): Promise<void> {
  await db
    .delete(webhookEndpoints)
    .where(
      and(
        eq(webhookEndpoints.id, id),
        eq(webhookEndpoints.organizationId, organizationId)
      )
    );
}
