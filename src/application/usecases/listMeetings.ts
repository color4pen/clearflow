import { meetingRepository } from "@/infrastructure/repositories";
import type { Meeting } from "@/domain/models/meeting";

export async function listMeetings(dealId: string, organizationId: string): Promise<Meeting[]> {
  return meetingRepository.findAllByDeal(dealId, organizationId);
}
