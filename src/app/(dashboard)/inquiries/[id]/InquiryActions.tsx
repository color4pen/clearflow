"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateInquiryStatusAction } from "@/app/actions/inquiries";
import type { InquiryStatus } from "@/domain/models/inquiry";

type Props = {
  inquiry: {
    id: string;
    status: InquiryStatus;
  };
  canChangeStatus: boolean;
};

export function InquiryActions({ inquiry, canChangeStatus }: Props) {
  const router = useRouter();
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (inquiry.status === "converted" || inquiry.status === "declined") {
    return <p className="text-xs text-text-muted">このステータスはこれ以上変更できません</p>;
  }

  async function handleTransition(newStatus: InquiryStatus) {
    setIsSubmitting(true);
    setErrorMessage(null);
    const formData = new FormData();
    formData.set("newStatus", newStatus);
    const result = await updateInquiryStatusAction(inquiry.id, formData);
    setIsSubmitting(false);
    if (!result.success) {
      setErrorMessage(result.message ?? "エラーが発生しました");
    } else {
      router.refresh();
    }
  }

  return (
    <div className="space-y-2">
      {errorMessage && (
        <p className="text-danger text-xs">{errorMessage}</p>
      )}

      <div className="flex gap-2 flex-wrap">
        {inquiry.status === "new" && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleTransition("in_progress")}
            className="bg-primary text-white text-xs font-bold px-4 py-1.5 cursor-pointer disabled:opacity-50"
          >
            対応開始
          </button>
        )}

        {inquiry.status === "in_progress" && canChangeStatus && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setShowConvertConfirm(true)}
            className="bg-green-600 text-white text-xs font-bold px-4 py-1.5 cursor-pointer disabled:opacity-50"
          >
            案件化
          </button>
        )}

        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleTransition("declined")}
          className="border border-danger text-danger text-xs font-bold px-4 py-1.5 cursor-pointer disabled:opacity-50 hover:bg-danger hover:text-white"
        >
          見送り
        </button>
      </div>

      {showConvertConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-bg-surface border border-border p-4 max-w-sm w-full">
            <p className="text-sm font-bold text-text mb-3">案件化</p>
            <p className="text-xs text-text-muted mb-4">この引き合いを案件化しますか？案件が作成され、ステータスが「案件化済」に変わります。</p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowConvertConfirm(false)}
                className="border border-border text-text text-xs px-3 py-1.5 cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleTransition("converted")}
                className="bg-green-600 text-white text-xs font-bold px-4 py-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "処理中..." : "案件化する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
