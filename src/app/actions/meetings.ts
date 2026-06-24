"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/infrastructure/auth";
import { createMeeting, updateMeeting, createClientContact } from "@/application/usecases";
import { checkRateLimit, RATE_LIMITS } from "@/infrastructure/rateLimit";

const hearingDataSchema = z.object({
  challenge: z.string().nullable().default(null),
  budget: z.string().nullable().default(null),
  decisionMaker: z.string().nullable().default(null),
  timeline: z.string().nullable().default(null),
  competitors: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
});

const actionItemSchema = z.object({
  description: z.string(),
  assignee: z.string(),
  dueDate: z.string().nullable(),
  done: z.boolean(),
});

const contactRegistrationSchema = z.object({
  name: z.string(),
  register: z.boolean(),
});

const createMeetingSchema = z.object({
  dealId: z.string().uuid("案件IDが不正です").optional(),
  inquiryId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  type: z.enum(["hearing", "proposal", "negotiation", "closing", "followup"]),
  date: z.string().min(1, "日時は必須です"),
  location: z.string().optional(),
  internalAttendees: z.array(z.string()).optional().default([]),
  externalAttendees: z.array(z.string()).optional().default([]),
  summary: z.string().optional(),
  actionItems: z.array(actionItemSchema).optional().default([]),
  hearingData: hearingDataSchema.optional(),
  contactRegistrations: z.array(contactRegistrationSchema).optional().default([]),
}).refine(
  (data) => data.dealId || data.inquiryId,
  { message: "案件または引き合いの指定が必要です", path: ["dealId"] }
);

export type CreateMeetingState = {
  errors?: {
    dealId?: string[];
    type?: string[];
    date?: string[];
    location?: string[];
    internalAttendees?: string[];
    externalAttendees?: string[];
    summary?: string[];
    actionItems?: string[];
    hearingData?: string[];
  };
  message?: string;
  dealId?: string;
};

