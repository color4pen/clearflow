import { db } from "@/infrastructure/db";
import { apiTokenRepository } from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";

type RevokeApiTokenInput = {
  tokenId: string;
  userId: string;
  organizationId: string;
};

type RevokeApiTokenResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function revokeApiToken(
  input: RevokeApiTokenInput
): Promise<RevokeApiTokenResult> {
  const { tokenId, userId, organizationId } = input;

  const result = await db.transaction(async (tx) => {
    const revoked = await apiTokenRepository.revokeById(
      tokenId,
      userId,
      organizationId,
      tx
    );

    if (!revoked) {
      return { ok: false as const, reason: "トークンが見つからないか、既に失効済みです" };
    }

    await recordAudit(
      {
        action: "api_token.revoke",
        targetType: "api_token",
        targetId: tokenId,
        actorId: userId,
        organizationId,
      },
      tx
    );

    return { ok: true as const };
  });

  return result;
}
