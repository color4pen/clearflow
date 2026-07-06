import { apiTokenRepository, oauthTokenRepository, userRepository } from "./repositories";
import { hasApiTokenPrefix, hashApiToken } from "@/domain/models/apiToken";
import { hasOAuthAccessTokenPrefix, hashOAuthToken } from "@/domain/models/oauthToken";
import type { Role } from "@/domain/models/user";

/**
 * Authorization: Bearer ヘッダから userId / organizationId / role を解決する。
 * PAT（cfp_ プレフィクス）と OAuth アクセストークン（oat_ プレフィクス）の両方を解決する。
 * ハッシュ照合・失効/期限切れ検査・deactivated ユーザー検査を行う。
 * いずれかの検査で失敗した場合は null を返す（エラー種別を外部に漏らさない）。
 */
export async function resolveBearer(
  authorizationHeader: string | null
): Promise<{ userId: string; organizationId: string; role: Role } | null> {
  // (1) ヘッダが "Bearer " で始まるか検査
  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    return null;
  }

  const plainToken = authorizationHeader.slice("Bearer ".length);

  // (2) PAT パス
  if (hasApiTokenPrefix(plainToken)) {
    return resolveApiToken(plainToken);
  }

  // (3) OAuth アクセストークンパス
  if (hasOAuthAccessTokenPrefix(plainToken)) {
    return resolveOAuthAccessToken(plainToken);
  }

  // (4) どちらのプレフィクスにも一致しない
  return null;
}

/** PAT（cfp_ プレフィクス）を解決する。 */
async function resolveApiToken(
  plainToken: string
): Promise<{ userId: string; organizationId: string; role: Role } | null> {
  const tokenHash = hashApiToken(plainToken);

  const tokenRecord = await apiTokenRepository.findByTokenHash(tokenHash);
  if (!tokenRecord) {
    return null;
  }

  if (tokenRecord.revokedAt !== null) {
    return null;
  }
  if (tokenRecord.expiresAt !== null && tokenRecord.expiresAt <= new Date()) {
    return null;
  }

  const user = await userRepository.findById(
    tokenRecord.userId,
    tokenRecord.organizationId
  );
  if (!user) {
    return null;
  }
  if (user.deactivatedAt !== null) {
    return null;
  }

  try {
    await apiTokenRepository.updateLastUsedAt(
      tokenRecord.id,
      tokenRecord.organizationId,
      new Date()
    );
  } catch {
    // 表示用のタイムスタンプ更新に過ぎないため、失敗しても解決を継続する
  }

  return {
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
  };
}

/** OAuth アクセストークン（oat_ プレフィクス）を解決する。 */
async function resolveOAuthAccessToken(
  plainToken: string
): Promise<{ userId: string; organizationId: string; role: Role } | null> {
  const tokenHash = hashOAuthToken(plainToken);

  const tokenRecord = await oauthTokenRepository.findByTokenHash(tokenHash);
  if (!tokenRecord) {
    return null;
  }

  if (tokenRecord.type !== "access_token") {
    return null;
  }

  if (tokenRecord.revokedAt !== null) {
    return null;
  }
  if (tokenRecord.expiresAt <= new Date()) {
    return null;
  }

  const user = await userRepository.findById(
    tokenRecord.userId,
    tokenRecord.organizationId
  );
  if (!user) {
    return null;
  }
  if (user.deactivatedAt !== null) {
    return null;
  }

  try {
    await oauthTokenRepository.updateLastUsedAt(
      tokenRecord.id,
      tokenRecord.organizationId,
      new Date()
    );
  } catch {
    // 表示用のタイムスタンプ更新に過ぎないため、失敗しても解決を継続する
  }

  return {
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
  };
}
