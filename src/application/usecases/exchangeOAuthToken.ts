import { createHash } from "crypto";
import { db } from "@/infrastructure/db";
import { oauthTokenRepository } from "@/infrastructure/repositories";
import {
  generateOAuthAccessToken,
  generateOAuthRefreshToken,
  hashOAuthToken,
  toOAuthTokenDisplayPrefix,
  ACCESS_TOKEN_LIFETIME_MS,
  REFRESH_TOKEN_LIFETIME_MS,
} from "@/domain/models/oauthToken";

type ExchangeAuthCodeInput = {
  grantType: "authorization_code";
  code: string;
  redirectUri: string;
  clientId: string;
  codeVerifier: string;
};

type ExchangeRefreshTokenInput = {
  grantType: "refresh_token";
  refreshToken: string;
  clientId: string;
};

export type ExchangeOAuthTokenInput = ExchangeAuthCodeInput | ExchangeRefreshTokenInput;

export type ExchangeOAuthTokenResult =
  | {
      ok: true;
      accessToken: string;
      refreshToken: string;
      expiresIn: 3600;
      tokenType: "Bearer";
    }
  | { ok: false; error: "invalid_grant" | "invalid_request" | "unsupported_grant_type" };

/** PKCE S256 検証: SHA-256(codeVerifier) を base64url エンコードし codeChallenge と比較。 */
function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  const digest = createHash("sha256").update(codeVerifier).digest("base64url");
  return digest === codeChallenge;
}

export async function exchangeOAuthToken(
  input: ExchangeOAuthTokenInput
): Promise<ExchangeOAuthTokenResult> {
  if (input.grantType === "authorization_code") {
    return exchangeAuthorizationCode(input);
  } else if (input.grantType === "refresh_token") {
    return exchangeRefreshToken(input);
  }
  return { ok: false, error: "unsupported_grant_type" };
}

async function exchangeAuthorizationCode(
  input: ExchangeAuthCodeInput
): Promise<ExchangeOAuthTokenResult> {
  const { code, redirectUri, clientId, codeVerifier } = input;

  const codeHash = hashOAuthToken(code);
  const codeRecord = await oauthTokenRepository.findByTokenHash(codeHash);

  if (!codeRecord) {
    return { ok: false, error: "invalid_grant" };
  }

  if (codeRecord.type !== "authorization_code") {
    return { ok: false, error: "invalid_grant" };
  }

  if (codeRecord.clientId !== clientId) {
    return { ok: false, error: "invalid_grant" };
  }

  // 認可コード再利用検知: 使用済み（revokedAt が設定済み）→ 系列失効
  if (codeRecord.revokedAt !== null) {
    await oauthTokenRepository.revokeByFamilyId(codeRecord.familyId);
    return { ok: false, error: "invalid_grant" };
  }

  // 期限切れ検証
  if (codeRecord.expiresAt <= new Date()) {
    return { ok: false, error: "invalid_grant" };
  }

  // redirectUri 一致検証
  if (codeRecord.redirectUri !== redirectUri) {
    return { ok: false, error: "invalid_grant" };
  }

  // PKCE 検証
  if (!codeRecord.codeChallenge || !verifyPkce(codeVerifier, codeRecord.codeChallenge)) {
    return { ok: false, error: "invalid_grant" };
  }

  const { userId, organizationId, familyId, id: codeId } = codeRecord;
  const now = new Date();
  const accessTokenExpiresAt = new Date(now.getTime() + ACCESS_TOKEN_LIFETIME_MS);
  const refreshTokenExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_LIFETIME_MS);

  const plainAccessToken = generateOAuthAccessToken();
  const plainRefreshToken = generateOAuthRefreshToken();

  try {
    await db.transaction(async (tx) => {
      // 認可コードを原子的に使用済みにする。並行リクエストに負けた（0 行更新）場合は
      // トランザクションを中断し、トークンを発行しない（単回使用の保証）。
      const won = await oauthTokenRepository.revokeById(codeId, tx);
      if (!won) {
        throw new CodeAlreadyUsedError();
      }

      // アクセストークン保存
      await oauthTokenRepository.create(
        {
          type: "access_token",
          clientId,
          userId,
          organizationId,
          tokenHash: hashOAuthToken(plainAccessToken),
          tokenPrefix: toOAuthTokenDisplayPrefix(plainAccessToken),
          familyId,
          expiresAt: accessTokenExpiresAt,
        },
        tx
      );

      // リフレッシュトークン保存
      await oauthTokenRepository.create(
        {
          type: "refresh_token",
          clientId,
          userId,
          organizationId,
          tokenHash: hashOAuthToken(plainRefreshToken),
          tokenPrefix: toOAuthTokenDisplayPrefix(plainRefreshToken),
          familyId,
          expiresAt: refreshTokenExpiresAt,
        },
        tx
      );
    });
  } catch (err) {
    if (err instanceof CodeAlreadyUsedError) {
      return { ok: false, error: "invalid_grant" };
    }
    throw err;
  }

  return {
    ok: true,
    accessToken: plainAccessToken,
    refreshToken: plainRefreshToken,
    expiresIn: 3600,
    tokenType: "Bearer",
  };
}

