import { inquiryRepository } from "@/infrastructure/repositories";

export async function searchInquiries(
  organizationId: string,
  query: string
): Promise<{ id: string; label: string }[]> {
  const inquiries = await inquiryRepository.searchByTitle(organizationId, query);
  return inquiries.map((inquiry) => ({ id: inquiry.id, label: inquiry.title }));
}
