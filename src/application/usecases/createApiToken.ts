import { randomBytes, createHash } from "crypto";
import { db } from "@/infrastructure/db";
import { apiTokenRepository } from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";
import type { ApiToken } from "@/domain/models/apiToken";

type CreateApiTokenInput = {
  userId: string;
  organizationId: string;
  name: string;
  expiresAt?: Date | null;
};

type CreateApiTokenResult =
  | { ok: true; token: ApiToken; plainToken: string }
  | { ok: false; reason: string };

export async function createApiToken(
  input: CreateApiTokenInput
): Promise<CreateApiTokenResult> {
  const { userId, organizationId, name, expiresAt } = input;

  if (!name || name.trim().length === 0) {
    return { ok: false, reason: "トークン名は必須です" };
  }

  // トークン生成: cfp_ + 32 バイト乱数 (base64url)
  const randomPart = randomBytes(32)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const plainToken = `cfp_${randomPart}`;

  // tokenPrefix: 平文の先頭 8 文字
  const tokenPrefix = plainToken.slice(0, 8);

  // tokenHash: SHA-256
  const tokenHash = createHash("sha256").update(plainToken).digest("hex");

  const newToken = await db.transaction(async (tx) => {
    const token = await apiTokenRepository.create(
      {
        organizationId,
        userId,
        name: name.trim(),
        tokenHash,
        tokenPrefix,
        expiresAt: expiresAt ?? null,
      },
      tx
    );

    await recordAudit(
      {
        action: "api_token.create",
        targetType: "api_token",
        targetId: token.id,
        actorId: userId,
        organizationId,
      },
      tx
    );

    return token;
  });

  return { ok: true, token: newToken, plainToken };
}
