import { dealRepository } from "@/infrastructure/repositories";

export async function searchDeals(
  organizationId: string,
  query: string
): Promise<{ id: string; label: string }[]> {
  const deals = await dealRepository.searchByTitle(organizationId, query);
  return deals.map((deal) => ({ id: deal.id, label: deal.title }));
}
