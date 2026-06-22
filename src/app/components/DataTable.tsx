import type { ReactNode } from "react";
import { RowClickHandler } from "./RowClickHandler";

type Column<T> = {
  key: string;
  header: string;
  align?: "left" | "center" | "right";
  width?: string;
  render: (row: T, index: number) => ReactNode;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowClass?: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  rowHref?: (row: T) => string;
  footer?: ReactNode;
};

export function DataTable<T>({ columns, rows, rowKey, rowClass, onRowClick, rowHref, footer }: Props<T>) {
  const alignClass = (align?: string) =>
    align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";

  return (
    <div>
      {rowHref && <RowClickHandler />}
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-bg-table-head border border-border-table-head">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-1 py-1.5 text-xs text-text font-bold ${alignClass(col.align)} ${col.width ?? ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const href = rowHref?.(row);
            const clickable = onRowClick || href;
            return (
              <tr
                key={rowKey(row)}
                className={`border border-border-light ${clickable ? "cursor-pointer hover:bg-primary/10" : "hover:bg-bg-surface-alt"} ${rowClass?.(row, idx) ?? (idx % 2 === 0 ? "bg-bg-surface" : "bg-bg-surface-alt")}`}
                data-href={href ?? undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-1 py-1 text-xs ${alignClass(col.align)}`}>
                    {col.render(row, idx)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {footer && (
        <div className="bg-bg-toolbar border border-border border-t-0 px-2 py-0.5 text-xs text-text-muted">
          {footer}
        </div>
      )}
    </div>
  );
}
