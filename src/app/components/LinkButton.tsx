import type { ReactNode } from "react";

type Variant = "primary" | "danger" | "success" | "warning" | "muted";

const variantClass: Record<Variant, string> = {
  primary: "text-primary",
  danger: "text-danger",
  success: "text-success",
  warning: "text-revision",
  muted: "text-text-muted",
};

type ButtonProps = {
  variant?: Variant;
  disabled?: boolean;
  children: ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className">;

export function LinkButton({ variant = "primary", disabled, children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={`text-xs underline cursor-pointer ${variantClass[variant]} disabled:text-text-disabled disabled:no-underline disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

type SubmitButtonProps = {
  pending?: boolean;
  children: ReactNode;
  pendingText?: string;
  className?: string;
};

export function SubmitButton({ pending, children, pendingText = "処理中...", className = "" }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={`bg-primary text-white text-xs px-3 py-1 rounded-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {pending ? pendingText : children}
    </button>
  );
}
