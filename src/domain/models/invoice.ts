export type InvoiceStatus = "scheduled" | "invoiced" | "paid" | "overdue";

export type Invoice = {
  id: string;
  organizationId: string;
  contractId: string;
  title: string;
  amount: number;
  dueDate: Date | null;
  status: InvoiceStatus;
  invoicedAt: Date | null;
  paidAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};
