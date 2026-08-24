import React, { useMemo } from "react";
import { ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSortState } from "@/hooks/useSortState";
import { compareBy, type SortDirection } from "@/lib/sortUtils";

export interface Column<T> {
  key: string;
  label: string;
  accessor: (row: T) => string | number | undefined;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  storageKey: string;
  defaultSortKey: string;
  defaultSortOrder: SortDirection;
  emptyText?: string;
  onRowClick?: (row: T) => void;
}

function DataTableInner<T>({
  columns,
  rows,
  rowKey,
  storageKey,
  defaultSortKey,
  defaultSortOrder,
  emptyText = "No data found.",
  onRowClick,
}: DataTableProps<T>) {
  const { sortKey, sortOrder, setSortKey, toggleOrder } = useSortState<string>(
    storageKey,
    defaultSortKey,
    defaultSortOrder
  );

  const sortedRows = useMemo(() => {
    const col = columns.find((c) => c.key === sortKey);
    if (!col || !col.sortable) return rows;
    return [...rows].sort((a, b) => compareBy(a, b, col.accessor, sortOrder));
  }, [rows, columns, sortKey, sortOrder]);

  const handleHeaderClick = (col: Column<T>) => {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      toggleOrder();
    } else {
      setSortKey(col.key);
    }
  };

  return (
    <table className="w-full text-sm">
      <thead className="bg-muted/50 sticky top-0 z-10">
        <tr className="text-left border-b border-border/50">
          {columns.map((col) => {
            const isActive = sortKey === col.key;
            if (!col.sortable) {
              return (
                <th
                  key={col.key}
                  className={cn(
                    "p-4 font-semibold text-muted-foreground whitespace-nowrap",
                    col.headerClassName
                  )}
                >
                  {col.label}
                </th>
              );
            }
            return (
              <th
                key={col.key}
                className={cn(
                  "p-4 font-semibold cursor-pointer select-none whitespace-nowrap focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary rounded-xs",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  col.headerClassName
                )}
                onClick={() => handleHeaderClick(col)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleHeaderClick(col);
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  {col.label}
                  <ArrowUpDown className={cn("h-3 w-3", isActive ? "opacity-100" : "opacity-30")} />
                </div>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {sortedRows.map((row) => (
          <tr
            key={rowKey(row)}
            className={cn(
              "border-b border-border/30 hover:bg-muted/30 transition-colors",
              onRowClick &&
                "cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:-outline-offset-2"
            )}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            role={onRowClick ? "button" : undefined}
            tabIndex={onRowClick ? 0 : undefined}
            onKeyDown={(e) => {
              if (onRowClick && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onRowClick(row);
              }
            }}
          >
            {columns.map((col) => (
              <td
                key={col.key}
                data-testid={`dt-cell-${col.key}`}
                className={cn("py-3 px-4", col.className)}
              >
                {col.render ? col.render(row) : String(col.accessor(row) ?? "")}
              </td>
            ))}
          </tr>
        ))}
        {sortedRows.length === 0 && (
          <tr>
            <td colSpan={columns.length} className="py-12 text-center text-muted-foreground italic">
              {emptyText}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export const DataTable = React.memo(DataTableInner) as <T>(
  props: DataTableProps<T>
) => React.ReactElement;
