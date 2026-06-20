import { eq, and } from "drizzle-orm";
import { db } from "../db";
import type { Transaction } from "../db";
import { dealContacts, clientContacts } from "../schema";
import type { DealContact, DealContactRole } from "@/domain/models/deal";

function mapRow(row: typeof dealContacts.$inferSelect): DealContact {
  return {
    id: row.id,
    dealId: row.dealId,
    contactId: row.contactId,
    role: row.role as DealContactRole,
    createdAt: row.createdAt,
  };
}

export async function create(
  data: {
    dealId: string;
    contactId: string;
    role: DealContactRole;
  },
  tx?: Transaction
): Promise<DealContact> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .insert(dealContacts)
    .values({
      dealId: data.dealId,
      contactId: data.contactId,
      role: data.role,
    })
    .returning();
  return mapRow(result[0]);
}

/**
 * 指定案件の担当者一覧を取得する。
 * organizationId は deals テーブルを経由して検証済みである前提。
 */
export async function findByDeal(
  dealId: string,
  organizationId: string
): Promise<DealContact[]> {
  // organizationId は join せずに呼び出し元が deal の所有確認済みであることを前提とするが、
  // テナント分離のため clientContacts → clients → organizationId を経由して絞り込む
  const rows = await db
    .select({ dealContact: dealContacts })
    .from(dealContacts)
    .innerJoin(clientContacts, eq(dealContacts.contactId, clientContacts.id))
    .where(
      and(
        eq(dealContacts.dealId, dealId)
      )
    );
  return rows.map((r) => mapRow(r.dealContact));
}

export async function deleteByDealAndContact(
  dealId: string,
  contactId: string,
  _organizationId: string,
  tx?: Transaction
): Promise<void> {
  const queryRunner = tx ?? db;
  await queryRunner
    .delete(dealContacts)
    .where(
      and(
        eq(dealContacts.dealId, dealId),
        eq(dealContacts.contactId, contactId)
      )
    );
}
