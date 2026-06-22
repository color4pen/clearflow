"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMeetingAction } from "@/app/actions/meetings";
import { Input } from "@/app/components";
import type { ActionItem } from "@/domain/models/meeting";

type Props = {
  meetingId: string;
  dealId: string;
  actionItems: ActionItem[];
  editable: boolean;
};

const boundUpdateMeetingAction = updateMeetingAction.bind(null, {});

export function MeetingActionItemsSection({ meetingId, dealId, actionItems, editable }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  function handleToggle(index: number) {
    if (!editable || isPending) return;

    const updatedItems = actionItems.map((item, i) =>
      i === index ? { ...item, done: !item.done } : item
    );

    startTransition(async () => {
      const formData = new FormData();
      formData.set("meetingId", meetingId);
      formData.set("dealId", dealId);
      formData.set("actionItems", JSON.stringify(updatedItems));
      await boundUpdateMeetingAction(formData);
      router.refresh();
    });
  }

  function handleAdd() {
    if (!newDescription.trim() || !newAssignee.trim()) {
      setAddError("内容と担当者は必須です");
      return;
    }
    setAddError(null);

    const newItem: ActionItem = {
      description: newDescription.trim(),
      assignee: newAssignee.trim(),
      dueDate: newDueDate || null,
      done: false,
    };
    const updatedItems = [...actionItems, newItem];

    startTransition(async () => {
      const formData = new FormData();
      formData.set("meetingId", meetingId);
      formData.set("dealId", dealId);
      formData.set("actionItems", JSON.stringify(updatedItems));
      await boundUpdateMeetingAction(formData);
      setNewDescription("");
      setNewAssignee("");
      setNewDueDate("");
      setShowAddForm(false);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold text-text">アクションアイテム</h2>
        {editable && !showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="text-xs font-bold px-3 py-1 bg-green-600 text-white cursor-pointer"
          >
            追加
          </button>
        )}
      </div>

      {actionItems.length === 0 && !showAddForm && (
        <p className="text-xs text-text-muted">アクションアイテムはありません</p>
      )}

      {actionItems.length > 0 && (
        <ul className="text-xs space-y-1">
          {actionItems.map((item, idx) => (
            <li key={idx} className="flex gap-2 items-start">
              <input
                type="checkbox"
                checked={item.done}
                disabled={!editable || isPending}
                onChange={() => handleToggle(idx)}
                className="mt-0.5 cursor-pointer disabled:cursor-default"
              />
              <span className={item.done ? "text-text-muted line-through flex-1" : "text-text flex-1"}>
                {item.description}
              </span>
              <span className="text-text-muted shrink-0">（{item.assignee}）</span>
              {item.dueDate && (
                <span className="text-text-muted shrink-0">{item.dueDate}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {showAddForm && (
        <div className="mt-2 border border-border p-2 space-y-1" onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}>
          {addError && <p className="text-danger text-xs">{addError}</p>}
          <div className="flex gap-2 items-center">
            <label className="text-xs text-text-muted w-16 shrink-0">内容</label>
            <Input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="アクションアイテムの内容"
              disabled={isPending}
            />
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-xs text-text-muted w-16 shrink-0">担当者</label>
            <Input
              value={newAssignee}
              onChange={(e) => setNewAssignee(e.target.value)}
              placeholder="担当者名"
              disabled={isPending}
            />
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-xs text-text-muted w-16 shrink-0">期日</label>
            <Input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              disabled={isPending}
            />
          </div>
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={handleAdd}
              disabled={isPending}
              className="text-xs font-bold px-3 py-1 bg-green-600 text-white cursor-pointer disabled:opacity-50"
            >
              {isPending ? "追加中..." : "追加"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setAddError(null);
                setNewDescription("");
                setNewAssignee("");
                setNewDueDate("");
              }}
              disabled={isPending}
              className="text-xs font-bold px-3 py-1 bg-bg-toolbar border border-border text-text cursor-pointer disabled:opacity-50"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
