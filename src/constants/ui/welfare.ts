/**
 * Constants for WelfarePanel component.
 */

import { Shield, AlertTriangle, CheckCircle } from "lucide-react";
import type { DietRegimen } from "@/engine/types/economy";

export const COMPLIANCE_DISPLAY: Record<
  string,
  { label: string; color: string; description: string; icon: React.ElementType }
> = {
  compliant: {
    label: "Compliant",
    color: "text-success",
    description: "No concerns from the JSA. Your stable operates within regulations.",
    icon: CheckCircle,
  },
  watch: {
    label: "Under Watch",
    color: "text-gold",
    description: "The JSA has flagged minor concerns. Improve conditions to avoid escalation.",
    icon: AlertTriangle,
  },
  investigation: {
    label: "Investigation",
    color: "text-warning",
    description: "An active investigation is underway. Serious consequences may follow.",
    icon: Shield,
  },
  sanctioned: {
    label: "Sanctioned",
    color: "text-destructive",
    description:
      "The JSA has imposed sanctions. Financial penalties and reputation damage are in effect.",
    icon: AlertTriangle,
  },
};

export const WELFARE_RISK_DISPLAY: Record<string, { label: string; color: string }> = {
  safe: { label: "Safe", color: "text-success" },
  cautious: { label: "Cautious", color: "text-gold" },
  elevated: { label: "Elevated", color: "text-warning" },
  critical: { label: "Critical", color: "text-destructive" },
};

export const MORALE_DISPLAY: Record<string, { label: string; color: string }> = {
  inspired: { label: "Inspired", color: "text-success" },
  content: { label: "Content", color: "text-success" },
  neutral: { label: "Neutral", color: "text-muted-foreground" },
  disgruntled: { label: "Disgruntled", color: "text-warning" },
  mutinous: { label: "Mutinous", color: "text-destructive" },
};

export const DIET_DISPLAY: Record<DietRegimen, { label: string; cost: string; desc: string }> = {
  austerity: {
    label: "Austerity",
    cost: "¥1,000/day",
    desc: "Minimal portions. High morale penalty, weight loss.",
  },
  maintenance: {
    label: "Maintenance",
    cost: "¥3,000/day",
    desc: "Standard stew. Balanced weight and morale.",
  },
  heavy_bulk: {
    label: "Heavy Bulk",
    cost: "¥6,000/day",
    desc: "Force-feeding. Fast weight gain, minor morale drop.",
  },
  premium: {
    label: "Premium Nutrition",
    cost: "¥10,000/day",
    desc: "High-grade wagyu. Boosts weight, morale, and recovery.",
  },
};

export const ROSTER_DISPLAY: Record<string, { label: string; color: string }> = {
  dominant: { label: "Dominant", color: "text-gold" },
  strong: { label: "Strong", color: "text-success" },
  competitive: { label: "Competitive", color: "text-primary" },
  developing: { label: "Developing", color: "text-gold" },
  weak: { label: "Weak", color: "text-muted-foreground" },
};
