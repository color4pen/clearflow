"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createActionItemAction } from "@/app/actions/actionItems";
import { Input } from "@/app/components";
import { ActionItemRow } from "@/app/(dashboard)/components/ActionItemRow";
import type { ActionItemWithSource } from "@/application/usecases/listActionItems";

type Props = {
  items: ActionItemWithSource[];
  orgUsers: { id: string; name: string }[];
  currentUserId: string;
};

export function TaskList({ items, orgUsers, currentUserId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [newAssigneeId, setNewAssigneeId] = useState(currentUserId);
  const [newDueDate, setNewDueDate] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  function handleAdd() {
    if (!newDescription.trim()) {
      setAddError("内容は必須です");
      return;
    }
    setAddError(null);

    startTransition(async () => {
      const result = await createActionItemAction({
        description: newDescription.trim(),
        assigneeId: newAssigneeId || undefined,
        dueDate: newDueDate || undefined,
        // No dealId / meetingId / inquiryId → personal task
      });
      if (result.message) {
        setAddError(result.message);
        return;
      }
      setNewDescription("");
      setNewAssigneeId(currentUserId);
      setNewDueDate("");
      setShowAddForm(false);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-text-muted">{items.length} 件</span>
        {!showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="text-xs font-bold px-3 py-1 bg-green-600 text-white cursor-pointer"
          >
            個人タスク追加
          </button>
        )}
      </div>

      {showAddForm && (
        <div
          className="mb-3 border border-border p-2 space-y-1"
          onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
        >
          <p className="text-xs font-bold text-text mb-1">個人タスクを追加</p>
          {addError && <p className="text-danger text-xs">{addError}</p>}
          <div className="flex gap-2 items-center">
            <label className="text-xs text-text-muted w-16 shrink-0">内容</label>
            <Input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="タスクの内容（必須）"
              disabled={isPending}
            />
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-xs text-text-muted w-16 shrink-0">担当者</label>
            <select
              value={newAssigneeId}
              onChange={(e) => setNewAssigneeId(e.target.value)}
              disabled={isPending}
              className="text-xs border border-border px-2 py-1 flex-1 bg-bg-page text-text"
            >
              <option value="">未設定</option>
              {orgUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
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
                setNewAssigneeId(currentUserId);
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

      {items.length === 0 ? (
        <p className="text-xs text-text-muted">アクションアイテムはありません</p>
      ) : (
        <div>
          <div className="flex gap-2 items-center text-xs text-text-muted font-bold border-b border-border py-1 px-2 bg-bg-toolbar">
            <span className="w-4 shrink-0"></span>
            <span className="flex-1">内容</span>
            <span className="w-20 shrink-0">担当者</span>
            <span className="w-24 shrink-0">期日</span>
            <span className="w-28 shrink-0">紐づけ先</span>
            <span className="w-20 shrink-0"></span>
          </div>
          <ul className="text-xs space-y-0 divide-y divide-border">
            {items.map((item) => (
              <ActionItemRow
                key={item.id}
                item={item}
                orgUsers={orgUsers}
                editable={true}
                canDelete={true}
                showSource={true}
                sourceName={item.sourceName}
                sourceHref={item.sourceHref}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
