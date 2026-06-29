import { interactionRepository } from "@/infrastructure/repositories";
import type { Interaction } from "@/domain/models/interaction";

export async function listMeetingsByInquiry(inquiryId: string, organizationId: string): Promise<Interaction[]> {
  return interactionRepository.findAllByInquiry(inquiryId, organizationId);
}
