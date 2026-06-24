import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export function SectionCard({ children, className = "" }: Props) {
  return (
    <div className={`bg-bg-surface border border-border rounded shadow-sm ${className}`}>
      {children}
    </div>
  );
}
