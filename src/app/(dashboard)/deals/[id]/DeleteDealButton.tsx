"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteDealAction } from "@/app/actions/deals";
import { ConfirmDialog, useToast } from "@/app/components";

type Props = {
  dealId: string;
};

export function DeleteDealButton({ dealId }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleConfirm() {
    setIsDeleting(true);
    const result = await deleteDealAction(dealId);
    setIsDeleting(false);

    if (!result.success) {
      showToast(result.message ?? "削除に失敗しました", "error");
      setShowConfirm(false);
      return;
    }

    showToast("案件を削除しました", "success");
    router.push("/deals");
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
        message="この案件を削除しますか？担当者は自動的に削除されます。"
        loading={isDeleting}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
