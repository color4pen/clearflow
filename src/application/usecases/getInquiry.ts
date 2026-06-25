import { inquiryRepository } from "@/infrastructure/repositories";
import type { Inquiry } from "@/domain/models/inquiry";

export async function getInquiry(data: {
  inquiryId: string;
  organizationId: string;
}): Promise<Inquiry | null> {
  return inquiryRepository.findById(data.inquiryId, data.organizationId);
}
