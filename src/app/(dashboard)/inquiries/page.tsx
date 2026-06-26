import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { listInquiries, listDeals } from "@/application/usecases";
import { PageToolbar, ToolbarActions } from "@/app/components";
import { sourceLabels } from "@/app/(dashboard)/labels";
import { InquiryListView } from "./InquiryListView";

export default async function InquiriesPage() {
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const [allInquiries, deals] = await Promise.all([
    listInquiries(organizationId),
    listDeals(organizationId),
  ]);

  // inquiryId → dealId マップ
  const dealMap = deals
    .filter((d) => d.inquiryId != null)
    .reduce<Map<string, string>>((map, d) => {
      map.set(d.inquiryId!, d.id);
      return map;
    }, new Map());

  const inquiryRows = allInquiries.map((inq) => ({
    id: inq.id,
    title: inq.title,
    clientName: inq.clientName,
    source: inq.source,
    status: inq.status,
    createdAt: inq.createdAt.toISOString(),
    dealId: dealMap.get(inq.id) ?? null,
  }));

  const sources = Object.entries(sourceLabels).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <div>
      <PageToolbar
        title="引き合い管理"
        actions={
          <ToolbarActions>
            <Link href="/inquiries/new" className="text-xs text-primary underline">
              [新規登録]
            </Link>
          </ToolbarActions>
        }
      />

      <InquiryListView inquiries={inquiryRows} sources={sources} />
    </div>
  );
}
