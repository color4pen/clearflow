"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateDealPhaseAction } from "@/app/actions/deals";
import { ConfirmDialog, useToast } from "@/app/components";

type Props = {
  dealId: string;
  dealPhase: string;
  canChangePhase: boolean;
};

export function DealHeaderActions({ dealId, dealPhase, canChangePhase }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingPhase, setPendingPhase] = useState<"won" | "lost" | null>(null);

  if (!canChangePhase || dealPhase === "won" || dealPhase === "lost") {
    return null;
  }

  async function handleConfirm() {
    if (!pendingPhase) return;
    const newPhase = pendingPhase;
    const label = newPhase === "won" ? "受注" : "失注";
    setIsSubmitting(true);
    setPendingPhase(null);
    const formData = new FormData();
    formData.set("newPhase", newPhase);
    const result = await updateDealPhaseAction(dealId, formData);
    setIsSubmitting(false);
    if (!result.success) {
      showToast(result.message ?? "エラーが発生しました", "error");
    } else {
      showToast(`フェーズを「${label}」に変更しました`, "success");
      router.refresh();
    }
  }

  const label = pendingPhase === "won" ? "受注" : pendingPhase === "lost" ? "失注" : "";

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => setPendingPhase("won")}
          className="border border-green-600 text-green-600 hover:bg-green-50 text-xs font-bold px-4 py-1.5 disabled:opacity-50"
        >
          受注にする
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => setPendingPhase("lost")}
          className="border border-danger text-danger hover:bg-red-50 text-xs font-bold px-4 py-1.5 disabled:opacity-50"
        >
          失注にする
        </button>
      </div>
      <ConfirmDialog
        open={pendingPhase !== null}
        variant={pendingPhase === "won" ? "primary" : "danger"}
        title={`フェーズ変更: ${label}`}
        message={`フェーズを「${label}」に変更しますか？`}
        loading={isSubmitting}
        onConfirm={handleConfirm}
        onCancel={() => setPendingPhase(null)}
      />
    </div>
  );
}
