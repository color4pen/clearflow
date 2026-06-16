import { eq, and } from "drizzle-orm";
import { db } from "../db";
import type { Transaction } from "../db";
import { requests } from "../schema";
import type { Request, RequestStatus } from "@/domain/models/request";

function mapRow(row: typeof requests.$inferSelect): Request {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    organizationId: row.organizationId,
    creatorId: row.creatorId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function create(data: {
  title: string;
  description?: string | null;
  organizationId: string;
  creatorId: string;
}): Promise<Request> {
  const result = await db
    .insert(requests)
    .values({
      title: data.title,
      description: data.description ?? null,
      status: "draft",
      organizationId: data.organizationId,
      creatorId: data.creatorId,
    })
    .returning();
  return mapRow(result[0]);
}

export async function findById(
  id: string,
  organizationId: string
): Promise<Request | null> {
  const result = await db
    .select()
    .from(requests)
    .where(and(eq(requests.id, id), eq(requests.organizationId, organizationId)))
    .limit(1);
  return result[0] ? mapRow(result[0]) : null;
}

export async function findAllByOrganization(
  organizationId: string
): Promise<Request[]> {
  const result = await db
    .select()
    .from(requests)
    .where(eq(requests.organizationId, organizationId))
    .orderBy(requests.createdAt);
  return result.map(mapRow);
}

export async function updateStatus(
  id: string,
  organizationId: string,
  status: RequestStatus,
  updatedAt: Date,
  tx?: Transaction
): Promise<Request | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .update(requests)
    .set({ status, updatedAt })
    .where(and(eq(requests.id, id), eq(requests.organizationId, organizationId)))
    .returning();
  return result[0] ? mapRow(result[0]) : null;
}
