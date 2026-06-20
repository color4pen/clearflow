"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createMeetingAction } from "@/app/actions/meetings";
import { FormField, Input, Select, Textarea, SubmitButton } from "@/app/components";
import type { ActionItem } from "@/domain/models/meeting";

type Props = {
  dealId: string;
};

const typeOptions = [
  { value: "", label: "選択してください" },
  { value: "hearing", label: "ヒアリング" },
  { value: "proposal", label: "提案" },
  { value: "negotiation", label: "交渉" },
  { value: "closing", label: "クロージング" },
  { value: "followup", label: "フォローアップ" },
];

export function DealMeetingForm({ dealId }: Props) {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState("");
  const [internalAttendees, setInternalAttendees] = useState<string[]>([""]);
  const [externalAttendees, setExternalAttendees] = useState<string[]>([""]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);

  const [state, formAction, isPending] = useActionState(
    async (prev: Parameters<typeof createMeetingAction>[0], formData: FormData) => {
      formData.set("internalAttendees", JSON.stringify(internalAttendees.filter((a) => a.trim())));
      formData.set("externalAttendees", JSON.stringify(externalAttendees.filter((a) => a.trim())));
      formData.set("actionItems", JSON.stringify(actionItems));

      const result = await createMeetingAction(prev, formData);
      if (!result.errors && !result.message) {
        router.push(`/deals/${dealId}`);
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
      <input type="hidden" name="dealId" value={dealId} />

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
          <Textarea id="summary" name="summary" rows={4} placeholder="商談の要約・議事録" />
        </FormField>
      </div>

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

      <div className="mt-4 flex gap-2">
        <SubmitButton pending={isPending}>記録する</SubmitButton>
        <Link href={`/deals/${dealId}`} className="text-xs text-text-muted underline self-center">
          キャンセル
        </Link>
      </div>
    </form>
  );
}
