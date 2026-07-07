import { invoiceRepository, contractRepository } from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";

import { db } from "@/infrastructure/db";

export type DeleteContractResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function deleteContract(data: {
  id: string;
  organizationId: string;
  actorId: string;
}): Promise<DeleteContractResult> {
  // 請求の存在を確認する
  const invoices = await invoiceRepository.findAllByContract(data.id, data.organizationId);
  if (invoices.length > 0) {
    return { ok: false, reason: "請求が紐づいている契約は削除できません" };
  }

  try {
    await db.transaction(async (tx) => {
      await contractRepository.deleteById(data.id, data.organizationId, tx);

      await recordAudit(
        {
          action: "contract.delete",
          targetType: "contract",
          targetId: data.id,
          actorId: data.actorId,
          organizationId: data.organizationId,
        },
        tx
      );
    });

    return { ok: true };
  } catch {
    return {
      ok: false,
      reason: "契約の削除に失敗しました",
    };
  }
}
