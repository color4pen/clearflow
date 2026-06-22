"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "./FormField";

type Props = {
  value: string;
  onSave: (newValue: string) => Promise<{ success: boolean; message?: string }>;
  editable: boolean;
  placeholder?: string;
  className?: string;
};

export function InlineEditText({ value, onSave, editable, placeholder, className }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [currentValue, setCurrentValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Prevents blur from double-triggering save after Enter or cancel
  const actionTakenRef = useRef(false);

  // Sync with parent when value prop changes (e.g. after router.refresh())
  useEffect(() => {
    if (!isEditing) {
      setCurrentValue(value);
    }
  }, [value, isEditing]);

  function startEdit() {
    if (!editable) return;
    setEditValue(currentValue);
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
      setCurrentValue(editValue);
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
      <div className={className}>
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          disabled={isSaving}
          placeholder={placeholder}
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
      className={`${editable ? "cursor-pointer hover:underline decoration-dashed" : ""} ${className ?? ""}`}
      onClick={startEdit}
    >
      {currentValue || <span className="text-text-muted">{placeholder ?? "-"}</span>}
    </span>
  );
}
