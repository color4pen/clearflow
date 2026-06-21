"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateDealAction } from "@/app/actions/deals";
import { SectionCard, Textarea } from "@/app/components";

type Props = {
  dealId: string;
  notes: string | null;
};

export function DealNotesSection({ dealId, notes }: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
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
      setIsEditing(false);
      router.refresh();
    }
  }

  return (
    <SectionCard className="p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold text-text">備考</h2>
        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-xs text-primary underline cursor-pointer"
          >
            編集
          </button>
        )}
      </div>
      {error && <p className="text-danger text-xs mb-1">{error}</p>}
      {isEditing ? (
        <div>
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={6}
            placeholder="案件の状況や共有事項を記入"
          />
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSave}
              className="bg-primary text-white text-xs font-bold px-4 py-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "保存中..." : "保存"}
            </button>
            <button
              type="button"
              onClick={() => {
                setValue(notes ?? "");
                setIsEditing(false);
              }}
              className="border border-border text-text text-xs px-3 py-1.5 cursor-pointer"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : notes ? (
        <p className="text-xs text-text whitespace-pre-wrap">{notes}</p>
      ) : (
        <p className="text-xs text-text-muted">備考はありません</p>
      )}
    </SectionCard>
  );
}
