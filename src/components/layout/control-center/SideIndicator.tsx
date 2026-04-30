/**
 * SideIndicator.tsx
 * =================
 * 3px left-border east/west side indicator stripe.
 * Wraps children with a colored left border using CSS utility classes.
 */

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface SideIndicatorProps {
  side: "east" | "west" | "none";
  children: ReactNode;
  className?: string;
}

const SIDE_CLASS: Record<string, string> = {
  east: "east-accent pl-3",
  west: "west-accent pl-3",
  none: "",
};

export function SideIndicator({ side, children, className }: SideIndicatorProps) {
  return <div className={cn(SIDE_CLASS[side], className)}>{children}</div>;
}
