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

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
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
    if (!isValidUrl(uri)) {
      return { ok: false, reason: `redirect_uri is not a valid URL: ${uri}` };
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
