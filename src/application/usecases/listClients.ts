import { clientRepository } from "@/infrastructure/repositories";
import type { Client } from "@/domain/models/client";

export async function listClients(organizationId: string): Promise<Client[]> {
  return clientRepository.findAllByOrganization(organizationId);
}
