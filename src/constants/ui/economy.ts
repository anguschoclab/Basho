/**
 * Constants for economy page narrative descriptions.
 */

import type { RunwayBand, KoenkaiBandType } from "../../engine/types/narrative";
import { ShieldCheck, ThumbsUp, AlertTriangle, AlertOctagon, Skull } from "lucide-react";

export const RUNWAY_CONFIG: Record<
  RunwayBand,
  {
    label: string;
    description: string;
    color: string;
    progressValue: number;
    icon: typeof ShieldCheck;
  }
> = {
  secure: {
    label: "Secure Finances",
    description: "Comfortable reserves with room to invest in the future.",
    color: "text-success",
    progressValue: 100,
    icon: ShieldCheck,
  },
  comfortable: {
    label: "Comfortable",
    description: "Finances are stable. You can weather minor setbacks without concern.",
    color: "text-green-400",
    progressValue: 75,
    icon: ThumbsUp,
  },
  tight: {
    label: "Tight Budget",
    description: "Careful management required. Unexpected expenses could cause problems.",
    color: "text-gold",
    progressValue: 50,
    icon: AlertTriangle,
  },
  critical: {
    label: "Critical",
    description: "Pressure is mounting. Consider reducing costs or strengthening income streams.",
    color: "text-orange-400",
    progressValue: 25,
    icon: AlertOctagon,
  },
  desperate: {
    label: "Desperate",
    description: "Immediate intervention required. The heya's survival is at stake.",
    color: "text-red-400",
    progressValue: 10,
    icon: Skull,
  },
};

export const KOENKAI_CONFIG: Record<
  KoenkaiBandType,
  {
    label: string;
    description: string;
    color: string;
    monthlySupport: string;
  }
> = {
  powerful: {
    label: "Powerful Kōenkai",
    description: "A wide network of patrons and devoted fans provides substantial support.",
    color: "text-gold",
    monthlySupport: "Very High",
  },
  strong: {
    label: "Strong Kōenkai",
    description: "A dedicated group of supporters contributes reliably each month.",
    color: "text-purple-400",
    monthlySupport: "High",
  },
  moderate: {
    label: "Modest Kōenkai",
    description: "A smaller but loyal supporter base helps cover some expenses.",
    color: "text-west",
    monthlySupport: "Moderate",
  },
  weak: {
    label: "Weak Kōenkai",
    description: "Few supporters. Building stronger relationships should be a priority.",
    color: "text-muted-foreground",
    monthlySupport: "Low",
  },
  none: {
    label: "No Kōenkai",
    description: "No organized supporter group yet. You're operating without a safety net.",
    color: "text-red-400",
    monthlySupport: "None",
  },
};
