/**
 * Constants for FinancesWidget component.
 */

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const FINANCES_RUNWAY_CONFIG: Record<
  string,
  { label: string; color: string; icon: LucideIcon; bgAccent: string }
> = {
  secure: {
    label: "Secure",
    color: "text-success",
    icon: TrendingUp,
    bgAccent: "bg-success/10",
  },
  comfortable: {
    label: "Comfortable",
    color: "text-success",
    icon: TrendingUp,
    bgAccent: "bg-success/10",
  },
  tight: {
    label: "Tight",
    color: "text-gold",
    icon: Minus,
    bgAccent: "bg-gold/10",
  },
  critical: {
    label: "Critical",
    color: "text-warning",
    icon: TrendingDown,
    bgAccent: "bg-warning/10",
  },
  desperate: {
    label: "Desperate",
    color: "text-destructive",
    icon: TrendingDown,
    bgAccent: "bg-destructive/15",
  },
};
