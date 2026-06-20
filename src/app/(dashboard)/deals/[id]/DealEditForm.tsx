"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateDealAction } from "@/app/actions/deals";
import { FormField, Input, Textarea, Select } from "@/app/components";
import type { Deal } from "@/domain/models/deal";

type Props = {
  deal: Deal;
};

export function DealEditForm({ deal }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    const formData = new FormData(e.currentTarget);
    const result = await updateDealAction(deal.id, formData);
    setIsSubmitting(false);
    if (!result.success) {
      setMessage(result.message ?? "更新に失敗しました");
    } else {
      setIsEditing(false);
      router.refresh();
    }
  }

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="text-xs text-primary underline cursor-pointer"
      >
        案件情報を編集
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {message && <p className="text-danger text-xs">{message}</p>}

      <FormField label="案件名">
        <Input name="title" defaultValue={deal.title} />
      </FormField>

      <FormField label="想定金額">
        <Input
          name="estimatedAmount"
          type="number"
          defaultValue={deal.estimatedAmount ?? ""}
        />
      </FormField>

      <FormField label="想定開始日">
        <Input
          name="estimatedStartDate"
          type="date"
          defaultValue={
            deal.estimatedStartDate
              ? deal.estimatedStartDate.toISOString().slice(0, 10)
              : ""
          }
        />
      </FormField>

      <FormField label="想定終了日">
        <Input
          name="estimatedEndDate"
          type="date"
          defaultValue={
            deal.estimatedEndDate
              ? deal.estimatedEndDate.toISOString().slice(0, 10)
              : ""
          }
        />
      </FormField>

      <FormField label="契約種別">
        <Select name="contractType" defaultValue={deal.contractType ?? ""}>
          <option value="">未設定</option>
          <option value="quasi_delegation">準委任</option>
          <option value="fixed_price">請負</option>
          <option value="ses">SES</option>
        </Select>
      </FormField>

      <FormField label="備考">
        <Textarea name="notes" defaultValue={deal.notes ?? ""} rows={3} />
      </FormField>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary text-white text-xs px-3 py-1 rounded-none cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? "保存中..." : "保存"}
        </button>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="text-xs text-text-muted underline"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
