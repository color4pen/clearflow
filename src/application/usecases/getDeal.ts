import { dealRepository } from "@/infrastructure/repositories";
import type { Deal } from "@/domain/models/deal";

export async function getDeal(id: string, organizationId: string): Promise<Deal | null> {
  return dealRepository.findById(id, organizationId);
}
