"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createActionItemAction } from "@/app/actions/actionItems";
import { useToast } from "@/app/components";
import { ActionItemRow } from "@/app/(dashboard)/components/ActionItemRow";
import { ActionItemModal } from "@/app/(dashboard)/components/ActionItemModal";
import type { ActionItemWithSource } from "@/application/usecases/listActionItems";

type Props = {
  items: ActionItemWithSource[];
  orgUsers: { id: string; name: string }[];
  currentUserId: string;
  canDelete: boolean;
};

export function TaskList({ items, orgUsers, currentUserId, canDelete }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [showAddModal, setShowAddModal] = useState(false);

  function handleAdd(values: { description: string; assigneeId: string | null; dueDate: string | null }) {
    startTransition(async () => {
      const result = await createActionItemAction({
        description: values.description,
        assigneeId: values.assigneeId ?? undefined,
        dueDate: values.dueDate ?? undefined,
      });
      if (result.message) {
        showToast(result.message, "error");
        return;
      }
      setShowAddModal(false);
      router.refresh();
    });
  }

  return (
    <div>
      <ActionItemModal
        open={showAddModal}
        title="個人タスクを追加"
        orgUsers={orgUsers}
        defaultValues={{ assigneeId: currentUserId }}
        loading={isPending}
        onSubmit={handleAdd}
        onCancel={() => setShowAddModal(false)}
      />

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-text-muted">{items.length} 件</span>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="text-xs font-medium px-3 py-1.5 bg-primary text-white rounded cursor-pointer"
        >
          個人タスク追加
        </button>
      </div>

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
                canDelete={canDelete}
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
