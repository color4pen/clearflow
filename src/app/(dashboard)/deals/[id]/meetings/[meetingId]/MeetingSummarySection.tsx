"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
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
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const save = useCallback(async (text: string) => {
    setSaveStatus("saving");
    const formData = new FormData();
    formData.set("meetingId", meetingId);
    formData.set("dealId", dealId);
    formData.set("summary", text);
    const result = await updateMeetingAction({}, formData);
    const success = !result.message && !result.errors;
    if (success) {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
      router.refresh();
    } else {
      setSaveStatus("error");
    }
  }, [meetingId, dealId, router]);

  const debouncedSave = useDebouncedCallback((text: string) => {
    save(text);
  }, 800);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newValue = e.target.value;
    setValue(newValue);
    debouncedSave(newValue);
  }

  return (
    <div>
      {saveStatus !== "idle" && (
        <div className="flex justify-end mb-1">
          {saveStatus === "saving" && <span className="text-text-muted text-xs">保存中...</span>}
          {saveStatus === "saved" && <span className="text-green-600 text-xs">保存済み</span>}
          {saveStatus === "error" && <span className="text-danger text-xs">保存に失敗しました</span>}
        </div>
      )}
      <Textarea
        value={value}
        onChange={handleChange}
        placeholder="議事録を入力"
        rows={8}
        disabled={!editable}
      />
    </div>
  );
}
