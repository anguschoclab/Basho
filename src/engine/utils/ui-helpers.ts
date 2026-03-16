export function getFacilityLevelLabel(level: number): string {
  if (level >= 85) return "World-Class";
  if (level >= 65) return "Excellent";
  if (level >= 45) return "Adequate";
  if (level >= 25) return "Basic";
  return "Minimal";
}

export function getFacilityLevelColor(level: number): string {
  if (level >= 85) return "text-gold";
  if (level >= 65) return "text-primary";
  if (level >= 45) return "text-primary/70";
  if (level >= 25) return "text-warning";
  return "text-destructive";
}
