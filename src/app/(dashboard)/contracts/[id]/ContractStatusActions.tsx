"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateContractStatusAction } from "@/app/actions/contracts";
import { contractStatusLabels } from "@/app/(dashboard)/labels";
import type { ContractStatus } from "@/domain/models/contract";

type Props = {
  contract: {
    id: string;
    status: ContractStatus;
  };
  canChangeStatus: boolean;
};

const TERMINAL_STATUSES: ContractStatus[] = ["completed", "cancelled"];

const STATUS_VARIANTS: Record<ContractStatus, "primary" | "success" | "danger"> = {
  active: "primary",
  completed: "success",
  cancelled: "danger",
};

const variantStyles = {
  primary: "bg-primary text-white",
  success: "bg-green-600 text-white",
  danger: "border border-danger text-danger hover:bg-danger hover:text-white",
};

const ALL_STATUSES: ContractStatus[] = ["active", "completed", "cancelled"];

export function ContractStatusActions({ contract, canChangeStatus }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (TERMINAL_STATUSES.includes(contract.status)) {
    return <p className="text-xs text-text-muted">このステータスはこれ以上変更できません</p>;
  }

  if (!canChangeStatus) {
    return <p className="text-xs text-text-muted">ステータスの変更は管理者またはマネージャーのみ実行できます</p>;
  }

  async function handleTransition(newStatus: ContractStatus) {
    setIsSubmitting(true);
    setErrorMessage(null);
    const result = await updateContractStatusAction(contract.id, newStatus);
    setIsSubmitting(false);
    if (!result.success) {
      setErrorMessage(result.message ?? "エラーが発生しました");
    } else {
      router.refresh();
    }
  }

  // 現在のステータスを除いた遷移先候補（active は終端でないので completed/cancelled のみ）
  const options = ALL_STATUSES.filter((s) => s !== contract.status && s !== "active").map((status) => ({
    status,
    label: contractStatusLabels[status] ?? status,
    variant: STATUS_VARIANTS[status],
  }));

  return (
    <div className="space-y-2">
      {errorMessage && (
        <p className="text-danger text-xs">{errorMessage}</p>
      )}

      <div className="flex gap-2 flex-wrap">
        {options.map((option) => (
          <button
            key={option.status}
            type="button"
            disabled={isSubmitting}
            onClick={() => handleTransition(option.status)}
            className={`text-xs font-bold px-4 py-1.5 cursor-pointer disabled:opacity-50 ${variantStyles[option.variant]}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
