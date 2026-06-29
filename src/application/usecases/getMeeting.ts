import { interactionRepository } from "@/infrastructure/repositories";
import type { Interaction } from "@/domain/models/interaction";

export async function getMeeting(meetingId: string, organizationId: string): Promise<Interaction | null> {
  return interactionRepository.findById(meetingId, organizationId);
}
