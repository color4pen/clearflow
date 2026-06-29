"use client";

import { useState } from "react";
import { deactivateUserAction, reactivateUserAction } from "@/app/actions/users";
import { BTN_DANGER, BTN_PRIMARY } from "../../styles";

type Props = {
  userId: string;
  isDeactivated: boolean;
};

export function UserDeactivateButton({ userId, isDeactivated }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    setError(null);

    const formData = new FormData();
    formData.set("userId", userId);

    try {
      const result = isDeactivated
        ? await reactivateUserAction(formData)
        : await deactivateUserAction(formData);

      if (!result.success) {
        setError(result.message ?? "エラーが発生しました");
      }
    } catch {
      setError("エラーが発生しました");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={
          isDeactivated
            ? `${BTN_PRIMARY} disabled:opacity-50 disabled:cursor-not-allowed`
            : `${BTN_DANGER} disabled:opacity-50 disabled:cursor-not-allowed`
        }
      >
        {isDeactivated ? "有効化" : "無効化"}
      </button>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
