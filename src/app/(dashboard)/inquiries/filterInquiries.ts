import type { InquiryStatus } from "@/domain/models/inquiry";

export type InquiryRow = {
  id: string;
  title: string;
  clientName: string | null;
  source: string;
  status: InquiryStatus;
  createdAt: string;
  dealId: string | null;
};

export type TabValue = "all" | "new" | "converted" | "declined";

export type FilterParams = {
  activeTab: TabValue;
  sourceFilter: string;
  searchQuery: string;
};

export function filterInquiries(
  inquiries: InquiryRow[],
  { activeTab, sourceFilter, searchQuery }: FilterParams,
): InquiryRow[] {
  return inquiries.filter((row) => {
    if (activeTab !== "all" && row.status !== activeTab) return false;
    if (sourceFilter !== "" && row.source !== sourceFilter) return false;
    if (searchQuery !== "") {
      const q = searchQuery.toLowerCase();
      const titleMatch = row.title.toLowerCase().includes(q);
      const clientMatch = (row.clientName ?? "").toLowerCase().includes(q);
      if (!titleMatch && !clientMatch) return false;
    }
    return true;
  });
}
