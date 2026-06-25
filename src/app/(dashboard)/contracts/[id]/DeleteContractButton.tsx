"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteContractAction } from "@/app/actions/contracts";
import { ConfirmDialog, useToast } from "@/app/components";

type Props = {
  contractId: string;
};

export function DeleteContractButton({ contractId }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleConfirm() {
    setIsDeleting(true);
    const result = await deleteContractAction(contractId);
    setIsDeleting(false);

    if (!result.success) {
      showToast(result.message ?? "削除に失敗しました", "error");
      setShowConfirm(false);
      return;
    }

    showToast("契約を削除しました", "success");
    router.push("/contracts");
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
        message="この契約を削除しますか？"
        loading={isDeleting}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
