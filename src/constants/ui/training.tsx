/**
 * trainingConstants.ts
 *
 * Constants for training page UI.
 */

import type { IndividualFocusType } from "../../engine/types/training";
import { Activity, Users, Shield, HeartPulse } from "lucide-react";

export const FOCUS_MODE_OPTIONS: {
  value: IndividualFocusType;
  label: string;
  description: string;
  color: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "develop",
    label: "Develop",
    description: "Balanced growth for rising talent",
    color: "bg-west/10 text-west",
    icon: <Activity className="h-3 w-3" />,
  },
  {
    value: "push",
    label: "Push",
    description: "Maximum growth, higher risk",
    color: "bg-warning/10 text-warning",
    icon: <Users className="h-3 w-3" />,
  },
  {
    value: "protect",
    label: "Protect",
    description: "Lower risk, preserve current form",
    color: "bg-success/10 text-success",
    icon: <Shield className="h-3 w-3" />,
  },
  {
    value: "rebuild",
    label: "Rebuild",
    description: "Recovery-focused after injury",
    color: "bg-destructive/10 text-destructive",
    icon: <HeartPulse className="h-3 w-3" />,
  },
];
