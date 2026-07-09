"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateMeetingAction } from "@/app/actions/meetings";
import { SectionCard, Input, Textarea, preventEnterSubmit } from "@/app/components";
import type { HearingData } from "@/domain/models/interaction";

type Props = {
  meetingId: string;
  dealId: string;
  details: HearingData | null;
  editable: boolean;
};

export function MeetingHearingSection({
  meetingId,
  dealId,
  details: initialDetails,
  editable,
}: Props) {
  const router = useRouter();
  const [hearingData, setHearingData] = useState<HearingData>(
    initialDetails ?? {
      challenge: null,
      budget: null,
      decisionMaker: null,
      timeline: null,
      competitors: null,
      notes: null,
    }
  );

  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function markDirty() {
    setIsDirty(true);
  }

  async function handleSave() {
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("meetingId", meetingId);
    formData.set("dealId", dealId);
    formData.set("hearingData", JSON.stringify(hearingData));

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
    <form onKeyDown={preventEnterSubmit}>
      <SectionCard className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-text">ヒアリング項目</h2>
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
        <div
          className="text-xs"
          style={{
            display: "grid",
            gridTemplateColumns: "100px 1fr",
            rowGap: "6px",
            alignItems: "start",
          }}
        >
          <label className="text-text-muted pt-1" htmlFor="hearing-challenge">
            課題
          </label>
          <Textarea
            id="hearing-challenge"
            value={hearingData.challenge ?? ""}
            onChange={(e) => {
              setHearingData((prev) => ({
                ...prev,
                challenge: e.target.value || null,
              }));
              markDirty();
            }}
            rows={2}
            placeholder="顧客の課題"
            disabled={!editable}
          />
          <label className="text-text-muted pt-1" htmlFor="hearing-budget">
            予算感
          </label>
          <Input
            id="hearing-budget"
            value={hearingData.budget ?? ""}
            onChange={(e) => {
              setHearingData((prev) => ({
                ...prev,
                budget: e.target.value || null,
              }));
              markDirty();
            }}
            placeholder="予算感"
            disabled={!editable}
          />
          <label className="text-text-muted pt-1" htmlFor="hearing-decisionMaker">
            決裁者
          </label>
          <Input
            id="hearing-decisionMaker"
            value={hearingData.decisionMaker ?? ""}
            onChange={(e) => {
              setHearingData((prev) => ({
                ...prev,
                decisionMaker: e.target.value || null,
              }));
              markDirty();
            }}
            placeholder="決裁者"
            disabled={!editable}
          />
          <label className="text-text-muted pt-1" htmlFor="hearing-timeline">
            時期
          </label>
          <Input
            id="hearing-timeline"
            value={hearingData.timeline ?? ""}
            onChange={(e) => {
              setHearingData((prev) => ({
                ...prev,
                timeline: e.target.value || null,
              }));
              markDirty();
            }}
            placeholder="導入時期"
            disabled={!editable}
          />
          <label className="text-text-muted pt-1" htmlFor="hearing-competitors">
            競合状況
          </label>
          <Textarea
            id="hearing-competitors"
            value={hearingData.competitors ?? ""}
            onChange={(e) => {
              setHearingData((prev) => ({
                ...prev,
                competitors: e.target.value || null,
              }));
              markDirty();
            }}
            rows={2}
            placeholder="競合他社など"
            disabled={!editable}
          />
          <label className="text-text-muted pt-1" htmlFor="hearing-notes">
            備考
          </label>
          <Textarea
            id="hearing-notes"
            value={hearingData.notes ?? ""}
            onChange={(e) => {
              setHearingData((prev) => ({
                ...prev,
                notes: e.target.value || null,
              }));
              markDirty();
            }}
            rows={2}
            placeholder="備考"
            disabled={!editable}
          />
        </div>
      </SectionCard>
    </form>
  );
}
