"use client";

import { useState, useRef, useEffect } from "react";
import type { ActionItemStatus } from "@/domain/models/actionItem";

const OPTIONS: { value: ActionItemStatus; label: string }[] = [
  { value: "todo", label: "未着手" },
  { value: "in_progress", label: "対応中" },
  { value: "done", label: "完了" },
];

// チップ本体の配色（状態ごと）
const CHIP: Record<ActionItemStatus, string> = {
  todo: "bg-bg-surface-alt text-text-muted border-border",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  done: "bg-green-50 text-green-700 border-green-200",
};

// 先頭ドットの色
const DOT: Record<ActionItemStatus, string> = {
  todo: "bg-gray-400",
  in_progress: "bg-blue-500",
  done: "bg-green-500",
};

type Props = {
  value: ActionItemStatus;
  disabled?: boolean;
  onChange: (status: ActionItemStatus) => void;
  className?: string;
};

export function StatusChipSelect({ value, disabled = false, onChange, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];

  return (
    <div
      ref={ref}
      className={`relative inline-block ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen((v) => !v);
        }}
        className={`inline-flex items-center gap-1.5 text-xs font-medium border rounded-full pl-2 pr-1.5 py-0.5 cursor-pointer disabled:cursor-default disabled:opacity-70 ${CHIP[value]}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${DOT[value]}`} />
        {current.label}
        {!disabled && (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="opacity-60">
            <path
              d="M3 4.5 6 7.5 9 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 min-w-[120px] bg-bg-surface border border-border rounded shadow-md py-1">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                setOpen(false);
                if (o.value !== value) onChange(o.value);
              }}
              className={`flex items-center gap-2 w-full text-left text-xs px-2.5 py-1.5 hover:bg-bg-surface-alt cursor-pointer ${
                o.value === value ? "font-bold text-text" : "text-text"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${DOT[o.value]}`} />
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
