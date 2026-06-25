"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateDealAction } from "@/app/actions/deals";
import { Input, Select, MoneyInput, preventEnterSubmit } from "@/app/components";
import { contractTypeLabels } from "@/app/(dashboard)/labels";

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
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const startDateStr = deal.estimatedStartDate
    ? deal.estimatedStartDate.toISOString().slice(0, 10)
    : "";
  const endDateStr = deal.estimatedEndDate
    ? deal.estimatedEndDate.toISOString().slice(0, 10)
    : "";

  function markDirty() {
    setIsDirty(true);
  }

  function handleCancel() {
    setIsEditing(false);
    setIsDirty(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await updateDealAction(deal.id, formData);
    setIsSubmitting(false);

    if (result.success) {
      setIsDirty(false);
      setIsEditing(false);
      router.refresh();
    } else {
      setError(result.message ?? "保存に失敗しました");
    }
  }

  // 表示モード
  if (!isEditing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-text">案件情報</h2>
          {editable && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-xs font-bold px-3 py-1 border border-border text-text-muted hover:text-text"
            >
              編集
            </button>
          )}
        </div>
        <div className="text-xs space-y-1">
          <div className="flex gap-2">
            <span className="text-text-muted w-[90px] shrink-0">案件名</span>
            <span className="text-text flex-1">{deal.title}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-text-muted w-[90px] shrink-0">想定金額</span>
            <span className="text-text flex-1">
              {deal.estimatedAmount != null
                ? `¥${deal.estimatedAmount.toLocaleString("ja-JP")}`
                : "-"}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-text-muted w-[90px] shrink-0">想定開始日</span>
            <span className="text-text flex-1">
              {deal.estimatedStartDate
                ? deal.estimatedStartDate.toLocaleDateString("ja-JP")
                : "-"}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-text-muted w-[90px] shrink-0">想定終了日</span>
            <span className="text-text flex-1">
              {deal.estimatedEndDate
                ? deal.estimatedEndDate.toLocaleDateString("ja-JP")
                : "-"}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-text-muted w-[90px] shrink-0">契約種別</span>
            <span className="text-text flex-1">
              {deal.contractType
                ? contractTypeLabels[deal.contractType] ?? deal.contractType
                : "-"}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-text-muted w-[90px] shrink-0">作成日</span>
            <span className="text-text flex-1">
              {deal.createdAt.toLocaleDateString("ja-JP")}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 編集モード
  return (
    <form onSubmit={handleSubmit} onKeyDown={preventEnterSubmit}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold text-text">案件情報</h2>
        <div className="flex items-center gap-2">
          {error && <span className="text-danger text-xs">{error}</span>}
          <button
            type="button"
            onClick={handleCancel}
            className="text-xs px-3 py-1 border border-border text-text-muted hover:text-text"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={!isDirty || isSubmitting}
            className={`text-xs font-bold px-3 py-1 ${
              isDirty
                ? "bg-green-600 text-white cursor-pointer"
                : "bg-bg-toolbar border border-border text-text-muted cursor-not-allowed"
            } disabled:opacity-50`}
          >
            {isSubmitting ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
      <dl className="text-xs space-y-1">
        <div className="flex gap-2">
          <dt className="text-text-muted w-[90px] shrink-0">案件名</dt>
          <dd className="text-text flex-1">
            <Input name="title" defaultValue={deal.title} onChange={markDirty} />
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-text-muted w-[90px] shrink-0">想定金額</dt>
          <dd className="text-text flex-1">
            <MoneyInput
              name="estimatedAmount"
              defaultValue={deal.estimatedAmount}
              onChange={markDirty}
            />
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-text-muted w-[90px] shrink-0">想定開始日</dt>
          <dd className="text-text flex-1">
            <Input
              type="date"
              name="estimatedStartDate"
              defaultValue={startDateStr}
              onChange={markDirty}
            />
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-text-muted w-[90px] shrink-0">想定終了日</dt>
          <dd className="text-text flex-1">
            <Input
              type="date"
              name="estimatedEndDate"
              defaultValue={endDateStr}
              onChange={markDirty}
            />
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-text-muted w-[90px] shrink-0">契約種別</dt>
          <dd className="text-text flex-1">
            <Select
              name="contractType"
              defaultValue={deal.contractType ?? ""}
              onChange={markDirty}
            >
              <option value="">-</option>
              {Object.entries(contractTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-text-muted w-[90px] shrink-0">作成日</dt>
          <dd className="text-text px-2 py-1">
            {deal.createdAt.toLocaleDateString("ja-JP")}
          </dd>
        </div>
      </dl>
    </form>
  );
}
