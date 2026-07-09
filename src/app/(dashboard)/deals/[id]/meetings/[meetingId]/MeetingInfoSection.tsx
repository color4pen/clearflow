"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateMeetingAction } from "@/app/actions/meetings";
import { SectionCard, Input, Select, preventEnterSubmit } from "@/app/components";
import { meetingTypeLabels } from "@/app/(dashboard)/labels";

const typeOptions = Object.entries(meetingTypeLabels).map(([value, label]) => ({
  value,
  label,
}));

type Props = {
  meetingId: string;
  dealId: string;
  meeting: {
    meetingType: string | null;
    date: Date;
    location: string | null;
  };
  editable: boolean;
};

function toDatetimeLocalValue(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export function MeetingInfoSection({ meetingId, dealId, meeting, editable }: Props) {
  const router = useRouter();

  const [mode, setMode] = useState<"display" | "edit">("display");
  const [type, setType] = useState(meeting.meetingType ?? "");
  const [date, setDate] = useState(toDatetimeLocalValue(meeting.date));
  const [location, setLocation] = useState(meeting.location ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleCancel() {
    setType(meeting.meetingType ?? "");
    setDate(toDatetimeLocalValue(meeting.date));
    setLocation(meeting.location ?? "");
    setError(null);
    setMode("display");
  }

  async function handleSave() {
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("meetingId", meetingId);
    formData.set("dealId", dealId);
    formData.set("type", type);
    formData.set("date", date);
    formData.set("location", location);

    const result = await updateMeetingAction({}, formData);
    const success = !result.message && !result.errors;
    setIsSubmitting(false);

    if (success) {
      setMode("display");
      router.refresh();
    } else {
      setError(result.message ?? "保存に失敗しました");
    }
  }

  const displayDate = date
    ? new Date(date).toLocaleString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

  return (
    <form onKeyDown={preventEnterSubmit}>
      <SectionCard className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-text">商談情報</h2>
          <div className="flex items-center gap-2">
            {error && <span className="text-danger text-xs">{error}</span>}
            {mode === "display" && editable && (
              <button
                type="button"
                onClick={() => setMode("edit")}
                className="text-xs font-bold px-3 py-1 bg-bg-toolbar border border-border text-text cursor-pointer"
              >
                編集
              </button>
            )}
            {mode === "edit" && (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="text-xs px-3 py-1 bg-bg-toolbar border border-border text-text cursor-pointer"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSave}
                  className="text-xs font-bold px-3 py-1 bg-primary text-white cursor-pointer disabled:opacity-50 hover:opacity-90"
                >
                  {isSubmitting ? "保存中..." : "保存"}
                </button>
              </>
            )}
          </div>
        </div>

        {mode === "display" ? (
          <dl className="text-xs space-y-1">
            <div className="flex gap-2 items-center">
              <dt className="text-text-muted w-24 shrink-0">種別</dt>
              <dd className="text-text">{meetingTypeLabels[type] ?? type}</dd>
            </div>
            <div className="flex gap-2 items-center">
              <dt className="text-text-muted w-24 shrink-0">日時</dt>
              <dd className="text-text">{displayDate}</dd>
            </div>
            <div className="flex gap-2 items-center">
              <dt className="text-text-muted w-24 shrink-0">場所</dt>
              <dd className="text-text">{location || "-"}</dd>
            </div>
          </dl>
        ) : (
          <dl className="text-xs space-y-1">
            <div className="flex gap-2 items-center">
              <dt className="text-text-muted w-24 shrink-0">種別</dt>
              <dd className="text-text flex-1">
                <Select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  {typeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </dd>
            </div>
            <div className="flex gap-2 items-center">
              <dt className="text-text-muted w-24 shrink-0">日時</dt>
              <dd className="text-text flex-1">
                <Input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </dd>
            </div>
            <div className="flex gap-2 items-center">
              <dt className="text-text-muted w-24 shrink-0">場所</dt>
              <dd className="text-text flex-1">
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="場所またはURL"
                />
              </dd>
            </div>
          </dl>
        )}
      </SectionCard>
    </form>
  );
}
