import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import {
  inquiryRepository,
  clientRepository,
  approvalTemplateRepository,
} from "@/infrastructure/repositories";
import { SectionCard } from "@/app/components";
import { InquiryActions } from "./InquiryActions";

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

export default async function InquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const inquiry = await inquiryRepository.findById(id, organizationId);
  if (!inquiry) {
    notFound();
  }

  const [client, templates] = await Promise.all([
    clientRepository.findById(inquiry.clientId, organizationId),
    approvalTemplateRepository.findByOrganization(organizationId),
  ]);

  const canChangeStatus =
    session!.user.role === "admin" || session!.user.role === "manager";

  return (
    <div>
      <div className="bg-bg-toolbar border border-border px-2 py-1 mb-2">
        <span className="text-sm font-bold text-text">{inquiry.title}</span>
        <span className="text-text-muted text-xs ml-2">
          <Link href="/inquiries" className="text-primary underline">引き合い一覧</Link>
          {" > "}詳細
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <SectionCard className="p-3">
          <h2 className="text-xs font-bold text-text mb-2">引き合い情報</h2>
          <dl className="text-xs space-y-1">
            <div className="flex gap-2">
              <dt className="text-text-muted w-20 shrink-0">件名</dt>
              <dd className="text-text">{inquiry.title}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-20 shrink-0">ステータス</dt>
              <dd className="text-text">{statusLabels[inquiry.status] ?? inquiry.status}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-20 shrink-0">顧客</dt>
              <dd className="text-text">
                {client ? (
                  <Link href={`/clients/${client.id}`} className="text-primary underline">
                    {client.name}
                  </Link>
                ) : "-"}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-20 shrink-0">流入経路</dt>
              <dd className="text-text">{sourceLabels[inquiry.source] ?? inquiry.source}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-20 shrink-0">概要</dt>
              <dd className="text-text">{inquiry.description ?? "-"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-20 shrink-0">作成日</dt>
              <dd className="text-text">{inquiry.createdAt.toLocaleDateString("ja-JP")}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-20 shrink-0">更新日</dt>
              <dd className="text-text">{inquiry.updatedAt.toLocaleDateString("ja-JP")}</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard className="p-3">
          <h2 className="text-xs font-bold text-text mb-2">承認情報</h2>
          {inquiry.requestId ? (
            <div className="text-xs">
              <p className="text-text-muted mb-1">関連する承認リクエスト</p>
              <Link
                href={`/requests/${inquiry.requestId}`}
                className="text-primary underline"
              >
                承認リクエストを表示
              </Link>
            </div>
          ) : (
            <p className="text-xs text-text-muted">承認リクエストはありません</p>
          )}
        </SectionCard>
      </div>

      {/* ステータス変更 */}
      <SectionCard className="p-3">
        <h2 className="text-xs font-bold text-text mb-2">ステータス変更</h2>
        <InquiryActions
          inquiry={{
            id: inquiry.id,
            status: inquiry.status,
          }}
          templates={templates.map((t) => ({ id: t.id, name: t.name }))}
          canChangeStatus={canChangeStatus}
        />
      </SectionCard>
    </div>
  );
}
