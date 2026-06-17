"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/infrastructure/auth";
import {
  webhookEndpointRepository,
  webhookDeliveryRepository,
} from "@/infrastructure/repositories";
import { WEBHOOK_EVENT_TYPES } from "@/domain/models/webhookEvent";

const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^::1$/,
  /^169\.254\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
];

function isPrivateHost(hostname: string): boolean {
  return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(hostname));
}

function validateWebhookUrl(
  url: string
): { ok: true } | { ok: false; message: string } {
  const urlResult = z.string().url().safeParse(url);
  if (!urlResult.success) {
    return { ok: false, message: "有効な URL を入力してください" };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, message: "有効な URL を入力してください" };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, message: "内部ネットワークの URL は登録できません" };
  }

  if (isPrivateHost(parsed.hostname)) {
    return { ok: false, message: "内部ネットワークの URL は登録できません" };
  }

  return { ok: true };
}

export async function listWebhookEndpointsAction() {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: "認証が必要です" };
  if (session.user.role !== "admin") return { success: false, message: "権限がありません" };

  const endpoints = await webhookEndpointRepository.findByOrganization(
    session.user.organizationId
  );

  return {
    success: true,
    endpoints: endpoints.map((ep) => ({
      ...ep,
      secret: ep.secret.slice(0, 8) + "...",
    })),
  };
}

export async function createWebhookEndpointAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: "認証が必要です" };
  if (session.user.role !== "admin") return { success: false, message: "権限がありません" };

  const url = formData.get("url") as string;
  const eventsRaw = formData.getAll("events") as string[];

  const urlValidation = validateWebhookUrl(url);
  if (!urlValidation.ok) {
    return { success: false, message: urlValidation.message };
  }

  const validEvents = eventsRaw.filter((e) =>
    (WEBHOOK_EVENT_TYPES as readonly string[]).includes(e)
  );
  if (validEvents.length === 0) {
    return { success: false, message: "購読するイベントを1つ以上選択してください" };
  }

  const secret = "whsec_" + randomBytes(32).toString("hex");

  const endpoint = await webhookEndpointRepository.create({
    organizationId: session.user.organizationId,
    url,
    secret,
    events: validEvents,
  });

  revalidatePath("/settings/webhooks");

  return {
    success: true,
    endpoint: {
      ...endpoint,
      secret, // Full secret on initial creation only
    },
  };
}

export async function deleteWebhookEndpointAction(endpointId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: "認証が必要です" };
  if (session.user.role !== "admin") return { success: false, message: "権限がありません" };

  await webhookEndpointRepository.deleteById(
    endpointId,
    session.user.organizationId
  );

  revalidatePath("/settings/webhooks");

  return { success: true };
}

export async function toggleWebhookEndpointAction(
  endpointId: string,
  isActive: boolean
) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: "認証が必要です" };
  if (session.user.role !== "admin") return { success: false, message: "権限がありません" };

  await webhookEndpointRepository.updateIsActive(
    endpointId,
    session.user.organizationId,
    isActive
  );

  revalidatePath("/settings/webhooks");

  return { success: true };
}

export async function listWebhookDeliveriesAction(endpointId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: "認証が必要です" };
  if (session.user.role !== "admin") return { success: false, message: "権限がありません" };

  const deliveries = await webhookDeliveryRepository.findByEndpointId(
    endpointId,
    session.user.organizationId,
    { limit: 50 }
  );

  return { success: true, deliveries };
}
