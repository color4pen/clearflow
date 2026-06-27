import { dealRepository, clientRepository } from "@/infrastructure/repositories";

export async function searchDeals(
  organizationId: string,
  query: string
): Promise<{ id: string; label: string }[]> {
  const deals = await dealRepository.searchByTitle(organizationId, query);

  // 案件タイトルだけでは顧客の区別が付かないため、ラベルに顧客名を添える
  const clientIds = [...new Set(deals.map((deal) => deal.clientId))];
  const clients = await Promise.all(
    clientIds.map((id) => clientRepository.findById(id, organizationId))
  );
  const clientNameById = new Map<string, string>();
  for (const client of clients) {
    if (client) clientNameById.set(client.id, client.name);
  }

  return deals.map((deal) => {
    const clientName = clientNameById.get(deal.clientId);
    return {
      id: deal.id,
      label: clientName ? `${clientName} / ${deal.title}` : deal.title,
    };
  });
}
