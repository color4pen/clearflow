"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateMeetingAction } from "@/app/actions/meetings";
import { SectionCard, FormField, Input, Select, Textarea, preventEnterSubmit } from "@/app/components";
import { meetingTypeLabels } from "@/app/(dashboard)/labels";
import type { HearingData } from "@/domain/models/meeting";

const typeOptions = Object.entries(meetingTypeLabels).map(([value, label]) => ({
  value,
  label,
}));

type Props = {
  meetingId: string;
  dealId: string;
  meeting: {
    type: string;
    date: Date;
    location: string | null;
    attendees: { internal: string[]; external: string[] };
    hearingData: HearingData | null;
  };
  editable: boolean;
  orgUsers?: Array<{ id: string; name: string }>;
  existingContacts?: Array<{ id: string; name: string }>;
};

function toDatetimeLocalValue(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export function MeetingInfoSection({ meetingId, dealId, meeting, editable, orgUsers = [], existingContacts = [] }: Props) {
  const router = useRouter();

  const [type, setType] = useState(meeting.type);
  const [date, setDate] = useState(toDatetimeLocalValue(meeting.date));
  const [location, setLocation] = useState(meeting.location ?? "");
  const [internalAttendees, setInternalAttendees] = useState<string[]>(
    meeting.attendees.internal.length > 0 ? [...meeting.attendees.internal] : [""]
  );
  const [externalAttendees, setExternalAttendees] = useState<string[]>(
    meeting.attendees.external.length > 0 ? [...meeting.attendees.external] : [""]
  );
  const [hearingData, setHearingData] = useState<HearingData>(
    meeting.hearingData ?? {
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
    formData.set("type", type);
    formData.set("date", date);
    formData.set("location", location);
    formData.set(
      "internalAttendees",
      JSON.stringify(internalAttendees.filter((a) => a.trim()))
    );
    formData.set(
      "externalAttendees",
      JSON.stringify(externalAttendees.filter((a) => a.trim()))
    );

    if (type === "hearing") {
      formData.set("hearingData", JSON.stringify(hearingData));
    } else {
      formData.set("hearingData", "null");
    }

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

  function addInternalAttendee() {
    setInternalAttendees((prev) => [...prev, ""]);
    markDirty();
  }

  function removeInternalAttendee(idx: number) {
    setInternalAttendees((prev) => prev.filter((_, i) => i !== idx));
    markDirty();
  }

  function addExternalAttendee() {
    setExternalAttendees((prev) => [...prev, ""]);
    markDirty();
  }

  function removeExternalAttendee(idx: number) {
    setExternalAttendees((prev) => prev.filter((_, i) => i !== idx));
    markDirty();
  }

  return (
    <form onKeyDown={preventEnterSubmit} className="space-y-2">
      {/* 商談情報 */}
      <SectionCard className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-text">商談情報</h2>
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
        <dl className="text-xs space-y-1">
          <div className="flex gap-2 items-center">
            <dt className="text-text-muted w-24 shrink-0">種別</dt>
            <dd className="text-text flex-1">
              <Select
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  markDirty();
                }}
                disabled={!editable}
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
                onChange={(e) => {
                  setDate(e.target.value);
                  markDirty();
                }}
                disabled={!editable}
              />
            </dd>
          </div>
          <div className="flex gap-2 items-center">
            <dt className="text-text-muted w-24 shrink-0">場所</dt>
            <dd className="text-text flex-1">
              <Input
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  markDirty();
                }}
                placeholder="場所またはURL"
                disabled={!editable}
              />
            </dd>
          </div>
        </dl>
      </SectionCard>

      {/* 参加者 */}
      <SectionCard className="p-3">
        <h2 className="text-xs font-bold text-text mb-2">参加者</h2>
        <div className="text-xs space-y-2">
          <div>
            <p className="text-text-muted font-bold mb-0.5">社内</p>
            {editable && orgUsers.length > 0 && (
              <div className="mb-1">
                <Select
                  value=""
                  onChange={(e) => {
                    const user = orgUsers.find((u) => u.id === e.target.value);
                    if (user && !internalAttendees.includes(user.name)) {
                      setInternalAttendees((prev) => [
                        ...prev.filter((a) => a.trim()),
                        user.name,
                        "",
                      ]);
                      markDirty();
                    }
                    e.target.value = "";
                  }}
                >
                  <option value="">ユーザーから追加...</option>
                  {orgUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </Select>
              </div>
            )}
            {internalAttendees.map((attendee, idx) => (
              <div key={idx} className="flex gap-1 mb-1">
                <Input
                  value={attendee}
                  onChange={(e) => {
                    setInternalAttendees((prev) =>
                      prev.map((a, i) => (i === idx ? e.target.value : a))
                    );
                    markDirty();
                  }}
                  placeholder="氏名"
                  disabled={!editable}
                />
                {editable && internalAttendees.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeInternalAttendee(idx)}
                    className="text-xs text-danger underline whitespace-nowrap"
                  >
                    削除
                  </button>
                )}
              </div>
            ))}
            {editable && (
              <button
                type="button"
                onClick={addInternalAttendee}
                className="text-xs text-primary underline"
              >
                + 追加
              </button>
            )}
          </div>
          <div>
            <p className="text-text-muted font-bold mb-0.5">社外</p>
            {editable && existingContacts.length > 0 && (
              <div className="mb-1">
                <Select
                  value=""
                  onChange={(e) => {
                    const contact = existingContacts.find((c) => c.id === e.target.value);
                    if (contact && !externalAttendees.includes(contact.name)) {
                      setExternalAttendees((prev) => [
                        ...prev.filter((a) => a.trim()),
                        contact.name,
                        "",
                      ]);
                      markDirty();
                    }
                    e.target.value = "";
                  }}
                >
                  <option value="">顧客担当者から追加...</option>
                  {existingContacts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>
            )}
            {externalAttendees.map((attendee, idx) => (
              <div key={idx} className="flex gap-1 mb-1">
                <Input
                  value={attendee}
                  onChange={(e) => {
                    setExternalAttendees((prev) =>
                      prev.map((a, i) => (i === idx ? e.target.value : a))
                    );
                    markDirty();
                  }}
                  placeholder="氏名"
                  disabled={!editable}
                />
                {editable && externalAttendees.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeExternalAttendee(idx)}
                    className="text-xs text-danger underline whitespace-nowrap"
                  >
                    削除
                  </button>
                )}
              </div>
            ))}
            {editable && (
              <button
                type="button"
                onClick={addExternalAttendee}
                className="text-xs text-primary underline"
              >
                + 追加
              </button>
            )}
          </div>
        </div>
      </SectionCard>

      {/* ヒアリング項目 */}
      {type === "hearing" && (
        <SectionCard className="p-3">
          <h2 className="text-xs font-bold text-text mb-2">ヒアリング項目</h2>
          <div className="text-xs space-y-1">
            <FormField label="課題" htmlFor="hearing-challenge">
              <Textarea
                id="hearing-challenge"
                value={hearingData.challenge ?? ""}
                onChange={(e) => {
                  setHearingData((prev) => ({ ...prev, challenge: e.target.value || null }));
                  markDirty();
                }}
                rows={2}
                placeholder="顧客の課題"
                disabled={!editable}
              />
            </FormField>
            <FormField label="予算感" htmlFor="hearing-budget">
              <Input
                id="hearing-budget"
                value={hearingData.budget ?? ""}
                onChange={(e) => {
                  setHearingData((prev) => ({ ...prev, budget: e.target.value || null }));
                  markDirty();
                }}
                placeholder="予算感"
                disabled={!editable}
              />
            </FormField>
            <FormField label="決裁者" htmlFor="hearing-decisionMaker">
              <Input
                id="hearing-decisionMaker"
                value={hearingData.decisionMaker ?? ""}
                onChange={(e) => {
                  setHearingData((prev) => ({ ...prev, decisionMaker: e.target.value || null }));
                  markDirty();
                }}
                placeholder="決裁者"
                disabled={!editable}
              />
            </FormField>
            <FormField label="時期" htmlFor="hearing-timeline">
              <Input
                id="hearing-timeline"
                value={hearingData.timeline ?? ""}
                onChange={(e) => {
                  setHearingData((prev) => ({ ...prev, timeline: e.target.value || null }));
                  markDirty();
                }}
                placeholder="導入時期"
                disabled={!editable}
              />
            </FormField>
            <FormField label="競合状況" htmlFor="hearing-competitors">
              <Textarea
                id="hearing-competitors"
                value={hearingData.competitors ?? ""}
                onChange={(e) => {
                  setHearingData((prev) => ({ ...prev, competitors: e.target.value || null }));
                  markDirty();
                }}
                rows={2}
                placeholder="競合他社など"
                disabled={!editable}
              />
            </FormField>
            <FormField label="備考" htmlFor="hearing-notes">
              <Textarea
                id="hearing-notes"
                value={hearingData.notes ?? ""}
                onChange={(e) => {
                  setHearingData((prev) => ({ ...prev, notes: e.target.value || null }));
                  markDirty();
                }}
                rows={2}
                placeholder="備考"
                disabled={!editable}
              />
            </FormField>
          </div>
        </SectionCard>
      )}
    </form>
  );
}
