import { eq, and, sql, desc, ilike } from "drizzle-orm";

const LINK_SEARCH_LIMIT = 20;
import { db } from "../db";
import type { Transaction } from "../db";
import { inquiries, clients } from "../schema";
import type { Inquiry, InquiryWithClient, InquiryStatus } from "@/domain/models/inquiry";

function mapRow(row: typeof inquiries.$inferSelect): Inquiry {
  return {
    id: row.id,
    organizationId: row.organizationId,
    clientId: row.clientId ?? null,
    title: row.title,
    description: row.description ?? null,
    contactNote: row.contactNote ?? null,
    source: row.source,
    status: row.status,
    assigneeId: row.assigneeId ?? null,
    budget: row.budget ?? null,
    timeline: row.timeline ?? null,
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
    contactNote?: string | null;
    source: string;
    assigneeId?: string | null;
    budget?: number | null;
    timeline?: string | null;
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
      contactNote: data.contactNote ?? null,
      source: data.source as "web" | "phone" | "email" | "referral" | "agent_service" | "exhibition" | "other",
      status: "new",
      assigneeId: data.assigneeId ?? null,
      budget: data.budget ?? null,
      timeline: data.timeline ?? null,
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
    .orderBy(desc(inquiries.createdAt));
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
    .orderBy(desc(inquiries.createdAt));

  return rows.map((row) => ({
    ...mapRow(row.inquiry),
    clientName: row.clientName ?? null,
  }));
}

type InquirySourceValue = "web" | "phone" | "email" | "referral" | "agent_service" | "exhibition" | "other";

export async function update(
  id: string,
  organizationId: string,
  data: Partial<{
    title: string;
    description: string | null;
    contactNote: string | null;
    source: InquirySourceValue;
    clientId: string | null;
    assigneeId: string | null;
    budget: number | null;
    timeline: string | null;
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
  currentVersion: number,
  tx?: Transaction
): Promise<Inquiry | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .update(inquiries)
    .set({ status, updatedAt: new Date(), version: sql`version + 1` })
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

export async function deleteById(
  id: string,
  organizationId: string,
  tx?: Transaction
): Promise<void> {
  const queryRunner = tx ?? db;
  await queryRunner
    .delete(inquiries)
    .where(and(eq(inquiries.id, id), eq(inquiries.organizationId, organizationId)));
}

export async function searchByTitle(
  organizationId: string,
  query: string
): Promise<Inquiry[]> {
  const result = await db
    .select()
    .from(inquiries)
    .where(
      and(
        eq(inquiries.organizationId, organizationId),
        ilike(inquiries.title, `%${query}%`)
      )
    )
    .orderBy(desc(inquiries.createdAt))
    .limit(LINK_SEARCH_LIMIT);
  return result.map(mapRow);
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
    .orderBy(desc(inquiries.createdAt));
  return result.map(mapRow);
}
