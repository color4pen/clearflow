"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteInquiryAction } from "@/app/actions/inquiries";

type Props = {
  inquiryId: string;
};

export function DeleteInquiryButton({ inquiryId }: Props) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm("この引き合いを削除しますか？")) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    const result = await deleteInquiryAction(inquiryId);
    setIsDeleting(false);

    if (!result.success) {
      setError(result.message ?? "削除に失敗しました");
      return;
    }

    router.push("/inquiries");
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
