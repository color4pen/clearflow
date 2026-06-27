import { inquiryRepository, clientRepository } from "@/infrastructure/repositories";

export async function searchInquiries(
  organizationId: string,
  query: string
): Promise<{ id: string; label: string }[]> {
  const inquiries = await inquiryRepository.searchByTitle(organizationId, query);

  // 引合タイトルだけでは顧客の区別が付かないため、ラベルに顧客名を添える（顧客未確定の引合もあるため null 許容）
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

  return inquiries.map((inquiry) => {
    const clientName = inquiry.clientId
      ? clientNameById.get(inquiry.clientId)
      : undefined;
    return {
      id: inquiry.id,
      label: clientName ? `${clientName} / ${inquiry.title}` : inquiry.title,
    };
  });
}
