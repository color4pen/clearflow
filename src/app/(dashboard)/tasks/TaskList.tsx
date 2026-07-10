"use client";

import { EmptyState } from "@/app/components";
import { ActionItemRow } from "@/app/(dashboard)/components/ActionItemRow";
import type { ActionItemWithSource } from "@/application/usecases/listActionItems";

type Props = {
  items: ActionItemWithSource[];
  orgUsers: { id: string; name: string }[];
  canDelete: boolean;
};

export function TaskList({ items, orgUsers, canDelete }: Props) {
  return (
    <div>
      <div className="flex items-center px-3.5 py-2">
        <span className="text-xs text-text-muted">{items.length} 件</span>
      </div>

      {items.length === 0 ? (
        <EmptyState icon="📋" message="タスクはありません" className="px-3.5" />
      ) : (
        <div>
          <div className="grid text-table-head font-medium text-text-secondary bg-bg-table-head px-3.5 py-2" style={{ gridTemplateColumns: "100px 1fr 100px 100px 140px" }}>
            <span>状態</span>
            <span>内容</span>
            <span>担当者</span>
            <span>期日</span>
            <span>紐づけ先</span>
          </div>
          <ul className="divide-y divide-border-light">
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
