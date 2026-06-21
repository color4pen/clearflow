"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateDealPhaseAction } from "@/app/actions/deals";
import type { DealPhase } from "@/domain/models/deal";

type Props = {
  deal: {
    id: string;
    phase: DealPhase;
  };
  canChangePhase: boolean;
};

const nextPhaseOptions: Partial<
  Record<DealPhase, Array<{ phase: DealPhase; label: string; variant: "primary" | "success" | "danger" }>>
> = {
  proposal_prep: [
    { phase: "proposed", label: "提案済に変更", variant: "primary" },
    { phase: "lost", label: "失注", variant: "danger" },
  ],
  proposed: [
    { phase: "negotiation", label: "交渉開始", variant: "primary" },
    { phase: "lost", label: "失注", variant: "danger" },
  ],
  negotiation: [
    { phase: "won", label: "受注", variant: "success" },
    { phase: "lost", label: "失注", variant: "danger" },
  ],
};

const variantStyles = {
  primary: "bg-primary text-white",
  success: "bg-green-600 text-white",
  danger: "border border-danger text-danger hover:bg-danger hover:text-white",
};

export function DealPhaseActions({ deal, canChangePhase }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (deal.phase === "won" || deal.phase === "lost") {
    return <p className="text-xs text-text-muted">このフェーズはこれ以上変更できません</p>;
  }

  if (!canChangePhase) {
    return <p className="text-xs text-text-muted">フェーズの変更は管理者またはマネージャーのみ実行できます</p>;
  }

  async function handleTransition(newPhase: DealPhase) {
    setIsSubmitting(true);
    setErrorMessage(null);
    const formData = new FormData();
    formData.set("newPhase", newPhase);
    const result = await updateDealPhaseAction(deal.id, formData);
    setIsSubmitting(false);
    if (!result.success) {
      setErrorMessage(result.message ?? "エラーが発生しました");
    } else {
      router.refresh();
    }
  }

  const options = nextPhaseOptions[deal.phase] ?? [];

  return (
    <div className="space-y-2">
      {errorMessage && (
        <p className="text-danger text-xs">{errorMessage}</p>
      )}

      <div className="flex gap-2 flex-wrap">
        {options.map((option) => (
          <button
            key={option.phase}
            type="button"
            disabled={isSubmitting}
            onClick={() => handleTransition(option.phase)}
            className={`text-xs font-bold px-4 py-1.5 cursor-pointer disabled:opacity-50 ${variantStyles[option.variant]}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
