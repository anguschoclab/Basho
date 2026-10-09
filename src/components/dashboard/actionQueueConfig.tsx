/**
 * actionQueueConfig.tsx
 *
 * Severity styling + icon maps for the action queue widget. JSX-bearing
 * constants — no component exports in this file.
 */

import {
  AlertTriangle,
  AlertCircle,
  Info,
  Coins,
  HeartPulse,
  Globe,
  Trophy,
  Calendar,
} from "lucide-react";
import type { ActionSeverity } from "@/presenters/projections/actionQueue";

export const ACTION_ICON_MAP: Record<string, React.ReactNode> = {
  coins: <Coins className="h-4 w-4" />,
  "heart-pulse": <HeartPulse className="h-4 w-4" />,
  globe: <Globe className="h-4 w-4" />,
  trophy: <Trophy className="h-4 w-4" />,
  calendar: <Calendar className="h-4 w-4" />,
};

export const SEVERITY_CONFIG: Record<
  ActionSeverity,
  {
    icon: React.ReactNode;
    badge: string;
    border: string;
    bg: string;
    hoverBg: string;
    text: string;
  }
> = {
  critical: {
    icon: <AlertTriangle className="h-4 w-4 text-destructive" />,
    badge: "border-destructive/30 text-destructive",
    border: "border-destructive/30",
    bg: "bg-destructive/8",
    hoverBg: "hover:bg-destructive/15",
    text: "text-destructive",
  },
  warning: {
    icon: <AlertCircle className="h-4 w-4 text-warning" />,
    badge: "border-warning/30 text-warning",
    border: "border-warning/30",
    bg: "bg-warning/8",
    hoverBg: "hover:bg-warning/15",
    text: "text-warning",
  },
  info: {
    icon: <Info className="h-4 w-4 text-primary" />,
    badge: "border-primary/30 text-primary",
    border: "border-primary/30",
    bg: "bg-primary/5",
    hoverBg: "hover:bg-primary/10",
    text: "text-primary",
  },
};
