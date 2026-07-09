"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateContractStatusAction } from "@/app/actions/contracts";
import { contractStatusLabels } from "@/app/(dashboard)/labels";
import { ConfirmDialog, useToast } from "@/app/components";
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
  success: "bg-primary text-white",
  danger: "border border-danger text-danger hover:bg-danger hover:text-white",
};

const ALL_STATUSES: ContractStatus[] = ["active", "completed", "cancelled"];

const DIALOG_CONFIG: Record<string, { title: string; message: string; variant: "primary" | "danger" }> = {
  completed: {
    title: "契約完了",
    message: "この契約を完了しますか？",
    variant: "primary",
  },
  cancelled: {
    title: "契約解除",
    message: "この契約を解除しますか？",
    variant: "danger",
  },
};

export function ContractStatusActions({ contract, canChangeStatus }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ContractStatus | null>(null);

  if (TERMINAL_STATUSES.includes(contract.status)) {
    return <p className="text-xs text-text-muted">このステータスはこれ以上変更できません</p>;
  }

  if (!canChangeStatus) {
    return <p className="text-xs text-text-muted">ステータスの変更は管理者またはマネージャーのみ実行できます</p>;
  }

  async function handleConfirm() {
    if (!pendingStatus) return;
    const newStatus = pendingStatus;
    setPendingStatus(null);
    setIsSubmitting(true);
    const result = await updateContractStatusAction(contract.id, newStatus);
    setIsSubmitting(false);
    if (!result.success) {
      showToast(result.message ?? "エラーが発生しました", "error");
    } else {
      showToast("ステータスを更新しました", "success");
      router.refresh();
    }
  }

  // 現在のステータスを除いた遷移先候補（active は終端でないので completed/cancelled のみ）
  const options = ALL_STATUSES.filter((s) => s !== contract.status && s !== "active").map((status) => ({
    status,
    label: contractStatusLabels[status] ?? status,
    variant: STATUS_VARIANTS[status],
  }));

  const dialogConfig = pendingStatus ? DIALOG_CONFIG[pendingStatus] : null;

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        {options.map((option) => (
          <button
            key={option.status}
            type="button"
            disabled={isSubmitting}
            onClick={() => setPendingStatus(option.status)}
            className={`text-xs font-bold px-4 py-1.5 cursor-pointer disabled:opacity-50 ${variantStyles[option.variant]}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {dialogConfig && (
        <ConfirmDialog
          open={pendingStatus !== null}
          variant={dialogConfig.variant}
          title={dialogConfig.title}
          message={dialogConfig.message}
          loading={isSubmitting}
          onConfirm={handleConfirm}
          onCancel={() => setPendingStatus(null)}
        />
      )}
    </div>
  );
}
