import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import {
  dealRepository,
  inquiryRepository,
  clientRepository,
  approvalTemplateRepository,
} from "@/infrastructure/repositories";
import { SectionCard } from "@/app/components";
import { DealPhaseActions } from "./DealPhaseActions";
import { DealEditForm } from "./DealEditForm";

const phaseLabels: Record<string, string> = {
  proposal_prep: "提案準備",
  proposed: "提案済",
  negotiation: "交渉中",
  internal_approval: "内示",
  won: "受注",
  lost: "失注",
};

const contractTypeLabels: Record<string, string> = {
  quasi_delegation: "準委任",
  contract: "請負",
  ses: "SES",
};

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const deal = await dealRepository.findById(id, organizationId);
  if (!deal) {
    notFound();
  }

  const [inquiry, templates] = await Promise.all([
    inquiryRepository.findById(deal.inquiryId, organizationId),
    approvalTemplateRepository.findByOrganization(organizationId),
  ]);

  const client = inquiry
    ? await clientRepository.findById(inquiry.clientId, organizationId)
    : null;

  const canChangePhase =
    session!.user.role === "admin" || session!.user.role === "manager";

  return (
    <div>
      <div className="bg-bg-toolbar border border-border px-2 py-1 mb-2">
        <span className="text-sm font-bold text-text">{deal.title}</span>
        <span className="text-text-muted text-xs ml-2">
          <Link href="/deals" className="text-primary underline">案件一覧</Link>
          {" > "}詳細
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <SectionCard className="p-3">
          <h2 className="text-xs font-bold text-text mb-2">案件情報</h2>
          <dl className="text-xs space-y-1">
            <div className="flex gap-2">
              <dt className="text-text-muted w-24 shrink-0">案件名</dt>
              <dd className="text-text">{deal.title}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-24 shrink-0">フェーズ</dt>
              <dd className="text-text">{phaseLabels[deal.phase] ?? deal.phase}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-24 shrink-0">想定金額</dt>
              <dd className="text-text">
                {deal.estimatedAmount != null
                  ? `¥${deal.estimatedAmount.toLocaleString("ja-JP")}`
                  : "-"}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-24 shrink-0">想定開始日</dt>
              <dd className="text-text">
                {deal.estimatedStartDate
                  ? deal.estimatedStartDate.toLocaleDateString("ja-JP")
                  : "-"}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-24 shrink-0">想定終了日</dt>
              <dd className="text-text">
                {deal.estimatedEndDate
                  ? deal.estimatedEndDate.toLocaleDateString("ja-JP")
                  : "-"}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-24 shrink-0">契約種別</dt>
              <dd className="text-text">
                {deal.contractType ? contractTypeLabels[deal.contractType] ?? deal.contractType : "-"}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-24 shrink-0">備考</dt>
              <dd className="text-text">{deal.notes ?? "-"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-24 shrink-0">作成日</dt>
              <dd className="text-text">{deal.createdAt.toLocaleDateString("ja-JP")}</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard className="p-3">
          <h2 className="text-xs font-bold text-text mb-2">関連情報</h2>
          <dl className="text-xs space-y-1">
            <div className="flex gap-2">
              <dt className="text-text-muted w-24 shrink-0">引き合い</dt>
              <dd className="text-text">
                <Link
                  href={`/inquiries/${deal.inquiryId}`}
                  className="text-primary underline"
                >
                  {inquiry?.title ?? deal.inquiryId}
                </Link>
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-24 shrink-0">顧客</dt>
              <dd className="text-text">
                {client ? (
                  <Link href={`/clients/${client.id}`} className="text-primary underline">
                    {client.name}
                  </Link>
                ) : "-"}
              </dd>
            </div>
            {deal.estimateRequestId && (
              <div className="flex gap-2">
                <dt className="text-text-muted w-24 shrink-0">見積承認</dt>
                <dd className="text-text">
                  <Link
                    href={`/requests/${deal.estimateRequestId}`}
                    className="text-primary underline"
                  >
                    承認リクエストを表示
                  </Link>
                </dd>
              </div>
            )}
          </dl>
        </SectionCard>
      </div>

      {/* フェーズ変更 */}
      <SectionCard className="p-3 mb-2">
        <h2 className="text-xs font-bold text-text mb-2">フェーズ変更</h2>
        <DealPhaseActions
          deal={{ id: deal.id, phase: deal.phase }}
          templates={templates.map((t) => ({ id: t.id, name: t.name }))}
          canChangePhase={canChangePhase}
        />
      </SectionCard>

      {/* 案件情報編集 */}
      <SectionCard className="p-3">
        <h2 className="text-xs font-bold text-text mb-2">案件情報の編集</h2>
        <DealEditForm deal={deal} />
      </SectionCard>
    </div>
  );
}
