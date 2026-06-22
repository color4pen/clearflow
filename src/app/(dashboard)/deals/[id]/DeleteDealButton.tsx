"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteDealAction } from "@/app/actions/deals";

type Props = {
  dealId: string;
};

export function DeleteDealButton({ dealId }: Props) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm("この案件を削除しますか？担当者は自動的に削除されます。")) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    const result = await deleteDealAction(dealId);
    setIsDeleting(false);

    if (!result.success) {
      setError(result.message ?? "削除に失敗しました");
      return;
    }

    router.push("/deals");
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
