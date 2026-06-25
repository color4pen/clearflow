import type { InquiryStatus } from "@/domain/models/inquiry";
import { statusLabels } from "@/app/(dashboard)/labels";

type Props = {
  status: InquiryStatus;
};

export function InquiryStatusBadge({ status }: Props) {
  return (
    <span className="inline-block px-[7px] py-[1px] rounded-[3px] bg-[#f5f5f5] border border-[#e0e0e0] text-xs">
      {statusLabels[status] ?? status}
    </span>
  );
}
