"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateMeetingAction } from "@/app/actions/meetings";
import { MarkdownTextarea } from "@/app/components";

type Props = {
  meetingId: string;
  dealId: string;
  summary: string | null;
  editable: boolean;
};

export function MeetingSummarySection({ meetingId, dealId, summary, editable }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(summary ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  async function handleSave() {
    setIsSubmitting(true);
    setError(null);
    const formData = new FormData();
    formData.set("meetingId", meetingId);
    formData.set("dealId", dealId);
    formData.set("summary", value);
    const result = await updateMeetingAction({}, formData);
    const success = !result.message && !result.errors;
    setIsSubmitting(false);
    if (success) {
      setIsDirty(false);
      router.refresh();
    } else {
      setError(result.message ?? "保存に失敗しました");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold text-text">議事録</h2>
        <div className="flex items-center gap-2">
          {error && <span className="text-danger text-xs">{error}</span>}
          {editable && (
            <button
              type="button"
              disabled={!isDirty || isSubmitting}
              onClick={handleSave}
              className={`text-xs font-bold px-3 py-1 ${
                isDirty
                  ? "bg-green-600 text-white cursor-pointer"
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
        placeholder="議事録を入力"
        rows={10}
        disabled={!editable}
      />
    </div>
  );
}
