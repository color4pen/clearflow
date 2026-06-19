"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { updateMeetingAction } from "@/app/actions/meetings";
import { FormField, Input, Select, Textarea, SubmitButton } from "@/app/components";
import type { Meeting, ActionItem } from "@/domain/models/meeting";

type Props = {
  meeting: Meeting;
  inquiryId: string;
};

const typeOptions = [
  { value: "hearing", label: "ヒアリング" },
  { value: "proposal", label: "提案" },
  { value: "negotiation", label: "交渉" },
  { value: "closing", label: "クロージング" },
  { value: "followup", label: "フォローアップ" },
];

export function MeetingDetail({ meeting, inquiryId }: Props) {
  const router = useRouter();
  const [actionItems, setActionItems] = useState<ActionItem[]>(meeting.actionItems);
  const [editMode, setEditMode] = useState(false);

  const [updateState, updateAction, isUpdating] = useActionState(
    async (prev: Parameters<typeof updateMeetingAction>[0], formData: FormData) => {
      formData.set("actionItems", JSON.stringify(actionItems));

      // ヒアリングデータ（編集フォームで type が hearing の場合）
      const type = (formData.get("type") as string) || meeting.type;
      if (type === "hearing") {
        formData.set(
          "hearingData",
          JSON.stringify({
            challenge: formData.get("hearing_challenge") || null,
            budget: formData.get("hearing_budget") || null,
            decisionMaker: formData.get("hearing_decisionMaker") || null,
            timeline: formData.get("hearing_timeline") || null,
            competitors: formData.get("hearing_competitors") || null,
            notes: formData.get("hearing_notes") || null,
          })
        );
      } else {
        formData.set("hearingData", "null");
      }

      const result = await updateMeetingAction(prev, formData);
      if (!result.errors && !result.message) {
        setEditMode(false);
        router.refresh();
      }
      return result;
    },
    {}
  );

  function toggleActionItemDone(idx: number) {
    const updated = actionItems.map((item, i) =>
      i === idx ? { ...item, done: !item.done } : item
    );
    setActionItems(updated);

    // done 状態のみ更新（updateMeetingAction を直接呼び出す）
    const formData = new FormData();
    formData.set("meetingId", meeting.id);
    formData.set("inquiryId", inquiryId);
    formData.set("actionItems", JSON.stringify(updated));
    updateMeetingAction({}, formData).then(() => {
      router.refresh();
    });
  }

  return (
    <div>
      {/* アクションアイテム */}
      <div className="mt-3">
        <p className="text-xs font-bold text-text mb-1">アクションアイテム</p>
        {actionItems.length === 0 ? (
          <p className="text-xs text-text-muted">アクションアイテムはありません</p>
        ) : (
          <div className="space-y-1">
            {actionItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 border border-border-light p-2 bg-bg-surface"
              >
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleActionItemDone(idx)}
                  className="cursor-pointer"
                />
                <div className="flex-1">
                  <span className={`text-xs text-text ${item.done ? "line-through text-text-muted" : ""}`}>
                    {item.description}
                  </span>
                  {item.assignee && (
                    <span className="text-xs text-text-muted ml-2">担当: {item.assignee}</span>
                  )}
                  {item.dueDate && (
                    <span className="text-xs text-text-muted ml-2">期日: {item.dueDate}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 編集フォーム */}
      <div className="mt-4">
        {!editMode ? (
          <button
            type="button"
            onClick={() => setEditMode(true)}
            className="text-xs text-primary underline"
          >
            編集する
          </button>
        ) : (
          <form action={updateAction} className="border border-border-light p-3 bg-bg-surface-alt">
            <input type="hidden" name="meetingId" value={meeting.id} />
            <input type="hidden" name="inquiryId" value={inquiryId} />

            {updateState.message && (
              <p className="text-danger text-xs mb-2">{updateState.message}</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <FormField label="種別" htmlFor="edit-type">
                <Select id="edit-type" name="type" defaultValue={meeting.type}>
                  {typeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="日時" htmlFor="edit-date">
                <Input
                  id="edit-date"
                  name="date"
                  type="datetime-local"
                  defaultValue={meeting.date.toISOString().slice(0, 16)}
                />
              </FormField>

              <FormField label="場所 / URL" htmlFor="edit-location">
                <Input
                  id="edit-location"
                  name="location"
                  defaultValue={meeting.location ?? ""}
                  placeholder="場所またはオンラインURL"
                />
              </FormField>
            </div>

            <div className="mt-3">
              <FormField label="議事録" htmlFor="edit-summary">
                <Textarea
                  id="edit-summary"
                  name="summary"
                  rows={4}
                  defaultValue={meeting.summary ?? ""}
                  placeholder="商談の要約・議事録"
                />
              </FormField>
            </div>

            {/* hearing の場合はヒアリング項目編集フォームを表示 */}
            {meeting.type === "hearing" && (
              <div className="mt-3 border border-border-light p-2 bg-bg-surface">
                <p className="text-xs font-bold text-text mb-2">ヒアリング項目</p>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="課題" htmlFor="edit-challenge">
                    <Textarea
                      id="edit-challenge"
                      name="hearing_challenge"
                      rows={3}
                      defaultValue={meeting.hearingData?.challenge ?? ""}
                    />
                  </FormField>
                  <FormField label="予算感" htmlFor="edit-budget">
                    <Input
                      id="edit-budget"
                      name="hearing_budget"
                      defaultValue={meeting.hearingData?.budget ?? ""}
                    />
                  </FormField>
                  <FormField label="決裁者" htmlFor="edit-decisionMaker">
                    <Input
                      id="edit-decisionMaker"
                      name="hearing_decisionMaker"
                      defaultValue={meeting.hearingData?.decisionMaker ?? ""}
                    />
                  </FormField>
                  <FormField label="時期" htmlFor="edit-timeline">
                    <Input
                      id="edit-timeline"
                      name="hearing_timeline"
                      defaultValue={meeting.hearingData?.timeline ?? ""}
                    />
                  </FormField>
                  <FormField label="競合状況" htmlFor="edit-competitors">
                    <Textarea
                      id="edit-competitors"
                      name="hearing_competitors"
                      rows={3}
                      defaultValue={meeting.hearingData?.competitors ?? ""}
                    />
                  </FormField>
                  <FormField label="備考" htmlFor="edit-notes">
                    <Textarea
                      id="edit-notes"
                      name="hearing_notes"
                      rows={3}
                      defaultValue={meeting.hearingData?.notes ?? ""}
                    />
                  </FormField>
                </div>
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <SubmitButton pending={isUpdating}>更新する</SubmitButton>
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="text-xs text-text-muted underline"
              >
                キャンセル
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
