import { dealRepository } from "@/infrastructure/repositories";
import type { Deal } from "@/domain/models/deal";

export async function getDealByInquiry(inquiryId: string, organizationId: string): Promise<Deal | null> {
  return dealRepository.findByInquiryId(inquiryId, organizationId);
}
