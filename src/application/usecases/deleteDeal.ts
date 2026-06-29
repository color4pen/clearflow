import {
  interactionRepository,
  contractRepository,
  dealRepository,
  dealContactRepository,
  inquiryRepository,
} from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";

import { db } from "@/infrastructure/db";

export type DeleteDealResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function deleteDeal(data: {
  id: string;
  organizationId: string;
  actorId: string;
}): Promise<DeleteDealResult> {
  // 商談の存在を確認する
  const meetings = await interactionRepository.findAllByDeal(data.id, data.organizationId);
  if (meetings.length > 0) {
    return { ok: false, reason: "商談が紐づいている案件は削除できません" };
  }

  // 契約の存在を確認する
  const contracts = await contractRepository.findAllByDealId(data.id, data.organizationId);
  if (contracts.length > 0) {
    return { ok: false, reason: "契約が紐づいている案件は削除できません" };
  }

  // 案件が存在するかを確認する
  const deal = await dealRepository.findById(data.id, data.organizationId);
  if (!deal) {
    return { ok: false, reason: "案件が見つかりません" };
  }

  try {
    await db.transaction(async (tx) => {
      // 担当者を全件削除する（案件に従属するデータ）
      await dealContactRepository.deleteAllByDeal(data.id, data.organizationId, tx);

      // 引き合い経由の案件の場合、引き合いのステータスを new に戻す
      if (deal.inquiryId) {
        const inquiry = await inquiryRepository.findById(deal.inquiryId, data.organizationId, tx);
        if (inquiry) {
          const updated = await inquiryRepository.updateStatus(
            deal.inquiryId,
            data.organizationId,
            "new",
            inquiry.version,
            tx
          );
          if (!updated) throw new Error("引き合いのステータス更新に失敗しました");
        }
      }

      // 案件を削除する
      await dealRepository.deleteById(data.id, data.organizationId, tx);

      await recordAudit(
        {
          action: "deal.delete",
          targetType: "deal",
          targetId: data.id,
          actorId: data.actorId,
          organizationId: data.organizationId,
        },
        tx
      );
    });

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "案件の削除に失敗しました",
    };
  }
}
