"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateDealAction } from "@/app/actions/deals";
import { SectionCard, FormField, Input, Textarea, Select, preventEnterSubmit, MoneyInput } from "@/app/components";
import { phaseLabels } from "@/app/(dashboard)/labels";
import type { Deal } from "@/domain/models/deal";

type Props = {
  deal: Deal;
  users: { id: string; name: string }[];
};

const allPhases = ["proposal_prep", "proposed", "negotiation", "won", "lost"] as const;

export function DealEditForm({ deal, users }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isTerminal = deal.phase === "won" || deal.phase === "lost";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const selectedPhase = formData.get("phase");

    if (selectedPhase === "won") {
      if (!window.confirm("受注に変更すると元に戻せません。続行しますか？")) {
        return;
      }
    } else if (selectedPhase === "lost") {
      if (!window.confirm("失注に変更すると元に戻せません。続行しますか？")) {
        return;
      }
    }

    setIsSubmitting(true);
    setMessage(null);
    const result = await updateDealAction(deal.id, formData);
    setIsSubmitting(false);
    if (!result.success) {
      setMessage(result.message ?? "更新に失敗しました");
    } else {
      router.push(`/deals/${deal.id}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} onKeyDown={preventEnterSubmit}>
      <SectionCard className="p-3">
        {message && <p className="text-danger text-xs mb-2">{message}</p>}

        <FormField label="フェーズ">
          {isTerminal ? (
            <p className="text-xs text-text-muted py-1">{phaseLabels[deal.phase]}（変更不可）</p>
          ) : (
            <Select name="phase" defaultValue="">
              <option value="">変更しない</option>
              {allPhases
                .filter((p) => p !== deal.phase)
                .map((p) => (
                  <option key={p} value={p}>
                    {phaseLabels[p]}
                  </option>
                ))}
            </Select>
          )}
        </FormField>

        <FormField label="案件名">
          <Input name="title" defaultValue={deal.title} required />
        </FormField>

        <FormField label="想定金額">
          <MoneyInput
            name="estimatedAmount"
            defaultValue={deal.estimatedAmount}
          />
        </FormField>

        <FormField label="想定開始日">
          <Input
            name="estimatedStartDate"
            type="date"
            defaultValue={
              deal.estimatedStartDate
                ? deal.estimatedStartDate.toISOString().slice(0, 10)
                : ""
            }
          />
        </FormField>

        <FormField label="想定終了日">
          <Input
            name="estimatedEndDate"
            type="date"
            defaultValue={
              deal.estimatedEndDate
                ? deal.estimatedEndDate.toISOString().slice(0, 10)
                : ""
            }
          />
        </FormField>

        <FormField label="契約種別">
          <Select name="contractType" defaultValue={deal.contractType ?? ""}>
            <option value="">未設定</option>
            <option value="quasi_delegation">準委任</option>
            <option value="fixed_price">請負</option>
            <option value="ses">SES</option>
          </Select>
        </FormField>

        <FormField label="営業担当">
          <Select name="assigneeId" defaultValue={deal.assigneeId ?? ""}>
            <option value="">未設定</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="技術担当">
          <Select name="technicalLeadId" defaultValue={deal.technicalLeadId ?? ""}>
            <option value="">未設定</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="備考">
          <Textarea name="notes" defaultValue={deal.notes ?? ""} rows={4} />
        </FormField>

        <div className="flex gap-2 mt-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary text-white text-xs font-bold px-4 py-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? "保存中..." : "保存"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="border border-border text-text text-xs px-3 py-1.5 cursor-pointer"
          >
            キャンセル
          </button>
        </div>
      </SectionCard>
    </form>
  );
}
