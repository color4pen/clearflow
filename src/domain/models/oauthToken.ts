/** OAuth トークンのドメイン型・定数・ユーティリティ関数。 */
import { randomBytes, createHash } from "crypto";

export type OAuthTokenType = "authorization_code" | "access_token" | "refresh_token";

export type OAuthToken = {
  id: string;
  type: OAuthTokenType;
  clientId: string;
  userId: string;
  organizationId: string;
  tokenPrefix: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  // Authorization code specific
  codeChallenge: string | null;
  codeChallengeMethod: string | null;
  redirectUri: string | null;
  state: string | null;
};

/** OAuth アクセストークンのプレフィクス。 */
export const OAUTH_ACCESS_TOKEN_PREFIX = "oat_";

/** OAuth リフレッシュトークンのプレフィクス。 */
export const OAUTH_REFRESH_TOKEN_PREFIX = "ort_";

/** 認可コードのプレフィクス（内部識別用）。 */
export const OAUTH_AUTH_CODE_PREFIX = "oac_";

/** アクセストークンの有効期限（1 時間）。 */
export const ACCESS_TOKEN_LIFETIME_MS = 3_600_000;

/** リフレッシュトークンの有効期限（30 日）。 */
export const REFRESH_TOKEN_LIFETIME_MS = 30 * 24 * 3_600_000;

/** 認可コードの有効期限（10 分）。 */
export const AUTHORIZATION_CODE_LIFETIME_MS = 600_000;

/** OAuth アクセストークン（`oat_` + 32 バイト乱数の base64url）を生成する。 */
export function generateOAuthAccessToken(): string {
  const randomPart = randomBytes(32).toString("base64url");
  return `${OAUTH_ACCESS_TOKEN_PREFIX}${randomPart}`;
}

/** OAuth リフレッシュトークン（`ort_` + 32 バイト乱数の base64url）を生成する。 */
export function generateOAuthRefreshToken(): string {
  const randomPart = randomBytes(32).toString("base64url");
  return `${OAUTH_REFRESH_TOKEN_PREFIX}${randomPart}`;
}

/** 認可コード（`oac_` + 32 バイト乱数の base64url）を生成する。 */
export function generateAuthorizationCode(): string {
  const randomPart = randomBytes(32).toString("base64url");
  return `${OAUTH_AUTH_CODE_PREFIX}${randomPart}`;
}

/** トークンの保存用 SHA-256 ハッシュ（hex）。 */
export function hashOAuthToken(plainToken: string): string {
  return createHash("sha256").update(plainToken).digest("hex");
}

/** 平文トークンが OAuth アクセストークンのプレフィクスを持つか。 */
export function hasOAuthAccessTokenPrefix(token: string): boolean {
  return token.startsWith(OAUTH_ACCESS_TOKEN_PREFIX);
}

/** 平文トークンが OAuth リフレッシュトークンのプレフィクスを持つか。 */
export function hasOAuthRefreshTokenPrefix(token: string): boolean {
  return token.startsWith(OAUTH_REFRESH_TOKEN_PREFIX);
}

/** 一覧表示用のプレフィクス（平文先頭 8 文字）。 */
export function toOAuthTokenDisplayPrefix(plainToken: string): string {
  return plainToken.slice(0, 8);
}
