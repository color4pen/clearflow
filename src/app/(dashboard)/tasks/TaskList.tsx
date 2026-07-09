"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createActionItemAction } from "@/app/actions/actionItems";
import { Input, useToast } from "@/app/components";
import { BTN_PRIMARY, BTN_SECONDARY, SELECT_BASE } from "@/app/(dashboard)/styles";
import { ActionItemRow } from "@/app/(dashboard)/components/ActionItemRow";
import { LinkTargetPicker, type LinkTarget } from "@/app/(dashboard)/components/LinkTargetPicker";
import type { ActionItemWithSource } from "@/application/usecases/listActionItems";

const TYPE_LABEL: Record<"deal" | "inquiry" | "meeting", string> = {
  deal: "案件",
  inquiry: "引合",
  meeting: "商談",
};

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
  const [showPicker, setShowPicker] = useState(false);
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState(currentUserId);
  const [dueDate, setDueDate] = useState("");
  const [linkTarget, setLinkTarget] = useState<LinkTarget | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleOpenAdd() {
    setDescription("");
    setAssigneeId(currentUserId);
    setDueDate("");
    setLinkTarget(null);
    setError(null);
    setShowAddModal(true);
  }

  function handleAdd() {
    if (!description.trim()) {
      setError("内容は必須です");
      return;
    }
    setError(null);

    const dealId = linkTarget?.type === "deal" ? linkTarget.id : null;
    const inquiryId = linkTarget?.type === "inquiry" ? linkTarget.id : null;
    const interactionId = linkTarget?.type === "meeting" ? linkTarget.id : null;

    startTransition(async () => {
      const result = await createActionItemAction({
        description: description.trim(),
        assigneeId: assigneeId || undefined,
        dueDate: dueDate || undefined,
        dealId: dealId ?? undefined,
        inquiryId: inquiryId ?? undefined,
        interactionId: interactionId ?? undefined,
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
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-bg-surface border border-border rounded p-4 shadow-md w-full" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-bold text-text mb-3">タスクを作成</p>
            <div className="space-y-2">
              {error && <p className="text-danger text-xs">{error}</p>}
              <div>
                <label className="text-xs text-text-muted block mb-0.5">内容</label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="タスクの内容（必須）" disabled={isPending} />
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-0.5">担当者</label>
                <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} disabled={isPending} className={SELECT_BASE}>
                  <option value="">未設定</option>
                  {orgUsers.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
                </select>
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-0.5">期日</label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={isPending} />
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-0.5">紐づけ先</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text flex-1 truncate">
                    {linkTarget
                      ? `${TYPE_LABEL[linkTarget.type]}: ${linkTarget.label}`
                      : "なし"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPicker(true)}
                    disabled={isPending}
                    className="text-xs text-primary underline cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    選択
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button type="button" onClick={() => setShowAddModal(false)} disabled={isPending} className={BTN_SECONDARY}>キャンセル</button>
              <button type="button" onClick={handleAdd} disabled={isPending} className={BTN_PRIMARY}>{isPending ? "作成中..." : "作成"}</button>
            </div>
          </div>
        </div>
      )}

      <LinkTargetPicker
        open={showPicker}
        initialValue={linkTarget}
        onConfirm={(value) => {
          setLinkTarget(value);
          setShowPicker(false);
        }}
        onCancel={() => setShowPicker(false)}
      />

      <div className="flex items-center justify-between px-3.5 py-2">
        <span className="text-xs text-text-muted">{items.length} 件</span>
        <button type="button" onClick={handleOpenAdd} className={BTN_PRIMARY}>
          新規作成
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-text-muted px-3.5 py-4">タスクはありません</p>
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
