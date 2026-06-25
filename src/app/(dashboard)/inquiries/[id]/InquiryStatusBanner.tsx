import Link from "next/link";
import type { InquiryStatus } from "@/domain/models/inquiry";

type Props = {
  status: InquiryStatus;
  dealId: string | null;
  dealTitle: string | null;
  hasPendingApproval: boolean;
};

export function InquiryStatusBanner({ status, dealId, dealTitle, hasPendingApproval }: Props) {
  if (status === "new" && hasPendingApproval) {
    return (
      <div
        className="text-sm px-4 py-3 mb-3"
        style={{
          backgroundColor: "#eef5fb",
          borderLeft: "3px solid #2980b9",
        }}
      >
        案件化の承認待ちです
      </div>
    );
  }

  if (status === "converted" && dealId) {
    return (
      <div
        className="text-sm px-4 py-3 mb-3 flex items-center gap-2"
        style={{
          backgroundColor: "#eef7f1",
          borderLeft: "3px solid #cde6d8",
        }}
      >
        <span>案件化済み</span>
        {dealTitle && (
          <Link href={`/deals/${dealId}`} className="text-primary underline font-bold">
            {dealTitle}
          </Link>
        )}
        {!dealTitle && (
          <Link href={`/deals/${dealId}`} className="text-primary underline font-bold">
            案件を見る
          </Link>
        )}
      </div>
    );
  }

  return null;
}
