/**
 * isPrimary の一意性を検証する純粋関数。
 * isPrimary=true かつ既存の主担当者が存在する場合にエラーを返す。
 */
export function validatePrimaryUniqueness(
  isPrimary: boolean,
  existingPrimaryCount: number
): { valid: true } | { valid: false; reason: string } {
  if (isPrimary && existingPrimaryCount > 0) {
    return { valid: false, reason: "この顧客にはすでに主担当者が設定されています" };
  }
  return { valid: true };
}
