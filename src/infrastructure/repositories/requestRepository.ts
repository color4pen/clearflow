import { eq, and, sql } from "drizzle-orm";
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
    amount: row.amount ?? null,
    organizationId: row.organizationId,
    creatorId: row.creatorId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    version: row.version,
  };
}

export async function create(
  data: {
    title: string;
    description?: string | null;
    amount?: number | null;
    organizationId: string;
    creatorId: string;
  },
  tx?: Transaction
): Promise<Request> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .insert(requests)
    .values({
      title: data.title,
      description: data.description ?? null,
      amount: data.amount ?? null,
      status: "draft",
      organizationId: data.organizationId,
      creatorId: data.creatorId,
    })
    .returning();
  return mapRow(result[0]);
}

export async function findById(
  id: string,
  organizationId: string,
  tx?: Transaction
): Promise<Request | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
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
  expectedVersion: number,
  tx?: Transaction
): Promise<Request | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .update(requests)
    .set({ status, updatedAt, version: sql`version + 1` })
    .where(
      and(
        eq(requests.id, id),
        eq(requests.organizationId, organizationId),
        eq(requests.version, expectedVersion)
      )
    )
    .returning();
  return result[0] ? mapRow(result[0]) : null;
}
