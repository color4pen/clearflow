import { eq, and, inArray } from "drizzle-orm";
import { db } from "../db";
import type { Transaction } from "../db";
import { dealContacts, clientContacts, clients, deals } from "../schema";
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
 * clientContacts → clients.organizationId を経由してテナント分離を保証する。
 */
export async function findByDeal(
  dealId: string,
  organizationId: string
): Promise<DealContact[]> {
  const rows = await db
    .select({ dealContact: dealContacts })
    .from(dealContacts)
    .innerJoin(clientContacts, eq(dealContacts.contactId, clientContacts.id))
    .innerJoin(clients, eq(clientContacts.clientId, clients.id))
    .where(
      and(
        eq(dealContacts.dealId, dealId),
        eq(clients.organizationId, organizationId)
      )
    );
  return rows.map((r) => mapRow(r.dealContact));
}

/**
 * 指定案件の担当者関連を削除する。
 * deals.organizationId を経由してテナント分離を保証する（Drizzle の delete は JOIN 非対応のため select→delete の2ステップ）。
 */
export async function deleteByDealAndContact(
  dealId: string,
  contactId: string,
  organizationId: string,
  tx?: Transaction
): Promise<void> {
  const queryRunner = tx ?? db;

  // テナント検証: 対象レコードが organizationId に属する deal かを確認する
  const targets = await queryRunner
    .select({ id: dealContacts.id })
    .from(dealContacts)
    .innerJoin(deals, eq(dealContacts.dealId, deals.id))
    .where(
      and(
        eq(dealContacts.dealId, dealId),
        eq(dealContacts.contactId, contactId),
        eq(deals.organizationId, organizationId)
      )
    );

  if (targets.length === 0) return;

  await queryRunner
    .delete(dealContacts)
    .where(inArray(dealContacts.id, targets.map((r) => r.id)));
}