/** 認可コード / リフレッシュトークンが並行リクエストに先に消費されたことを表す内部エラー。 */
class CodeAlreadyUsedError extends Error {}

async function exchangeRefreshToken(
  input: ExchangeRefreshTokenInput
): Promise<ExchangeOAuthTokenResult> {
  const { refreshToken, clientId } = input;

  const tokenHash = hashOAuthToken(refreshToken);
  const tokenRecord = await oauthTokenRepository.findByTokenHash(tokenHash);

  if (!tokenRecord) {
    return { ok: false, error: "invalid_grant" };
  }

  if (tokenRecord.type !== "refresh_token") {
    return { ok: false, error: "invalid_grant" };
  }

  if (tokenRecord.clientId !== clientId) {
    return { ok: false, error: "invalid_grant" };
  }

  // 再利用検知: 失効済みトークンで交換試行 → 系列失効
  if (tokenRecord.revokedAt !== null) {
    await oauthTokenRepository.revokeByFamilyId(tokenRecord.familyId);
    return { ok: false, error: "invalid_grant" };
  }

  // 期限切れ検証
  if (tokenRecord.expiresAt <= new Date()) {
    return { ok: false, error: "invalid_grant" };
  }

  const { userId, organizationId, familyId, id: tokenId } = tokenRecord;
  const now = new Date();
  const accessTokenExpiresAt = new Date(now.getTime() + ACCESS_TOKEN_LIFETIME_MS);
  const refreshTokenExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_LIFETIME_MS);

  const plainAccessToken = generateOAuthAccessToken();
  const plainRefreshToken = generateOAuthRefreshToken();

  try {
    await db.transaction(async (tx) => {
      // 旧リフレッシュトークンを原子的に失効させる。並行リクエストに負けた場合は中断する
      // （回転の二重発行を防ぐ）。
      const won = await oauthTokenRepository.revokeById(tokenId, tx);
      if (!won) {
        throw new CodeAlreadyUsedError();
      }

      // 新アクセストークン保存
      await oauthTokenRepository.create(
        {
          type: "access_token",
          clientId,
          userId,
          organizationId,
          tokenHash: hashOAuthToken(plainAccessToken),
          tokenPrefix: toOAuthTokenDisplayPrefix(plainAccessToken),
          familyId,
          expiresAt: accessTokenExpiresAt,
        },
        tx
      );

      // 新リフレッシュトークン保存
      await oauthTokenRepository.create(
        {
          type: "refresh_token",
          clientId,
          userId,
          organizationId,
          tokenHash: hashOAuthToken(plainRefreshToken),
          tokenPrefix: toOAuthTokenDisplayPrefix(plainRefreshToken),
          familyId,
          expiresAt: refreshTokenExpiresAt,
        },
        tx
      );
    });
  } catch (err) {
    if (err instanceof CodeAlreadyUsedError) {
      return { ok: false, error: "invalid_grant" };
    }
    throw err;
  }

  return {
    ok: true,
    accessToken: plainAccessToken,
    refreshToken: plainRefreshToken,
    expiresIn: 3600,
    tokenType: "Bearer",
  };
}
