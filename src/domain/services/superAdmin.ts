/**
 * スーパー管理者判定サービス。
 * `SUPER_ADMIN_EMAILS` 環境変数に含まれるメールアドレスを持つユーザーをスーパー管理者とする。
 * DB への永続的な特権フラグは持たない（env 指定のみ）。
 */

export function isSuperAdmin(email: string | null | undefined): boolean {
  if (email == null) return false;

  const raw = process.env.SUPER_ADMIN_EMAILS ?? "";
  if (!raw.trim()) return false;

  const adminEmails = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);

  return adminEmails.includes(email.toLowerCase());
}
