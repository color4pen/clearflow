"use client";

import { useRouter } from "next/navigation";
import { updateMeetingAction } from "@/app/actions/meetings";
import { InlineEditTextarea } from "@/app/components";

type Props = {
  meetingId: string;
  dealId: string;
  summary: string | null;
  editable: boolean;
};

export function MeetingSummarySection({ meetingId, dealId, summary, editable }: Props) {
  const router = useRouter();

  async function handleSave(newValue: string) {
    const formData = new FormData();
    formData.set("meetingId", meetingId);
    formData.set("dealId", dealId);
    formData.set("summary", newValue);
    const result = await updateMeetingAction({}, formData);
    const success = !result.message && !result.errors;
    if (success) router.refresh();
    return { success, message: result.message };
  }

  return (
    <InlineEditTextarea
      value={summary}
      onSave={handleSave}
      editable={editable}
      placeholder="議事録を入力"
      rows={8}
    />
  );
}
