import Link from "next/link";
import { getInquiry, getContract } from "@/application/usecases";
import type { OriginType } from "@/domain/models/approvalPolicy";

type Props = {
  originType: OriginType;
  originTriggerAction: string | null;
  originTriggerEntityId: string | null;
  organizationId: string;
};

export async function SystemOriginBanner({
  originType,
  originTriggerAction,
  originTriggerEntityId,
  organizationId,
}: Props) {
  if (originType !== "system") return null;
  if (!originTriggerAction || !originTriggerEntityId) return null;

  if (originTriggerAction === "inquiry.convert") {
    let entityTitle: string | null = null;
    let entityLink: string | null = null;

    try {
      const inquiry = await getInquiry({
        inquiryId: originTriggerEntityId,
        organizationId,
      });
      if (!inquiry) return null;
      entityTitle = inquiry.title;
      entityLink = `/inquiries/${inquiry.id}`;
    } catch {
      return null;
    }

    return (
      <Banner>
        この承認は引合「
        <Link href={entityLink!} className="underline font-semibold hover:opacity-80">
          {entityTitle}
        </Link>
        」の案件化に必要です
      </Banner>
    );
  }

  if (originTriggerAction === "contract.create" || originTriggerAction === "contract.cancel") {
    let entityTitle: string | null = null;
    let entityLink: string | null = null;

    try {
      const contract = await getContract({
        contractId: originTriggerEntityId,
        organizationId,
      });
      if (!contract) return null;
      entityTitle = contract.title;
      entityLink = `/contracts/${contract.id}`;
    } catch {
      return null;
    }

    return (
      <Banner>
        この承認は契約「
        <Link href={entityLink!} className="underline font-semibold hover:opacity-80">
          {entityTitle}
        </Link>
        」に必要です
      </Banner>
    );
  }

  return null;
}

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
      <span className="text-blue-500 text-sm mt-0.5 flex-shrink-0">ℹ</span>
      <p className="text-xs text-blue-800">{children}</p>
    </div>
  );
}
