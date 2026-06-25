"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateInquiryStatusAction } from "@/app/actions/inquiries";
import { ConfirmDialog, useToast } from "@/app/components";
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
  const { showToast } = useToast();
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (inquiry.status === "converted") {
    return null;
  }

  async function handleTransition(newStatus: InquiryStatus) {
    setIsSubmitting(true);
    const formData = new FormData();
    formData.set("newStatus", newStatus);
    const result = await updateInquiryStatusAction(inquiry.id, formData);
    setIsSubmitting(false);
    if (!result.success) {
      showToast(result.message ?? "エラーが発生しました", "error");
    } else {
      showToast("ステータスを更新しました", "success");
      router.refresh();
    }
  }

  async function handleConvertConfirm() {
    setShowConvertConfirm(false);
    await handleTransition("converted");
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        {inquiry.status === "new" && canChangeStatus && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setShowConvertConfirm(true)}
            className="bg-green-600 text-white text-xs font-bold px-4 py-1.5 cursor-pointer disabled:opacity-50"
          >
            案件化
          </button>
        )}

        {inquiry.status === "declined" && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleTransition("new")}
            className="bg-primary text-white text-xs font-bold px-4 py-1.5 cursor-pointer disabled:opacity-50"
          >
            再開
          </button>
        )}

        {inquiry.status !== "declined" && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleTransition("declined")}
            className="border border-danger text-danger text-xs font-bold px-4 py-1.5 cursor-pointer disabled:opacity-50 hover:bg-danger hover:text-white"
          >
            見送り
          </button>
        )}
      </div>

      <ConfirmDialog
        open={showConvertConfirm}
        variant="primary"
        title="案件化"
        message="この引き合いを案件化しますか？案件が作成され、ステータスが「案件化済」に変わります。"
        confirmLabel="案件化する"
        loading={isSubmitting}
        onConfirm={handleConvertConfirm}
        onCancel={() => setShowConvertConfirm(false)}
      />
    </div>
  );
}
