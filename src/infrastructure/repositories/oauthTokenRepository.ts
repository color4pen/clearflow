import { eq, and, isNull, or, lt, gt, desc } from "drizzle-orm";
import { db } from "../db";
import type { Transaction } from "../db";
import { oauthTokens, oauthClients } from "../schema";
import type { OAuthToken, OAuthTokenType } from "@/domain/models/oauthToken";

/** lastUsedAt を再書き込みしない間隔。書き込みを間引く。 */
const LAST_USED_THROTTLE_MS = 60_000;

const oauthTokenColumns = {
  id: oauthTokens.id,
  type: oauthTokens.type,
  clientId: oauthTokens.clientId,
  userId: oauthTokens.userId,
  organizationId: oauthTokens.organizationId,
  tokenPrefix: oauthTokens.tokenPrefix,
  familyId: oauthTokens.familyId,
  expiresAt: oauthTokens.expiresAt,
  revokedAt: oauthTokens.revokedAt,
  lastUsedAt: oauthTokens.lastUsedAt,
  createdAt: oauthTokens.createdAt,
  codeChallenge: oauthTokens.codeChallenge,
  codeChallengeMethod: oauthTokens.codeChallengeMethod,
  redirectUri: oauthTokens.redirectUri,
  state: oauthTokens.state,
} as const;

function rowToToken(row: {
  id: string;
  type: string;
  clientId: string;
  userId: string;
  organizationId: string;
  tokenPrefix: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  codeChallenge: string | null;
  codeChallengeMethod: string | null;
  redirectUri: string | null;
  state: string | null;
}): OAuthToken {
  return {
    id: row.id,
    type: row.type as OAuthTokenType,
    clientId: row.clientId,
    userId: row.userId,
    organizationId: row.organizationId,
    tokenPrefix: row.tokenPrefix,
    familyId: row.familyId,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    lastUsedAt: row.lastUsedAt,
    createdAt: row.createdAt,
    codeChallenge: row.codeChallenge,
    codeChallengeMethod: row.codeChallengeMethod,
    redirectUri: row.redirectUri,
    state: row.state,
  };
}

export async function create(
  data: {
    type: OAuthTokenType;
    clientId: string;
    userId: string;
    organizationId: string;
    tokenHash: string;
    tokenPrefix: string;
    familyId: string;
    expiresAt: Date;
    codeChallenge?: string | null;
    codeChallengeMethod?: string | null;
    redirectUri?: string | null;
    state?: string | null;
  },
  tx?: Transaction
): Promise<OAuthToken> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .insert(oauthTokens)
    .values({
      type: data.type,
      clientId: data.clientId,
      userId: data.userId,
      organizationId: data.organizationId,
      tokenHash: data.tokenHash,
      tokenPrefix: data.tokenPrefix,
      familyId: data.familyId,
      expiresAt: data.expiresAt,
      codeChallenge: data.codeChallenge ?? null,
      codeChallengeMethod: data.codeChallengeMethod ?? null,
      redirectUri: data.redirectUri ?? null,
      state: data.state ?? null,
    })
    .returning(oauthTokenColumns);
  const row = result[0]!;
  return rowToToken(row);
}

/**
 * tokenHash でトークンを検索する（グローバル検索。認証パスでは organizationId が未知のため）。
 */
export async function findByTokenHash(tokenHash: string): Promise<OAuthToken | null> {
  const result = await db
    .select(oauthTokenColumns)
    .from(oauthTokens)
    .where(eq(oauthTokens.tokenHash, tokenHash))
    .limit(1);
  const row = result[0];
  return row ? rowToToken(row) : null;
}

/** 指定 ID のトークンを失効させる。 */
export async function revokeById(id: string, tx?: Transaction): Promise<void> {
  const queryRunner = tx ?? db;
  await queryRunner
    .update(oauthTokens)
    .set({ revokedAt: new Date() })
    .where(eq(oauthTokens.id, id));
}

/** 同一 familyId の全トークンを失効させる（再利用検知による系列一括失効）。 */
export async function revokeByFamilyId(familyId: string, tx?: Transaction): Promise<void> {
  const queryRunner = tx ?? db;
  await queryRunner
    .update(oauthTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(oauthTokens.familyId, familyId),
        isNull(oauthTokens.revokedAt)
      )
    );
}

/**
 * 指定ユーザー × クライアント × 組織のすべてのトークンを失効させる（接続解除）。
 */
export async function revokeByUserAndClientId(
  userId: string,
  clientId: string,
  organizationId: string,
  tx?: Transaction
): Promise<void> {
  const queryRunner = tx ?? db;
  await queryRunner
    .update(oauthTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(oauthTokens.userId, userId),
        eq(oauthTokens.clientId, clientId),
        eq(oauthTokens.organizationId, organizationId),
        isNull(oauthTokens.revokedAt)
      )
    );
}

/** 接続一覧: ユーザー × 組織の有効なアクセストークン/リフレッシュトークンをクライアント単位でグルーピング。 */
export async function findActiveConnectionsByUser(
  userId: string,
  organizationId: string
): Promise<Array<{
  clientId: string;
  clientName: string;
  lastUsedAt: Date | null;
  connectedAt: Date;
}>> {
  const now = new Date();
  const rows = await db
    .select({
      clientId: oauthTokens.clientId,
      clientName: oauthClients.clientName,
      lastUsedAt: oauthTokens.lastUsedAt,
      createdAt: oauthTokens.createdAt,
    })
    .from(oauthTokens)
    .innerJoin(oauthClients, eq(oauthTokens.clientId, oauthClients.clientId))
    .where(
      and(
        eq(oauthTokens.userId, userId),
        eq(oauthTokens.organizationId, organizationId),
        or(
          eq(oauthTokens.type, "access_token"),
          eq(oauthTokens.type, "refresh_token")
        ),
        isNull(oauthTokens.revokedAt),
        gt(oauthTokens.expiresAt, now)
      )
    )
    .orderBy(desc(oauthTokens.createdAt));

  // クライアント単位でグルーピング（最初に出現したもの = 最新の接続）
  const seen = new Set<string>();
  const connections: Array<{
    clientId: string;
    clientName: string;
    lastUsedAt: Date | null;
    connectedAt: Date;
  }> = [];

  for (const row of rows) {
    if (!seen.has(row.clientId)) {
      seen.add(row.clientId);
      connections.push({
        clientId: row.clientId,
        clientName: row.clientName,
        lastUsedAt: row.lastUsedAt,
        connectedAt: row.createdAt,
      });
    }
  }

  return connections;
}

/**
 * lastUsedAt を更新する。organizationId でテナントスコープし、
 * 直近 {@link LAST_USED_THROTTLE_MS} 以内に更新済みの行は DB 側で no-op にして
 * 認証ホットパスの書き込みを間引く。
 */
export async function updateLastUsedAt(
  id: string,
  organizationId: string,
  timestamp: Date
): Promise<void> {
  const staleBefore = new Date(timestamp.getTime() - LAST_USED_THROTTLE_MS);
  await db
    .update(oauthTokens)
    .set({ lastUsedAt: timestamp })
    .where(
      and(
        eq(oauthTokens.id, id),
        eq(oauthTokens.organizationId, organizationId),
        or(
          isNull(oauthTokens.lastUsedAt),
          lt(oauthTokens.lastUsedAt, staleBefore)
        )
      )
    );
}
