"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateDealPhaseAction } from "@/app/actions/deals";
import { phaseLabels } from "@/app/(dashboard)/labels";
import type { DealPhase } from "@/domain/models/deal";

type Props = {
  deal: {
    id: string;
    phase: DealPhase;
  };
  canChangePhase: boolean;
};

const NON_TERMINAL_PHASES: DealPhase[] = ["proposal_prep", "proposed", "negotiation"];
const TERMINAL_PHASES: DealPhase[] = ["won", "lost"];

export function DealPhaseActions({ deal, canChangePhase }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (TERMINAL_PHASES.includes(deal.phase) || !canChangePhase) {
    return null;
  }

  async function handleTransition(newPhase: DealPhase) {
    if (newPhase === deal.phase) return;
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

  return (
    <div>
      <h2 className="text-xs font-bold text-text mb-2">フェーズ変更</h2>
      {errorMessage && (
        <p className="text-danger text-xs mb-1">{errorMessage}</p>
      )}
      <div className="flex gap-2 flex-wrap">
        {NON_TERMINAL_PHASES.map((phase) => {
          const isCurrent = phase === deal.phase;
          return (
            <button
              key={phase}
              type="button"
              disabled={isCurrent || isSubmitting}
              onClick={() => handleTransition(phase)}
              className={`text-xs font-bold px-4 py-1.5 ${
                isCurrent
                  ? "bg-primary text-white cursor-default"
                  : "border border-border text-text hover:bg-bg-page cursor-pointer disabled:opacity-50"
              }`}
            >
              {phaseLabels[phase] ?? phase}
            </button>
          );
        })}
      </div>
    </div>
  );
}
