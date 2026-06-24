import type { ClientContact } from "@/domain/models/client";

export type ValidationResult = { ok: true } | { ok: false; reason: string };

/**
 * 同一 clientId 内で isPrimary = true が 1 件以下であることを検証する。
 * 新規作成時は existingContacts に既存の担当者一覧を渡す。
 * 更新時は excludeContactId で自身を除外する。
 */
export function validateIsPrimaryUniqueness(
  isPrimary: boolean,
  existingContacts: ClientContact[],
  excludeContactId?: string
): ValidationResult {
  if (!isPrimary) return { ok: true };
  const hasPrimary = existingContacts.some(
    (c) => c.isPrimary && c.id !== excludeContactId
  );
  if (hasPrimary) {
    return { ok: false, reason: "この顧客にはすでに主担当者が設定されています" };
  }
  return { ok: true };
}
