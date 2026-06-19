"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createMeetingAction } from "@/app/actions/meetings";
import { FormField, Input, Select, Textarea, SubmitButton } from "@/app/components";
import type { ActionItem } from "@/domain/models/meeting";

type Props = {
  inquiryId: string;
};

const typeOptions = [
  { value: "", label: "選択してください" },
  { value: "hearing", label: "ヒアリング" },
  { value: "proposal", label: "提案" },
  { value: "negotiation", label: "交渉" },
  { value: "closing", label: "クロージング" },
  { value: "followup", label: "フォローアップ" },
];

export function MeetingForm({ inquiryId }: Props) {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState("");
  const [internalAttendees, setInternalAttendees] = useState<string[]>([""]);
  const [externalAttendees, setExternalAttendees] = useState<string[]>([""]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);

  // ヒアリングデータ
  const [hearingChallenge, setHearingChallenge] = useState("");
  const [hearingBudget, setHearingBudget] = useState("");
  const [hearingDecisionMaker, setHearingDecisionMaker] = useState("");
  const [hearingTimeline, setHearingTimeline] = useState("");
  const [hearingCompetitors, setHearingCompetitors] = useState("");
  const [hearingNotes, setHearingNotes] = useState("");

  const [state, formAction, isPending] = useActionState(
    async (prev: Parameters<typeof createMeetingAction>[0], formData: FormData) => {
      // 動的フィールドを JSON として追加
      formData.set("internalAttendees", JSON.stringify(internalAttendees.filter((a) => a.trim())));
      formData.set("externalAttendees", JSON.stringify(externalAttendees.filter((a) => a.trim())));
      formData.set("actionItems", JSON.stringify(actionItems));

      // hearing 選択時のみ hearingData を設定
      if (selectedType === "hearing") {
        formData.set(
          "hearingData",
          JSON.stringify({
            challenge: hearingChallenge || null,
            budget: hearingBudget || null,
            decisionMaker: hearingDecisionMaker || null,
            timeline: hearingTimeline || null,
            competitors: hearingCompetitors || null,
            notes: hearingNotes || null,
          })
        );
      }

      const result = await createMeetingAction(prev, formData);
      if (!result.errors && !result.message) {
        router.push(`/inquiries/${inquiryId}`);
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

  return (
    <form action={formAction} className="bg-bg-surface border border-border border-t-0 p-4">
      <input type="hidden" name="inquiryId" value={inquiryId} />

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
            onChange={(e) => setSelectedType(e.target.value)}
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
          <Input id="date" name="date" type="datetime-local" required />
        </FormField>

        <FormField
          label="場所 / URL"
          htmlFor="location"
          error={state.errors?.location?.[0]}
        >
          <Input id="location" name="location" placeholder="場所またはオンラインURL（任意）" />
        </FormField>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {/* 社内参加者 */}
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

        {/* 社外参加者 */}
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
          <Textarea id="summary" name="summary" rows={4} placeholder="商談の要約・議事録" />
        </FormField>
      </div>

      {/* アクションアイテム */}
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
            <button
              type="button"
              onClick={() => removeActionItem(idx)}
              className="text-xs text-danger underline"
            >
              削除
            </button>
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

      {/* ヒアリング項目（hearing 選択時のみ表示） */}
      {selectedType === "hearing" && (
        <div className="mt-4 border border-border-light p-3 bg-bg-surface-alt">
          <p className="text-xs font-bold text-text mb-2">ヒアリング項目</p>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="課題" htmlFor="hearing-challenge">
              <Textarea
                id="hearing-challenge"
                value={hearingChallenge}
                onChange={(e) => setHearingChallenge(e.target.value)}
                rows={3}
                placeholder="先方が抱えている課題"
              />
            </FormField>
            <FormField label="予算感" htmlFor="hearing-budget">
              <Input
                id="hearing-budget"
                value={hearingBudget}
                onChange={(e) => setHearingBudget(e.target.value)}
                placeholder="概算予算"
              />
            </FormField>
            <FormField label="決裁者" htmlFor="hearing-decisionMaker">
              <Input
                id="hearing-decisionMaker"
                value={hearingDecisionMaker}
                onChange={(e) => setHearingDecisionMaker(e.target.value)}
                placeholder="決裁権限者"
              />
            </FormField>
            <FormField label="時期" htmlFor="hearing-timeline">
              <Input
                id="hearing-timeline"
                value={hearingTimeline}
                onChange={(e) => setHearingTimeline(e.target.value)}
                placeholder="導入・実施時期"
              />
            </FormField>
            <FormField label="競合状況" htmlFor="hearing-competitors">
              <Textarea
                id="hearing-competitors"
                value={hearingCompetitors}
                onChange={(e) => setHearingCompetitors(e.target.value)}
                rows={3}
                placeholder="競合他社の状況"
              />
            </FormField>
            <FormField label="備考" htmlFor="hearing-notes">
              <Textarea
                id="hearing-notes"
                value={hearingNotes}
                onChange={(e) => setHearingNotes(e.target.value)}
                rows={3}
                placeholder="その他備考"
              />
            </FormField>
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <SubmitButton pending={isPending}>記録する</SubmitButton>
        <Link href={`/inquiries/${inquiryId}`} className="text-xs text-text-muted underline self-center">
          キャンセル
        </Link>
      </div>
    </form>
  );
}
