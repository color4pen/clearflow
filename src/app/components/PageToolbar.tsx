import type { ReactNode } from "react";

type Props = {
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
};

export function PageToolbar({ title, children, actions }: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap mb-3">
      <h1 className="text-lg font-bold text-text">{title}</h1>
      {children}
      {actions && <div className="ml-auto flex items-center gap-3">{actions}</div>}
    </div>
  );
}

type ToolbarActionsProps = {
  children: ReactNode;
};

export function ToolbarActions({ children }: ToolbarActionsProps) {
  return <div className="flex items-center gap-3">{children}</div>;
}
