"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateInvoiceStatusAction } from "@/app/actions/invoices";
import type { InvoiceStatus } from "@/domain/models/invoice";

type Props = {
  invoiceId: string;
  contractId: string;
  status: InvoiceStatus;
};

function todayString(): string {
  return new Intl.DateTimeFormat('sv', { timeZone: 'Asia/Tokyo' }).format(new Date());
}

export function InvoiceActions({ invoiceId, contractId, status }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPaidDialog, setShowPaidDialog] = useState(false);
  const [paidAt, setPaidAt] = useState<string>(todayString());

  async function handleTransition(newStatus: InvoiceStatus, paidAtDate?: string) {
    setIsSubmitting(true);
    setError(null);
    const result = await updateInvoiceStatusAction(invoiceId, newStatus, contractId, paidAtDate);
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.message ?? "エラーが発生しました");
    } else {
      setShowPaidDialog(false);
      router.refresh();
    }
  }

  function handlePaidConfirm() {
    handleTransition("paid", paidAt);
  }

  if (status === "paid") {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-danger text-xs">{error}</p>}

      <div className="flex gap-2">
        {status === "scheduled" && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleTransition("invoiced")}
            className="text-xs px-3 py-1.5 bg-primary text-white cursor-pointer disabled:opacity-50"
          >
            発行する
          </button>
        )}

        {(status === "invoiced" || status === "overdue") && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => { setPaidAt(todayString()); setShowPaidDialog(true); }}
            className="text-xs px-3 py-1.5 bg-green-600 text-white cursor-pointer disabled:opacity-50"
          >
            入金確認
          </button>
        )}

        {status === "invoiced" && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleTransition("overdue")}
            className="text-xs px-3 py-1.5 border border-danger text-danger hover:bg-danger hover:text-white cursor-pointer disabled:opacity-50"
          >
            期日超過にする
          </button>
        )}
      </div>

      {showPaidDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-bg-surface border border-border w-80 p-4">
            <h3 className="text-sm font-bold text-text mb-3">入金日を確認</h3>
            <div className="mb-4">
              <label className="text-xs text-text-muted block mb-1" htmlFor="paid-at-input">
                入金日
              </label>
              <input
                id="paid-at-input"
                type="date"
                value={paidAt}
                max={todayString()}
                onChange={(e) => setPaidAt(e.target.value)}
                className="border border-border text-xs px-2 py-1 w-full bg-bg-surface text-text"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setShowPaidDialog(false); setError(null); }}
                disabled={isSubmitting}
                className="text-xs px-3 py-1 border border-border text-text cursor-pointer disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handlePaidConfirm}
                disabled={isSubmitting}
                className="text-xs px-3 py-1 bg-green-600 text-white cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "処理中..." : "確認"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
