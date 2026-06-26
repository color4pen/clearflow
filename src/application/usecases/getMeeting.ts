import { meetingRepository } from "@/infrastructure/repositories";
import type { Meeting } from "@/domain/models/meeting";

export async function getMeeting(meetingId: string, organizationId: string): Promise<Meeting | null> {
  return meetingRepository.findById(meetingId, organizationId);
}
