import { requestRepository } from "@/infrastructure/repositories";
import type { Request } from "@/domain/models/request";

export async function listRequests(organizationId: string): Promise<Request[]> {
  return requestRepository.findAllByOrganization(organizationId);
}
