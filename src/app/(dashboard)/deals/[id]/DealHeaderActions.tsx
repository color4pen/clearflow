"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateDealPhaseAction } from "@/app/actions/deals";

type Props = {
  dealId: string;
  dealPhase: string;
  canChangePhase: boolean;
};

export function DealHeaderActions({ dealId, dealPhase, canChangePhase }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!canChangePhase || dealPhase === "won" || dealPhase === "lost") {
    return null;
  }

  async function handleTransition(newPhase: "won" | "lost") {
    const label = newPhase === "won" ? "受注" : "失注";
    if (!window.confirm(`フェーズを「${label}」に変更しますか？`)) return;
    setIsSubmitting(true);
    const formData = new FormData();
    formData.set("newPhase", newPhase);
    await updateDealPhaseAction(dealId, formData);
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => handleTransition("won")}
        className="border border-green-600 text-green-600 hover:bg-green-50 text-xs font-bold px-4 py-1.5 disabled:opacity-50"
      >
        受注にする
      </button>
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => handleTransition("lost")}
        className="border border-danger text-danger hover:bg-red-50 text-xs font-bold px-4 py-1.5 disabled:opacity-50"
      >
        失注にする
      </button>
    </div>
  );
}
