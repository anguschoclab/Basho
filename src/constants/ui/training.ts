/**
 * trainingConstants.ts
 *
 * Constants for training page UI.
 */

import type { IndividualFocusType } from "../../engine/types/training";

export const FOCUS_MODE_OPTIONS: {
  value: IndividualFocusType;
  label: string;
  description: string;
  color: string;
}[] = [
  {
    value: "develop",
    label: "Develop",
    description: "Balanced growth for rising talent",
    color: "bg-west/10 text-west",
  },
  {
    value: "push",
    label: "Push",
    description: "Maximum growth, higher risk",
    color: "bg-warning/10 text-warning",
  },
  {
    value: "protect",
    label: "Protect",
    description: "Lower risk, preserve current form",
    color: "bg-success/10 text-success",
  },
  {
    value: "rebuild",
    label: "Rebuild",
    description: "Recovery-focused after injury",
    color: "bg-destructive/10 text-destructive",
  },
];
