import { watchRepository, dealRepository } from "@/infrastructure/repositories";
import type { Watch } from "@/domain/models/watch";

export type WatchDealResult = { ok: true; watch: Watch } | { ok: false; reason: string };

export async function watchDeal(data: {
  userId: string;
  dealId: string;
  organizationId: string;
}): Promise<WatchDealResult> {
  // 組織所有権の検証: dealId が organizationId に属する案件かを確認する
  const deal = await dealRepository.findById(data.dealId, data.organizationId);
  if (!deal) {
    return { ok: false, reason: "指定された案件が見つかりません" };
  }

  try {
    const watch = await watchRepository.create({
      userId: data.userId,
      dealId: data.dealId,
      organizationId: data.organizationId,
    });
    return { ok: true, watch };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "watch の作成に失敗しました",
    };
  }
}
