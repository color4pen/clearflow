"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateMeetingAction } from "@/app/actions/meetings";
import { Textarea } from "@/app/components";

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
      router.refresh();
    } else {
      setError(result.message ?? "保存に失敗しました");
    }
  }

  return (
    <div>
      {error && <p className="text-danger text-xs mb-1">{error}</p>}
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="議事録を入力"
        rows={8}
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
    </div>
  );
}
