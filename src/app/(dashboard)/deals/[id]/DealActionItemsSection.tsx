"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createActionItemAction } from "@/app/actions/actionItems";
import { useToast } from "@/app/components";
import { BTN_PRIMARY } from "@/app/(dashboard)/styles";
import { ActionItemRow } from "@/app/(dashboard)/components/ActionItemRow";
import { ActionItemModal } from "@/app/(dashboard)/components/ActionItemModal";
import type { ActionItem } from "@/domain/models/actionItem";

type Props = {
  actionItems: ActionItem[];
  dealId: string;
  orgUsers: { id: string; name: string }[];
  editable: boolean;
};

export function DealActionItemsSection({ actionItems, dealId, orgUsers, editable }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { showToast } = useToast();
  const [showAddModal, setShowAddModal] = useState(false);

  function handleAdd(values: { description: string; assigneeId: string | null; dueDate: string | null }) {
    startTransition(async () => {
      const result = await createActionItemAction({
        description: values.description,
        assigneeId: values.assigneeId ?? undefined,
        dueDate: values.dueDate ?? undefined,
        dealId,
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
        title="アクションアイテムを追加"
        orgUsers={orgUsers}
        loading={isPending}
        onSubmit={handleAdd}
        onCancel={() => setShowAddModal(false)}
      />

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold text-text">アクションアイテム</h2>
        {editable && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className={BTN_PRIMARY}
          >
            追加
          </button>
        )}
      </div>

      {actionItems.length === 0 && (
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
    </div>
  );
}
