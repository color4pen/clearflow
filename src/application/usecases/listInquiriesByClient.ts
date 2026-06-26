import { inquiryRepository } from "@/infrastructure/repositories";
import type { Inquiry } from "@/domain/models/inquiry";

export async function listInquiriesByClient(clientId: string, organizationId: string): Promise<Inquiry[]> {
  return inquiryRepository.findByClientId(clientId, organizationId);
}
