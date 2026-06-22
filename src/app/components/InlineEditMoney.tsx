"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "./FormField";

type Props = {
  value: number | null;
  onSave: (newValue: string) => Promise<{ success: boolean; message?: string }>;
  editable: boolean;
};

export function InlineEditMoney({ value, onSave, editable }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value != null ? String(value) : "");
  const [currentValue, setCurrentValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actionTakenRef = useRef(false);

  useEffect(() => {
    if (!isEditing) {
      setCurrentValue(value);
    }
  }, [value, isEditing]);

  function startEdit() {
    if (!editable) return;
    setEditValue(currentValue != null ? String(currentValue) : "");
    setIsEditing(true);
    setError(null);
    actionTakenRef.current = false;
  }

  async function save() {
    if (actionTakenRef.current) return;
    actionTakenRef.current = true;
    setIsSaving(true);
    setError(null);
    const result = await onSave(editValue);
    setIsSaving(false);
    if (!result.success) {
      actionTakenRef.current = false;
      setError(result.message ?? "保存に失敗しました");
    } else {
      const numVal = editValue !== "" ? Number(editValue) : null;
      setCurrentValue(numVal);
      setIsEditing(false);
    }
  }

  function cancel() {
    actionTakenRef.current = true;
    setIsEditing(false);
    setError(null);
  }

  if (isEditing) {
    return (
      <div>
        <Input
          type="text"
          inputMode="numeric"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value.replace(/[^0-9]/g, ""))}
          disabled={isSaving}
          placeholder="例: 1000000"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              save();
            } else if (e.key === "Escape") {
              cancel();
            }
          }}
          onBlur={save}
        />
        {isSaving && <p className="text-text-muted text-xs mt-0.5">保存中...</p>}
        {error && <p className="text-danger text-xs mt-0.5">{error}</p>}
      </div>
    );
  }

  return (
    <span
      className={editable ? "cursor-pointer hover:underline decoration-dashed" : ""}
      onClick={startEdit}
    >
      {currentValue != null ? (
        `¥${currentValue.toLocaleString("ja-JP")}`
      ) : (
        <span className="text-text-muted">-</span>
      )}
    </span>
  );
}
