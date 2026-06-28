"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/infrastructure/auth";
import { createClient, listClients, createClientContact, deleteClientContact } from "@/application/usecases";
import { validatePrimaryUniqueness } from "@/application/services/clientContactService";
import { checkRateLimit, RATE_LIMITS } from "@/infrastructure/rateLimit";
import { canPerform } from "@/domain/authorization";
import type { Client } from "@/domain/models/client";

const contactSchema = z.object({
  name: z.string().min(1, "担当者名は必須です"),
  department: z.string().optional(),
  position: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

const createClientSchema = z.object({
  name: z.string().min(1, "顧客名は必須です"),
  industry: z.string().optional(),
  size: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  contacts: z.array(contactSchema).optional(),
});

export type CreateClientState = {
  errors?: {
    name?: string[];
    industry?: string[];
    size?: string[];
    address?: string[];
    notes?: string[];
    contacts?: string[];
  };
  message?: string;
};

export async function createClientAction(
  prevState: CreateClientState,
  formData: FormData
): Promise<CreateClientState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { message: "認証が必要です" };
  }

  if (!canPerform(session.user.role, "client", "create")) {
    return { message: "この操作を実行する権限がありません" };
  }

  const rateCheck = await checkRateLimit({
    key: `createClient:${session.user.id}`,
    limit: RATE_LIMITS.createRequest.limit,
    windowMs: RATE_LIMITS.createRequest.windowMs,
  });
  if (!rateCheck.allowed) {
    return { message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" };
  }

  // contacts は JSON 文字列として受け取る
  let contacts: z.infer<typeof contactSchema>[] | undefined;
  const contactsRaw = formData.get("contacts");
  if (contactsRaw && typeof contactsRaw === "string") {
    try {
      contacts = JSON.parse(contactsRaw);
    } catch {
      return { errors: { contacts: ["担当者情報が不正です"] } };
    }
  }

  const parsed = createClientSchema.safeParse({
    name: formData.get("name"),
    industry: formData.get("industry") || undefined,
    size: formData.get("size") || undefined,
    address: formData.get("address") || undefined,
    notes: formData.get("notes") || undefined,
    contacts,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const result = await createClient({
    name: parsed.data.name,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    industry: parsed.data.industry ?? null,
    size: parsed.data.size ?? null,
    address: parsed.data.address ?? null,
    notes: parsed.data.notes ?? null,
    contacts: parsed.data.contacts,
  });

  if (!result.ok) {
    return { message: result.reason };
  }

  revalidatePath("/clients");
  return {};
}

const updateClientSchema = z.object({
  name: z.string().min(1, "顧客名は必須です"),
  industry: z.string().optional(),
  size: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export type UpdateClientState = {
  errors?: {
    name?: string[];
    industry?: string[];
    size?: string[];
    address?: string[];
    notes?: string[];
  };
  message?: string;
  success?: boolean;
};

export async function updateClientAction(
  clientId: string,
  _prevState: UpdateClientState,
  formData: FormData
): Promise<UpdateClientState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { message: "認証が必要です" };
  }

  if (!canPerform(session.user.role, "client", "edit")) {
    return { message: "この操作を実行する権限がありません" };
  }

  const parsed = updateClientSchema.safeParse({
    name: formData.get("name"),
    industry: formData.get("industry") || undefined,
    size: formData.get("size") || undefined,
    address: formData.get("address") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { clientRepository } = await import("@/infrastructure/repositories");
  const updated = await clientRepository.update(
    clientId,
    session.user.organizationId,
    {
      name: parsed.data.name,
      industry: parsed.data.industry ?? null,
      size: parsed.data.size ?? null,
      address: parsed.data.address ?? null,
      notes: parsed.data.notes ?? null,
    }
  );

  if (!updated) {
    return { message: "顧客が見つかりません" };
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}

export async function listClientsAction(): Promise<{
  success: boolean;
  clients?: Client[];
  message?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  const clients = await listClients(session.user.organizationId);
  return { success: true, clients };
}

export type ContactActionResult = { success: boolean; message?: string };

const addContactSchema = z.object({
  name: z.string().min(1, "担当者名は必須です"),
  department: z.string().optional(),
  position: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

export async function addClientContactAction(
  clientId: string,
  formData: FormData
): Promise<ContactActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  if (!canPerform(session.user.role, "client", "addContact")) {
    return { success: false, message: "この操作を実行する権限がありません" };
  }

  const parsed = addContactSchema.safeParse({
    name: formData.get("name"),
    department: formData.get("department") || undefined,
    position: formData.get("position") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    isPrimary: formData.get("isPrimary") === "on",
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { success: false, message: firstError?.message ?? "入力が不正です" };
  }

  const result = await createClientContact({
    clientId,
    name: parsed.data.name,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    department: parsed.data.department ?? null,
    position: parsed.data.position ?? null,
    email: parsed.data.email ?? null,
    phone: parsed.data.phone ?? null,
    isPrimary: parsed.data.isPrimary ?? false,
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}

const updateContactSchema = z.object({
  name: z.string().min(1, "担当者名は必須です"),
  department: z.string().optional(),
  position: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

export async function updateClientContactAction(
  clientId: string,
  contactId: string,
  formData: FormData
): Promise<ContactActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  if (!canPerform(session.user.role, "client", "editContact")) {
    return { success: false, message: "この操作を実行する権限がありません" };
  }

  const { clientRepository } = await import("@/infrastructure/repositories");

  const client = await clientRepository.findById(clientId, session.user.organizationId);
  if (!client) {
    return { success: false, message: "顧客が見つかりません" };
  }

  const parsed = updateContactSchema.safeParse({
    name: formData.get("name"),
    department: formData.get("department") || undefined,
    position: formData.get("position") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    isPrimary: formData.get("isPrimary") === "on",
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { success: false, message: firstError?.message ?? "入力が不正です" };
  }

  const isPrimary = parsed.data.isPrimary ?? false;
  const primaryValidation = await validatePrimaryUniqueness(clientId, session.user.organizationId, contactId, isPrimary);
  if (!primaryValidation.ok) {
    return { success: false, message: primaryValidation.reason };
  }

  const updated = await clientRepository.updateContact(contactId, clientId, session.user.organizationId, {
    name: parsed.data.name,
    department: parsed.data.department ?? null,
    position: parsed.data.position ?? null,
    email: parsed.data.email ?? null,
    phone: parsed.data.phone ?? null,
    isPrimary,
  });

  if (!updated) {
    return { success: false, message: "担当者が見つかりません" };
  }

  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}

export async function deleteClientContactAction(
  clientId: string,
  contactId: string
): Promise<ContactActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  if (!canPerform(session.user.role, "client", "deleteContact")) {
    return { success: false, message: "この操作を実行する権限がありません" };
  }

  const result = await deleteClientContact({
    contactId,
    clientId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}
