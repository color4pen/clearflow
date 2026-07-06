import { db } from "@/infrastructure/db";
import { apiTokenRepository } from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";
import {
  generatePlainToken,
  hashApiToken,
  toDisplayPrefix,
  type ApiToken,
} from "@/domain/models/apiToken";

/** トークン名の最大長。プレゼンテーション層の検証と同じ上限をドメイン側でも担保する。 */
const MAX_TOKEN_NAME_LENGTH = 100;

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

  const trimmedName = name?.trim() ?? "";
  if (trimmedName.length === 0) {
    return { ok: false, reason: "トークン名は必須です" };
  }
  if (trimmedName.length > MAX_TOKEN_NAME_LENGTH) {
    return {
      ok: false,
      reason: `トークン名は${MAX_TOKEN_NAME_LENGTH}文字以内で入力してください`,
    };
  }

  const plainToken = generatePlainToken();
  const tokenPrefix = toDisplayPrefix(plainToken);
  const tokenHash = hashApiToken(plainToken);

  const newToken = await db.transaction(async (tx) => {
    const token = await apiTokenRepository.create(
      {
        organizationId,
        userId,
        name: trimmedName,
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
