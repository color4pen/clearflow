import { userRepository } from "@/infrastructure/repositories";
import type { User } from "@/domain/models/user";

export async function listOrganizationUsers(data: {
  organizationId: string;
}): Promise<User[]> {
  return userRepository.findByOrganization(data.organizationId);
}
