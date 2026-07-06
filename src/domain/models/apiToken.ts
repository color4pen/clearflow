/** API トークンのドメイン型と、トークン形式・ハッシュの一元定義。 */
import { randomBytes, createHash } from "crypto";

export type ApiToken = {
  id: string;
  organizationId: string;
  userId: string;
  name: string;
  tokenPrefix: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
};

/** 平文トークンのプレフィクス。この値の変更は既存トークンの解決を壊すため慎重に扱う。 */
export const API_TOKEN_PREFIX = "cfp_";

/** 一覧表示用に保持する平文先頭の文字数。 */
export const API_TOKEN_DISPLAY_PREFIX_LENGTH = 8;

/** 新しい平文トークン（`cfp_` + 32 バイト乱数の base64url）を生成する。 */
export function generatePlainToken(): string {
  const randomPart = randomBytes(32).toString("base64url");
  return `${API_TOKEN_PREFIX}${randomPart}`;
}

/** 平文トークンが正しいプレフィクスを持つか。 */
export function hasApiTokenPrefix(plainToken: string): boolean {
  return plainToken.startsWith(API_TOKEN_PREFIX);
}

/** 平文トークンの保存用 SHA-256 ハッシュ（hex）。ミント側・解決側で同一実装を共有する。 */
export function hashApiToken(plainToken: string): string {
  return createHash("sha256").update(plainToken).digest("hex");
}

/** 一覧表示用のプレフィクス（平文先頭 N 文字）。 */
export function toDisplayPrefix(plainToken: string): string {
  return plainToken.slice(0, API_TOKEN_DISPLAY_PREFIX_LENGTH);
}
