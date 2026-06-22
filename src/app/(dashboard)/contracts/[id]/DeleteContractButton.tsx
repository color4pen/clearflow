"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteContractAction } from "@/app/actions/contracts";

type Props = {
  contractId: string;
};

export function DeleteContractButton({ contractId }: Props) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm("この契約を削除しますか？")) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    const result = await deleteContractAction(contractId);
    setIsDeleting(false);

    if (!result.success) {
      setError(result.message ?? "削除に失敗しました");
      return;
    }

    router.push("/contracts");
  }

  return (
    <div>
      {error && <p className="text-danger text-xs mb-1">{error}</p>}
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="text-xs text-danger underline disabled:opacity-50"
      >
        {isDeleting ? "削除中..." : "削除"}
      </button>
    </div>
  );
}
