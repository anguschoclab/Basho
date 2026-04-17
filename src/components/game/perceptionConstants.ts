/**
 * perceptionConstants.ts
 *
 * Constants for perception overview color mappings.
 */

export const STATURE_COLOR: Record<string, string> = {
  legendary: "text-gold",
  powerful: "text-primary",
  established: "text-west",
  rebuilding: "text-warning",
  fragile: "text-destructive",
  new: "text-success",
};

export const ROSTER_COLOR: Record<string, string> = {
  dominant: "text-gold",
  strong: "text-success",
  competitive: "text-primary",
  developing: "text-gold",
  weak: "text-muted-foreground",
};

export const MORALE_COLOR: Record<string, string> = {
  inspired: "text-success",
  content: "text-success",
  neutral: "text-muted-foreground",
  disgruntled: "text-warning",
  mutinous: "text-destructive",
};

export const WELFARE_COLOR: Record<string, string> = {
  safe: "text-success",
  cautious: "text-gold",
  elevated: "text-warning",
  critical: "text-destructive",
};

export const HEALTH_COLOR: Record<string, string> = {
  peak: "text-success",
  good: "text-success",
  fair: "text-gold",
  worn: "text-warning",
  fragile: "text-destructive",
};

export const MOMENTUM_COLOR: Record<string, string> = {
  rising: "text-success",
  steady: "text-muted-foreground",
  declining: "text-destructive",
};
