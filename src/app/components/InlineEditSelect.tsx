"use client";

import { useState, useEffect } from "react";
import { Select } from "./FormField";

type Option = { value: string; label: string };

type Props = {
  value: string;
  options: Option[];
  onSave: (newValue: string) => Promise<{ success: boolean; message?: string }>;
  editable: boolean;
  onBeforeSave?: (newValue: string) => boolean | Promise<boolean>;
};

export function InlineEditSelect({ value, options, onSave, editable, onBeforeSave }: Props) {
  const [isEditing, setIsEditing] = useState(false);
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
    setIsEditing(true);
    setError(null);
  }

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newValue = e.target.value;
    if (onBeforeSave) {
      const proceed = await onBeforeSave(newValue);
      if (!proceed) {
        setIsEditing(false);
        return;
      }
    }
    setIsSaving(true);
    const result = await onSave(newValue);
    setIsSaving(false);
    if (!result.success) {
      setError(result.message ?? "保存に失敗しました");
      setIsEditing(false);
    } else {
      setCurrentValue(newValue);
      setIsEditing(false);
    }
  }

  const currentLabel = options.find((o) => o.value === currentValue)?.label ?? currentValue;

  if (isEditing) {
    return (
      <div>
        <Select
          value={currentValue}
          onChange={handleChange}
          disabled={isSaving}
          autoFocus
          onBlur={() => {
            if (!isSaving) setIsEditing(false);
          }}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        {error && <p className="text-danger text-xs mt-0.5">{error}</p>}
      </div>
    );
  }

  return (
    <span
      className={editable ? "cursor-pointer hover:underline decoration-dashed" : ""}
      onClick={startEdit}
    >
      {currentLabel || <span className="text-text-muted">-</span>}
    </span>
  );
}
