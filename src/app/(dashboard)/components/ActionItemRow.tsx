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
        // 案件/会議ページ（showSource=false）では link を送らず、既存の紐づけ（会議由来の dealId+meetingId 等）を保持する
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
    <li
      className="grid items-center text-base-app px-3.5 py-2.5 hover:bg-bg-surface-alt"
      style={{ gridTemplateColumns: showSource ? "24px 1fr 100px 100px 140px 50px" : "24px 1fr 100px 100px 50px" }}
    >
      <input
        type="checkbox"
        checked={item.done}
        disabled={isPending}
        onChange={handleToggle}
        className="cursor-pointer disabled:cursor-default"
      />
      <span
        className={
          item.done
            ? "text-text-muted line-through truncate"
            : "text-text truncate"
        }
      >
        {item.description}
      </span>
      <span className="text-text-muted truncate">
        {resolveAssigneeName(item.assigneeId)}
      </span>
      <span className="text-text-muted font-mono">
        {item.dueDate ? formatDueDate(item.dueDate) : "—"}
      </span>
      {showSource && (
        <span className="text-text-muted truncate">
          {sourceHref ? (
            <Link href={sourceHref} className="text-primary underline">
              {sourceName ?? "—"}
            </Link>
          ) : (
            sourceName ?? "—"
          )}
        </span>
      )}
      <span className="flex justify-end">
        {editable && (
          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            disabled={isPending}
            className="text-xs text-primary underline cursor-pointer disabled:opacity-50"
          >
            編集
          </button>
        )}
      </span>
    </li>
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
