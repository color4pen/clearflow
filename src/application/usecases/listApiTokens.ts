import { apiTokenRepository } from "@/infrastructure/repositories";
import type { ApiToken } from "@/domain/models/apiToken";

type ListApiTokensInput = {
  userId: string;
  organizationId: string;
};

export async function listApiTokens(
  input: ListApiTokensInput
): Promise<ApiToken[]> {
  const { userId, organizationId } = input;
  return apiTokenRepository.findByUserAndOrganization(userId, organizationId);
}
