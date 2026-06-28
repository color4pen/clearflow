import { clientRepository } from "@/infrastructure/repositories";
import type { ClientContact } from "@/domain/models/client";

/** organizationId で repository がテナント分離を強制する。 */
export async function listClientContacts(clientId: string, organizationId: string): Promise<ClientContact[]> {
  return clientRepository.findContactsByClientId(clientId, organizationId);
}
