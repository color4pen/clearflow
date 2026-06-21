import { eq, and, asc, desc, or, inArray } from "drizzle-orm";
import { db } from "../db";
import type { Transaction } from "../db";
import { meetings, deals } from "../schema";
import type { Meeting, MeetingType, HearingData, ActionItem, MeetingAttendees } from "@/domain/models/meeting";

function mapRow(row: typeof meetings.$inferSelect): Meeting {
  return {
    id: row.id,
    organizationId: row.organizationId,
    inquiryId: row.inquiryId ?? null,
    dealId: row.dealId ?? null,
    type: row.type as MeetingType,
    date: row.date,
    location: row.location ?? null,
    attendees: row.attendees as MeetingAttendees,
    summary: row.summary ?? null,
    actionItems: row.actionItems as ActionItem[],
    hearingData: row.hearingData as HearingData | null,
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function create(
  data: {
    organizationId: string;
    inquiryId?: string | null;
    dealId?: string | null;
    type: MeetingType;
    date: Date;
    location?: string | null;
    attendees: MeetingAttendees;
    summary?: string | null;
    actionItems: ActionItem[];
    hearingData?: HearingData | null;
    createdById: string;
  },
  tx?: Transaction
): Promise<Meeting> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .insert(meetings)
    .values({
      organizationId: data.organizationId,
      inquiryId: data.inquiryId ?? null,
      dealId: data.dealId ?? null,
      type: data.type,
      date: data.date,
      location: data.location ?? null,
      attendees: data.attendees,
      summary: data.summary ?? null,
      actionItems: data.actionItems,
      hearingData: data.hearingData ?? null,
      createdById: data.createdById,
    })
    .returning();
  return mapRow(result[0]);
}

export async function findById(
  id: string,
  organizationId: string,
  tx?: Transaction
): Promise<Meeting | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, id), eq(meetings.organizationId, organizationId)))
    .limit(1);
  return result[0] ? mapRow(result[0]) : null;
}

export async function findAllByInquiry(
  inquiryId: string,
  organizationId: string
): Promise<Meeting[]> {
  const result = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.inquiryId, inquiryId), eq(meetings.organizationId, organizationId)))
    .orderBy(asc(meetings.date));
  return result.map(mapRow);
}

/**
 * 指定案件に直接紐づく商談を取得する。organizationId でテナント分離。
 */
export async function findAllByDeal(
  dealId: string,
  organizationId: string
): Promise<Meeting[]> {
  const result = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.dealId, dealId), eq(meetings.organizationId, organizationId)))
    .orderBy(asc(meetings.date));
  return result.map(mapRow);
}

/**
 * 引き合いに直接紐づく商談 + 引き合いから生まれた案件に紐づく商談を統合取得する。
 * organizationId でテナント分離。
 */
export async function findAllByInquiryOrDeal(
  inquiryId: string,
  organizationId: string
): Promise<Meeting[]> {
  const dealSubquery = db
    .select({ id: deals.id })
    .from(deals)
    .where(eq(deals.inquiryId, inquiryId));

  const result = await db
    .select()
    .from(meetings)
    .where(
      and(
        eq(meetings.organizationId, organizationId),
        or(
          eq(meetings.inquiryId, inquiryId),
          inArray(meetings.dealId, dealSubquery)
        )
      )
    )
    .orderBy(asc(meetings.date));
  return result.map(mapRow);
}

export async function findAllByOrganization(
  organizationId: string
): Promise<Meeting[]> {
  const result = await db
    .select()
    .from(meetings)
    .where(eq(meetings.organizationId, organizationId))
    .orderBy(desc(meetings.date));
  return result.map(mapRow);
}

export async function update(
  id: string,
  organizationId: string,
  data: Partial<{
    type: MeetingType;
    date: Date;
    location: string | null;
    attendees: MeetingAttendees;
    summary: string | null;
    actionItems: ActionItem[];
    hearingData: HearingData | null;
  }>,
  tx?: Transaction
): Promise<Meeting | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .update(meetings)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(meetings.id, id), eq(meetings.organizationId, organizationId)))
    .returning();
  return result[0] ? mapRow(result[0]) : null;
}