export async function createMeetingAction(
  prevState: CreateMeetingState,
  formData: FormData
): Promise<CreateMeetingState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { message: "認証が必要です" };
  }

  const rateCheck = await checkRateLimit({
    key: `createMeeting:${session.user.id}`,
    limit: RATE_LIMITS.createRequest.limit,
    windowMs: RATE_LIMITS.createRequest.windowMs,
  });
  if (!rateCheck.allowed) {
    return { message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" };
  }

  // 動的フィールドの JSON パース
  let internalAttendees: string[] = [];
  let externalAttendees: string[] = [];
  let actionItems: z.infer<typeof actionItemSchema>[] = [];
  let hearingData: z.infer<typeof hearingDataSchema> | undefined;
  let contactRegistrations: z.infer<typeof contactRegistrationSchema>[] = [];

  const internalAttendeesRaw = formData.get("internalAttendees");
  if (internalAttendeesRaw && typeof internalAttendeesRaw === "string") {
    try {
      internalAttendees = JSON.parse(internalAttendeesRaw);
    } catch {
      return { errors: { internalAttendees: ["社内参加者の形式が不正です"] } };
    }
  }

  const externalAttendeesRaw = formData.get("externalAttendees");
  if (externalAttendeesRaw && typeof externalAttendeesRaw === "string") {
    try {
      externalAttendees = JSON.parse(externalAttendeesRaw);
    } catch {
      return { errors: { externalAttendees: ["社外参加者の形式が不正です"] } };
    }
  }

  const actionItemsRaw = formData.get("actionItems");
  if (actionItemsRaw && typeof actionItemsRaw === "string") {
    try {
      actionItems = JSON.parse(actionItemsRaw);
    } catch {
      return { errors: { actionItems: ["アクションアイテムの形式が不正です"] } };
    }
  }

  const hearingDataRaw = formData.get("hearingData");
  if (hearingDataRaw && typeof hearingDataRaw === "string") {
    try {
      hearingData = JSON.parse(hearingDataRaw);
    } catch {
      return { errors: { hearingData: ["ヒアリングデータの形式が不正です"] } };
    }
  }

  const contactRegistrationsRaw = formData.get("contactRegistrations");
  if (contactRegistrationsRaw && typeof contactRegistrationsRaw === "string") {
    try {
      contactRegistrations = JSON.parse(contactRegistrationsRaw);
    } catch {
      // contactRegistrations のパース失敗は best-effort なので無視する
    }
  }

  const dealIdRaw = formData.get("dealId");
  const inquiryIdRaw = formData.get("inquiryId");
  const clientIdRaw = formData.get("clientId");

  const parsed = createMeetingSchema.safeParse({
    dealId: dealIdRaw && dealIdRaw !== "" ? dealIdRaw : undefined,
    inquiryId: inquiryIdRaw && inquiryIdRaw !== "" ? inquiryIdRaw : undefined,
    clientId: clientIdRaw && clientIdRaw !== "" ? clientIdRaw : undefined,
    type: formData.get("type"),
    date: formData.get("date"),
    location: formData.get("location") || undefined,
    internalAttendees,
    externalAttendees,
    summary: formData.get("summary") || undefined,
    actionItems,
    hearingData,
    contactRegistrations,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const result = await createMeeting({
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    dealId: parsed.data.dealId ?? null,
    inquiryId: parsed.data.inquiryId ?? null,
    type: parsed.data.type,
    date: new Date(parsed.data.date),
    location: parsed.data.location ?? null,
    attendees: [
      ...parsed.data.internalAttendees.map((name) => ({
        userId: null,
        contactId: null,
        name,
        isExternal: false,
      })),
      ...parsed.data.externalAttendees.map((name) => ({
        userId: null,
        contactId: null,
        name,
        isExternal: true,
      })),
    ],
    summary: parsed.data.summary ?? null,
    actionItems: parsed.data.actionItems,
    hearingData: parsed.data.hearingData ?? null,
  });

  if (!result.ok) {
    return { message: result.reason };
  }

  // チェックされた外部参加者を顧客担当者として登録する（best-effort）
  if (parsed.data.clientId && parsed.data.contactRegistrations.length > 0) {
    for (const entry of parsed.data.contactRegistrations) {
      if (entry.register && entry.name.trim()) {
        await createClientContact({
          clientId: parsed.data.clientId,
          name: entry.name.trim(),
          organizationId: session.user.organizationId,
          actorId: session.user.id,
        });
      }
    }
  }

  if (parsed.data.dealId) {
    revalidatePath(`/deals/${parsed.data.dealId}`);
  }
  return { dealId: parsed.data.dealId };
}

const updateMeetingSchema = z.object({
  meetingId: z.string().uuid("商談IDが不正です"),
  type: z.enum(["hearing", "proposal", "negotiation", "closing", "followup"]).optional(),
  date: z.string().optional(),
  location: z.string().nullable().optional(),
  internalAttendees: z.array(z.string()).optional(),
  externalAttendees: z.array(z.string()).optional(),
  summary: z.string().nullable().optional(),
  actionItems: z.array(actionItemSchema).optional(),
  hearingData: hearingDataSchema.nullable().optional(),
});

export type UpdateMeetingState = {
  errors?: {
    meetingId?: string[];
    type?: string[];
    date?: string[];
    location?: string[];
    internalAttendees?: string[];
    externalAttendees?: string[];
    summary?: string[];
    actionItems?: string[];
    hearingData?: string[];
  };
  message?: string;
};

export async function updateMeetingAction(
  prevState: UpdateMeetingState,
  formData: FormData
): Promise<UpdateMeetingState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { message: "認証が必要です" };
  }

  if (session.user.role !== "admin" && session.user.role !== "manager") {
    return { message: "権限がありません" };
  }

  const rateCheck = await checkRateLimit({
    key: `updateMeeting:${session.user.id}`,
    limit: RATE_LIMITS.createRequest.limit,
    windowMs: RATE_LIMITS.createRequest.windowMs,
  });
  if (!rateCheck.allowed) {
    return { message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" };
  }

  let internalAttendees: string[] | undefined;
  let externalAttendees: string[] | undefined;
  let actionItems: z.infer<typeof actionItemSchema>[] | undefined;
  let hearingData: z.infer<typeof hearingDataSchema> | null | undefined;

  const internalAttendeesRaw = formData.get("internalAttendees");
  if (internalAttendeesRaw && typeof internalAttendeesRaw === "string") {
    try {
      internalAttendees = JSON.parse(internalAttendeesRaw);
    } catch {
      return { errors: { internalAttendees: ["社内参加者の形式が不正です"] } };
    }
  }

  const externalAttendeesRaw = formData.get("externalAttendees");
  if (externalAttendeesRaw && typeof externalAttendeesRaw === "string") {
    try {
      externalAttendees = JSON.parse(externalAttendeesRaw);
    } catch {
      return { errors: { externalAttendees: ["社外参加者の形式が不正です"] } };
    }
  }

  const actionItemsRaw = formData.get("actionItems");
  if (actionItemsRaw && typeof actionItemsRaw === "string") {
    try {
      actionItems = JSON.parse(actionItemsRaw);
    } catch {
      return { errors: { actionItems: ["アクションアイテムの形式が不正です"] } };
    }
  }

  const hearingDataRaw = formData.get("hearingData");
  if (hearingDataRaw && typeof hearingDataRaw === "string") {
    try {
      hearingData = hearingDataRaw === "null" ? null : JSON.parse(hearingDataRaw);
    } catch {
      return { errors: { hearingData: ["ヒアリングデータの形式が不正です"] } };
    }
  }

  const parsed = updateMeetingSchema.safeParse({
    meetingId: formData.get("meetingId"),
    type: formData.get("type") || undefined,
    date: formData.get("date") || undefined,
    location: formData.get("location") ?? undefined,
    internalAttendees,
    externalAttendees,
    summary: formData.get("summary") ?? undefined,
    actionItems,
    hearingData,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const attendees =
    internalAttendees !== undefined || externalAttendees !== undefined
      ? [
          ...(parsed.data.internalAttendees ?? []).map((name) => ({
            userId: null,
            contactId: null,
            name,
            isExternal: false,
          })),
          ...(parsed.data.externalAttendees ?? []).map((name) => ({
            userId: null,
            contactId: null,
            name,
            isExternal: true,
          })),
        ]
      : undefined;

  const result = await updateMeeting({
    meetingId: parsed.data.meetingId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    type: parsed.data.type,
    date: parsed.data.date ? new Date(parsed.data.date) : undefined,
    location: parsed.data.location,
    attendees,
    summary: parsed.data.summary,
    actionItems: parsed.data.actionItems,
    hearingData: parsed.data.hearingData,
  });

  if (!result.ok) {
    return { message: result.reason };
  }

  const clientIdRaw = formData.get("clientId");
  const registerContactsRaw = formData.get("registerContacts");
  if (clientIdRaw && typeof clientIdRaw === "string" && registerContactsRaw && typeof registerContactsRaw === "string") {
    try {
      const contacts = JSON.parse(registerContactsRaw) as Array<{ name: string; register: boolean }>;
      for (const entry of contacts) {
        if (entry.register && entry.name.trim()) {
          await createClientContact({
            clientId: clientIdRaw,
            name: entry.name.trim(),
            organizationId: session.user.organizationId,
            actorId: session.user.id,
          });
        }
      }
    } catch {
      // best-effort
    }
  }

  // dealId がある場合は関連パスを再検証する（インライン編集で FormData に含まれる）
  const dealIdRaw = formData.get("dealId");
  if (typeof dealIdRaw === "string" && dealIdRaw) {
    revalidatePath(`/deals/${dealIdRaw}`);
    revalidatePath(`/deals/${dealIdRaw}/meetings/${parsed.data.meetingId}`);
  }

  return {};
}
