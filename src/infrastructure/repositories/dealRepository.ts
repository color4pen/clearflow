import { eq, and, asc, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../db";
import type { Transaction } from "../db";
import { deals, inquiries, clients, users } from "../schema";
import type { Deal, DealWithDetails, DealPhase, ContractType } from "@/domain/models/deal";

function mapRow(row: typeof deals.$inferSelect): Deal {
  return {
    id: row.id,
    organizationId: row.organizationId,
    inquiryId: row.inquiryId ?? null,
    clientId: row.clientId,
    title: row.title,
    phase: row.phase,
    estimatedAmount: row.estimatedAmount ?? null,
    estimatedStartDate: row.estimatedStartDate ?? null,
    estimatedEndDate: row.estimatedEndDate ?? null,
    contractType: row.contractType as ContractType | null,
    assigneeId: row.assigneeId ?? null,
    technicalLeadId: row.technicalLeadId ?? null,
    estimateRequestId: row.estimateRequestId ?? null,
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    version: row.version,
  };
}

export async function create(
  data: {
    organizationId: string;
    clientId: string;
    inquiryId?: string;
    title: string;
    estimatedAmount?: number | null;
    estimatedStartDate?: Date | null;
    estimatedEndDate?: Date | null;
    contractType?: string | null;
    assigneeId?: string | null;
    technicalLeadId?: string | null;
    notes?: string | null;
  },
  tx?: Transaction
): Promise<Deal> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .insert(deals)
    .values({
      organizationId: data.organizationId,
      clientId: data.clientId,
      inquiryId: data.inquiryId ?? null,
      title: data.title,
      estimatedAmount: data.estimatedAmount ?? null,
      estimatedStartDate: data.estimatedStartDate ?? null,
      estimatedEndDate: data.estimatedEndDate ?? null,
      contractType: data.contractType ?? null,
      assigneeId: data.assigneeId ?? null,
      technicalLeadId: data.technicalLeadId ?? null,
      notes: data.notes ?? null,
    })
    .returning();
  return mapRow(result[0]);
}

export async function findById(
  id: string,
  organizationId: string,
  tx?: Transaction
): Promise<Deal | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .select()
    .from(deals)
    .where(and(eq(deals.id, id), eq(deals.organizationId, organizationId)))
    .limit(1);
  return result[0] ? mapRow(result[0]) : null;
}

export async function findAllByOrganization(
  organizationId: string
): Promise<DealWithDetails[]> {
  // assigneeId は nullable なので LEFT JOIN で担当者名を取得する
  const assignees = alias(users, "assignees");

  const rows = await db
    .select({
      deal: deals,
      inquiryTitle: inquiries.title,
      clientName: clients.name,
      assigneeName: assignees.name,
    })
    .from(deals)
    .innerJoin(clients, eq(deals.clientId, clients.id))
    .leftJoin(inquiries, eq(deals.inquiryId, inquiries.id))
    .leftJoin(assignees, eq(deals.assigneeId, assignees.id))
    .where(eq(deals.organizationId, organizationId))
    .orderBy(asc(deals.createdAt));

  return rows.map((row) => ({
    ...mapRow(row.deal),
    inquiryTitle: row.inquiryTitle ?? null,
    clientName: row.clientName,
    assigneeName: row.assigneeName ?? null,
  }));
}

export async function findAllByClientId(
  clientId: string,
  organizationId: string,
  tx?: Transaction
): Promise<Deal[]> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .select()
    .from(deals)
    .where(
      and(eq(deals.clientId, clientId), eq(deals.organizationId, organizationId))
    )
    .orderBy(asc(deals.createdAt));
  return result.map(mapRow);
}

export async function findByInquiryId(
  inquiryId: string,
  organizationId: string,
  tx?: Transaction
): Promise<Deal | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .select()
    .from(deals)
    .where(and(eq(deals.inquiryId, inquiryId), eq(deals.organizationId, organizationId)))
    .limit(1);
  return result[0] ? mapRow(result[0]) : null;
}

export async function update(
  id: string,
  organizationId: string,
  data: Partial<{
    title: string;
    estimatedAmount: number | null;
    estimatedStartDate: Date | null;
    estimatedEndDate: Date | null;
    contractType: string | null;
    assigneeId: string | null;
    technicalLeadId: string | null;
    notes: string | null;
  }>,
  tx?: Transaction
): Promise<Deal | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .update(deals)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(deals.id, id), eq(deals.organizationId, organizationId)))
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
    .delete(deals)
    .where(and(eq(deals.id, id), eq(deals.organizationId, organizationId)));
}

export async function updatePhase(
  id: string,
  organizationId: string,
  phase: DealPhase,
  currentVersion: number,
  tx?: Transaction
): Promise<Deal | null> {
  const queryRunner = tx ?? db;
  // estimateRequestId は将来の手動紐づけ用に deals テーブルに残すが、フェーズ更新では変更しない
  const result = await queryRunner
    .update(deals)
    .set({
      phase,
      updatedAt: new Date(),
      version: sql`version + 1`,
    })
    .where(
      and(
        eq(deals.id, id),
        eq(deals.organizationId, organizationId),
        eq(deals.version, currentVersion)
      )
    )
    .returning();
  return result[0] ? mapRow(result[0]) : null;
}
