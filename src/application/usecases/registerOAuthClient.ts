import { randomUUID } from "crypto";
import { oauthClientRepository } from "@/infrastructure/repositories";
import type { OAuthClient } from "@/domain/models/oauthClient";

type RegisterOAuthClientInput = {
  clientName: string;
  redirectUris: string[];
  grantTypes?: string[];
  responseTypes?: string[];
  tokenEndpointAuthMethod?: string;
};

type RegisterOAuthClientResult =
  | { ok: true; client: OAuthClient }
  | { ok: false; reason: string };

/**
 * redirect_uri として許可する URL か検証する。
 * 認可コードの平文流出を防ぐため https を必須とし、開発用途の localhost のみ http を許可する
 * （javascript: / data: 等の危険スキームも排除される）。
 */
function isValidRedirectUri(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol === "https:") {
    return true;
  }
  if (parsed.protocol === "http:") {
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "[::1]";
  }
  return false;
}

export async function registerOAuthClient(
  input: RegisterOAuthClientInput
): Promise<RegisterOAuthClientResult> {
  const { clientName, redirectUris, grantTypes, responseTypes, tokenEndpointAuthMethod } = input;

  const trimmedName = (clientName ?? "").trim();
  if (trimmedName.length === 0) {
    return { ok: false, reason: "client_name is required" };
  }

  if (!redirectUris || redirectUris.length === 0) {
    return { ok: false, reason: "redirect_uris must contain at least one URI" };
  }

  for (const uri of redirectUris) {
    if (!isValidRedirectUri(uri)) {
      return {
        ok: false,
        reason: `redirect_uri must be https (or http on localhost): ${uri}`,
      };
    }
  }

  // tokenEndpointAuthMethod は "none" のみ許可（公開クライアント）
  const authMethod = tokenEndpointAuthMethod ?? "none";
  if (authMethod !== "none") {
    return {
      ok: false,
      reason: `token_endpoint_auth_method "${authMethod}" is not supported. Only "none" is allowed.`,
    };
  }

  const clientId = randomUUID();
  const resolvedGrantTypes = grantTypes ?? ["authorization_code", "refresh_token"];
  const resolvedResponseTypes = responseTypes ?? ["code"];

  const client = await oauthClientRepository.create({
    clientId,
    clientName: trimmedName,
    redirectUris,
    tokenEndpointAuthMethod: authMethod,
    grantTypes: resolvedGrantTypes,
    responseTypes: resolvedResponseTypes,
  });

  return { ok: true, client };
}
