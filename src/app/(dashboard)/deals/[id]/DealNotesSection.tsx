"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateDealAction } from "@/app/actions/deals";
import { SectionCard, MarkdownTextarea } from "@/app/components";

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
  const [isDirty, setIsDirty] = useState(false);

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
      setIsDirty(false);
      router.refresh();
    }
  }

  return (
    <SectionCard className="p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold text-text">備考</h2>
        <div className="flex items-center gap-2">
          {error && <span className="text-danger text-xs">{error}</span>}
          {editable && (
            <button
              type="button"
              disabled={!isDirty || isSubmitting}
              onClick={handleSave}
              className={`text-xs font-bold px-3 py-1 ${
                isDirty
                  ? "bg-primary text-white cursor-pointer hover:opacity-90"
                  : "bg-bg-toolbar border border-border text-text-muted cursor-not-allowed"
              } disabled:opacity-50`}
            >
              {isSubmitting ? "保存中..." : "保存"}
            </button>
          )}
        </div>
      </div>
      <MarkdownTextarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setIsDirty(true);
        }}
        rows={8}
        placeholder="案件の状況や共有事項を記入"
        disabled={!editable}
      />
    </SectionCard>
  );
}
