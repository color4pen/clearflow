"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createActionItemAction } from "@/app/actions/actionItems";
import { Input } from "@/app/components";
import { ActionItemRow } from "@/app/(dashboard)/components/ActionItemRow";
import type { ActionItem } from "@/domain/models/actionItem";

type Props = {
  meetingId: string;
  dealId: string;
  actionItems: ActionItem[];
  orgUsers: { id: string; name: string }[];
  editable: boolean;
};

export function MeetingActionItemsSection({ meetingId, dealId, actionItems, orgUsers, editable }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [newAssigneeId, setNewAssigneeId] = useState("");
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
        meetingId,
        dealId,
      });
      if (result.message) {
        setAddError(result.message);
        return;
      }
      setNewDescription("");
      setNewAssigneeId("");
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
          {actionItems.map((item) => (
            <ActionItemRow
              key={item.id}
              item={item}
              orgUsers={orgUsers}
              editable={editable}
              canDelete={editable}
              showSource={false}
            />
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
                setNewAssigneeId("");
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
