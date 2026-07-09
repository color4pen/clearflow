import type { ReactNode } from "react";

export type StatusBadgeVariant = "gray" | "blue" | "green" | "yellow" | "red" | "navy";

type Props = {
  variant: StatusBadgeVariant;
  children: ReactNode;
  className?: string;
};

const VARIANT_CLASS: Record<StatusBadgeVariant, string> = {
  gray: "bg-status-gray-bg text-status-gray-text",
  blue: "bg-status-blue-bg text-status-blue-text",
  green: "bg-status-green-bg text-status-green-text",
  yellow: "bg-status-yellow-bg text-status-yellow-text",
  red: "bg-status-red-bg text-status-red-text",
  navy: "bg-status-navy-bg text-status-navy-text",
};

export function StatusBadge({ variant, children, className }: Props) {
  return (
    <span
      className={[
        "rounded-full px-2 py-0.5 text-2xs font-semibold whitespace-nowrap inline-block",
        VARIANT_CLASS[variant],
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
