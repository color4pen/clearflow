"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  updateActionItemStatusAction,
  updateActionItemAction,
  deleteActionItemAction,
} from "@/app/actions/actionItems";
import type { ActionItemStatus } from "@/domain/models/actionItem";
import { ConfirmDialog, useToast } from "@/app/components";
import { ActionItemModal } from "./ActionItemModal";
import type { LinkTarget } from "./LinkTargetPicker";
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

  function buildLinkTarget(): LinkTarget | null {
    if (item.dealId) {
      return { type: "deal", id: item.dealId, label: sourceName ?? item.dealId };
    }
    if (item.meetingId) {
      return { type: "meeting", id: item.meetingId, label: sourceName ?? item.meetingId };
    }
    if (item.inquiryId) {
      return { type: "inquiry", id: item.inquiryId, label: sourceName ?? item.inquiryId };
    }
    return null;
  }

  function handleStatusChange(status: ActionItemStatus) {
    if (isPending) return;
    startTransition(async () => {
      const result = await updateActionItemStatusAction({ id: item.id, status });
      if (result.message) {
        showToast(result.message, "error");
        return;
      }
      router.refresh();
    });
  }

  function handleSave(values: {
    description: string;
    assigneeId: string | null;
    dueDate: string | null;
    linkTarget: LinkTarget | null;
  }) {
    const { linkTarget } = values;

    startTransition(async () => {
      const result = await updateActionItemAction({
        id: item.id,
        description: values.description,
        assigneeId: values.assigneeId,
        dueDate: values.dueDate,
        // 紐づけ先ピッカーを表示する一覧（showSource=true）でのみ単一紐づけを反映する。
        // 案件/商談ページ（showSource=false）では link を送らず、既存の紐づけ（商談由来の dealId+meetingId 等）を保持する
        ...(showSource
          ? {
              dealId: linkTarget?.type === "deal" ? linkTarget.id : null,
              inquiryId: linkTarget?.type === "inquiry" ? linkTarget.id : null,
              meetingId: linkTarget?.type === "meeting" ? linkTarget.id : null,
            }
          : {}),
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
        linkTarget: buildLinkTarget(),
      }}
      showLinkTarget={showSource === true}
      loading={isPending}
      onSubmit={handleSave}
      onCancel={() => setShowEditModal(false)}
      onDelete={canDelete ? () => setShowDeleteConfirm(true) : undefined}
    />
    {showSource ? (
      // グローバルなタスク一覧: ヘッダーと整列する表形式の行。行クリックで編集
      <li
        className={`grid items-center text-base-app px-3.5 py-2.5 hover:bg-bg-surface-alt ${
          editable ? "cursor-pointer" : ""
        }`}
        style={{ gridTemplateColumns: "120px 1fr 100px 100px 140px" }}
        onClick={editable ? () => setShowEditModal(true) : undefined}
      >
        <select
          value={item.status}
          disabled={isPending || !editable}
          onChange={(e) => handleStatusChange(e.target.value as ActionItemStatus)}
          onClick={(e) => e.stopPropagation()}
          className={`text-sm border rounded px-1 py-0.5 cursor-pointer disabled:cursor-default ${
            item.status === "done"
              ? "text-text-muted bg-bg-surface"
              : item.status === "in_progress"
              ? "text-primary bg-bg-surface"
              : "text-text bg-bg-surface"
          }`}
        >
          <option value="todo">未着手</option>
          <option value="in_progress">対応中</option>
          <option value="done">完了</option>
        </select>
        <span
          className={`min-w-0 truncate ${
            item.status === "done" ? "text-text-muted line-through" : "text-text"
          }`}
        >
          {item.description}
        </span>
        <span className="text-text-muted truncate">
          {resolveAssigneeName(item.assigneeId)}
        </span>
        <span className="text-text-muted font-mono">
          {item.dueDate ? formatDueDate(item.dueDate) : "—"}
        </span>
        <span className="text-text-muted truncate">
          {sourceHref ? (
            <Link
              href={sourceHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-primary underline"
            >
              {sourceName ?? "—"}
            </Link>
          ) : (
            sourceName ?? "—"
          )}
        </span>
      </li>
    ) : (
      // 案件/商談ページの狭いカード: 説明を1行目に広く取り、担当者・期日を下段に縦積みする。行クリックで編集
      <li
        className={`flex items-center gap-3 text-base-app px-2 py-2.5 hover:bg-bg-surface-alt ${
          editable ? "cursor-pointer" : ""
        }`}
        onClick={editable ? () => setShowEditModal(true) : undefined}
      >
        <select
          value={item.status}
          disabled={isPending || !editable}
          onChange={(e) => handleStatusChange(e.target.value as ActionItemStatus)}
          onClick={(e) => e.stopPropagation()}
          className={`text-sm border rounded px-1 py-0.5 cursor-pointer disabled:cursor-default flex-shrink-0 ${
            item.status === "done"
              ? "text-text-muted bg-bg-surface"
              : item.status === "in_progress"
              ? "text-primary bg-bg-surface"
              : "text-text bg-bg-surface"
          }`}
        >
          <option value="todo">未着手</option>
          <option value="in_progress">対応中</option>
          <option value="done">完了</option>
        </select>
        <div className="flex-1 min-w-0">
          <p
            className={`break-words ${
              item.status === "done" ? "text-text-muted line-through" : "text-text"
            }`}
          >
            {item.description}
          </p>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-text-muted">
            <span className="truncate">{resolveAssigneeName(item.assigneeId)}</span>
            <span>·</span>
            <span className="font-mono whitespace-nowrap">
              {item.dueDate ? formatDueDate(item.dueDate) : "—"}
            </span>
          </div>
        </div>
      </li>
    )}
    {canDelete && (
      <ConfirmDialog
        open={showDeleteConfirm}
        title="アクションアイテムを削除"
        message="このアクションアイテムを削除しますか？"
        variant="danger"
        loading={isPending}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    )}
    </>
  );
}
