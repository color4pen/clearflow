import { clientRepository } from "@/infrastructure/repositories";
import type { Client } from "@/domain/models/client";

export async function getClient(clientId: string, organizationId: string): Promise<Client | null> {
  return clientRepository.findById(clientId, organizationId);
}
