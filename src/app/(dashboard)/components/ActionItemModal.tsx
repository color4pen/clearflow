"use client";

import { useState, useEffect } from "react";
import { Input } from "@/app/components";

type Props = {
  open: boolean;
  title: string;
  orgUsers: { id: string; name: string }[];
  defaultValues?: {
    description?: string;
    assigneeId?: string;
    dueDate?: string;
  };
  loading?: boolean;
  onSubmit: (values: {
    description: string;
    assigneeId: string | null;
    dueDate: string | null;
  }) => void;
  onCancel: () => void;
  onDelete?: () => void;
};

export function ActionItemModal({
  open,
  title,
  orgUsers,
  defaultValues,
  loading = false,
  onSubmit,
  onCancel,
  onDelete,
}: Props) {
  const [description, setDescription] = useState(defaultValues?.description ?? "");
  const [assigneeId, setAssigneeId] = useState(defaultValues?.assigneeId ?? "");
  const [dueDate, setDueDate] = useState(defaultValues?.dueDate ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDescription(defaultValues?.description ?? "");
      setAssigneeId(defaultValues?.assigneeId ?? "");
      setDueDate(defaultValues?.dueDate ?? "");
      setError(null);
    }
  }, [open, defaultValues?.description, defaultValues?.assigneeId, defaultValues?.dueDate]);

  function handleConfirm() {
    if (!description.trim()) {
      setError("内容は必須です");
      return;
    }
    setError(null);
    onSubmit({
      description: description.trim(),
      assigneeId: assigneeId || null,
      dueDate: dueDate || null,
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onCancel}>
      <div className="bg-bg-surface border border-border rounded p-4 shadow-md w-full" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-bold text-text mb-3">{title}</p>
        <div className="space-y-2">
          {error && <p className="text-danger text-xs">{error}</p>}
          <div>
            <label className="text-xs text-text-muted block mb-0.5">内容</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="タスクの内容（必須）"
              disabled={loading}
            />
          </div>
          <div>
            <label className="text-xs text-text-muted block mb-0.5">担当者</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              disabled={loading}
              className="w-full text-xs border border-border rounded px-2 py-1.5 bg-bg-surface text-text"
            >
              <option value="">未設定</option>
              {orgUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-muted block mb-0.5">期日</label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>
        <div className="flex items-center mt-4">
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={loading}
              className="text-xs text-danger underline cursor-pointer disabled:opacity-50"
            >
              削除
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button type="button" onClick={onCancel} disabled={loading} className="border border-border text-text text-xs px-3 py-1.5 cursor-pointer disabled:opacity-50">
              キャンセル
            </button>
            <button type="button" onClick={handleConfirm} disabled={loading} className="bg-primary text-white text-xs px-3 py-1.5 cursor-pointer disabled:opacity-50">
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
