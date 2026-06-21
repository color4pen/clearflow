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
  Record<DealPhase, Array<{ phase: DealPhase; label: string; variant: "primary" | "danger" }>>
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
    { phase: "won", label: "受注", variant: "primary" },
    { phase: "lost", label: "失注", variant: "danger" },
  ],
};

export function DealPhaseActions({ deal, canChangePhase }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 終端状態ではボタンなし
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
            className={`text-xs underline cursor-pointer disabled:opacity-50 ${
              option.variant === "danger" ? "text-danger" : "text-primary"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
