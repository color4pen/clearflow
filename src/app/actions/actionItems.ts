"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/infrastructure/auth";
import {
  createActionItem,
  toggleActionItemDone,
  updateActionItem,
  deleteActionItem,
  searchDeals,
  searchInquiries,
  searchMeetings,
} from "@/application/usecases";
import { actionItemRepository } from "@/infrastructure/repositories";
import { meetingRepository } from "@/infrastructure/repositories";
import { checkRateLimit, RATE_LIMITS } from "@/infrastructure/rateLimit";
import { canPerform } from "@/domain/authorization";

const createActionItemSchema = z.object({
  description: z.string().min(1, "説明は必須です"),
  assigneeId: z.string().uuid("担当者IDが不正です").optional(),
  dueDate: z.string().optional(),
  meetingId: z.string().uuid("商談IDが不正です").optional(),
  dealId: z.string().uuid("案件IDが不正です").optional(),
  inquiryId: z.string().uuid("引合IDが不正です").optional(),
});

export type CreateActionItemState = {
  errors?: {
    description?: string[];
    assigneeId?: string[];
    dueDate?: string[];
    meetingId?: string[];
    dealId?: string[];
    inquiryId?: string[];
  };
  message?: string;
};

export async function createActionItemAction(
  data: unknown
): Promise<CreateActionItemState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { message: "認証が必要です" };
  }

  if (!canPerform(session.user.role, "actionItem", "create")) {
    return { message: "この操作を実行する権限がありません" };
  }

  const rateCheck = await checkRateLimit({
    key: `createActionItem:${session.user.id}`,
    limit: RATE_LIMITS.createRequest.limit,
    windowMs: RATE_LIMITS.createRequest.windowMs,
  });
  if (!rateCheck.allowed) {
    return { message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" };
  }

  const parsed = createActionItemSchema.safeParse(data);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const result = await createActionItem({
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    description: parsed.data.description,
    assigneeId: parsed.data.assigneeId ?? null,
    dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    meetingId: parsed.data.meetingId ?? null,
    dealId: parsed.data.dealId ?? null,
    inquiryId: parsed.data.inquiryId ?? null,
  });

  if (!result.ok) {
    return { message: result.reason };
  }

  revalidatePath("/dashboard");
  revalidatePath("/tasks");

  if (parsed.data.dealId) {
    revalidatePath(`/deals/${parsed.data.dealId}`);
  }

  if (parsed.data.meetingId) {
    // 商談から dealId を取得して meeting ページも再検証する
    const meeting = await meetingRepository.findById(
      parsed.data.meetingId,
      session.user.organizationId
    );
    if (meeting?.dealId) {
      revalidatePath(`/deals/${meeting.dealId}/meetings/${parsed.data.meetingId}`);
    }
  }

  return {};
}

const toggleActionItemSchema = z.object({
  id: z.string().uuid("アクションアイテムIDが不正です"),
});

export type ToggleActionItemState = {
  errors?: {
    id?: string[];
  };
  message?: string;
};

export async function toggleActionItemAction(
  data: unknown
): Promise<ToggleActionItemState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { message: "認証が必要です" };
  }

  if (!canPerform(session.user.role, "actionItem", "toggle")) {
    return { message: "この操作を実行する権限がありません" };
  }

  const parsed = toggleActionItemSchema.safeParse(data);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  // 紐づけ先を取得しておく（revalidatePath 用）
  const existing = await actionItemRepository.findById(
    parsed.data.id,
    session.user.organizationId
  );

  const result = await toggleActionItemDone({
    id: parsed.data.id,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
  });

  if (!result.ok) {
    return { message: result.reason };
  }

  revalidatePath("/dashboard");
  revalidatePath("/tasks");

  if (existing?.dealId) {
    revalidatePath(`/deals/${existing.dealId}`);
  }

  if (existing?.meetingId) {
    const meeting = await meetingRepository.findById(
      existing.meetingId,
      session.user.organizationId
    );
    if (meeting?.dealId) {
      revalidatePath(`/deals/${meeting.dealId}/meetings/${existing.meetingId}`);
    }
  }

  return {};
}

const updateActionItemSchema = z.object({
  id: z.string().uuid("アクションアイテムIDが不正です"),
  description: z.string().min(1, "説明は必須です").optional(),
  assigneeId: z.string().uuid("担当者IDが不正です").nullable().optional(),
  dueDate: z.string().nullable().optional(),
  meetingId: z.string().uuid("商談IDが不正です").nullable().optional(),
  dealId: z.string().uuid("案件IDが不正です").nullable().optional(),
  inquiryId: z.string().uuid("引合IDが不正です").nullable().optional(),
});

