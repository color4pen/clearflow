import { oauthTokenRepository } from "@/infrastructure/repositories";

type ListOAuthConnectionsInput = {
  userId: string;
  organizationId: string;
};

export type OAuthConnection = {
  clientId: string;
  clientName: string;
  lastUsedAt: Date | null;
  connectedAt: Date;
};

export async function listOAuthConnections(
  input: ListOAuthConnectionsInput
): Promise<OAuthConnection[]> {
  const { userId, organizationId } = input;
  return oauthTokenRepository.findActiveConnectionsByUser(userId, organizationId);
}
