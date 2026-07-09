"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createInvoiceAction } from "@/app/actions/invoices";
import { FormField, Input, SectionCard, preventEnterSubmit, SubmitButton } from "@/app/components";
import { BTN_SECONDARY } from "@/app/(dashboard)/styles";
import { MoneyInput } from "@/app/components/MoneyInput";

type Props = {
  contractId: string;
  remainingAmount?: number | null;
};

export function NewInvoiceForm({ contractId, remainingAmount }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [issueDate, setIssueDate] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");

  function validateDates(): string | null {
    if (issueDate && dueDate && issueDate > dueDate) {
      return "請求予定日は支払期限以前の日付を入力してください";
    }
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const dateError = validateDates();
    if (dateError) {
      setErrorMessage(dateError);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const result = await createInvoiceAction(formData);
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.message ?? "エラーが発生しました");
    } else {
      router.push(`/contracts/${contractId}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} onKeyDown={preventEnterSubmit}>
      <SectionCard className="p-3">
        <input type="hidden" name="contractId" value={contractId} />

        {errorMessage && (
          <p className="text-danger text-xs mb-2">{errorMessage}</p>
        )}

        {remainingAmount !== null && remainingAmount !== undefined && (
          <div className="mb-3 p-2 bg-bg-toolbar border border-border text-xs text-text-muted">
            残り請求可能金額: <span className="font-bold text-text">¥{remainingAmount.toLocaleString("ja-JP")}</span>
          </div>
        )}

        <FormField label="タイトル" htmlFor="invoice-title">
          <Input
            id="invoice-title"
            name="title"
            type="text"
            required
            maxLength={255}
            placeholder="着手金、中間金など"
          />
        </FormField>

        <FormField label="金額（円）" htmlFor="invoice-amount">
          <MoneyInput
            name="amount"
            placeholder="1,000,000"
          />
        </FormField>

        <FormField label="請求日" htmlFor="invoice-issue-date">
          <Input
            id="invoice-issue-date"
            name="issueDate"
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
          />
        </FormField>

        <FormField label="支払期日" htmlFor="invoice-due-date">
          <Input
            id="invoice-due-date"
            name="dueDate"
            type="date"
            required
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </FormField>

        <FormField label="備考" htmlFor="invoice-notes">
          <textarea
            id="invoice-notes"
            name="notes"
            rows={3}
            maxLength={1000}
            placeholder="任意"
            className="border border-border text-xs px-2 py-1 w-full bg-bg-surface text-text resize-none"
          />
        </FormField>

        <div className="flex gap-2 mt-3">
          <SubmitButton pending={isSubmitting}>請求を作成</SubmitButton>
          <button
            type="button"
            onClick={() => router.push(`/contracts/${contractId}`)}
            className={BTN_SECONDARY}
          >
            キャンセル
          </button>
        </div>
      </SectionCard>
    </form>
  );
}
