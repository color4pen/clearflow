import { eq, and, asc, gte, lt, lte, sql } from "drizzle-orm";
import { db } from "../db";
import type { Transaction } from "../db";
import { invoices } from "../schema";
import type { Invoice, InvoiceStatus } from "@/domain/models/invoice";

function mapRow(row: typeof invoices.$inferSelect): Invoice {
  return {
    id: row.id,
    organizationId: row.organizationId,
    contractId: row.contractId,
    title: row.title,
    amount: row.amount,
    issueDate: row.issueDate ?? null,
    dueDate: row.dueDate,
    status: row.status as InvoiceStatus,
    invoicedAt: row.invoicedAt ?? null,
    paidAt: row.paidAt ?? null,
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function create(
  data: {
    organizationId: string;
    contractId: string;
    title: string;
    amount: number;
    issueDate?: Date | null;
    dueDate: Date;
    notes?: string | null;
  },
  tx?: Transaction
): Promise<Invoice> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .insert(invoices)
    .values({
      organizationId: data.organizationId,
      contractId: data.contractId,
      title: data.title,
      amount: data.amount,
      issueDate: data.issueDate ?? null,
      dueDate: data.dueDate,
      notes: data.notes ?? null,
    })
    .returning();
  return mapRow(result[0]);
}

export async function findById(
  id: string,
  organizationId: string,
  tx?: Transaction
): Promise<Invoice | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.organizationId, organizationId)))
    .limit(1);
  return result[0] ? mapRow(result[0]) : null;
}

export async function findAllByContract(
  contractId: string,
  organizationId: string,
  tx?: Transaction
): Promise<Invoice[]> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .select()
    .from(invoices)
    .where(and(eq(invoices.contractId, contractId), eq(invoices.organizationId, organizationId)))
    .orderBy(asc(invoices.createdAt));
  return result.map(mapRow);
}

export async function update(
  id: string,
  organizationId: string,
  data: Partial<{
    title: string;
    amount: number;
    issueDate: Date | null;
    dueDate: Date;
    notes: string | null;
  }>,
  tx?: Transaction
): Promise<Invoice | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .update(invoices)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(invoices.id, id), eq(invoices.organizationId, organizationId)))
    .returning();
  return result[0] ? mapRow(result[0]) : null;
}

export async function updateStatus(
  id: string,
  organizationId: string,
  status: InvoiceStatus,
  additionalFields?: Partial<{ invoicedAt: Date; paidAt: Date }>,
  tx?: Transaction
): Promise<Invoice | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .update(invoices)
    .set({ status, ...additionalFields, updatedAt: new Date() })
    .where(and(eq(invoices.id, id), eq(invoices.organizationId, organizationId)))
    .returning();
  return result[0] ? mapRow(result[0]) : null;
}

export async function findAllByOrganization(
  organizationId: string,
  filters?: {
    status?: InvoiceStatus;
    paidAtFrom?: Date;
    paidAtTo?: Date;
    issueDateFrom?: Date;
    issueDateTo?: Date;
  }
): Promise<Invoice[]> {
  const conditions = [eq(invoices.organizationId, organizationId)];

  if (filters?.status) {
    conditions.push(eq(invoices.status, filters.status));
  }
  if (filters?.paidAtFrom) {
    conditions.push(gte(invoices.paidAt, filters.paidAtFrom));
  }
  if (filters?.paidAtTo) {
    conditions.push(lt(invoices.paidAt, filters.paidAtTo));
  }
  if (filters?.issueDateFrom) {
    conditions.push(gte(invoices.issueDate, filters.issueDateFrom));
  }
  if (filters?.issueDateTo) {
    conditions.push(lte(invoices.issueDate, filters.issueDateTo));
  }

  const result = await db
    .select()
    .from(invoices)
    .where(and(...conditions))
    .orderBy(asc(invoices.dueDate));
  return result.map(mapRow);
}

/** 契約に紐づく全請求の金額合計を SQL の SUM で返す。請求が存在しない場合は 0 を返す */
export async function sumAmountByContract(
  contractId: string,
  organizationId: string,
  tx?: Transaction
): Promise<number> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .select({ total: sql<number>`COALESCE(SUM(${invoices.amount}), 0)` })
    .from(invoices)
    .where(and(eq(invoices.contractId, contractId), eq(invoices.organizationId, organizationId)));
  return Number(result[0]?.total ?? 0);
}
