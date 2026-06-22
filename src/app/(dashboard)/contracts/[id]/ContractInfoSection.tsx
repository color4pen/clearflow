"use client";

import { useRouter } from "next/navigation";
import { updateContractAction } from "@/app/actions/contracts";
import { InlineEditText, InlineEditSelect, InlineEditDate, InlineEditMoney } from "@/app/components";
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

const contractTypeOptions = [
  { value: "", label: "-" },
  ...Object.entries(contractTypeLabels).map(([value, label]) => ({ value, label })),
];

const renewalTypeOptions = Object.entries(renewalTypeLabels).map(([value, label]) => ({
  value,
  label,
}));

export function ContractInfoSection({ contract, editable }: Props) {
  const router = useRouter();

  async function saveTitle(newValue: string) {
    const fd = new FormData();
    fd.set("title", newValue);
    const result = await updateContractAction(contract.id, fd);
    if (result.success) router.refresh();
    return result;
  }

  async function saveContractType(newValue: string) {
    const fd = new FormData();
    fd.set("contractType", newValue);
    const result = await updateContractAction(contract.id, fd);
    if (result.success) router.refresh();
    return result;
  }

  async function saveAmount(newValue: string) {
    const fd = new FormData();
    fd.set("amount", newValue);
    const result = await updateContractAction(contract.id, fd);
    if (result.success) router.refresh();
    return result;
  }

  async function saveStartDate(newValue: string) {
    const fd = new FormData();
    fd.set("startDate", newValue);
    const result = await updateContractAction(contract.id, fd);
    if (result.success) router.refresh();
    return result;
  }

  async function saveEndDate(newValue: string) {
    const fd = new FormData();
    fd.set("endDate", newValue);
    const result = await updateContractAction(contract.id, fd);
    if (result.success) router.refresh();
    return result;
  }

  async function savePaymentTerms(newValue: string) {
    const fd = new FormData();
    fd.set("paymentTerms", newValue);
    const result = await updateContractAction(contract.id, fd);
    if (result.success) router.refresh();
    return result;
  }

  async function saveRenewalType(newValue: string) {
    const fd = new FormData();
    fd.set("renewalType", newValue);
    const result = await updateContractAction(contract.id, fd);
    if (result.success) router.refresh();
    return result;
  }

  async function saveRenewalCycle(newValue: string) {
    const fd = new FormData();
    fd.set("renewalCycle", newValue);
    const result = await updateContractAction(contract.id, fd);
    if (result.success) router.refresh();
    return result;
  }

  const startDateStr = contract.startDate
    ? contract.startDate.toISOString().slice(0, 10)
    : null;
  const endDateStr = contract.endDate
    ? contract.endDate.toISOString().slice(0, 10)
    : null;

  return (
    <>
      <div className="flex gap-2">
        <dt className="text-text-muted w-24 shrink-0">契約名</dt>
        <dd className="text-text flex-1">
          <InlineEditText
            value={contract.title}
            onSave={saveTitle}
            editable={editable}
            placeholder="契約名を入力"
          />
        </dd>
      </div>
      <div className="flex gap-2">
        <dt className="text-text-muted w-24 shrink-0">契約種別</dt>
        <dd className="text-text flex-1">
          <InlineEditSelect
            value={contract.contractType ?? ""}
            options={contractTypeOptions}
            onSave={saveContractType}
            editable={editable}
          />
        </dd>
      </div>
      <div className="flex gap-2">
        <dt className="text-text-muted w-24 shrink-0">金額</dt>
        <dd className="text-text flex-1">
          <InlineEditMoney
            value={contract.amount}
            onSave={saveAmount}
            editable={editable}
          />
        </dd>
      </div>
      <div className="flex gap-2">
        <dt className="text-text-muted w-24 shrink-0">開始日</dt>
        <dd className="text-text flex-1">
          <InlineEditDate
            value={startDateStr}
            onSave={saveStartDate}
            editable={editable}
          />
        </dd>
      </div>
      <div className="flex gap-2">
        <dt className="text-text-muted w-24 shrink-0">終了日</dt>
        <dd className="text-text flex-1">
          <InlineEditDate
            value={endDateStr}
            onSave={saveEndDate}
            editable={editable}
          />
        </dd>
      </div>
      <div className="flex gap-2">
        <dt className="text-text-muted w-24 shrink-0">支払条件</dt>
        <dd className="text-text flex-1">
          <InlineEditText
            value={contract.paymentTerms ?? ""}
            onSave={savePaymentTerms}
            editable={editable}
            placeholder="例: 月末締め翌月払い"
          />
        </dd>
      </div>
      <div className="flex gap-2">
        <dt className="text-text-muted w-24 shrink-0">更新種別</dt>
        <dd className="text-text flex-1">
          <InlineEditSelect
            value={contract.renewalType}
            options={renewalTypeOptions}
            onSave={saveRenewalType}
            editable={editable}
          />
        </dd>
      </div>
      <div className="flex gap-2">
        <dt className="text-text-muted w-24 shrink-0">更新サイクル</dt>
        <dd className="text-text flex-1">
          <InlineEditText
            value={contract.renewalCycle ?? ""}
            onSave={saveRenewalCycle}
            editable={editable}
            placeholder="例: 1年"
          />
        </dd>
      </div>
      <div className="flex gap-2">
        <dt className="text-text-muted w-24 shrink-0">作成日</dt>
        <dd className="text-text">{contract.createdAt.toLocaleDateString("ja-JP")}</dd>
      </div>
    </>
  );
}
