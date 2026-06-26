"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  toggleActionItemAction,
  updateActionItemAction,
  deleteActionItemAction,
} from "@/app/actions/actionItems";
import { Input, ConfirmDialog, useToast } from "@/app/components";
import type { ActionItem } from "@/domain/models/actionItem";

type Props = {
  item: ActionItem;
  orgUsers: { id: string; name: string }[];
  editable: boolean;
  canDelete: boolean;
  showSource?: boolean;
  sourceName?: string;
  sourceHref?: string | null;
};

export function ActionItemRow({
  item,
  orgUsers,
  editable,
  canDelete,
  showSource = false,
  sourceName,
  sourceHref,
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Editable field states (initialized from item)
  const [editDescription, setEditDescription] = useState(item.description);
  const [editAssigneeId, setEditAssigneeId] = useState(item.assigneeId ?? "");
  const [editDueDate, setEditDueDate] = useState(
    item.dueDate ? formatDateForInput(item.dueDate) : ""
  );

  function formatDateForInput(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function formatDueDate(date: Date | null): string | null {
    if (!date) return null;
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  function resolveAssigneeName(assigneeId: string | null): string {
    if (!assigneeId) return "未設定";
    const user = orgUsers.find((u) => u.id === assigneeId);
    return user?.name ?? "未設定";
  }

  function handleToggle() {
    if (isPending) return;
    startTransition(async () => {
      const result = await toggleActionItemAction({ id: item.id });
      if (result.message) {
        showToast(result.message, "error");
        return;
      }
      router.refresh();
    });
  }

  function handleEditStart() {
    setEditDescription(item.description);
    setEditAssigneeId(item.assigneeId ?? "");
    setEditDueDate(item.dueDate ? formatDateForInput(item.dueDate) : "");
    setIsEditing(true);
  }

  function handleEditCancel() {
    setIsEditing(false);
  }

  function handleSave() {
    if (!editDescription.trim()) {
      showToast("内容は必須です", "error");
      return;
    }
    startTransition(async () => {
      const result = await updateActionItemAction({
        id: item.id,
        description: editDescription.trim(),
        assigneeId: editAssigneeId || null,
        dueDate: editDueDate || null,
      });
      if (result.message) {
        showToast(result.message, "error");
        return;
      }
      setIsEditing(false);
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteActionItemAction({ id: item.id });
      if (result.message) {
        showToast(result.message, "error");
        setShowDeleteConfirm(false);
        return;
      }
      setShowDeleteConfirm(false);
      router.refresh();
    });
  }

  if (isEditing) {
    return (
      <li className="text-xs space-y-1 border border-border p-2">
        <div className="flex gap-2 items-center">
          <label className="text-text-muted w-12 shrink-0">内容</label>
          <Input
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            disabled={isPending}
            placeholder="アクションアイテムの内容"
          />
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-text-muted w-12 shrink-0">担当者</label>
          <select
            value={editAssigneeId}
            onChange={(e) => setEditAssigneeId(e.target.value)}
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
          <label className="text-text-muted w-12 shrink-0">期日</label>
          <Input
            type="date"
            value={editDueDate}
            onChange={(e) => setEditDueDate(e.target.value)}
            disabled={isPending}
          />
        </div>
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="text-xs font-bold px-3 py-1 bg-green-600 text-white cursor-pointer disabled:opacity-50"
          >
            {isPending ? "保存中..." : "保存"}
          </button>
          <button
            type="button"
            onClick={handleEditCancel}
            disabled={isPending}
            className="text-xs font-bold px-3 py-1 bg-bg-toolbar border border-border text-text cursor-pointer disabled:opacity-50"
          >
            キャンセル
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex gap-2 items-start text-xs">
      <input
        type="checkbox"
        checked={item.done}
        disabled={isPending}
        onChange={handleToggle}
        className="mt-0.5 cursor-pointer disabled:cursor-default"
      />
      <span
        className={
          item.done
            ? "text-text-muted line-through flex-1"
            : "text-text flex-1"
        }
      >
        {item.description}
      </span>
      <span className="text-text-muted shrink-0">
        （{resolveAssigneeName(item.assigneeId)}）
      </span>
      {item.dueDate && (
        <span className="text-text-muted shrink-0">
          {formatDueDate(item.dueDate)}
        </span>
      )}
      {showSource && (
        <span className="text-text-muted shrink-0">
          {sourceHref ? (
            <Link href={sourceHref} className="text-primary underline">
              {sourceName ?? ""}
            </Link>
          ) : (
            sourceName ?? ""
          )}
        </span>
      )}
      {editable && (
        <button
          type="button"
          onClick={handleEditStart}
          disabled={isPending}
          className="text-xs text-primary underline shrink-0 cursor-pointer disabled:opacity-50"
        >
          編集
        </button>
      )}
      {canDelete && (
        <>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isPending}
            className="text-xs text-danger underline shrink-0 cursor-pointer disabled:opacity-50"
          >
            削除
          </button>
          <ConfirmDialog
            open={showDeleteConfirm}
            title="アクションアイテムを削除"
            message="このアクションアイテムを削除しますか？"
            variant="danger"
            loading={isPending}
            onConfirm={handleDelete}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        </>
      )}
    </li>
  );
}
