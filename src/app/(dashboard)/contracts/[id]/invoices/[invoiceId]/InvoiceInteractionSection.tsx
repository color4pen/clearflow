"use client";

import { useActionState } from "react";
import { SectionCard } from "@/app/components";
import { recordInvoiceAdjustmentAction } from "@/app/actions/interactions";
import type { RecordInvoiceAdjustmentState } from "@/app/actions/interactions";
import type { Interaction } from "@/domain/models/interaction";

type Props = {
  invoiceId: string;
  contractId: string;
  interactions: Interaction[];
  canRecord: boolean;
};

const initialState: RecordInvoiceAdjustmentState = {};

export function InvoiceInteractionSection({ invoiceId, contractId, interactions, canRecord }: Props) {
  const [state, formAction, isPending] = useActionState(
    recordInvoiceAdjustmentAction,
    initialState
  );

  return (
    <SectionCard className="p-3 mt-3">
      <h2 className="text-xs font-bold text-text mb-2">請求調整（やり取り）</h2>

      {interactions.length === 0 ? (
        <p className="text-xs text-text-muted mb-2">やり取りはまだありません</p>
      ) : (
        <ul className="space-y-2 mb-3">
          {interactions.map((item) => (
            <li key={item.id} className="border border-border p-2">
              <p className="text-xs text-text-muted">
                {item.date.toLocaleDateString("ja-JP")}
              </p>
              <p className="text-xs text-text mt-0.5">{item.summary ?? ""}</p>
            </li>
          ))}
        </ul>
      )}

      {canRecord && (
        <form action={formAction}>
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <input type="hidden" name="contractId" value={contractId} />

          {state.message && (
            <p className="text-danger text-xs mb-2">{state.message}</p>
          )}

          <div className="space-y-2">
            <div>
              <label className="text-xs text-text-muted block mb-0.5">日時（任意）</label>
              <input
                type="date"
                name="date"
                className="text-xs border border-border px-2 py-1 w-full"
              />
              {state.errors?.date && (
                <p className="text-danger text-xs mt-0.5">{state.errors.date[0]}</p>
              )}
            </div>

            <div>
              <label className="text-xs text-text-muted block mb-0.5">
                要約 <span className="text-danger">*</span>
              </label>
              <textarea
                name="summary"
                rows={3}
                required
                className="text-xs border border-border px-2 py-1 w-full resize-none"
                placeholder="やり取りの要約を入力"
              />
              {state.errors?.summary && (
                <p className="text-danger text-xs mt-0.5">{state.errors.summary[0]}</p>
              )}
            </div>

            <div>
              <label className="text-xs text-text-muted block mb-0.5">メモ（任意）</label>
              <textarea
                name="details"
                rows={2}
                className="text-xs border border-border px-2 py-1 w-full resize-none"
                placeholder="追加のメモ"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="text-xs px-3 py-1 bg-primary text-white disabled:opacity-50"
            >
              {isPending ? "記録中..." : "請求調整を記録"}
            </button>
          </div>
        </form>
      )}
    </SectionCard>
  );
}
