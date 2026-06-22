"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateContractAction } from "@/app/actions/contracts";
import { Input, Select, MoneyInput, preventEnterSubmit } from "@/app/components";
import { contractTypeLabels, renewalTypeLabels } from "@/app/(dashboard)/labels";
import type { RenewalType } from "@/domain/models/contract";

type ContractInfo = {
  id: string;
  title: string;
  contractType: string | null;
  amount: number | null;
  startDate: Date | null;
  endDate: Date | null;
  paymentTerms: string | null;
  renewalType: RenewalType;
  renewalCycle: string | null;
  createdAt: Date;
};

type Props = {
  contract: ContractInfo;
  editable: boolean;
};

export function ContractInfoSection({ contract, editable }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startDateStr = contract.startDate
    ? contract.startDate.toISOString().slice(0, 10)
    : "";
  const endDateStr = contract.endDate
    ? contract.endDate.toISOString().slice(0, 10)
    : "";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await updateContractAction(contract.id, formData);
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
      <div className="flex gap-2">
        <dt className="text-text-muted w-24 shrink-0">契約名</dt>
        <dd className="text-text flex-1">
          <Input name="title" defaultValue={contract.title} disabled={!editable} placeholder="契約名を入力" />
        </dd>
      </div>
      <div className="flex gap-2 mt-1">
        <dt className="text-text-muted w-24 shrink-0">契約種別</dt>
        <dd className="text-text flex-1">
          <Select name="contractType" defaultValue={contract.contractType ?? ""} disabled={!editable}>
            <option value="">-</option>
            {Object.entries(contractTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </dd>
      </div>
      <div className="flex gap-2 mt-1">
        <dt className="text-text-muted w-24 shrink-0">金額</dt>
        <dd className="text-text flex-1">
          <MoneyInput name="amount" defaultValue={contract.amount} disabled={!editable} />
        </dd>
      </div>
      <div className="flex gap-2 mt-1">
        <dt className="text-text-muted w-24 shrink-0">開始日</dt>
        <dd className="text-text flex-1">
          <Input type="date" name="startDate" defaultValue={startDateStr} disabled={!editable} />
        </dd>
      </div>
      <div className="flex gap-2 mt-1">
        <dt className="text-text-muted w-24 shrink-0">終了日</dt>
        <dd className="text-text flex-1">
          <Input type="date" name="endDate" defaultValue={endDateStr} disabled={!editable} />
        </dd>
      </div>
      <div className="flex gap-2 mt-1">
        <dt className="text-text-muted w-24 shrink-0">支払条件</dt>
        <dd className="text-text flex-1">
          <Input name="paymentTerms" defaultValue={contract.paymentTerms ?? ""} disabled={!editable} placeholder="例: 月末締め翌月払い" />
        </dd>
      </div>
      <div className="flex gap-2 mt-1">
        <dt className="text-text-muted w-24 shrink-0">更新種別</dt>
        <dd className="text-text flex-1">
          <Select name="renewalType" defaultValue={contract.renewalType} disabled={!editable}>
            {Object.entries(renewalTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </dd>
      </div>
      <div className="flex gap-2 mt-1">
        <dt className="text-text-muted w-24 shrink-0">更新サイクル</dt>
        <dd className="text-text flex-1">
          <Input name="renewalCycle" defaultValue={contract.renewalCycle ?? ""} disabled={!editable} placeholder="例: 1年" />
        </dd>
      </div>
      <div className="flex gap-2 mt-1">
        <dt className="text-text-muted w-24 shrink-0">作成日</dt>
        <dd className="text-text">{contract.createdAt.toLocaleDateString("ja-JP")}</dd>
      </div>
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
