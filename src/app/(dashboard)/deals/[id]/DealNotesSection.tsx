"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateDealAction } from "@/app/actions/deals";
import { SectionCard, Textarea } from "@/app/components";

type Props = {
  dealId: string;
  notes: string | null;
  editable: boolean;
};

export function DealNotesSection({ dealId, notes, editable }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(notes ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setIsSubmitting(true);
    setError(null);
    const formData = new FormData();
    formData.set("notes", value);
    const result = await updateDealAction(dealId, formData);
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.message ?? "保存に失敗しました");
    } else {
      router.refresh();
    }
  }

  return (
    <SectionCard className="p-3 mb-3">
      <h2 className="text-xs font-bold text-text mb-2">備考</h2>
      {error && <p className="text-danger text-xs mb-1">{error}</p>}
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={6}
        placeholder="案件の状況や共有事項を記入"
        disabled={!editable}
      />
      {editable && (
        <div className="mt-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSave}
            className="bg-primary text-white text-xs font-bold px-4 py-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? "保存中..." : "保存"}
          </button>
        </div>
      )}
    </SectionCard>
  );
}
