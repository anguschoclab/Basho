/**
 * DataTable.tsx
 * =============
 * Control Center minimal data table.
 * Mono column headers, Shippori/display name cells, tabular-nums values.
 */

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface DataColumn<T> {
  key: keyof T | string;
  header: string;
  align?: "left" | "right" | "center";
  render?: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T extends { id: string }> {
  columns: DataColumn<T>[];
  rows: T[];
  emptyText?: string;
  className?: string;
  onRowClick?: (row: T) => void;
  highlightRow?: (row: T) => boolean;
}

const ALIGN_CLASS: Record<string, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  emptyText = "No records.",
  className,
  onRowClick,
  highlightRow,
}: DataTableProps<T>) {
  return (
    <div className={cn("paper rounded overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/40">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={cn(
                    "stat-label px-3 py-2 font-semibold",
                    ALIGN_CLASS[col.align ?? "left"],
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center py-6 text-muted-foreground italic"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-border/20 last:border-0 transition-colors",
                    onRowClick ? "cursor-pointer hover:bg-muted/40" : "",
                    highlightRow?.(row) ? "bg-primary/5 border-l-2 border-l-primary" : ""
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className={cn(
                        "px-3 py-2 tabular-nums",
                        ALIGN_CLASS[col.align ?? "left"],
                        col.className
                      )}
                    >
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[String(col.key)] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
