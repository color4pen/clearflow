import type { ReactNode, KeyboardEvent as ReactKeyboardEvent } from "react";
import { FORM_LABEL } from "@/app/(dashboard)/styles";

type Props = {
  label: ReactNode;
  htmlFor?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
};

export function FormField({ label, htmlFor, error, required, children }: Props) {
  return (
    <div>
      <label htmlFor={htmlFor} className={`block ${FORM_LABEL} mb-0.5`}>
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
      {error && <p className="text-danger text-xs mt-0.5">{error}</p>}
    </div>
  );
}

export function Input({ invalid, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      {...props}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.preventDefault();
        props.onKeyDown?.(e);
      }}
      className={`w-full border ${invalid ? "border-danger focus:border-danger" : "border-border focus:border-primary"} rounded px-2.5 py-1.5 text-xs text-text bg-bg-surface focus:outline-none placeholder:text-text-placeholder ${props.className ?? ""}`}
    />
  );
}

export function Select({ invalid, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      {...props}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.preventDefault();
        props.onKeyDown?.(e);
      }}
      className={`block w-full border ${invalid ? "border-danger focus:border-danger" : "border-border focus:border-primary"} rounded px-2.5 py-1.5 text-xs text-text bg-bg-surface focus:outline-none ${props.className ?? ""}`}
    />
  );
}

export function Textarea({ invalid, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      {...props}
      className={`w-full border ${invalid ? "border-danger focus:border-danger" : "border-border focus:border-primary"} rounded p-2.5 text-xs text-text bg-bg-surface focus:outline-none placeholder:text-text-placeholder min-h-20 ${props.className ?? ""}`}
    />
  );
}

export function preventEnterSubmit(e: ReactKeyboardEvent<HTMLFormElement>) {
  if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
    e.preventDefault();
  }
}
