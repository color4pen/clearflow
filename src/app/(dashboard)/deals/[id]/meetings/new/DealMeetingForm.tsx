"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createMeetingAction } from "@/app/actions/meetings";
import { FormField, Input, Select, Textarea, SubmitButton, preventEnterSubmit } from "@/app/components";
import type { LegacyMeetingActionItem, HearingData } from "@/domain/models/interaction";

type ExternalAttendee = {
  contactId: string;
  name: string;
};

type Props = {
  dealId: string;
  clientId: string | null;
  existingContacts: Array<{ id: string; name: string }>;
  orgUsers?: Array<{ id: string; name: string }>;
};

const typeOptions = [
  { value: "", label: "選択してください" },
  { value: "hearing", label: "ヒアリング" },
  { value: "proposal", label: "提案" },
  { value: "negotiation", label: "交渉" },
  { value: "closing", label: "クロージング" },
  { value: "followup", label: "フォローアップ" },
];

const emptyHearingData: HearingData = {
  challenge: null,
  budget: null,
  decisionMaker: null,
  timeline: null,
  competitors: null,
  notes: null,
};

export function DealMeetingForm({ dealId, clientId, existingContacts, orgUsers = [] }: Props) {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState("");
  const [internalAttendees, setInternalAttendees] = useState<string[]>([""]);
  const [externalAttendees, setExternalAttendees] = useState<ExternalAttendee[]>([]);
  const [actionItems, setActionItems] = useState<LegacyMeetingActionItem[]>([]);
  const [hearingData, setHearingData] = useState<HearingData>({ ...emptyHearingData });

  const [state, formAction, isPending] = useActionState(
    async (prev: Parameters<typeof createMeetingAction>[0], formData: FormData) => {
      formData.set("internalAttendees", JSON.stringify(internalAttendees.filter((a) => a.trim())));
      formData.set(
        "externalContactIds",
        JSON.stringify(externalAttendees.map((a) => a.contactId))
      );
      formData.set("actionItems", JSON.stringify(actionItems));

      // ヒアリング種別の場合のみ hearingData を送信する
      if (selectedType === "hearing") {
        formData.set("hearingData", JSON.stringify(hearingData));
      }

      // clientId を FormData にセットする
      if (clientId) {
        formData.set("clientId", clientId);
      }

      const result = await createMeetingAction(prev, formData);
      if (result.dealId) {
        router.push(`/deals/${result.dealId}`);
        return result;
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

  function removeExternalAttendee(contactId: string) {
    setExternalAttendees((prev) => prev.filter((a) => a.contactId !== contactId));
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

  function updateActionItem(idx: number, field: keyof LegacyMeetingActionItem, value: string | boolean | null) {
    setActionItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  }

  return (
    <form action={formAction} onKeyDown={preventEnterSubmit} className="bg-bg-surface border border-border border-t-0 p-4">
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
          {orgUsers.length > 0 && (
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
          {state.errors?.externalContactIds?.[0] && (
            <p className="text-danger text-xs mb-1">{state.errors.externalContactIds[0]}</p>
          )}
          {!clientId ? (
            <p className="text-xs text-text-muted">顧客が未設定のため社外参加者を追加できません</p>
          ) : existingContacts.length === 0 ? (
            <p className="text-xs text-text-muted">
              担当者が登録されていません。
              <Link href={`/clients/${clientId}`} className="text-primary underline ml-1">
                顧客詳細で登録してください
              </Link>
            </p>
          ) : (
            <div className="mb-2">
              <Select
                value=""
                onChange={(e) => {
                  const contact = existingContacts.find((c) => c.id === e.target.value);
                  if (contact && !externalAttendees.some((a) => a.contactId === contact.id)) {
                    setExternalAttendees((prev) => [
                      ...prev,
                      { contactId: contact.id, name: contact.name },
                    ]);
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
          {externalAttendees.map((attendee) => (
            <div key={attendee.contactId} className="flex gap-1 mb-1 items-center">
              <span className="text-xs text-text flex-1">{attendee.name}</span>
              <button
                type="button"
                onClick={() => removeExternalAttendee(attendee.contactId)}
                className="text-xs text-danger underline whitespace-nowrap"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <FormField label="議事録" htmlFor="summary" error={state.errors?.summary?.[0]}>
          <Textarea id="summary" name="summary" rows={8} placeholder="商談の要約・議事録" />
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
