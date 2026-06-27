import { inquiryRepository, clientRepository } from "@/infrastructure/repositories";
import type { LinkTargetResult } from "./searchDeals";

export async function searchInquiries(
  organizationId: string,
  query: string
): Promise<LinkTargetResult[]> {
  const inquiries = await inquiryRepository.searchByTitle(organizationId, query);

  // タイトルだけでは顧客の区別が付かないため顧客名を解決する（顧客未確定の引合もあるため null 許容）
  const clientIds = [
    ...new Set(
      inquiries
        .map((inquiry) => inquiry.clientId)
        .filter((id): id is string => id !== null)
    ),
  ];
  const clients = await Promise.all(
    clientIds.map((id) => clientRepository.findById(id, organizationId))
  );
  const clientNameById = new Map<string, string>();
  for (const client of clients) {
    if (client) clientNameById.set(client.id, client.name);
  }

  return inquiries.map((inquiry) => ({
    id: inquiry.id,
    primary: inquiry.title,
    secondary: inquiry.clientId
      ? clientNameById.get(inquiry.clientId) ?? null
      : null,
    href: `/inquiries/${inquiry.id}`,
  }));
}
