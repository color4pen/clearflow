import { requestRepository } from "@/infrastructure/repositories";
import type { RequestWithSteps } from "@/domain/models/request";

export async function listRequests(organizationId: string): Promise<RequestWithSteps[]> {
  return requestRepository.findAllWithStepsByOrganization(organizationId);
}
