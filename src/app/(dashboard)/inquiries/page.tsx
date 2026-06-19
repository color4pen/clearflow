import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { listInquiries } from "@/application/usecases";
import { PageToolbar, ToolbarActions, DataTable } from "@/app/components";

const statusLabels: Record<string, string> = {
  new: "新規",
  in_progress: "対応中",
  converted: "商談化済",
  declined: "見送り",
};

const sourceLabels: Record<string, string> = {
  web: "Web",
  phone: "電話",
  referral: "紹介",
  exhibition: "展示会",
  other: "その他",
};

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusFilter } = await searchParams;
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const allInquiries = await listInquiries(organizationId);

  const filtered = statusFilter
    ? allInquiries.filter((inq) => inq.status === statusFilter)
    : allInquiries;

  const newCount = allInquiries.filter((i) => i.status === "new").length;
  const inProgressCount = allInquiries.filter((i) => i.status === "in_progress").length;
  const convertedCount = allInquiries.filter((i) => i.status === "converted").length;
  const declinedCount = allInquiries.filter((i) => i.status === "declined").length;

  const filterLinkClass = (s: string | undefined) =>
    s === statusFilter || (s === undefined && !statusFilter)
      ? "text-xs text-text underline font-bold"
      : "text-xs text-primary underline";

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
      >
        <span className="text-xs text-text-secondary">
          <Link href="/inquiries" className={filterLinkClass(undefined)}>全て {allInquiries.length}</Link>
          {" · "}
          <Link href="?status=new" className={filterLinkClass("new")}>新規 {newCount}</Link>
          {" · "}
          <Link href="?status=in_progress" className={filterLinkClass("in_progress")}>対応中 {inProgressCount}</Link>
          {" · "}
          <Link href="?status=converted" className={filterLinkClass("converted")}>商談化済 {convertedCount}</Link>
          {" · "}
          <Link href="?status=declined" className={filterLinkClass("declined")}>見送り {declinedCount}</Link>
        </span>
      </PageToolbar>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-text-disabled text-sm bg-bg-surface border border-border border-t-0">
          <p>引き合いがありません</p>
          <Link
            href="/inquiries/new"
            className="mt-2 inline-block text-primary underline text-xs"
          >
            最初の引き合いを登録する
          </Link>
        </div>
      ) : (
        <DataTable
          columns={[
            {
              key: "status",
              header: "ステータス",
              render: (row) => statusLabels[row.status] ?? row.status,
            },
            {
              key: "title",
              header: "件名",
              render: (row) => (
                <Link href={`/inquiries/${row.id}`} className="text-primary underline">
                  {row.title}
                </Link>
              ),
            },
            {
              key: "clientName",
              header: "顧客名",
              render: (row) => row.clientName,
            },
            {
              key: "source",
              header: "流入経路",
              render: (row) => sourceLabels[row.source] ?? row.source,
            },
            {
              key: "createdAt",
              header: "作成日",
              render: (row) => row.createdAt.toLocaleDateString("ja-JP"),
            },
          ]}
          rows={filtered}
          rowKey={(row) => row.id}
          footer={`${filtered.length} 件`}
        />
      )}
    </div>
  );
}
