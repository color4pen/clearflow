import type { ReactNode } from "react";

type Props = {
  icon?: string;
  message: string;
  children?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, message, children, className }: Props) {
  return (
    <div className={`py-10 text-center ${className ?? ""}`}>
      {icon && <span className="text-4xl block mb-2">{icon}</span>}
      <p className="text-xs text-text-muted">{message}</p>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
