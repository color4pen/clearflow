"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateContractAction } from "@/app/actions/contracts";
import type { Contract } from "@/domain/models/contract";

type Props = {
  contract: Contract;
};

export function ContractEditForm({ contract }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [renewalType, setRenewalType] = useState(contract.renewalType);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const result = await updateContractAction(contract.id, formData);
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.message ?? "エラーが発生しました");
    } else {
      router.push(`/contracts/${contract.id}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {errorMessage && (
        <p className="text-danger text-xs">{errorMessage}</p>
      )}

      <div className="space-y-1">
        <label className="text-xs text-text-muted" htmlFor="title">
          契約名
        </label>
        <input
          id="title"
          name="title"
          type="text"
          defaultValue={contract.title}
          className="w-full border border-border px-2 py-1 text-sm text-text bg-bg-input"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-text-muted" htmlFor="contractType">
          契約種別
        </label>
        <select
          id="contractType"
          name="contractType"
          defaultValue={contract.contractType ?? ""}
          className="w-full border border-border px-2 py-1 text-sm text-text bg-bg-input"
        >
          <option value="">未設定</option>
          <option value="quasi_delegation">準委任</option>
          <option value="fixed_price">請負</option>
          <option value="ses">SES</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-text-muted" htmlFor="amount">
          金額（円）
        </label>
        <input
          id="amount"
          name="amount"
          type="number"
          defaultValue={contract.amount ?? ""}
          min={0}
          className="w-full border border-border px-2 py-1 text-sm text-text bg-bg-input"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-text-muted" htmlFor="startDate">
          開始日
        </label>
        <input
          id="startDate"
          name="startDate"
          type="date"
          defaultValue={
            contract.startDate ? contract.startDate.toISOString().split("T")[0] : ""
          }
          className="w-full border border-border px-2 py-1 text-sm text-text bg-bg-input"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-text-muted" htmlFor="endDate">
          終了日
        </label>
        <input
          id="endDate"
          name="endDate"
          type="date"
          defaultValue={
            contract.endDate ? contract.endDate.toISOString().split("T")[0] : ""
          }
          className="w-full border border-border px-2 py-1 text-sm text-text bg-bg-input"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-text-muted" htmlFor="paymentTerms">
          支払条件
        </label>
        <input
          id="paymentTerms"
          name="paymentTerms"
          type="text"
          defaultValue={contract.paymentTerms ?? ""}
          className="w-full border border-border px-2 py-1 text-sm text-text bg-bg-input"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-text-muted" htmlFor="renewalType">
          更新種別
        </label>
        <select
          id="renewalType"
          name="renewalType"
          value={renewalType}
          onChange={(e) => setRenewalType(e.target.value as typeof renewalType)}
          className="w-full border border-border px-2 py-1 text-sm text-text bg-bg-input"
        >
          <option value="one_time">スポット</option>
          <option value="recurring">定期</option>
        </select>
      </div>

      {renewalType === "recurring" && (
        <div className="space-y-1">
          <label className="text-xs text-text-muted" htmlFor="renewalCycle">
            更新サイクル
          </label>
          <input
            id="renewalCycle"
            name="renewalCycle"
            type="text"
            defaultValue={contract.renewalCycle ?? ""}
            placeholder="monthly / yearly"
            className="w-full border border-border px-2 py-1 text-sm text-text bg-bg-input"
          />
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary text-white text-xs font-bold px-4 py-1.5 disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? "保存中..." : "保存"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="border border-border text-text text-xs px-4 py-1.5 cursor-pointer"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
