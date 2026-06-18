import type { ReactNode } from "react";

type Props = {
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
};

export function PageToolbar({ title, children, actions }: Props) {
  return (
    <div className="flex items-center justify-between bg-bg-toolbar border border-border px-2 py-1">
      <div className="flex items-center gap-1">
        <span className="text-sm font-bold text-text">{title}</span>
        {children && <span className="text-border mx-1">|</span>}
        {children}
      </div>
      {actions}
    </div>
  );
}

type ToolbarActionsProps = {
  children: ReactNode;
};

export function ToolbarActions({ children }: ToolbarActionsProps) {
  return <div className="flex items-center gap-2">{children}</div>;
}
