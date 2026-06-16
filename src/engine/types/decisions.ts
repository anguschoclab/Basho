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
  | "recruit_or_develop"
  | "ozeki_promotion"
  | "training_regime"
  | "insolvency_response"
  | "welfare_diet"
  | "weekly_training";

export interface LoopDecision {
  id: string;
  type: LoopDecisionType;
  description: string;
  deadlineWeek: number;
  options: LoopDecisionOption[];
  required: boolean;
}
