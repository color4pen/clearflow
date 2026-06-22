"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateDealAction } from "@/app/actions/deals";
import { Input, Select, MoneyInput, preventEnterSubmit } from "@/app/components";
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

export function DealInfoSection({ deal, editable }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState(deal.phase);

  const startDateStr = deal.estimatedStartDate
    ? deal.estimatedStartDate.toISOString().slice(0, 10)
    : "";
  const endDateStr = deal.estimatedEndDate
    ? deal.estimatedEndDate.toISOString().slice(0, 10)
    : "";

  function handlePhaseChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newValue = e.target.value;
    if (newValue === "won") {
      if (!window.confirm("フェーズを「受注」に変更しますか？")) {
        e.target.value = phase;
        return;
      }
    }
    if (newValue === "lost") {
      if (!window.confirm("フェーズを「失注」に変更しますか？")) {
        e.target.value = phase;
        return;
      }
    }
    setPhase(newValue);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await updateDealAction(deal.id, formData);
    setIsSubmitting(false);

    if (result.success) {
      router.refresh();
    } else {
      setError(result.message ?? "保存に失敗しました");
    }
  }

  return (
    <form onSubmit={handleSubmit} onKeyDown={preventEnterSubmit}>
      {error && <p className="text-danger text-xs mb-1">{error}</p>}
      <dl className="text-xs space-y-1">
        <div className="flex gap-2">
          <dt className="text-text-muted w-24 shrink-0">案件名</dt>
          <dd className="text-text flex-1">
            <Input name="title" defaultValue={deal.title} disabled={!editable} />
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-text-muted w-24 shrink-0">フェーズ</dt>
          <dd className="text-text flex-1">
            <Select
              name="phase"
              value={phase}
              onChange={handlePhaseChange}
              disabled={!editable}
            >
              {Object.entries(phaseLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-text-muted w-24 shrink-0">想定金額</dt>
          <dd className="text-text flex-1">
            <MoneyInput
              name="estimatedAmount"
              defaultValue={deal.estimatedAmount}
              disabled={!editable}
            />
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-text-muted w-24 shrink-0">想定開始日</dt>
          <dd className="text-text flex-1">
            <Input
              type="date"
              name="estimatedStartDate"
              defaultValue={startDateStr}
              disabled={!editable}
            />
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-text-muted w-24 shrink-0">想定終了日</dt>
          <dd className="text-text flex-1">
            <Input
              type="date"
              name="estimatedEndDate"
              defaultValue={endDateStr}
              disabled={!editable}
            />
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-text-muted w-24 shrink-0">契約種別</dt>
          <dd className="text-text flex-1">
            <Select
              name="contractType"
              defaultValue={deal.contractType ?? ""}
              disabled={!editable}
            >
              <option value="">-</option>
              {Object.entries(contractTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-text-muted w-24 shrink-0">作成日</dt>
          <dd className="text-text">{deal.createdAt.toLocaleDateString("ja-JP")}</dd>
        </div>
      </dl>
      {editable && (
        <div className="mt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary text-white text-xs font-bold px-4 py-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? "保存中..." : "保存"}
          </button>
        </div>
      )}
    </form>
  );
}
