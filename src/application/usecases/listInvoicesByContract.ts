import { invoiceRepository } from "@/infrastructure/repositories";
import type { Invoice } from "@/domain/models/invoice";

export async function listInvoicesByContract(data: {
  contractId: string;
  organizationId: string;
}): Promise<Invoice[]> {
  return invoiceRepository.findAllByContract(data.contractId, data.organizationId);
}
