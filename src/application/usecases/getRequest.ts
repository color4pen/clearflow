import { requestRepository } from "@/infrastructure/repositories";
import type { Request } from "@/domain/models/request";

export async function getRequest(
  requestId: string,
  organizationId: string
): Promise<Request | null> {
  return requestRepository.findById(requestId, organizationId);
}
