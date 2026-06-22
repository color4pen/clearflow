import type { ReactNode, FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";

type Props = {
  label: ReactNode;
  htmlFor?: string;
  error?: string;
  children: ReactNode;
};

export function FormField({ label, htmlFor, error, children }: Props) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-bold text-text mb-0.5">
        {label}
      </label>
      {children}
      {error && <p className="text-danger text-xs mt-0.5">{error}</p>}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.preventDefault();
        props.onKeyDown?.(e);
      }}
      className={`w-full border border-border rounded-none px-2 py-1 text-xs text-text bg-bg-surface focus:border-primary focus:outline-none placeholder:text-text-placeholder ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.preventDefault();
        props.onKeyDown?.(e);
      }}
      className={`block w-full border border-border rounded-none px-2 py-1 text-xs text-text bg-bg-surface focus:border-primary focus:outline-none ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full border border-border rounded-none px-2 py-1 text-xs text-text bg-bg-surface focus:border-primary focus:outline-none placeholder:text-text-placeholder ${props.className ?? ""}`}
    />
  );
}

export function preventEnterSubmit(e: ReactKeyboardEvent<HTMLFormElement>) {
  if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
    e.preventDefault();
  }
}