export type UpdateActionItemState = {
  errors?: {
    id?: string[];
    description?: string[];
    assigneeId?: string[];
    dueDate?: string[];
    meetingId?: string[];
    dealId?: string[];
    inquiryId?: string[];
  };
  message?: string;
};

export async function updateActionItemAction(
  data: unknown
): Promise<UpdateActionItemState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { message: "認証が必要です" };
  }

  if (!canPerform(session.user.role, "actionItem", "edit")) {
    return { message: "この操作を実行する権限がありません" };
  }

  const parsed = updateActionItemSchema.safeParse(data);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const result = await updateActionItem({
    id: parsed.data.id,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    description: parsed.data.description,
    assigneeId: parsed.data.assigneeId,
    dueDate: parsed.data.dueDate !== undefined
      ? (parsed.data.dueDate ? new Date(parsed.data.dueDate) : null)
      : undefined,
    meetingId: parsed.data.meetingId,
    dealId: parsed.data.dealId,
    inquiryId: parsed.data.inquiryId,
  });

  if (!result.ok) {
    return { message: result.reason };
  }

  revalidatePath("/dashboard");
  revalidatePath("/tasks");

  const updatedItem = result.actionItem;

  if (updatedItem.dealId) {
    revalidatePath(`/deals/${updatedItem.dealId}`);
  }

  if (updatedItem.meetingId) {
    const meeting = await meetingRepository.findById(
      updatedItem.meetingId,
      session.user.organizationId
    );
    if (meeting?.dealId) {
      revalidatePath(`/deals/${meeting.dealId}/meetings/${updatedItem.meetingId}`);
    }
  }

  return {};
}

const deleteActionItemSchema = z.object({
  id: z.string().uuid("アクションアイテムIDが不正です"),
});

export type DeleteActionItemState = {
  errors?: {
    id?: string[];
  };
  message?: string;
};

export async function deleteActionItemAction(
  data: unknown
): Promise<DeleteActionItemState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { message: "認証が必要です" };
  }

  if (!canPerform(session.user.role, "actionItem", "delete")) {
    return { message: "この操作を実行する権限がありません" };
  }

  const parsed = deleteActionItemSchema.safeParse(data);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  // 削除前に紐づけ先を記録する
  const existing = await actionItemRepository.findById(
    parsed.data.id,
    session.user.organizationId
  );

  const result = await deleteActionItem({
    id: parsed.data.id,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
  });

  if (!result.ok) {
    return { message: result.reason };
  }

  revalidatePath("/dashboard");
  revalidatePath("/tasks");

  if (existing?.dealId) {
    revalidatePath(`/deals/${existing.dealId}`);
  }

  if (existing?.meetingId) {
    const meeting = await meetingRepository.findById(
      existing.meetingId,
      session.user.organizationId
    );
    if (meeting?.dealId) {
      revalidatePath(`/deals/${meeting.dealId}/meetings/${existing.meetingId}`);
    }
  }

  return {};
}

const searchLinkTargetsSchema = z.object({
  type: z.enum(["deal", "inquiry", "meeting"]),
  query: z.string(),
});

export async function searchLinkTargetsAction(
  data: unknown
): Promise<{ data?: { id: string; label: string }[]; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { message: "認証が必要です" };
  }

  if (!canPerform(session.user.role, "actionItem", "create")) {
    return { message: "この操作を実行する権限がありません" };
  }

  const rateCheck = await checkRateLimit({
    key: `searchLinkTargets:${session.user.id}`,
    limit: RATE_LIMITS.createRequest.limit,
    windowMs: RATE_LIMITS.createRequest.windowMs,
  });
  if (!rateCheck.allowed) {
    return { message: "リクエストが多すぎます。しばらく待ってから再試行してください。" };
  }

  const parsed = searchLinkTargetsSchema.safeParse(data);
  if (!parsed.success) {
    return { message: "入力データが不正です" };
  }

  const { type, query } = parsed.data;
  const organizationId = session.user.organizationId;

  let results: { id: string; label: string }[];

  if (type === "deal") {
    results = await searchDeals(organizationId, query);
  } else if (type === "inquiry") {
    results = await searchInquiries(organizationId, query);
  } else {
    results = await searchMeetings(organizationId, query);
  }

  return { data: results };
}
