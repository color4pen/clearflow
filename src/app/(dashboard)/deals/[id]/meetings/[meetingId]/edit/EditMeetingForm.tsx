"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateMeetingAction } from "@/app/actions/meetings";
import { FormField, Input, Select, Textarea, SubmitButton } from "@/app/components";
import type { Meeting, ActionItem, HearingData } from "@/domain/models/meeting";

type Props = {
  meeting: Meeting;
  dealId: string;
};

const typeOptions = [
  { value: "hearing", label: "ヒアリング" },
  { value: "proposal", label: "提案" },
  { value: "negotiation", label: "交渉" },
  { value: "closing", label: "クロージング" },
  { value: "followup", label: "フォローアップ" },
];

export function EditMeetingForm({ meeting, dealId }: Props) {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState(meeting.type);
  const [internalAttendees, setInternalAttendees] = useState<string[]>(
    meeting.attendees.internal.length > 0 ? meeting.attendees.internal : [""]
  );
  const [externalAttendees, setExternalAttendees] = useState<string[]>(
    meeting.attendees.external.length > 0 ? meeting.attendees.external : [""]
  );
  const [actionItems, setActionItems] = useState<ActionItem[]>(meeting.actionItems);
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

  const [state, formAction, isPending] = useActionState(
    async (prev: Parameters<typeof updateMeetingAction>[0], formData: FormData) => {
      formData.set("meetingId", meeting.id);
      formData.set("internalAttendees", JSON.stringify(internalAttendees.filter((a) => a.trim())));
      formData.set("externalAttendees", JSON.stringify(externalAttendees.filter((a) => a.trim())));
      formData.set("actionItems", JSON.stringify(actionItems));

      if (selectedType === "hearing") {
        formData.set("hearingData", JSON.stringify(hearingData));
      } else {
        formData.set("hearingData", "null");
      }

      const result = await updateMeetingAction(prev, formData);
      if (!result.errors && !result.message) {
        router.push(`/deals/${dealId}/meetings/${meeting.id}`);
      }
      return result;
    },
    {}
  );

  function addInternalAttendee() {
    setInternalAttendees((prev) => [...prev, ""]);
  }

  function removeInternalAttendee(idx: number) {
    setInternalAttendees((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateInternalAttendee(idx: number, value: string) {
    setInternalAttendees((prev) => prev.map((a, i) => (i === idx ? value : a)));
  }

  function addExternalAttendee() {
    setExternalAttendees((prev) => [...prev, ""]);
  }

  function removeExternalAttendee(idx: number) {
    setExternalAttendees((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateExternalAttendee(idx: number, value: string) {
    setExternalAttendees((prev) => prev.map((a, i) => (i === idx ? value : a)));
  }

  function addActionItem() {
    setActionItems((prev) => [
      ...prev,
      { description: "", assignee: "", dueDate: null, done: false },
    ]);
  }

  function removeActionItem(idx: number) {
    setActionItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateActionItem(idx: number, field: keyof ActionItem, value: string | boolean | null) {
    setActionItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  }

  // date を datetime-local 形式に変換する
  const dateValue = meeting.date
    ? new Date(meeting.date.getTime() - meeting.date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";

  return (
    <form action={formAction} className="bg-bg-surface border border-border border-t-0 p-4">
      {state.message && (
        <p className="text-danger text-xs mb-3">{state.message}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <FormField
          label={<>種別 <span className="text-danger">*</span></>}
          htmlFor="type"
          error={state.errors?.type?.[0]}
        >
          <Select
            id="type"
            name="type"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as typeof selectedType)}
            required
          >
            {typeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          label={<>日時 <span className="text-danger">*</span></>}
          htmlFor="date"
          error={state.errors?.date?.[0]}
        >
          <Input id="date" name="date" type="datetime-local" defaultValue={dateValue} required />
        </FormField>

        <FormField
          label="場所 / URL"
          htmlFor="location"
          error={state.errors?.location?.[0]}
        >
          <Input
            id="location"
            name="location"
            defaultValue={meeting.location ?? ""}
            placeholder="場所またはオンラインURL（任意）"
          />
        </FormField>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-bold text-text mb-1">社内参加者</p>
          {internalAttendees.map((attendee, idx) => (
            <div key={idx} className="flex gap-1 mb-1">
              <Input
                value={attendee}
                onChange={(e) => updateInternalAttendee(idx, e.target.value)}
                placeholder="氏名"
              />
              {internalAttendees.length > 1 && (
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
          <button
            type="button"
            onClick={addInternalAttendee}
            className="text-xs text-primary underline"
          >
            + 追加
          </button>
        </div>

        <div>
          <p className="text-xs font-bold text-text mb-1">社外参加者</p>
          {externalAttendees.map((attendee, idx) => (
            <div key={idx} className="flex gap-1 mb-1">
              <Input
                value={attendee}
                onChange={(e) => updateExternalAttendee(idx, e.target.value)}
                placeholder="氏名"
              />
              {externalAttendees.length > 1 && (
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
          <button
            type="button"
            onClick={addExternalAttendee}
            className="text-xs text-primary underline"
          >
            + 追加
          </button>
        </div>
      </div>

      <div className="mt-3">
        <FormField label="議事録" htmlFor="summary" error={state.errors?.summary?.[0]}>
          <Textarea
            id="summary"
            name="summary"
            rows={4}
            defaultValue={meeting.summary ?? ""}
            placeholder="商談の要約・議事録"
          />
        </FormField>
      </div>

      {/* ヒアリング専用フィールド */}
      {selectedType === "hearing" && (
        <div className="mt-3 border border-border-light p-3 bg-bg-surface-alt">
          <p className="text-xs font-bold text-text mb-2">ヒアリング項目</p>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="課題" htmlFor="hearing-challenge">
              <Textarea
                id="hearing-challenge"
                value={hearingData.challenge ?? ""}
                onChange={(e) => setHearingData((prev) => ({ ...prev, challenge: e.target.value || null }))}
                rows={2}
                placeholder="顧客の課題"
              />
            </FormField>
            <FormField label="予算感" htmlFor="hearing-budget">
              <Input
                id="hearing-budget"
                value={hearingData.budget ?? ""}
                onChange={(e) => setHearingData((prev) => ({ ...prev, budget: e.target.value || null }))}
                placeholder="予算感"
              />
            </FormField>
            <FormField label="決裁者" htmlFor="hearing-decisionMaker">
              <Input
                id="hearing-decisionMaker"
                value={hearingData.decisionMaker ?? ""}
                onChange={(e) => setHearingData((prev) => ({ ...prev, decisionMaker: e.target.value || null }))}
                placeholder="決裁者"
              />
            </FormField>
            <FormField label="時期" htmlFor="hearing-timeline">
              <Input
                id="hearing-timeline"
                value={hearingData.timeline ?? ""}
                onChange={(e) => setHearingData((prev) => ({ ...prev, timeline: e.target.value || null }))}
                placeholder="導入時期"
              />
            </FormField>
            <FormField label="競合状況" htmlFor="hearing-competitors">
              <Textarea
                id="hearing-competitors"
                value={hearingData.competitors ?? ""}
                onChange={(e) => setHearingData((prev) => ({ ...prev, competitors: e.target.value || null }))}
                rows={2}
                placeholder="競合他社など"
              />
            </FormField>
            <FormField label="備考" htmlFor="hearing-notes">
              <Textarea
                id="hearing-notes"
                value={hearingData.notes ?? ""}
                onChange={(e) => setHearingData((prev) => ({ ...prev, notes: e.target.value || null }))}
                rows={2}
                placeholder="備考"
              />
            </FormField>
          </div>
        </div>
      )}

      <div className="mt-3">
        <p className="text-xs font-bold text-text mb-1">アクションアイテム</p>
        {actionItems.map((item, idx) => (
          <div key={idx} className="border border-border-light p-2 mb-2 bg-bg-surface-alt">
            <div className="grid grid-cols-3 gap-2 mb-1">
              <FormField label="内容" htmlFor={`ai-desc-${idx}`}>
                <Input
                  id={`ai-desc-${idx}`}
                  value={item.description}
                  onChange={(e) => updateActionItem(idx, "description", e.target.value)}
                  placeholder="アクション内容"
                />
              </FormField>
              <FormField label="担当者" htmlFor={`ai-assignee-${idx}`}>
                <Input
                  id={`ai-assignee-${idx}`}
                  value={item.assignee}
                  onChange={(e) => updateActionItem(idx, "assignee", e.target.value)}
                  placeholder="担当者名"
                />
              </FormField>
              <FormField label="期日" htmlFor={`ai-due-${idx}`}>
                <Input
                  id={`ai-due-${idx}`}
                  type="date"
                  value={item.dueDate ?? ""}
                  onChange={(e) => updateActionItem(idx, "dueDate", e.target.value || null)}
                />
              </FormField>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 text-xs text-text-muted">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => updateActionItem(idx, "done", !item.done)}
                  className="accent-primary"
                />
                完了
              </label>
              <button
                type="button"
                onClick={() => removeActionItem(idx)}
                className="text-xs text-danger underline"
              >
                削除
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addActionItem}
          className="text-xs text-primary underline"
        >
          + アクションアイテムを追加
        </button>
      </div>

      <div className="mt-4 flex gap-2">
        <SubmitButton pending={isPending}>保存</SubmitButton>
        <Link
          href={`/deals/${dealId}/meetings/${meeting.id}`}
          className="text-xs text-text-muted underline self-center"
        >
          キャンセル
        </Link>
      </div>
    </form>
  );
}
