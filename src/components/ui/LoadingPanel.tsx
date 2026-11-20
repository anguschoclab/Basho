/**
 * LoadingPanel.tsx
 * ================
 * Shared full-height loading state — the `Loader2` spinner + EmptyState
 * block duplicated across data-loading pages. Renders centered at 60vh so
 * it visually replaces page content while data resolves.
 */

import { Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";

interface LoadingPanelProps {
  /** Loading heading (e.g. "Loading Finances"). */
  title: string;
  /** Supporting description. */
  description?: string;
  /** Container className override. */
  className?: string;
}

export function LoadingPanel({ title, description, className }: LoadingPanelProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center min-h-[60vh]", className)}>
      <EmptyState
        icon={Loader2}
        title={title}
        description={description}
        iconClassName="animate-spin text-muted-foreground"
      />
    </div>
  );
}
