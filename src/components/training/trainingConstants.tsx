/**
 * trainingConstants.tsx
 *
 * Constants for training page.
 */

import type { IndividualFocusType } from "@/engine/types/training";
import { TrendingUp, Flame, Shield, Heart } from "lucide-react";

export const FOCUS_MODE_OPTIONS: {
  value: IndividualFocusType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    value: "develop",
    label: "Develop",
    description: "Balanced growth for rising talent",
    icon: <TrendingUp className="h-4 w-4" />,
    color: "bg-west/10 text-west",
  },
  {
    value: "push",
    label: "Push",
    description: "Maximum growth, higher risk",
    icon: <Flame className="h-4 w-4" />,
    color: "bg-warning/10 text-warning",
  },
  {
    value: "protect",
    label: "Protect",
    description: "Lower risk, preserve current form",
    icon: <Shield className="h-4 w-4" />,
    color: "bg-success/10 text-success",
  },
  {
    value: "rebuild",
    label: "Rebuild",
    description: "Recovery-focused after injury",
    icon: <Heart className="h-4 w-4" />,
    color: "bg-destructive/10 text-destructive",
  },
];
