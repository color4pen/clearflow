"use client";

import { useState, useEffect } from "react";
import { Textarea } from "./FormField";

type Props = {
  value: string | null;
  onSave: (newValue: string) => Promise<{ success: boolean; message?: string }>;
  editable: boolean;
  placeholder?: string;
  rows?: number;
};

export function InlineEditTextarea({ value, onSave, editable, placeholder, rows = 6 }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value ?? "");
  const [currentValue, setCurrentValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setCurrentValue(value);
    }
  }, [value, isEditing]);

  function startEdit() {
    if (!editable) return;
    setEditValue(currentValue ?? "");
    setIsEditing(true);
    setError(null);
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    const result = await onSave(editValue);
    setIsSaving(false);
    if (!result.success) {
      setError(result.message ?? "保存に失敗しました");
    } else {
      setCurrentValue(editValue);
      setIsEditing(false);
    }
  }

  function handleCancel() {
    setIsEditing(false);
    setError(null);
  }

  if (isEditing) {
    return (
      <div>
        <Textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          disabled={isSaving}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              handleCancel();
            }
          }}
        />
        {error && <p className="text-danger text-xs mt-0.5">{error}</p>}
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="bg-primary text-white text-xs font-bold px-4 py-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? "保存中..." : "保存"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="border border-border text-text text-xs px-3 py-1.5 cursor-pointer"
          >
            キャンセル
          </button>
        </div>
      </div>
    );
  }

  if (currentValue) {
    return (
      <p
        className={`text-xs text-text whitespace-pre-wrap ${editable ? "cursor-pointer" : ""}`}
        onClick={startEdit}
      >
        {currentValue}
      </p>
    );
  }

  return (
    <p
      className={`text-xs text-text-muted ${editable ? "cursor-pointer" : ""}`}
      onClick={startEdit}
    >
      {placeholder ?? "未入力"}
    </p>
  );
}
