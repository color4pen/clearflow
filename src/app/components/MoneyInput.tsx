"use client";

import { useState, useRef } from "react";

type Props = {
  name: string;
  defaultValue?: number | null;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onChange?: () => void;
};

function formatWithComma(value: number): string {
  return `¥${value.toLocaleString("ja-JP")}`;
}

export function MoneyInput({ name, defaultValue, placeholder, className, disabled, onChange }: Props) {
  const initial = defaultValue != null ? defaultValue : null;
  const [rawValue, setRawValue] = useState<string>(initial != null ? String(initial) : "");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const numericValue = rawValue === "" ? "" : Number(rawValue);

  const displayValue = isFocused
    ? rawValue
    : rawValue !== "" ? formatWithComma(Number(rawValue)) : "";

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/[^0-9]/g, "");
    setRawValue(digits);
    onChange?.();
  }

  function handleFocus() {
    setIsFocused(true);
  }

  function handleBlur() {
    setIsFocused(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") e.preventDefault();
  }

  const baseClass =
    "w-full border border-border rounded-none px-2 py-1 text-xs text-text bg-bg-surface focus:border-primary focus:outline-none placeholder:text-text-placeholder";

  return (
    <>
      <input type="hidden" name={name} value={numericValue} />
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`${baseClass} ${className ?? ""}`}
      />
    </>
  );
}
