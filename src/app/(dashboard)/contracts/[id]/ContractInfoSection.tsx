"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { updateContractAction } from "@/app/actions/contracts";
import { Input, Select, MoneyInput, preventEnterSubmit } from "@/app/components";
import { contractTypeLabels, renewalTypeLabels } from "@/app/(dashboard)/labels";
import type { RenewalType } from "@/domain/models/contract";

type ContractInfo = {
  id: string;
  title: string;
  contractType: string | null;
  amount: number | null;
  startDate: Date | null;
  endDate: Date | null;
  paymentTerms: string | null;
  renewalType: RenewalType;
  renewalCycle: string | null;
  createdAt: Date;
};

type Props = {
  contract: ContractInfo;
  editable: boolean;
};

export function ContractInfoSection({ contract, editable }: Props) {
  const router = useRouter();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const formRef = useRef<HTMLFormElement>(null);

  const startDateStr = contract.startDate
    ? contract.startDate.toISOString().slice(0, 10)
    : "";
  const endDateStr = contract.endDate
    ? contract.endDate.toISOString().slice(0, 10)
    : "";

  const save = useCallback(async () => {
    if (!formRef.current) return;
    setSaveStatus("saving");
    const formData = new FormData(formRef.current);
    const result = await updateContractAction(contract.id, formData);
    if (result.success === false) {
      setSaveStatus("error");
    } else {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
      router.refresh();
    }
  }, [contract.id, router]);

  const debouncedSave = useDebouncedCallback(save, 800);

  const handleSelectChange = useCallback(() => {
    save();
  }, [save]);

  return (
    <form ref={formRef} onKeyDown={preventEnterSubmit}>
      {saveStatus !== "idle" && (
        <div className="flex justify-end mb-1">
          {saveStatus === "saving" && <span className="text-text-muted text-xs">保存中...</span>}
          {saveStatus === "saved" && <span className="text-green-600 text-xs">保存済み</span>}
          {saveStatus === "error" && <span className="text-danger text-xs">保存に失敗しました</span>}
        </div>
      )}
      <div className="flex gap-2">
        <dt className="text-text-muted w-24 shrink-0">契約名</dt>
        <dd className="text-text flex-1">
          <Input name="title" defaultValue={contract.title} disabled={!editable} placeholder="契約名を入力" onChange={() => debouncedSave()} />
        </dd>
      </div>
      <div className="flex gap-2 mt-1">
        <dt className="text-text-muted w-24 shrink-0">契約種別</dt>
        <dd className="text-text flex-1">
          <Select name="contractType" defaultValue={contract.contractType ?? ""} disabled={!editable} onChange={handleSelectChange}>
            <option value="">-</option>
            {Object.entries(contractTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </dd>
      </div>
      <div className="flex gap-2 mt-1">
        <dt className="text-text-muted w-24 shrink-0">金額</dt>
        <dd className="text-text flex-1">
          <MoneyInput name="amount" defaultValue={contract.amount} disabled={!editable} onBlurCapture={() => debouncedSave()} />
        </dd>
      </div>
      <div className="flex gap-2 mt-1">
        <dt className="text-text-muted w-24 shrink-0">開始日</dt>
        <dd className="text-text flex-1">
          <Input type="date" name="startDate" defaultValue={startDateStr} disabled={!editable} onChange={() => debouncedSave()} />
        </dd>
      </div>
      <div className="flex gap-2 mt-1">
        <dt className="text-text-muted w-24 shrink-0">終了日</dt>
        <dd className="text-text flex-1">
          <Input type="date" name="endDate" defaultValue={endDateStr} disabled={!editable} onChange={() => debouncedSave()} />
        </dd>
      </div>
      <div className="flex gap-2 mt-1">
        <dt className="text-text-muted w-24 shrink-0">支払条件</dt>
        <dd className="text-text flex-1">
          <Input name="paymentTerms" defaultValue={contract.paymentTerms ?? ""} disabled={!editable} placeholder="例: 月末締め翌月払い" onChange={() => debouncedSave()} />
        </dd>
      </div>
      <div className="flex gap-2 mt-1">
        <dt className="text-text-muted w-24 shrink-0">更新種別</dt>
        <dd className="text-text flex-1">
          <Select name="renewalType" defaultValue={contract.renewalType} disabled={!editable} onChange={handleSelectChange}>
            {Object.entries(renewalTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </dd>
      </div>
      <div className="flex gap-2 mt-1">
        <dt className="text-text-muted w-24 shrink-0">更新サイクル</dt>
        <dd className="text-text flex-1">
          <Input name="renewalCycle" defaultValue={contract.renewalCycle ?? ""} disabled={!editable} placeholder="例: 1年" onChange={() => debouncedSave()} />
        </dd>
      </div>
      <div className="flex gap-2 mt-1">
        <dt className="text-text-muted w-24 shrink-0">作成日</dt>
        <dd className="text-text">{contract.createdAt.toLocaleDateString("ja-JP")}</dd>
      </div>
    </form>
  );
}
