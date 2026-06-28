import { clientRepository } from "@/infrastructure/repositories";
import type { Transaction } from "@/infrastructure/db";

export type ValidatePrimaryResult = { ok: true } | { ok: false; reason: string };

/**
 * isPrimary の一意性を検証する。
 * 同一顧客（clientId）に isPrimary=true の連絡先が既に存在する場合はエラーを返す。
 * contactId が指定された場合（更新時）は自身を除外して判定する。
 *
 * @param clientId       対象顧客 ID
 * @param organizationId テナント識別子（repository がテナント分離を強制する）
 * @param contactId      更新対象の連絡先 ID（新規作成時は null）
 * @param isPrimary      設定しようとしている isPrimary 値
 * @param tx             オプションのトランザクション
 */
export async function validatePrimaryUniqueness(
  clientId: string,
  organizationId: string,
  contactId: string | null,
  isPrimary: boolean,
  tx?: Transaction
): Promise<ValidatePrimaryResult> {
  if (!isPrimary) {
    return { ok: true };
  }

  const contacts = await clientRepository.findContactsByClientId(clientId, organizationId, tx);
  const existingPrimary = contacts.find(
    (c) => c.isPrimary && c.id !== contactId
  );

  if (existingPrimary) {
    return {
      ok: false,
      reason: "この顧客には既に主担当者が設定されています",
    };
  }

  return { ok: true };
}
