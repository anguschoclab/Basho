/**
 * Loop Decision Types (Plan 3)
 * Types for blocking and queue-based player loop decisions.
 */

export interface LoopDecisionOption {
  id: string;
  label: string;
  impact: string;
}

export type LoopDecisionType =
  | "pre_basho_readiness"
  | "insolvency_response"
  | "weekly_training_emphasis"
  | "welfare_diet";

export interface LoopDecision {
  id: string;
  type: LoopDecisionType;
  description: string;
  deadlineWeek: number;
  options: LoopDecisionOption[];
  required: boolean;
}
