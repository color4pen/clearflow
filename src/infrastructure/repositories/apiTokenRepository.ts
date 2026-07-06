import { eq, and, isNull, desc } from "drizzle-orm";
import { db } from "../db";
import type { Transaction } from "../db";
import { apiTokens } from "../schema";
import type { ApiToken } from "@/domain/models/apiToken";

export async function create(
  data: {
    organizationId: string;
    userId: string;
    name: string;
    tokenHash: string;
    tokenPrefix: string;
    expiresAt?: Date | null;
  },
  tx?: Transaction
): Promise<ApiToken> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .insert(apiTokens)
    .values({
      organizationId: data.organizationId,
      userId: data.userId,
      name: data.name,
      tokenHash: data.tokenHash,
      tokenPrefix: data.tokenPrefix,
      expiresAt: data.expiresAt ?? null,
    })
    .returning({
      id: apiTokens.id,
      organizationId: apiTokens.organizationId,
      userId: apiTokens.userId,
      name: apiTokens.name,
      tokenPrefix: apiTokens.tokenPrefix,
      lastUsedAt: apiTokens.lastUsedAt,
      expiresAt: apiTokens.expiresAt,
      revokedAt: apiTokens.revokedAt,
      createdAt: apiTokens.createdAt,
    });
  const row = result[0]!;
  return row;
}

export async function findByTokenHash(
  tokenHash: string
): Promise<{
  id: string;
  organizationId: string;
  userId: string;
  revokedAt: Date | null;
  expiresAt: Date | null;
} | null> {
  const result = await db
    .select({
      id: apiTokens.id,
      organizationId: apiTokens.organizationId,
      userId: apiTokens.userId,
      revokedAt: apiTokens.revokedAt,
      expiresAt: apiTokens.expiresAt,
    })
    .from(apiTokens)
    .where(eq(apiTokens.tokenHash, tokenHash))
    .limit(1);
  return result[0] ?? null;
}

export async function findByUserAndOrganization(
  userId: string,
  organizationId: string
): Promise<ApiToken[]> {
  const result = await db
    .select({
      id: apiTokens.id,
      organizationId: apiTokens.organizationId,
      userId: apiTokens.userId,
      name: apiTokens.name,
      tokenPrefix: apiTokens.tokenPrefix,
      lastUsedAt: apiTokens.lastUsedAt,
      expiresAt: apiTokens.expiresAt,
      revokedAt: apiTokens.revokedAt,
      createdAt: apiTokens.createdAt,
    })
    .from(apiTokens)
    .where(
      and(
        eq(apiTokens.userId, userId),
        eq(apiTokens.organizationId, organizationId)
      )
    )
    .orderBy(desc(apiTokens.createdAt));
  return result;
}

export async function revokeById(
  id: string,
  userId: string,
  organizationId: string,
  tx?: Transaction
): Promise<ApiToken | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .update(apiTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(apiTokens.id, id),
        eq(apiTokens.userId, userId),
        eq(apiTokens.organizationId, organizationId),
        isNull(apiTokens.revokedAt)
      )
    )
    .returning({
      id: apiTokens.id,
      organizationId: apiTokens.organizationId,
      userId: apiTokens.userId,
      name: apiTokens.name,
      tokenPrefix: apiTokens.tokenPrefix,
      lastUsedAt: apiTokens.lastUsedAt,
      expiresAt: apiTokens.expiresAt,
      revokedAt: apiTokens.revokedAt,
      createdAt: apiTokens.createdAt,
    });
  return result[0] ?? null;
}

export async function updateLastUsedAt(
  id: string,
  timestamp: Date
): Promise<void> {
  await db
    .update(apiTokens)
    .set({ lastUsedAt: timestamp })
    .where(eq(apiTokens.id, id));
}
