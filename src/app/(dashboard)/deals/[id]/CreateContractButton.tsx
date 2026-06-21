"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createContractAction } from "@/app/actions/contracts";

type Props = {
  dealId: string;
};

export function CreateContractButton({ dealId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createContractAction(formData);
      if (!result.success) {
        setErrorMessage(result.message ?? "エラーが発生しました");
      } else {
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="dealId" value={dealId} />
      {errorMessage && (
        <p className="text-danger text-xs mb-1">{errorMessage}</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="text-xs bg-primary text-white font-bold px-4 py-1.5 cursor-pointer disabled:opacity-50"
      >
        {isPending ? "作成中..." : "契約を作成"}
      </button>
    </form>
  );
}
