import { invoiceRepository, contractRepository } from "@/infrastructure/repositories";
import type { Invoice } from "@/domain/models/invoice";
import type { Contract } from "@/domain/models/contract";

export type GetInvoiceResult = { invoice: Invoice; contract: Contract } | null;

export async function getInvoice(data: {
  invoiceId: string;
  organizationId: string;
}): Promise<GetInvoiceResult> {
  const invoice = await invoiceRepository.findById(data.invoiceId, data.organizationId);
  if (!invoice) {
    return null;
  }

  const contract = await contractRepository.findById(invoice.contractId, data.organizationId);
  if (!contract) {
    return null;
  }

  return { invoice, contract };
}
