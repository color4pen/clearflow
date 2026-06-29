import { eq, and, asc, desc, sql, ilike, isNotNull } from "drizzle-orm";
import { db } from "../db";
import type { Transaction } from "../db";
import { interactions } from "../schema";
import type {
  Interaction,
  InteractionKind,
  MeetingType,
  HearingData,
  LegacyMeetingActionItem,
  MeetingAttendee,
} from "@/domain/models/interaction";

const LINK_SEARCH_LIMIT = 20;

function mapRow(row: typeof interactions.$inferSelect): Interaction {
  return {
    id: row.id,
    organizationId: row.organizationId,
    kind: row.kind as InteractionKind,
    dealId: row.dealId ?? null,
    inquiryId: row.inquiryId ?? null,
    contractId: row.contractId ?? null,
    invoiceId: row.invoiceId ?? null,
    clientId: row.clientId ?? null,
    meetingType: (row.meetingType as MeetingType | null) ?? null,
    date: row.date,
    location: row.location ?? null,
    attendees: row.attendees as MeetingAttendee[],
    summary: row.summary ?? null,
    actionItems: row.actionItems as LegacyMeetingActionItem[],
    details: row.details as HearingData | null,
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    version: row.version,
  };
}

export async function create(
  data: {
    organizationId: string;
    kind: InteractionKind;
    dealId?: string | null;
    inquiryId?: string | null;
    contractId?: string | null;
    invoiceId?: string | null;
    clientId?: string | null;
    meetingType?: MeetingType | null;
    date: Date;
    location?: string | null;
    attendees: MeetingAttendee[];
    summary?: string | null;
    actionItems: LegacyMeetingActionItem[];
    details?: HearingData | null;
    createdById: string;
  },
  tx?: Transaction
): Promise<Interaction> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .insert(interactions)
    .values({
      organizationId: data.organizationId,
      kind: data.kind,
      dealId: data.dealId ?? null,
      inquiryId: data.inquiryId ?? null,
      contractId: data.contractId ?? null,
      invoiceId: data.invoiceId ?? null,
      clientId: data.clientId ?? null,
      meetingType: data.meetingType ?? null,
      date: data.date,
      location: data.location ?? null,
      attendees: data.attendees,
      summary: data.summary ?? null,
      actionItems: data.actionItems,
      details: data.details ?? null,
      createdById: data.createdById,
    })
    .returning();
  return mapRow(result[0]);
}

export async function findById(
  id: string,
  organizationId: string,
  tx?: Transaction
): Promise<Interaction | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .select()
    .from(interactions)
    .where(and(eq(interactions.id, id), eq(interactions.organizationId, organizationId)))
    .limit(1);
  return result[0] ? mapRow(result[0]) : null;
}

/**
 * 指定案件に直接紐づく顧客接点を取得する。organizationId でテナント分離。
 */
export async function findAllByDeal(
  dealId: string,
  organizationId: string
): Promise<Interaction[]> {
  const result = await db
    .select()
    .from(interactions)
    .where(and(eq(interactions.dealId, dealId), eq(interactions.organizationId, organizationId)))
    .orderBy(asc(interactions.date));
  return result.map(mapRow);
}

export async function findAllByOrganization(
  organizationId: string
): Promise<Interaction[]> {
  const result = await db
    .select()
    .from(interactions)
    .where(eq(interactions.organizationId, organizationId))
    .orderBy(desc(interactions.date));
  return result.map(mapRow);
}

export async function update(
  id: string,
  organizationId: string,
  data: Partial<{
    kind: InteractionKind;
    meetingType: MeetingType | null;
    date: Date;
    location: string | null;
    attendees: MeetingAttendee[];
    summary: string | null;
    actionItems: LegacyMeetingActionItem[];
    details: HearingData | null;
    contractId: string | null;
    invoiceId: string | null;
    clientId: string | null;
  }>,
  expectedVersion: number,
  tx?: Transaction
): Promise<Interaction | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .update(interactions)
    .set({ ...data, updatedAt: new Date(), version: sql`version + 1` })
    .where(
      and(
        eq(interactions.id, id),
        eq(interactions.organizationId, organizationId),
        eq(interactions.version, expectedVersion)
      )
    )
    .returning();
  return result[0] ? mapRow(result[0]) : null;
}

export async function searchBySummary(
  organizationId: string,
  query: string
): Promise<Interaction[]> {
  const result = await db
    .select()
    .from(interactions)
    .where(
      and(
        eq(interactions.organizationId, organizationId),
        isNotNull(interactions.summary),
        ilike(interactions.summary, `%${query}%`)
      )
    )
    .orderBy(desc(interactions.date))
    .limit(LINK_SEARCH_LIMIT);
  return result.map(mapRow);
}

/**
 * 指定引合に直接紐づく顧客接点を取得する。organizationId でテナント分離。
 */
export async function findAllByInquiry(
  inquiryId: string,
  organizationId: string
): Promise<Interaction[]> {
  const result = await db
    .select()
    .from(interactions)
    .where(
      and(eq(interactions.inquiryId, inquiryId), eq(interactions.organizationId, organizationId))
    )
    .orderBy(asc(interactions.date));
  return result.map(mapRow);
}

/**
 * 指定契約に直接紐づく顧客接点を取得する。organizationId でテナント分離。
 * 新しい順（date DESC）で返す。
 */
export async function findAllByContract(
  contractId: string,
  organizationId: string
): Promise<Interaction[]> {
  const result = await db
    .select()
    .from(interactions)
    .where(
      and(eq(interactions.contractId, contractId), eq(interactions.organizationId, organizationId))
    )
    .orderBy(desc(interactions.date));
  return result.map(mapRow);
}

/**
 * 指定請求に直接紐づく顧客接点を取得する。organizationId でテナント分離。
 * 新しい順（date DESC）で返す。
 */
export async function findAllByInvoice(
  invoiceId: string,
  organizationId: string
): Promise<Interaction[]> {
  const result = await db
    .select()
    .from(interactions)
    .where(
      and(eq(interactions.invoiceId, invoiceId), eq(interactions.organizationId, organizationId))
    )
    .orderBy(desc(interactions.date));
  return result.map(mapRow);
}
