import { meetingRepository } from "@/infrastructure/repositories";
import type { Meeting } from "@/domain/models/meeting";

export async function listMeetingsByInquiry(inquiryId: string, organizationId: string): Promise<Meeting[]> {
  return meetingRepository.findAllByInquiry(inquiryId, organizationId);
}
