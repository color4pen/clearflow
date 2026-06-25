"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteInquiryAction } from "@/app/actions/inquiries";
import { ConfirmDialog, useToast } from "@/app/components";

type Props = {
  inquiryId: string;
};

export function DeleteInquiryButton({ inquiryId }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleConfirm() {
    setIsDeleting(true);
    const result = await deleteInquiryAction(inquiryId);
    setIsDeleting(false);

    if (!result.success) {
      showToast(result.message ?? "削除に失敗しました", "error");
      setShowConfirm(false);
      return;
    }

    showToast("引き合いを削除しました", "success");
    router.push("/inquiries");
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={isDeleting}
        className="text-xs text-danger underline disabled:opacity-50"
      >
        {isDeleting ? "削除中..." : "削除"}
      </button>
      <ConfirmDialog
        open={showConfirm}
        variant="danger"
        title="削除確認"
        message="この引き合いを削除しますか？"
        loading={isDeleting}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
