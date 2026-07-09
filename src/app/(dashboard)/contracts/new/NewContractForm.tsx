"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createContractAction } from "@/app/actions/contracts";
import { SectionCard, FormField, Input, Select, preventEnterSubmit, MoneyInput, SubmitButton } from "@/app/components";
import { BTN_SECONDARY } from "@/app/(dashboard)/styles";

type DealInfo = {
  id: string;
  title: string;
  contractType: string | null;
  estimatedAmount: number | null;
  estimatedStartDate: string | null;
  estimatedEndDate: string | null;
};

type Props = {
  deal: DealInfo;
};

export function NewContractForm({ deal }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [renewalType, setRenewalType] = useState<string>("one_time");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const result = await createContractAction(formData);
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.message ?? "エラーが発生しました");
    } else if (result.contractId) {
      router.push(`/contracts/${result.contractId}`);
    } else {
      router.push(`/deals/${deal.id}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} onKeyDown={preventEnterSubmit}>
      <SectionCard className="p-3">
        <input type="hidden" name="dealId" value={deal.id} />

        {errorMessage && (
          <p className="text-danger text-xs mb-2">{errorMessage}</p>
        )}

        <FormField label="契約名">
          <Input name="title" defaultValue={deal.title} />
        </FormField>

        <FormField label="契約種別">
          <Select name="contractType" defaultValue={deal.contractType ?? ""}>
            <option value="">未設定</option>
            <option value="quasi_delegation">準委任</option>
            <option value="fixed_price">請負</option>
            <option value="ses">SES</option>
          </Select>
        </FormField>

        <FormField label="金額（円）">
          <MoneyInput
            name="amount"
            defaultValue={deal.estimatedAmount}
          />
        </FormField>

        <FormField label="開始日">
          <Input
            name="startDate"
            type="date"
            defaultValue={deal.estimatedStartDate ?? ""}
          />
        </FormField>

        <FormField label="終了日">
          <Input
            name="endDate"
            type="date"
            defaultValue={deal.estimatedEndDate ?? ""}
          />
        </FormField>

        <FormField label="支払条件">
          <Input name="paymentTerms" />
        </FormField>

        <FormField label="更新種別">
          <Select
            name="renewalType"
            value={renewalType}
            onChange={(e) => setRenewalType(e.target.value)}
          >
            <option value="one_time">スポット</option>
            <option value="recurring">定期</option>
          </Select>
        </FormField>

        {renewalType === "recurring" && (
          <FormField label="更新サイクル">
            <Input name="renewalCycle" placeholder="monthly / yearly" />
          </FormField>
        )}

        <div className="flex gap-2 mt-3">
          <SubmitButton pending={isSubmitting}>契約を作成</SubmitButton>
          <button
            type="button"
            onClick={() => router.back()}
            className={BTN_SECONDARY}
          >
            キャンセル
          </button>
        </div>
      </SectionCard>
    </form>
  );
}
