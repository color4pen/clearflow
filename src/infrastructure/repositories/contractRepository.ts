import { eq, and, asc } from "drizzle-orm";
import { db } from "../db";
import type { Transaction } from "../db";
import { contracts, clients, deals } from "../schema";
import type { Contract, ContractWithClient, ContractStatus, RenewalType } from "@/domain/models/contract";

function mapRow(row: typeof contracts.$inferSelect): Contract {
  return {
    id: row.id,
    organizationId: row.organizationId,
    dealId: row.dealId,
    clientId: row.clientId,
    title: row.title,
    contractType: row.contractType ?? null,
    amount: row.amount,
    startDate: row.startDate,
    endDate: row.endDate ?? null,
    paymentTerms: row.paymentTerms ?? null,
    renewalType: row.renewalType as RenewalType,
    renewalCycle: row.renewalCycle ?? null,
    status: row.status as ContractStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function create(
  data: {
    organizationId: string;
    dealId: string;
    clientId: string;
    title: string;
    contractType?: string | null;
    amount: number;
    startDate: Date;
    endDate?: Date | null;
    paymentTerms?: string | null;
    renewalType?: RenewalType;
    renewalCycle?: string | null;
  },
  tx?: Transaction
): Promise<Contract> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .insert(contracts)
    .values({
      organizationId: data.organizationId,
      dealId: data.dealId,
      clientId: data.clientId,
      title: data.title,
      contractType: data.contractType ?? null,
      amount: data.amount,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      paymentTerms: data.paymentTerms ?? null,
      renewalType: data.renewalType ?? "one_time",
      renewalCycle: data.renewalCycle ?? null,
    })
    .returning();
  return mapRow(result[0]);
}

export async function findById(
  id: string,
  organizationId: string,
  tx?: Transaction
): Promise<Contract | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .select()
    .from(contracts)
    .where(and(eq(contracts.id, id), eq(contracts.organizationId, organizationId)))
    .limit(1);
  return result[0] ? mapRow(result[0]) : null;
}

export async function findAllByDealId(
  dealId: string,
  organizationId: string,
  tx?: Transaction
): Promise<Contract[]> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .select()
    .from(contracts)
    .where(and(eq(contracts.dealId, dealId), eq(contracts.organizationId, organizationId)));
  return result.map(mapRow);
}

export async function findAllByClientId(
  clientId: string,
  organizationId: string,
  tx?: Transaction
): Promise<Contract[]> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .select()
    .from(contracts)
    .where(
      and(
        eq(contracts.clientId, clientId),
        eq(contracts.organizationId, organizationId)
      )
    )
    .orderBy(asc(contracts.createdAt));
  return result.map(mapRow);
}

export async function findAllByOrganization(
  organizationId: string
): Promise<ContractWithClient[]> {
  const rows = await db
    .select({
      contract: contracts,
      clientName: clients.name,
      dealTitle: deals.title,
    })
    .from(contracts)
    .innerJoin(clients, eq(contracts.clientId, clients.id))
    .innerJoin(deals, and(eq(contracts.dealId, deals.id), eq(deals.organizationId, organizationId)))
    .where(eq(contracts.organizationId, organizationId))
    .orderBy(asc(contracts.createdAt));

  return rows.map((row) => ({
    ...mapRow(row.contract),
    clientName: row.clientName,
    dealTitle: row.dealTitle,
  }));
}

export async function deleteById(
  id: string,
  organizationId: string,
  tx?: Transaction
): Promise<void> {
  const queryRunner = tx ?? db;
  await queryRunner
    .delete(contracts)
    .where(and(eq(contracts.id, id), eq(contracts.organizationId, organizationId)));
}

export async function update(
  id: string,
  organizationId: string,
  data: Partial<{
    title: string;
    contractType: string | null;
    amount: number;
    startDate: Date;
    endDate: Date | null;
    paymentTerms: string | null;
    renewalType: RenewalType;
    renewalCycle: string | null;
    status: ContractStatus;
  }>,
  tx?: Transaction
): Promise<Contract | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .update(contracts)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(contracts.id, id), eq(contracts.organizationId, organizationId)))
    .returning();
  return result[0] ? mapRow(result[0]) : null;
}
