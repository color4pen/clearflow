import { eq, and, sql } from "drizzle-orm";
import { db } from "../db";
import type { Transaction } from "../db";
import { inquiries, clients } from "../schema";
import type { Inquiry, InquiryWithClient, InquiryStatus, InquirySource } from "@/domain/models/inquiry";

function mapRow(row: typeof inquiries.$inferSelect): Inquiry {
  return {
    id: row.id,
    organizationId: row.organizationId,
    clientId: row.clientId ?? null,
    title: row.title,
    description: row.description ?? null,
    source: row.source as InquirySource,
    status: row.status,
    assigneeId: row.assigneeId ?? null,
    conversionRequestId: row.conversionRequestId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    version: row.version,
  };
}

export async function create(
  data: {
    organizationId: string;
    clientId?: string | null;
    title: string;
    description?: string | null;
    source: string;
    assigneeId?: string | null;
  },
  tx?: Transaction
): Promise<Inquiry> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .insert(inquiries)
    .values({
      organizationId: data.organizationId,
      clientId: data.clientId ?? null,
      title: data.title,
      description: data.description ?? null,
      source: data.source,
      status: "new",
      assigneeId: data.assigneeId ?? null,
      conversionRequestId: null,
    })
    .returning();
  return mapRow(result[0]);
}

export async function findById(
  id: string,
  organizationId: string,
  tx?: Transaction
): Promise<Inquiry | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .select()
    .from(inquiries)
    .where(and(eq(inquiries.id, id), eq(inquiries.organizationId, organizationId)))
    .limit(1);
  return result[0] ? mapRow(result[0]) : null;
}

export async function findAllByOrganization(
  organizationId: string
): Promise<Inquiry[]> {
  const result = await db
    .select()
    .from(inquiries)
    .where(eq(inquiries.organizationId, organizationId))
    .orderBy(inquiries.createdAt);
  return result.map(mapRow);
}

export async function findAllWithClientByOrganization(
  organizationId: string
): Promise<InquiryWithClient[]> {
  const rows = await db
    .select({
      inquiry: inquiries,
      clientName: clients.name,
    })
    .from(inquiries)
    .leftJoin(clients, eq(inquiries.clientId, clients.id))
    .where(eq(inquiries.organizationId, organizationId))
    .orderBy(inquiries.createdAt);

  return rows.map((row) => ({
    ...mapRow(row.inquiry),
    clientName: row.clientName ?? null,
  }));
}

export async function update(
  id: string,
  organizationId: string,
  data: Partial<{
    title: string;
    description: string | null;
    source: string;
    assigneeId: string | null;
  }>,
  tx?: Transaction
): Promise<Inquiry | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .update(inquiries)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(inquiries.id, id), eq(inquiries.organizationId, organizationId)))
    .returning();
  return result[0] ? mapRow(result[0]) : null;
}

export async function updateStatus(
  id: string,
  organizationId: string,
  status: InquiryStatus,
  conversionRequestId: string | null,
  currentVersion: number,
  tx?: Transaction
): Promise<Inquiry | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .update(inquiries)
    .set({ status, conversionRequestId, updatedAt: new Date(), version: sql`version + 1` })
    .where(
      and(
        eq(inquiries.id, id),
        eq(inquiries.organizationId, organizationId),
        eq(inquiries.version, currentVersion)
      )
    )
    .returning();
  return result[0] ? mapRow(result[0]) : null;
}

/**
 * 特定顧客に紐づく引き合いを organizationId でテナント分離して取得する。
 */
export async function findByClientId(
  clientId: string,
  organizationId: string
): Promise<Inquiry[]> {
  const result = await db
    .select()
    .from(inquiries)
    .where(and(eq(inquiries.clientId, clientId), eq(inquiries.organizationId, organizationId)))
    .orderBy(inquiries.createdAt);
  return result.map(mapRow);
}
