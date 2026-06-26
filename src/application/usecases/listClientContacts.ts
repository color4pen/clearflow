import { clientRepository } from "@/infrastructure/repositories";
import type { ClientContact } from "@/domain/models/client";

/** @note organizationId を引数に取らない。呼び出し前に getClient 等でテナント検証を完了させること。 */
export async function listClientContacts(clientId: string): Promise<ClientContact[]> {
  return clientRepository.findContactsByClientId(clientId);
}
