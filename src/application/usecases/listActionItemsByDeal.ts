import { dealRepository, actionItemRepository } from "@/infrastructure/repositories";
import type { ActionItem } from "@/domain/models/actionItem";

export type ListActionItemsByDealResult =
  | { ok: true; actionItems: ActionItem[] }
  | { ok: false; reason: string };

export async function listActionItemsByDeal(data: {
  dealId: string;
  organizationId: string;
}): Promise<ListActionItemsByDealResult> {
  const deal = await dealRepository.findById(data.dealId, data.organizationId);
  if (!deal) {
    return { ok: false, reason: "案件が見つかりません" };
  }

  const actionItems = await actionItemRepository.findByDeal(data.dealId, data.organizationId);
  return { ok: true, actionItems };
}
