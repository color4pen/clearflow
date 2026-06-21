import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { dealRepository, inquiryRepository } from "@/infrastructure/repositories";
import { DealMeetingForm } from "./DealMeetingForm";

export default async function DealMeetingNewPage({
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

  // 引き合いの clientId を取得して DealMeetingForm に渡す
  const inquiry = deal.inquiryId
    ? await inquiryRepository.findById(deal.inquiryId, organizationId)
    : null;
  const clientId = inquiry?.clientId ?? null;

  return (
    <div>
      <div className="bg-bg-toolbar border border-border px-2 py-1 mb-0">
        <span className="text-sm font-bold text-text">商談記録</span>
        <span className="text-text-muted text-xs ml-2">
          <Link href="/deals" className="text-primary underline">案件一覧</Link>
          {" > "}
          <Link href={`/deals/${id}`} className="text-primary underline">{deal.title}</Link>
          {" > "}商談記録
        </span>
      </div>
      <DealMeetingForm dealId={id} clientId={clientId} />
    </div>
  );
}
