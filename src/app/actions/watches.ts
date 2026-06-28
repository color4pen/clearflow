"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/infrastructure/auth";
import { watchDeal, unwatchDeal } from "@/application/usecases";

export type WatchActionResult = { ok: true } | { ok: false; reason: string };

export async function watchDealAction(dealId: string): Promise<WatchActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, reason: "認証が必要です" };
  }

  const result = await watchDeal({
    userId: session.user.id,
    dealId,
    organizationId: session.user.organizationId,
  });

  if (result.ok) {
    revalidatePath(`/deals/${dealId}`);
  }

  return result.ok ? { ok: true } : { ok: false, reason: result.reason };
}

export async function unwatchDealAction(dealId: string): Promise<WatchActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, reason: "認証が必要です" };
  }

  const result = await unwatchDeal({
    userId: session.user.id,
    dealId,
    organizationId: session.user.organizationId,
  });

  if (result.ok) {
    revalidatePath(`/deals/${dealId}`);
  }

  return result.ok ? { ok: true } : { ok: false, reason: result.reason };
}
