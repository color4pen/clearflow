"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { updateDealAction } from "@/app/actions/deals";
import { Input, Select, MoneyInput, preventEnterSubmit } from "@/app/components";
import { phaseLabels, contractTypeLabels } from "@/app/(dashboard)/labels";

type DealInfo = {
  id: string;
  title: string;
  phase: string;
  estimatedAmount: number | null;
  estimatedStartDate: Date | null;
  estimatedEndDate: Date | null;
  contractType: string | null;
  createdAt: Date;
};

type Props = {
  deal: DealInfo;
  editable: boolean;
};

export function DealInfoSection({ deal, editable }: Props) {
  const router = useRouter();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [phase, setPhase] = useState(deal.phase);
  const formRef = useRef<HTMLFormElement>(null);

  const startDateStr = deal.estimatedStartDate
    ? deal.estimatedStartDate.toISOString().slice(0, 10)
    : "";
  const endDateStr = deal.estimatedEndDate
    ? deal.estimatedEndDate.toISOString().slice(0, 10)
    : "";

  const save = useCallback(async () => {
    if (!formRef.current) return;
    setSaveStatus("saving");
    const formData = new FormData(formRef.current);
    const result = await updateDealAction(deal.id, formData);
    if (result.success === false) {
      setSaveStatus("error");
    } else {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
      router.refresh();
    }
  }, [deal.id, router]);

  const debouncedSave = useDebouncedCallback(save, 800);

  function handlePhaseChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newValue = e.target.value;
    if (newValue === "won") {
      if (!window.confirm("フェーズを「受注」に変更しますか？")) {
        e.target.value = phase;
        return;
      }
    }
    if (newValue === "lost") {
      if (!window.confirm("フェーズを「失注」に変更しますか？")) {
        e.target.value = phase;
        return;
      }
    }
    setPhase(newValue);
    save();
  }

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
      <dl className="text-xs space-y-1">
        <div className="flex gap-2">
          <dt className="text-text-muted w-24 shrink-0">案件名</dt>
          <dd className="text-text flex-1">
            <Input name="title" defaultValue={deal.title} disabled={!editable} onChange={() => debouncedSave()} />
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-text-muted w-24 shrink-0">フェーズ</dt>
          <dd className="text-text flex-1">
            <Select
              name="phase"
              value={phase}
              onChange={handlePhaseChange}
              disabled={!editable}
            >
              {Object.entries(phaseLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-text-muted w-24 shrink-0">想定金額</dt>
          <dd className="text-text flex-1">
            <MoneyInput
              name="estimatedAmount"
              defaultValue={deal.estimatedAmount}
              disabled={!editable}
              onBlurCapture={() => debouncedSave()}
            />
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-text-muted w-24 shrink-0">想定開始日</dt>
          <dd className="text-text flex-1">
            <Input
              type="date"
              name="estimatedStartDate"
              defaultValue={startDateStr}
              disabled={!editable}
              onChange={() => debouncedSave()}
            />
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-text-muted w-24 shrink-0">想定終了日</dt>
          <dd className="text-text flex-1">
            <Input
              type="date"
              name="estimatedEndDate"
              defaultValue={endDateStr}
              disabled={!editable}
              onChange={() => debouncedSave()}
            />
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-text-muted w-24 shrink-0">契約種別</dt>
          <dd className="text-text flex-1">
            <Select
              name="contractType"
              defaultValue={deal.contractType ?? ""}
              disabled={!editable}
              onChange={handleSelectChange}
            >
              <option value="">-</option>
              {Object.entries(contractTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-text-muted w-24 shrink-0">作成日</dt>
          <dd className="text-text">{deal.createdAt.toLocaleDateString("ja-JP")}</dd>
        </div>
      </dl>
    </form>
  );
}
