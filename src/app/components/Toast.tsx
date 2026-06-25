"use client";

import { createContext, useContext, useState, useRef, type ReactNode } from "react";

export type ToastVariant = "success" | "error";

type ToastState = {
  id: string;
  message: string;
  variant: ToastVariant;
} | null;

type ToastContextType = {
  showToast: (message: string, variant: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string, variant: ToastVariant) {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setToast({ id: Math.random().toString(36).slice(2), message, variant });
    timerRef.current = setTimeout(() => {
      setToast(null);
    }, 3000);
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[60] bg-bg-surface border border-border shadow-md px-4 py-3 min-w-[240px] max-w-[360px] ${
            toast.variant === "success"
              ? "border-l-4 border-l-success"
              : "border-l-4 border-l-danger"
          }`}
        >
          <p className="text-xs text-text">{toast.message}</p>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
