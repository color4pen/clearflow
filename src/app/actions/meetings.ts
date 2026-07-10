"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/infrastructure/auth";
import { createMeeting, updateMeeting, listClientContacts } from "@/application/usecases";
import { checkRateLimit, RATE_LIMITS } from "@/infrastructure/rateLimit";
import { canPerform } from "@/domain/authorization";

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

const createMeetingSchema = z.object({
  dealId: z.string().uuid("案件IDが不正です").optional(),
  inquiryId: z.string().uuid("引合IDが不正です").optional(),
  clientId: z.string().uuid().optional(),
  type: z.enum(["hearing", "proposal", "negotiation", "closing", "followup"]),
  date: z.string().min(1, "日時は必須です"),
  location: z.string().optional(),
  internalAttendees: z.array(z.string()).optional().default([]),
  externalContactIds: z.array(z.string().uuid("社外参加者IDが不正です")).optional().default([]),
  summary: z.string().optional(),
  actionItems: z.array(actionItemSchema).optional().default([]),
  hearingData: hearingDataSchema.optional(),
});

export type CreateMeetingState = {
  errors?: {
    dealId?: string[];
    inquiryId?: string[];
    type?: string[];
    date?: string[];
    location?: string[];
    internalAttendees?: string[];
    externalContactIds?: string[];
    summary?: string[];
    actionItems?: string[];
    hearingData?: string[];
  };
  message?: string;
  dealId?: string;
  inquiryId?: string;
};

