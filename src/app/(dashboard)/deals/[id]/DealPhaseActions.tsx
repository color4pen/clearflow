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

const ALL_PHASES: DealPhase[] = ["proposal_prep", "proposed", "negotiation", "won", "lost"];
const TERMINAL_PHASES: DealPhase[] = ["won", "lost"];

function getVariant(phase: DealPhase): "primary" | "success" | "danger" {
  if (phase === "won") return "success";
  if (phase === "lost") return "danger";
  return "primary";
}

const variantStyles = {
  primary: "bg-primary text-white",
  success: "bg-green-600 text-white",
  danger: "border border-danger text-danger hover:bg-danger hover:text-white",
};

export function DealPhaseActions({ deal, canChangePhase }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (TERMINAL_PHASES.includes(deal.phase)) {
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

  // 終端状態と現在のフェーズを除いた全フェーズを遷移先候補として生成する
  const options = ALL_PHASES.filter((p) => p !== deal.phase).map((phase) => ({
    phase,
    label: phaseLabels[phase] ?? phase,
    variant: getVariant(phase),
  }));

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
