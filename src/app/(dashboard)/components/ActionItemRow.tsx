"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  toggleActionItemAction,
  updateActionItemAction,
  deleteActionItemAction,
} from "@/app/actions/actionItems";
import { ConfirmDialog, useToast } from "@/app/components";
import { ActionItemModal } from "./ActionItemModal";
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  function handleSave(values: { description: string; assigneeId: string | null; dueDate: string | null }) {
    startTransition(async () => {
      const result = await updateActionItemAction({
        id: item.id,
        description: values.description,
        assigneeId: values.assigneeId,
        dueDate: values.dueDate,
      });
      if (result.message) {
        showToast(result.message, "error");
        return;
      }
      setShowEditModal(false);
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

  return (
    <>
    <ActionItemModal
      open={showEditModal}
      title="アクションアイテムを編集"
      orgUsers={orgUsers}
      defaultValues={{
        description: item.description,
        assigneeId: item.assigneeId ?? "",
        dueDate: item.dueDate ? formatDateForInput(item.dueDate) : "",
      }}
      loading={isPending}
      onSubmit={handleSave}
      onCancel={() => setShowEditModal(false)}
    />
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
          onClick={() => setShowEditModal(true)}
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
    </>
  );
}
