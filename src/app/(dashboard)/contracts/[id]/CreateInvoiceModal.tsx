"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createInvoiceAction } from "@/app/actions/invoices";
import { FormField, Input, Textarea, preventEnterSubmit } from "@/app/components/FormField";
import { MoneyInput } from "@/app/components/MoneyInput";

type Props = {
  contractId: string;
};

export function CreateInvoiceModal({ contractId }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createInvoiceAction(formData);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.message ?? "エラーが発生しました");
    } else {
      setIsOpen(false);
      formRef.current?.reset();
      router.refresh();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-xs px-3 py-1 bg-primary text-white cursor-pointer"
      >
        請求を追加
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-bg-surface border border-border w-96 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-text">請求を追加</h3>
              <button
                type="button"
                onClick={() => { setIsOpen(false); setError(null); }}
                className="text-xs text-text-muted cursor-pointer"
              >
                ✕
              </button>
            </div>

            {error && (
              <p className="text-danger text-xs mb-2">{error}</p>
            )}

            <form ref={formRef} onSubmit={handleSubmit} onKeyDown={preventEnterSubmit} className="space-y-2">
              <input type="hidden" name="contractId" value={contractId} />

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

              <FormField label="支払期日" htmlFor="invoice-due-date">
                <Input
                  id="invoice-due-date"
                  name="dueDate"
                  type="date"
                />
              </FormField>

              <FormField label="備考" htmlFor="invoice-notes">
                <Textarea
                  id="invoice-notes"
                  name="notes"
                  rows={3}
                  maxLength={1000}
                  placeholder="任意"
                />
              </FormField>

              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => { setIsOpen(false); setError(null); }}
                  className="text-xs px-3 py-1 border border-border text-text cursor-pointer"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="text-xs px-3 py-1 bg-primary text-white cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "作成中..." : "作成"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