export async function createMeetingAction(
  prevState: CreateMeetingState,
  formData: FormData
): Promise<CreateMeetingState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { message: "認証が必要です" };
  }

  if (!canPerform(session.user.role, "meeting", "create")) {
    return { message: "この操作を実行する権限がありません" };
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
  let externalContactIds: string[] = [];
  let actionItems: z.infer<typeof actionItemSchema>[] = [];
  let hearingData: z.infer<typeof hearingDataSchema> | undefined;

  const internalAttendeesRaw = formData.get("internalAttendees");
  if (internalAttendeesRaw && typeof internalAttendeesRaw === "string") {
    try {
      internalAttendees = JSON.parse(internalAttendeesRaw);
    } catch {
      return { errors: { internalAttendees: ["社内参加者の形式が不正です"] } };
    }
  }

  const externalContactIdsRaw = formData.get("externalContactIds");
  if (externalContactIdsRaw && typeof externalContactIdsRaw === "string") {
    try {
      externalContactIds = JSON.parse(externalContactIdsRaw);
    } catch {
      return { errors: { externalContactIds: ["社外参加者IDの形式が不正です"] } };
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
    externalContactIds,
    summary: formData.get("summary") || undefined,
    actionItems,
    hearingData,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  // dealId と inquiryId の両方が未指定の場合はエラー
  if (!parsed.data.dealId && !parsed.data.inquiryId) {
    return { errors: { dealId: ["案件または引合のいずれかの指定が必要です"] } };
  }

  // 社外参加者 ID が指定されている場合は clientId が必須
  if (parsed.data.externalContactIds.length > 0 && !parsed.data.clientId) {
    return { errors: { externalContactIds: ["社外参加者を追加するには顧客の設定が必要です"] } };
  }

  // 社外参加者 ID を顧客担当者マスタで解決して氏名スナップショットを取得する
  let externalAttendeeEntries: Array<{ contactId: string; name: string }> = [];
  if (parsed.data.externalContactIds.length > 0 && parsed.data.clientId) {
    const contacts = await listClientContacts(parsed.data.clientId, session.user.organizationId);
    const contactMap = new Map(contacts.map((c) => [c.id, c.name]));

    const unresolvedIds = parsed.data.externalContactIds.filter((id) => !contactMap.has(id));
    if (unresolvedIds.length > 0) {
      return { errors: { externalContactIds: ["未登録の担当者IDが含まれています"] } };
    }

    externalAttendeeEntries = parsed.data.externalContactIds.map((contactId) => ({
      contactId,
      name: contactMap.get(contactId)!,
    }));
  }

  // internal/external の参加者リストを新構造に変換する
  const attendees = [
    ...parsed.data.internalAttendees.map((name) => ({
      userId: null as string | null,
      contactId: null as string | null,
      name,
      isExternal: false,
    })),
    ...externalAttendeeEntries.map(({ contactId, name }) => ({
      userId: null as string | null,
      contactId,
      name,
      isExternal: true,
    })),
  ];

  const result = await createMeeting({
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    kind: "meeting",
    dealId: parsed.data.dealId ?? null,
    inquiryId: parsed.data.inquiryId ?? null,
    meetingType: parsed.data.type,
    date: new Date(parsed.data.date),
    location: parsed.data.location ?? null,
    attendees,
    summary: parsed.data.summary ?? null,
    actionItems: parsed.data.actionItems,
    details: parsed.data.hearingData ?? null,
  });

  if (!result.ok) {
    return { message: result.reason };
  }

  if (parsed.data.dealId) {
    revalidatePath(`/deals/${parsed.data.dealId}`);
  }
  if (parsed.data.inquiryId) {
    revalidatePath(`/inquiries/${parsed.data.inquiryId}`);
  }
  return { dealId: parsed.data.dealId, inquiryId: parsed.data.inquiryId };
}

const updateMeetingSchema = z.object({
  meetingId: z.string().uuid("商談IDが不正です"),
  type: z.enum(["hearing", "proposal", "negotiation", "closing", "followup"]).optional(),
  date: z.string().optional(),
  location: z.string().nullable().optional(),
  internalAttendees: z.array(z.string()).optional(),
  externalContactIds: z.array(z.string().uuid("社外参加者IDが不正です")).optional(),
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
    externalContactIds?: string[];
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

  if (!canPerform(session.user.role, "meeting", "edit")) {
    return { message: "この操作を実行する権限がありません" };
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
  let externalContactIds: string[] | undefined;
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

  const externalContactIdsRaw = formData.get("externalContactIds");
  if (externalContactIdsRaw && typeof externalContactIdsRaw === "string") {
    try {
      externalContactIds = JSON.parse(externalContactIdsRaw);
    } catch {
      return { errors: { externalContactIds: ["社外参加者IDの形式が不正です"] } };
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
    externalContactIds,
    summary: formData.get("summary") ?? undefined,
    actionItems,
    hearingData,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  // 社外参加者 ID が指定された場合に clientId から担当者を解決する
  let externalAttendeesList:
    | Array<{ userId: null; contactId: string; name: string; isExternal: true }>
    | undefined;

  if (parsed.data.externalContactIds !== undefined) {
    const clientIdRaw = formData.get("clientId");
    if (parsed.data.externalContactIds.length > 0) {
      if (!clientIdRaw || typeof clientIdRaw !== "string") {
        return { errors: { externalContactIds: ["社外参加者を追加するには顧客の設定が必要です"] } };
      }
      const contacts = await listClientContacts(clientIdRaw, session.user.organizationId);
      const contactMap = new Map(contacts.map((c) => [c.id, c.name]));

      const unresolvedIds = parsed.data.externalContactIds.filter((id) => !contactMap.has(id));
      if (unresolvedIds.length > 0) {
        return { errors: { externalContactIds: ["未登録の担当者IDが含まれています"] } };
      }

      externalAttendeesList = parsed.data.externalContactIds.map((contactId) => ({
        userId: null,
        contactId,
        name: contactMap.get(contactId)!,
        isExternal: true as const,
      }));
    } else {
      // 空配列 → 社外参加者をクリア
      externalAttendeesList = [];
    }
  }

  // attendees の組み立て: internalAttendees と externalContactIds を独立して部分更新
  const internalAttendeesConverted =
    internalAttendees !== undefined
      ? internalAttendees.map((name) => ({
          userId: null as string | null,
          contactId: null as string | null,
          name,
          isExternal: false as const,
        }))
      : undefined;

  const result = await updateMeeting({
    meetingId: parsed.data.meetingId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    meetingType: parsed.data.type,
    date: parsed.data.date ? new Date(parsed.data.date) : undefined,
    location: parsed.data.location,
    internalAttendees: internalAttendeesConverted,
    externalAttendees: externalAttendeesList,
    summary: parsed.data.summary,
    actionItems: parsed.data.actionItems,
    details: parsed.data.hearingData,
  });

  if (!result.ok) {
    return { message: result.reason };
  }

  // dealId がある場合は関連パスを再検証する（インライン編集で FormData に含まれる）
  const dealIdRaw = formData.get("dealId");
  if (typeof dealIdRaw === "string" && dealIdRaw) {
    revalidatePath(`/deals/${dealIdRaw}`);
    revalidatePath(`/deals/${dealIdRaw}/meetings/${parsed.data.meetingId}`);
  }

  return {};
}
