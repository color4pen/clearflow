import { watchRepository } from "@/infrastructure/repositories";

export type UnwatchDealResult = { ok: true } | { ok: false; reason: string };

export async function unwatchDeal(data: {
  userId: string;
  dealId: string;
  organizationId: string;
}): Promise<UnwatchDealResult> {
  try {
    await watchRepository.deleteByUserAndDeal(
      data.userId,
      data.dealId,
      data.organizationId
    );
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "unwatch に失敗しました",
    };
  }
}
