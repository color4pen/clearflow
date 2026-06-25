import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { invoices, contracts, clients, deals } from "../schema";
import type { MonthlyRevenue, CustomerRevenue, DealRevenue, PipelineSummary } from "@/domain/models/revenue";
import type { DealPhase } from "@/domain/models/deal";

/**
 * 確定見込み売上: 期間内の scheduled + invoiced ステータスの請求合計金額を返す
 */
export async function getConfirmedRevenue(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const rows = await db
    .select({
      total: sql<number>`COALESCE(SUM(${invoices.amount}), 0)`,
    })
    .from(invoices)
    .innerJoin(contracts, eq(invoices.contractId, contracts.id))
    .where(
      and(
        eq(invoices.organizationId, organizationId),
        inArray(invoices.status, ["scheduled", "invoiced"]),
        gte(invoices.dueDate, startDate),
        lte(invoices.dueDate, endDate)
      )
    );

  return Number(rows[0]?.total ?? 0);
}

/**
 * 月次売上集計: 期間内の入金済み請求を月ごとに集計する
 */
export async function getMonthlyRevenue(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<MonthlyRevenue[]> {
  const rows = await db
    .select({
      yearMonth: sql<string>`TO_CHAR(DATE_TRUNC('month', ${invoices.paidAt}), 'YYYY-MM')`,
      amount: sql<number>`COALESCE(SUM(${invoices.amount}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(invoices)
    .innerJoin(contracts, eq(invoices.contractId, contracts.id))
    .where(
      and(
        eq(invoices.organizationId, organizationId),
        eq(invoices.status, "paid"),
        sql`${invoices.paidAt} IS NOT NULL`,
        gte(invoices.paidAt, startDate),
        lte(invoices.paidAt, endDate)
      )
    )
    .groupBy(sql`DATE_TRUNC('month', ${invoices.paidAt})`)
    .orderBy(sql`DATE_TRUNC('month', ${invoices.paidAt})`);

  return rows.map((row) => ({
    yearMonth: row.yearMonth,
    amount: Number(row.amount),
    count: Number(row.count),
  }));
}

/**
 * 顧客別売上集計: 期間内の入金済み請求を顧客ごとに集計する
 */
export async function getCustomerRevenue(
  organizationId: string,
  startDate: Date,
  endDate: Date,
  limit?: number
): Promise<CustomerRevenue[]> {
  const query = db
    .select({
      clientId: clients.id,
      clientName: clients.name,
      amount: sql<number>`COALESCE(SUM(${invoices.amount}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(invoices)
    .innerJoin(contracts, eq(invoices.contractId, contracts.id))
    .innerJoin(clients, eq(contracts.clientId, clients.id))
    .where(
      and(
        eq(invoices.organizationId, organizationId),
        eq(invoices.status, "paid"),
        sql`${invoices.paidAt} IS NOT NULL`,
        gte(invoices.paidAt, startDate),
        lte(invoices.paidAt, endDate)
      )
    )
    .groupBy(clients.id, clients.name)
    .orderBy(sql`COALESCE(SUM(${invoices.amount}), 0) DESC`);

  const rows = limit ? await query.limit(limit) : await query;

  return rows.map((row) => ({
    clientId: row.clientId,
    clientName: row.clientName,
    amount: Number(row.amount),
    count: Number(row.count),
  }));
}

/**
 * 案件別売上集計: 期間内の入金済み請求を案件ごとに集計する
 */
export async function getDealRevenue(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<DealRevenue[]> {
  const rows = await db
    .select({
      dealId: deals.id,
      dealTitle: deals.title,
      amount: sql<number>`COALESCE(SUM(${invoices.amount}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(invoices)
    .innerJoin(contracts, eq(invoices.contractId, contracts.id))
    .innerJoin(deals, eq(contracts.dealId, deals.id))
    .where(
      and(
        eq(invoices.organizationId, organizationId),
        eq(invoices.status, "paid"),
        sql`${invoices.paidAt} IS NOT NULL`,
        gte(invoices.paidAt, startDate),
        lte(invoices.paidAt, endDate)
      )
    )
    .groupBy(deals.id, deals.title)
    .orderBy(sql`COALESCE(SUM(${invoices.amount}), 0) DESC`);

  return rows.map((row) => ({
    dealId: row.dealId,
    dealTitle: row.dealTitle,
    amount: Number(row.amount),
    count: Number(row.count),
  }));
}

/**
 * パイプライン集計: 非終端フェーズの案件をフェーズごとに集計する
 * 対象フェーズ: proposal_prep, proposed, negotiation (won, lost を除外)
 */
export async function getPipelineSummary(
  organizationId: string
): Promise<PipelineSummary[]> {
  const activePhases = ["proposal_prep", "proposed", "negotiation"] as const;

  const rows = await db
    .select({
      phase: deals.phase,
      dealCount: sql<number>`COUNT(*)`,
      estimatedAmount: sql<number>`COALESCE(SUM(COALESCE(${deals.estimatedAmount}, 0)), 0)`,
    })
    .from(deals)
    .where(
      and(
        eq(deals.organizationId, organizationId),
        inArray(deals.phase, activePhases)
      )
    )
    .groupBy(deals.phase);

  return rows.map((row) => ({
    phase: row.phase as DealPhase,
    dealCount: Number(row.dealCount),
    estimatedAmount: Number(row.estimatedAmount),
  }));
}
