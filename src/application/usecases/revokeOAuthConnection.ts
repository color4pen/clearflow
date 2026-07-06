import { db } from "@/infrastructure/db";
import { oauthTokenRepository } from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";

type RevokeOAuthConnectionInput = {
  userId: string;
  organizationId: string;
  clientId: string;
};

type RevokeOAuthConnectionResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function revokeOAuthConnection(
  input: RevokeOAuthConnectionInput
): Promise<RevokeOAuthConnectionResult> {
  const { userId, organizationId, clientId } = input;

  await db.transaction(async (tx) => {
    await oauthTokenRepository.revokeByUserAndClientId(userId, clientId, organizationId, tx);

    await recordAudit(
      {
        action: "oauth_connection.revoke",
        targetType: "oauth_connection",
        targetId: clientId,
        actorId: userId,
        organizationId,
      },
      tx
    );
  });

  return { ok: true };
}
