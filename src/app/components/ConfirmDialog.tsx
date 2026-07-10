"use client";

import type { ReactNode } from "react";
import { BTN_PRIMARY, BTN_SECONDARY, BTN_DANGER } from "@/app/(dashboard)/styles";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "primary" | "danger";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "確認",
  cancelLabel = "キャンセル",
  variant = "primary",
  loading = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/45 flex items-center justify-center z-50"
      onClick={onCancel}
    >
      <div
        className="bg-bg-surface border border-border rounded-lg shadow-md w-full"
        style={{ maxWidth: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-bold text-text">{title}</p>
        </div>
        {/* body */}
        <div className="px-4 py-4">
          {message && <p className="text-xs text-text-muted mb-3">{message}</p>}
          {children && <div>{children}</div>}
        </div>
        {/* footer */}
        <div className="px-4 py-3 border-t border-border flex gap-2 justify-end">
          <button type="button" onClick={onCancel} disabled={loading} className={BTN_SECONDARY}>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={loading} className={variant === "danger" ? BTN_DANGER : BTN_PRIMARY}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
