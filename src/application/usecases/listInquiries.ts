import { inquiryRepository } from "@/infrastructure/repositories";
import type { InquiryWithClient } from "@/domain/models/inquiry";

export async function listInquiries(organizationId: string): Promise<InquiryWithClient[]> {
  return inquiryRepository.findAllWithClientByOrganization(organizationId);
}
