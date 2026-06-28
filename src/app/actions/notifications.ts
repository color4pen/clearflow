"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/infrastructure/auth";
import { markNotificationsAsRead } from "@/application/usecases";

export type MarkAsReadResult = { ok: true } | { ok: false; reason: string };

export async function markNotificationsAsReadAction(): Promise<MarkAsReadResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, reason: "認証が必要です" };
  }

  const result = await markNotificationsAsRead({
    userId: session.user.id,
    organizationId: session.user.organizationId,
  });

  if (result.ok) {
    revalidatePath("/");
  }

  return result.ok ? { ok: true } : { ok: false, reason: result.reason };
}
