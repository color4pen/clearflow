import { invoiceRepository } from "@/infrastructure/repositories";

export async function getInvoiceSumByContract(contractId: string, organizationId: string): Promise<number> {
  return invoiceRepository.sumAmountByContract(contractId, organizationId);
}
