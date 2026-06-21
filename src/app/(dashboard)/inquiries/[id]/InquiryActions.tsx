"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateInquiryStatusAction } from "@/app/actions/inquiries";
import { Select } from "@/app/components";
import type { InquiryStatus } from "@/domain/models/inquiry";

type Props = {
  inquiry: {
    id: string;
    status: InquiryStatus;
  };
  templates: Array<{ id: string; name: string }>;
  canChangeStatus: boolean;
};

export function InquiryActions({ inquiry, templates, canChangeStatus }: Props) {
  const router = useRouter();
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (inquiry.status === "converted" || inquiry.status === "declined") {
    return null;
  }

  async function handleTransition(newStatus: InquiryStatus, templateId?: string) {
    setIsSubmitting(true);
    setErrorMessage(null);
    const formData = new FormData();
    formData.set("newStatus", newStatus);
    if (templateId) formData.set("templateId", templateId);
    const result = await updateInquiryStatusAction(inquiry.id, formData);
    setIsSubmitting(false);
    if (!result.success) {
      setErrorMessage(result.message ?? "エラーが発生しました");
    } else {
      router.refresh();
    }
  }

  return (
    <>
      {errorMessage && (
        <span className="text-danger text-xs mr-2">{errorMessage}</span>
      )}

      {inquiry.status === "new" && (
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleTransition("in_progress")}
          className="bg-primary text-white text-xs px-2 py-0.5 cursor-pointer disabled:opacity-50"
        >
          対応開始
        </button>
      )}

      {inquiry.status === "in_progress" && canChangeStatus && !showConvertConfirm && (
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => setShowConvertConfirm(true)}
          className="bg-primary text-white text-xs px-2 py-0.5 cursor-pointer disabled:opacity-50"
        >
          案件化
        </button>
      )}

      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => handleTransition("declined")}
        className="text-xs text-danger underline cursor-pointer disabled:opacity-50"
      >
        見送り
      </button>

      {showConvertConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-bg-surface border border-border p-4 max-w-sm w-full">
            <p className="text-sm font-bold text-text mb-3">案件化</p>
            <p className="text-xs text-text-muted mb-3">この引き合いを案件化します。承認テンプレートを選択してください。</p>
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
            <div className="flex gap-2 mt-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowConvertConfirm(false);
                  setSelectedTemplateId("");
                }}
                className="text-xs text-text-muted underline cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                disabled={isSubmitting || !selectedTemplateId}
                onClick={() => {
                  if (selectedTemplateId) {
                    handleTransition("converted", selectedTemplateId);
                  }
                }}
                className="bg-primary text-white text-xs px-3 py-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "処理中..." : "案件化する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
