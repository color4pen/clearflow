import { randomUUID } from "crypto";
import { db } from "@/infrastructure/db";
import { oauthClientRepository, oauthTokenRepository } from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";
import {
  generateAuthorizationCode,
  hashOAuthToken,
  toOAuthTokenDisplayPrefix,
  AUTHORIZATION_CODE_LIFETIME_MS,
} from "@/domain/models/oauthToken";

type AuthorizeOAuthClientInput = {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  state?: string | null;
  userId: string;
  organizationId: string;
};

type AuthorizeOAuthClientResult =
  | { ok: true; code: string; state: string | null }
  | { ok: false; error: "invalid_request" | "access_denied" | "unauthorized_client" };

export async function authorizeOAuthClient(
  input: AuthorizeOAuthClientInput
): Promise<AuthorizeOAuthClientResult> {
  const { clientId, redirectUri, codeChallenge, codeChallengeMethod, state, userId, organizationId } = input;

  // クライアントを検索
  const client = await oauthClientRepository.findByClientId(clientId);
  if (!client) {
    return { ok: false, error: "unauthorized_client" };
  }

  // redirectUri がクライアントの登録済み redirectUris に含まれるか
  if (!client.redirectUris.includes(redirectUri)) {
    return { ok: false, error: "invalid_request" };
  }

  // PKCE: S256 必須
  if (codeChallengeMethod !== "S256") {
    return { ok: false, error: "invalid_request" };
  }

  if (!codeChallenge || codeChallenge.trim().length === 0) {
    return { ok: false, error: "invalid_request" };
  }

  // 認可コード生成
  const plainCode = generateAuthorizationCode();
  const codeHash = hashOAuthToken(plainCode);
  const codePrefix = toOAuthTokenDisplayPrefix(plainCode);
  const familyId = randomUUID();
  const expiresAt = new Date(Date.now() + AUTHORIZATION_CODE_LIFETIME_MS);

  await db.transaction(async (tx) => {
    await oauthTokenRepository.create(
      {
        type: "authorization_code",
        clientId,
        userId,
        organizationId,
        tokenHash: codeHash,
        tokenPrefix: codePrefix,
        familyId,
        expiresAt,
        codeChallenge,
        codeChallengeMethod,
        redirectUri,
        state: state ?? null,
      },
      tx
    );

    await recordAudit(
      {
        action: "oauth_connection.create",
        targetType: "oauth_connection",
        targetId: clientId,
        actorId: userId,
        organizationId,
      },
      tx
    );
  });

  return { ok: true, code: plainCode, state: state ?? null };
}
