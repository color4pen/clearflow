import { organizationRepository } from "@/infrastructure/repositories";
import type { Organization } from "@/domain/models/organization";

export async function listAllOrganizations(): Promise<Organization[]> {
  return organizationRepository.findAll();
}
