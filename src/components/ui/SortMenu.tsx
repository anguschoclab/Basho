import React, { useEffect } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useSortState } from "@/hooks/useSortState";
import type { SortDirection } from "@/lib/sortUtils";
import { cn } from "@/lib/utils";

export interface SortOption {
  key: string;
  label: string;
}

interface SortMenuProps {
  options: SortOption[];
  storageKey: string;
  defaultSortKey: string;
  defaultSortOrder: SortDirection;
  onSortChange: (key: string, order: SortDirection) => void;
  className?: string;
}

function SortMenuInner({
  options,
  storageKey,
  defaultSortKey,
  defaultSortOrder,
  onSortChange,
  className,
}: SortMenuProps) {
  const { sortKey, sortOrder, setSortKey, toggleOrder } = useSortState<string>(
    storageKey,
    defaultSortKey,
    defaultSortOrder
  );

  useEffect(() => {
    onSortChange(sortKey, sortOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKeyChange = (newKey: string) => {
    setSortKey(newKey);
    onSortChange(newKey, defaultSortOrder);
  };

  const handleToggle = () => {
    const newOrder: SortDirection = sortOrder === "asc" ? "desc" : "asc";
    toggleOrder();
    onSortChange(sortKey, newOrder);
  };

  const currentLabel =
    options.find((o) => o.key === sortKey)?.label ?? options[0]?.label ?? "";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select value={sortKey} onValueChange={handleKeyChange}>
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue>{currentLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.key} value={opt.key}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        onClick={handleToggle}
        aria-label={`toggle sort order: currently ${sortOrder === "asc" ? "ascending" : "descending"}`}
      >
        {sortOrder === "asc" ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ArrowDown className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

export const SortMenu = React.memo(SortMenuInner);
