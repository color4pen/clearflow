"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/infrastructure/auth";
import { createMeeting, updateMeeting } from "@/application/usecases";
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

const createMeetingSchema = z.object({
  inquiryId: z.string().uuid("引き合いIDが不正です").optional(),
  dealId: z.string().uuid("案件IDが不正です").optional(),
  type: z.enum(["hearing", "proposal", "negotiation", "closing", "followup"]),
  date: z.string().min(1, "日時は必須です"),
  location: z.string().optional(),
  internalAttendees: z.array(z.string()).optional().default([]),
  externalAttendees: z.array(z.string()).optional().default([]),
  summary: z.string().optional(),
  actionItems: z.array(actionItemSchema).optional().default([]),
  hearingData: hearingDataSchema.optional(),
});

export type CreateMeetingState = {
  errors?: {
    inquiryId?: string[];
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

  const inquiryIdRaw = formData.get("inquiryId");
  const dealIdRaw = formData.get("dealId");

  const parsed = createMeetingSchema.safeParse({
    inquiryId: inquiryIdRaw && inquiryIdRaw !== "" ? inquiryIdRaw : undefined,
    dealId: dealIdRaw && dealIdRaw !== "" ? dealIdRaw : undefined,
    type: formData.get("type"),
    date: formData.get("date"),
    location: formData.get("location") || undefined,
    internalAttendees,
    externalAttendees,
    summary: formData.get("summary") || undefined,
    actionItems,
    hearingData,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  // inquiryId と dealId のどちらか一方は必須
  if (!parsed.data.inquiryId && !parsed.data.dealId) {
    return { message: "引き合いまたは案件のどちらかを指定してください" };
  }

  const result = await createMeeting({
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    inquiryId: parsed.data.inquiryId ?? null,
    dealId: parsed.data.dealId ?? null,
    type: parsed.data.type,
    date: new Date(parsed.data.date),
    location: parsed.data.location ?? null,
    attendees: {
      internal: parsed.data.internalAttendees,
      external: parsed.data.externalAttendees,
    },
    summary: parsed.data.summary ?? null,
    actionItems: parsed.data.actionItems,
    hearingData: parsed.data.hearingData ?? null,
  });

  if (!result.ok) {
    return { message: result.reason };
  }

  if (parsed.data.inquiryId) {
    revalidatePath(`/inquiries/${parsed.data.inquiryId}`);
    revalidatePath(`/inquiries/${parsed.data.inquiryId}/meetings`);
  }
  if (parsed.data.dealId) {
    revalidatePath(`/deals/${parsed.data.dealId}`);
  }
  return {};
}

const updateMeetingSchema = z.object({
  meetingId: z.string().uuid("商談IDが不正です"),
  inquiryId: z.string().uuid("引き合いIDが不正です"),
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
    inquiryId?: string[];
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
    inquiryId: formData.get("inquiryId"),
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
      ? {
          internal: parsed.data.internalAttendees ?? [],
          external: parsed.data.externalAttendees ?? [],
        }
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

  revalidatePath(`/inquiries/${parsed.data.inquiryId}`);
  revalidatePath(`/inquiries/${parsed.data.inquiryId}/meetings/${parsed.data.meetingId}`);
  return {};
}
