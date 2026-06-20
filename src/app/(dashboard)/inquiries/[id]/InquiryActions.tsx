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
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 終端状態ではボタンなし
  if (inquiry.status === "converted" || inquiry.status === "declined") {
    return <p className="text-xs text-text-muted">このステータスはこれ以上変更できません</p>;
  }

  if (!canChangeStatus && inquiry.status === "in_progress") {
    // 商談化ボタンが非表示になる可能性があるが、対応中→見送りは可能
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
    <div className="space-y-2">
      {errorMessage && (
        <p className="text-danger text-xs">{errorMessage}</p>
      )}

      <div className="flex gap-2 flex-wrap">
        {inquiry.status === "new" && (
          <>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleTransition("in_progress")}
              className="text-xs text-primary underline cursor-pointer disabled:opacity-50"
            >
              対応開始
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleTransition("declined")}
              className="text-xs text-danger underline cursor-pointer disabled:opacity-50"
            >
              見送り
            </button>
          </>
        )}

        {inquiry.status === "in_progress" && (
          <>
            {canChangeStatus && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowTemplateSelector(true)}
                className="text-xs text-success underline cursor-pointer disabled:opacity-50"
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
          </>
        )}
      </div>

      {/* 案件化テンプレート選択 */}
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
                  handleTransition("converted", selectedTemplateId);
                }
              }}
              className="bg-primary text-white text-xs px-3 py-1 rounded-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "処理中..." : "案件化する"}
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
