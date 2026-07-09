"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateDealPhaseAction } from "@/app/actions/deals";
import { phaseLabels } from "@/app/(dashboard)/labels";
import { ConfirmDialog, useToast } from "@/app/components";
import type { DealPhase } from "@/domain/models/deal";

// ヒアリング → 提案準備 → 提案済 → 交渉中 →（受注 / 失注 / 見送り）の一本のパイプライン。
// 非終端4フェーズは相互に自由遷移（後戻り・スキップ可）、受注/失注/見送りは終端。
const PIPELINE: DealPhase[] = ["hearing", "proposal_prep", "proposed", "negotiation"];

type Props = {
  dealId: string;
  phase: DealPhase;
  canChangePhase: boolean;
  inquiryId?: string | null;
};

export function DealPhaseStepper({ dealId, phase, canChangePhase, inquiryId }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [pendingTerminal, setPendingTerminal] = useState<"won" | "lost" | "passed" | null>(null);

  const isTerminal = phase === "won" || phase === "lost" || phase === "passed";
  // 進捗インデックス: 非終端は自身の位置、終端は全ステップ完了扱い
  const currentIndex = isTerminal ? PIPELINE.length : PIPELINE.indexOf(phase);

  async function changeTo(newPhase: DealPhase) {
    if (newPhase === phase || submitting) return;
    setSubmitting(true);
    const formData = new FormData();
    formData.set("newPhase", newPhase);
    const result = await updateDealPhaseAction(dealId, formData);
    setSubmitting(false);
    if (!result.success) {
      showToast(result.message ?? "エラーが発生しました", "error");
    } else {
      showToast(`フェーズを「${phaseLabels[newPhase] ?? newPhase}」に変更しました`, "success");
      router.refresh();
    }
  }

  async function confirmTerminal() {
    if (!pendingTerminal) return;
    const target = pendingTerminal;
    setPendingTerminal(null);
    await changeTo(target);
  }

  // 進捗を表す連結線（現在地までは primary 色で塗る）
  const bar = (active: boolean) => (
    <span
      className={`h-0.5 w-5 rounded-full shrink-0 ${active ? "bg-primary" : "bg-border"}`}
      aria-hidden
    />
  );

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* 引き合い: パイプラインの起点。あり=実線リンク / なし=点線 disabled で常時表示 */}
      {inquiryId ? (
        <>
          <Link
            href={`/inquiries/${inquiryId}`}
            title="引き合いを表示"
            className="text-xs font-medium rounded-full px-3.5 py-1.5 border bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 transition-colors"
          >
            引き合い
          </Link>
          <span className="h-0.5 w-5 rounded-full bg-primary shrink-0" aria-hidden />
        </>
      ) : (
        <>
          <span
            title="引き合いなし"
            className="text-xs font-medium rounded-full px-3 py-1.5 border border-dashed border-border text-text-disabled cursor-default"
          >
            引き合い
          </span>
          <span
            className="w-5 border-t border-dashed border-border shrink-0"
            aria-hidden
          />
        </>
      )}

      {/* パイプライン: 完了=塗り / 現在=強調 / 未到達=淡色 */}
      {PIPELINE.map((p, i) => {
        const isCurrent = !isTerminal && p === phase;
        const isCompleted = i < currentIndex;
        const interactive = canChangePhase && !isTerminal && !isCurrent;
        return (
          <Fragment key={p}>
            {i > 0 && bar(i <= currentIndex)}
            <button
              type="button"
              disabled={!interactive || submitting}
              onClick={() => interactive && changeTo(p)}
              title={interactive ? `「${phaseLabels[p]}」へ移動` : undefined}
              className={[
                "text-xs font-bold rounded-full px-3.5 py-1.5 border transition-colors",
                isCurrent
                  ? "bg-primary text-white border-primary cursor-default"
                  : isCompleted
                  ? interactive
                    ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 cursor-pointer"
                    : "bg-primary/10 text-primary border-primary/30 cursor-default"
                  : interactive
                  ? "bg-bg-surface text-text-muted border-border hover:border-primary hover:text-primary cursor-pointer"
                  : "bg-bg-surface text-text-muted border-border cursor-default",
              ].join(" ")}
            >
              {phaseLabels[p] ?? p}
            </button>
          </Fragment>
        );
      })}

      {bar(isTerminal)}

      {/* 終端: 受注/失注/見送り */}
      {isTerminal ? (
        <span
          className={[
            "text-xs font-bold rounded-full px-3.5 py-1.5 border",
            phase === "won"
              ? "bg-status-green-bg text-status-green-text border-status-green-text/30"
              : phase === "lost"
              ? "bg-status-red-bg text-status-red-text border-status-red-text/30"
              : "bg-status-gray-bg text-status-gray-text border-status-gray-text/30",
          ].join(" ")}
        >
          {phaseLabels[phase] ?? phase}（確定）
        </span>
      ) : canChangePhase ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => setPendingTerminal("won")}
            className="text-xs font-bold rounded-full px-3.5 py-1.5 border border-status-green-text text-status-green-text hover:bg-status-green-bg cursor-pointer disabled:opacity-50"
          >
            受注にする
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => setPendingTerminal("lost")}
            className="text-xs font-bold rounded-full px-3.5 py-1.5 border border-danger text-danger hover:bg-status-red-bg cursor-pointer disabled:opacity-50"
          >
            失注にする
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => setPendingTerminal("passed")}
            className="text-xs font-bold rounded-full px-3.5 py-1.5 border border-status-gray-text text-status-gray-text hover:bg-status-gray-bg cursor-pointer disabled:opacity-50"
          >
            見送りにする
          </button>
        </div>
      ) : (
        <span className="text-xs text-text-muted">受注 / 失注 / 見送り</span>
      )}

      <ConfirmDialog
        open={pendingTerminal !== null}
        variant={pendingTerminal === "won" ? "primary" : pendingTerminal === "lost" ? "danger" : "primary"}
        title={
          pendingTerminal === "won"
            ? "フェーズ変更: 受注"
            : pendingTerminal === "lost"
            ? "フェーズ変更: 失注"
            : "フェーズ変更: 見送り"
        }
        message={
          pendingTerminal === "won"
            ? "フェーズを「受注」に変更しますか？確定後はフェーズを戻せません。"
            : pendingTerminal === "lost"
            ? "フェーズを「失注」に変更しますか？確定後はフェーズを戻せません。"
            : "フェーズを「見送り」に変更しますか？確定後はフェーズを戻せません。"
        }
        loading={submitting}
        onConfirm={confirmTerminal}
        onCancel={() => setPendingTerminal(null)}
      />
    </div>
  );
}
