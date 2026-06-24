import { invoiceRepository } from "@/infrastructure/repositories";
import type { Invoice, InvoiceStatus } from "@/domain/models/invoice";

export async function listInvoicesByOrganization(data: {
  organizationId: string;
  status?: InvoiceStatus;
  paidAtFrom?: Date;
  paidAtTo?: Date;
  issueDateFrom?: Date;
  issueDateTo?: Date;
}): Promise<Invoice[]> {
  return invoiceRepository.findAllByOrganization(data.organizationId, {
    status: data.status,
    paidAtFrom: data.paidAtFrom,
    paidAtTo: data.paidAtTo,
    issueDateFrom: data.issueDateFrom,
    issueDateTo: data.issueDateTo,
  });
}
