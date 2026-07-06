import { eq } from "drizzle-orm";
import { db } from "../db";
import type { Transaction } from "../db";
import { oauthClients } from "../schema";
import type { OAuthClient } from "@/domain/models/oauthClient";

const oauthClientColumns = {
  id: oauthClients.id,
  clientId: oauthClients.clientId,
  clientName: oauthClients.clientName,
  redirectUris: oauthClients.redirectUris,
  tokenEndpointAuthMethod: oauthClients.tokenEndpointAuthMethod,
  grantTypes: oauthClients.grantTypes,
  responseTypes: oauthClients.responseTypes,
  clientIdIssuedAt: oauthClients.clientIdIssuedAt,
  createdAt: oauthClients.createdAt,
} as const;

function rowToClient(row: {
  id: string;
  clientId: string;
  clientName: string;
  redirectUris: unknown;
  tokenEndpointAuthMethod: string;
  grantTypes: unknown;
  responseTypes: unknown;
  clientIdIssuedAt: Date;
  createdAt: Date;
}): OAuthClient {
  return {
    id: row.id,
    clientId: row.clientId,
    clientName: row.clientName,
    redirectUris: row.redirectUris as string[],
    tokenEndpointAuthMethod: row.tokenEndpointAuthMethod,
    grantTypes: row.grantTypes as string[],
    responseTypes: row.responseTypes as string[],
    clientIdIssuedAt: row.clientIdIssuedAt,
    createdAt: row.createdAt,
  };
}

export async function create(
  data: {
    clientId: string;
    clientName: string;
    redirectUris: string[];
    tokenEndpointAuthMethod?: string;
    grantTypes: string[];
    responseTypes: string[];
  },
  tx?: Transaction
): Promise<OAuthClient> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .insert(oauthClients)
    .values({
      clientId: data.clientId,
      clientName: data.clientName,
      redirectUris: data.redirectUris,
      tokenEndpointAuthMethod: data.tokenEndpointAuthMethod ?? "none",
      grantTypes: data.grantTypes,
      responseTypes: data.responseTypes,
    })
    .returning(oauthClientColumns);
  const row = result[0]!;
  return rowToClient(row);
}

export async function findByClientId(clientId: string): Promise<OAuthClient | null> {
  const result = await db
    .select(oauthClientColumns)
    .from(oauthClients)
    .where(eq(oauthClients.clientId, clientId))
    .limit(1);
  const row = result[0];
  return row ? rowToClient(row) : null;
}
