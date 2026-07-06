import { createHash } from "crypto";
import { apiTokenRepository, userRepository } from "./repositories";
import type { Role } from "@/domain/models/user";

/**
 * Authorization: Bearer ヘッダから userId / organizationId / role を解決する。
 * ハッシュ照合・失効/期限切れ検査・deactivated ユーザー検査・lastUsedAt 更新を行う。
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

  // (2) トークンが "cfp_" で始まるか検査
  if (!plainToken.startsWith("cfp_")) {
    return null;
  }

  // (3) SHA-256 ハッシュを算出
  const tokenHash = createHash("sha256").update(plainToken).digest("hex");

  // (4) DB 照合
  const tokenRecord = await apiTokenRepository.findByTokenHash(tokenHash);
  if (!tokenRecord) {
    return null;
  }

  // (5) revokedAt / expiresAt の検査
  if (tokenRecord.revokedAt !== null) {
    return null;
  }
  if (tokenRecord.expiresAt !== null && tokenRecord.expiresAt < new Date()) {
    return null;
  }

  // (6) ユーザーを取得し deactivatedAt を検査
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

  // (7) lastUsedAt を更新（ベストエフォート）
  await apiTokenRepository.updateLastUsedAt(tokenRecord.id, new Date());

  // (8) 解決結果を返す
  return {
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
  };
}
