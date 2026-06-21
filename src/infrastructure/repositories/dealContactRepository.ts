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

/**
 * 案件担当者を作成する。
 * deals.organizationId と clientContacts → clients.organizationId の両方を事前確認してテナント分離を保証する。
 */
export async function create(
  data: {
    dealId: string;
    contactId: string;
    role: DealContactRole;
    organizationId: string;
  },
  tx?: Transaction
): Promise<DealContact> {
  const queryRunner = tx ?? db;

  // テナント検証: dealId が organizationId に属するかを確認する
  const owningDeal = await queryRunner
    .select({ id: deals.id })
    .from(deals)
    .where(and(eq(deals.id, data.dealId), eq(deals.organizationId, data.organizationId)))
    .limit(1);

  if (owningDeal.length === 0) {
    throw new Error("指定された案件が見つからないか、アクセス権限がありません");
  }

  // テナント検証: contactId が同一組織の担当者であるかを確認する
  const owningContact = await queryRunner
    .select({ id: clientContacts.id })
    .from(clientContacts)
    .innerJoin(clients, eq(clientContacts.clientId, clients.id))
    .where(
      and(
        eq(clientContacts.id, data.contactId),
        eq(clients.organizationId, data.organizationId)
      )
    )
    .limit(1);

  if (owningContact.length === 0) {
    throw new Error("指定された担当者が見つからないか、アクセス権限がありません");
  }

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
