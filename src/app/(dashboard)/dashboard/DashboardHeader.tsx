import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle: string;
  actions: ReactNode;
};

export function DashboardHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="flex items-center justify-between px-1 py-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-lg font-bold text-text">{title}</span>
        <span className="text-xs text-text-muted">{subtitle}</span>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}
