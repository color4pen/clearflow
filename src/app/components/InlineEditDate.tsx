"use client";

import { useState, useRef, useEffect } from "react";

type Props = {
  value: string | null;
  onSave: (newValue: string) => Promise<{ success: boolean; message?: string }>;
  editable: boolean;
  displayFormat?: (date: string) => string;
};

function defaultFormat(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ja-JP");
}

export function InlineEditDate({ value, onSave, editable, displayFormat = defaultFormat }: Props) {
  const [isEditing, setIsEditing] = useState(false);
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
    setIsEditing(true);
    setError(null);
    actionTakenRef.current = false;
  }

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value;
    if (!newValue) return;
    if (actionTakenRef.current) return;
    actionTakenRef.current = true;
    setIsSaving(true);
    const result = await onSave(newValue);
    setIsSaving(false);
    if (!result.success) {
      actionTakenRef.current = false;
      setError(result.message ?? "保存に失敗しました");
      setIsEditing(false);
    } else {
      setCurrentValue(newValue);
      setIsEditing(false);
    }
  }

  if (isEditing) {
    return (
      <div>
        <input
          type="date"
          defaultValue={currentValue ?? ""}
          disabled={isSaving}
          autoFocus
          onChange={handleChange}
          onBlur={() => {
            if (!isSaving && !actionTakenRef.current) {
              setIsEditing(false);
            }
          }}
          className="border border-border rounded-none px-2 py-1 text-xs text-text bg-bg-surface focus:border-primary focus:outline-none"
        />
        {error && <p className="text-danger text-xs mt-0.5">{error}</p>}
      </div>
    );
  }

  return (
    <span
      className={editable ? "cursor-pointer hover:underline decoration-dashed" : ""}
      onClick={startEdit}
    >
      {currentValue ? displayFormat(currentValue) : <span className="text-text-muted">-</span>}
    </span>
  );
}
