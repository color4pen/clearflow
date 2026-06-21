"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateInvoiceStatusAction } from "@/app/actions/invoices";
import type { InvoiceStatus } from "@/domain/models/invoice";

type Props = {
  invoiceId: string;
  status: InvoiceStatus;
};

export function InvoiceStatusButtons({ invoiceId, status }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTransition(newStatus: InvoiceStatus) {
    setIsSubmitting(true);
    setError(null);
    const result = await updateInvoiceStatusAction(invoiceId, newStatus);
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.message ?? "エラーが発生しました");
    } else {
      router.refresh();
    }
  }

  if (status === "paid" || status === "overdue") {
    return null;
  }

  return (
    <div className="flex flex-col gap-1">
      {error && <p className="text-danger text-xs">{error}</p>}
      {status === "scheduled" && (
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleTransition("invoiced")}
          className="text-xs px-2 py-0.5 bg-primary text-white cursor-pointer disabled:opacity-50"
        >
          請求書発行
        </button>
      )}
      {status === "invoiced" && (
        <>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleTransition("paid")}
            className="text-xs px-2 py-0.5 bg-green-600 text-white cursor-pointer disabled:opacity-50"
          >
            入金確認
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleTransition("overdue")}
            className="text-xs px-2 py-0.5 border border-danger text-danger hover:bg-danger hover:text-white cursor-pointer disabled:opacity-50"
          >
            期日超過
          </button>
        </>
      )}
    </div>
  );
}
