"use client";

import { useRouter } from "next/navigation";
import { updateDealAction } from "@/app/actions/deals";
import { InlineEditText, InlineEditSelect, InlineEditDate, InlineEditMoney } from "@/app/components";
import { phaseLabels, contractTypeLabels } from "@/app/(dashboard)/labels";

type DealInfo = {
  id: string;
  title: string;
  phase: string;
  estimatedAmount: number | null;
  estimatedStartDate: Date | null;
  estimatedEndDate: Date | null;
  contractType: string | null;
  createdAt: Date;
};

type Props = {
  deal: DealInfo;
  editable: boolean;
};

const phaseOptions = Object.entries(phaseLabels).map(([value, label]) => ({ value, label }));

const contractTypeOptions = [
  { value: "", label: "-" },
  ...Object.entries(contractTypeLabels).map(([value, label]) => ({ value, label })),
];

export function DealInfoSection({ deal, editable }: Props) {
  const router = useRouter();

  async function saveTitle(newValue: string) {
    const fd = new FormData();
    fd.set("title", newValue);
    const result = await updateDealAction(deal.id, fd);
    if (result.success) router.refresh();
    return result;
  }

  async function savePhase(newValue: string) {
    const fd = new FormData();
    fd.set("phase", newValue);
    const result = await updateDealAction(deal.id, fd);
    if (result.success) router.refresh();
    return result;
  }

  async function saveAmount(newValue: string) {
    const fd = new FormData();
    fd.set("estimatedAmount", newValue);
    const result = await updateDealAction(deal.id, fd);
    if (result.success) router.refresh();
    return result;
  }

  async function saveStartDate(newValue: string) {
    const fd = new FormData();
    fd.set("estimatedStartDate", newValue);
    const result = await updateDealAction(deal.id, fd);
    if (result.success) router.refresh();
    return result;
  }

  async function saveEndDate(newValue: string) {
    const fd = new FormData();
    fd.set("estimatedEndDate", newValue);
    const result = await updateDealAction(deal.id, fd);
    if (result.success) router.refresh();
    return result;
  }

  async function saveContractType(newValue: string) {
    const fd = new FormData();
    fd.set("contractType", newValue);
    const result = await updateDealAction(deal.id, fd);
    if (result.success) router.refresh();
    return result;
  }

  async function confirmPhaseChange(newValue: string): Promise<boolean> {
    if (newValue === "won") {
      return window.confirm("フェーズを「受注」に変更しますか？");
    }
    if (newValue === "lost") {
      return window.confirm("フェーズを「失注」に変更しますか？");
    }
    return true;
  }

  const startDateStr = deal.estimatedStartDate
    ? deal.estimatedStartDate.toISOString().slice(0, 10)
    : null;
  const endDateStr = deal.estimatedEndDate
    ? deal.estimatedEndDate.toISOString().slice(0, 10)
    : null;

  return (
    <>
      <div className="flex gap-2">
        <dt className="text-text-muted w-24 shrink-0">案件名</dt>
        <dd className="text-text flex-1">
          <InlineEditText
            value={deal.title}
            onSave={saveTitle}
            editable={editable}
            placeholder="案件名を入力"
          />
        </dd>
      </div>
      <div className="flex gap-2">
        <dt className="text-text-muted w-24 shrink-0">フェーズ</dt>
        <dd className="text-text flex-1">
          <InlineEditSelect
            value={deal.phase}
            options={phaseOptions}
            onSave={savePhase}
            editable={editable}
            onBeforeSave={confirmPhaseChange}
          />
        </dd>
      </div>
      <div className="flex gap-2">
        <dt className="text-text-muted w-24 shrink-0">想定金額</dt>
        <dd className="text-text flex-1">
          <InlineEditMoney
            value={deal.estimatedAmount}
            onSave={saveAmount}
            editable={editable}
          />
        </dd>
      </div>
      <div className="flex gap-2">
        <dt className="text-text-muted w-24 shrink-0">想定開始日</dt>
        <dd className="text-text flex-1">
          <InlineEditDate
            value={startDateStr}
            onSave={saveStartDate}
            editable={editable}
          />
        </dd>
      </div>
      <div className="flex gap-2">
        <dt className="text-text-muted w-24 shrink-0">想定終了日</dt>
        <dd className="text-text flex-1">
          <InlineEditDate
            value={endDateStr}
            onSave={saveEndDate}
            editable={editable}
          />
        </dd>
      </div>
      <div className="flex gap-2">
        <dt className="text-text-muted w-24 shrink-0">契約種別</dt>
        <dd className="text-text flex-1">
          <InlineEditSelect
            value={deal.contractType ?? ""}
            options={contractTypeOptions}
            onSave={saveContractType}
            editable={editable}
          />
        </dd>
      </div>
      <div className="flex gap-2">
        <dt className="text-text-muted w-24 shrink-0">作成日</dt>
        <dd className="text-text">{deal.createdAt.toLocaleDateString("ja-JP")}</dd>
      </div>
    </>
  );
}
