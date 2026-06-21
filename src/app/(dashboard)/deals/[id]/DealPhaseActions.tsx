"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateDealPhaseAction } from "@/app/actions/deals";
import { Select } from "@/app/components";
import type { DealPhase } from "@/domain/models/deal";

type Props = {
  deal: {
    id: string;
    phase: DealPhase;
  };
  templates: Array<{ id: string; name: string }>;
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
    { phase: "estimate_approval", label: "見積承認中に変更", variant: "primary" },
    { phase: "lost", label: "失注", variant: "danger" },
  ],
  estimate_approval: [
    { phase: "won", label: "受注", variant: "primary" },
    { phase: "lost", label: "失注", variant: "danger" },
  ],
};

export function DealPhaseActions({ deal, templates, canChangePhase }: Props) {
  const router = useRouter();
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 終端状態ではボタンなし
  if (deal.phase === "won" || deal.phase === "lost") {
    return <p className="text-xs text-text-muted">このフェーズはこれ以上変更できません</p>;
  }

  if (!canChangePhase) {
    return <p className="text-xs text-text-muted">フェーズの変更は管理者またはマネージャーのみ実行できます</p>;
  }

  async function handleTransition(newPhase: DealPhase, templateId?: string) {
    setIsSubmitting(true);
    setErrorMessage(null);
    const formData = new FormData();
    formData.set("newPhase", newPhase);
    if (templateId) formData.set("templateId", templateId);
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
            onClick={() => {
              if (option.phase === "estimate_approval") {
                setShowTemplateSelector(true);
              } else {
                handleTransition(option.phase);
              }
            }}
            className={`text-xs underline cursor-pointer disabled:opacity-50 ${
              option.variant === "danger" ? "text-danger" : "text-primary"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* 見積承認フェーズ遷移時のテンプレート選択 */}
      {showTemplateSelector && (
        <div className="border border-border-light p-3 bg-bg-surface-alt">
          <p className="text-xs font-bold text-text mb-2">承認テンプレートを選択</p>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
              >
                <option value="">選択してください</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
            <button
              type="button"
              disabled={isSubmitting || !selectedTemplateId}
              onClick={() => {
                if (selectedTemplateId) {
                  handleTransition("estimate_approval", selectedTemplateId);
                }
              }}
              className="bg-primary text-white text-xs px-3 py-1 rounded-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "処理中..." : "見積承認中に変更する"}
            </button>
            <button
              type="button"
              onClick={() => setShowTemplateSelector(false)}
              className="text-xs text-text-muted underline"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
