/**
 * colorMaps.ts
 *
 * Centralized color mapping constants for UI components.
 * Eliminates duplicate color map definitions across components.
 */

// Status color mappings
export const STATUS_COLORS: Record<string, string> = {
  healthy: "text-success",
  injured: "text-destructive",
  recovering: "text-warning",
  retired: "text-muted-foreground",
  suspended: "text-destructive",
  active: "text-success",
  inactive: "text-muted-foreground",
};

// Band color mappings
export const BAND_COLORS: Record<string, { label: string; color: string }> = {
  peak: { label: "Peak", color: "text-success" },
  good: { label: "Good", color: "text-primary" },
  fair: { label: "Fair", color: "text-warning" },
  worn: { label: "Worn", color: "text-orange-500" },
  fragile: { label: "Fragile", color: "text-destructive" },

  safe: { label: "Safe", color: "text-success" },
  cautious: { label: "Cautious", color: "text-warning" },
  elevated: { label: "Elevated", color: "text-orange-500" },
  critical: { label: "Critical", color: "text-destructive" },

  cold: { label: "Cold", color: "text-muted-foreground" },
  warm: { label: "Warm", color: "text-warning" },
  hot: { label: "Hot", color: "text-orange-500" },
  blazing: { label: "Blazing", color: "text-destructive" },

  dominant: { label: "Dominant", color: "text-success" },
  strong: { label: "Strong", color: "text-primary" },
  competitive: { label: "Competitive", color: "text-warning" },
  developing: { label: "Developing", color: "text-orange-500" },
  weak: { label: "Weak", color: "text-destructive" },
};

// Rivalry heat configuration (from BoutCard.tsx)
export const HEAT_CONFIG: Record<string, { icon: string; label: string; classes: string }> = {
  inferno: {
    icon: "🔥",
    label: "Inferno Rivalry",
    classes: "bg-destructive/15 text-destructive border-destructive/25",
  },
  hot: {
    icon: "🌡️",
    label: "Heated Rivalry",
    classes: "bg-warning/15 text-warning border-warning/25",
  },
  warm: {
    icon: "🌡️",
    label: "Warm Rivalry",
    classes: "bg-warning/10 text-warning/80 border-warning/20",
  },
  cold: {
    icon: "❄️",
    label: "Cold",
    classes: "bg-muted text-muted-foreground border-border",
  },
};

// Rank border colors (from SumoAvatar.tsx)
export const RANK_BORDER_COLORS: Record<string, string> = {
  yokozuna: "border-gold",
  ozeki: "border-muted-foreground",
  sekiwake: "border-gold",
  komusubi: "border-gold",
  maegashira: "border-west",
  juryo: "border-west",
  makushita: "border-success",
  sandanme: "border-warning",
  jonidan: "border-primary",
  jonokuchi: "border-muted-foreground",
};

// Division colors
export const DIVISION_COLORS: Record<string, string> = {
  makuuchi: "bg-gold/10 text-gold border-gold/20",
  juryo: "bg-west/10 text-west border-west/20",
  makushita: "bg-success/10 text-success border-success/20",
  sandanme: "bg-warning/10 text-warning border-warning/20",
  jonidan: "bg-primary/10 text-primary border-primary/20",
  jonokuchi: "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20",
};

// Side colors
export const SIDE_COLORS: Record<string, string> = {
  east: "text-primary",
  west: "text-west",
};

// Result colors
export const RESULT_COLORS: Record<string, string> = {
  win: "text-success",
  loss: "text-destructive",
  draw: "text-warning",
  pending: "text-muted-foreground",
};

// Stature band colors
export const STATURE_COLORS: Record<string, string> = {
  legendary: "bg-gold/10 text-gold border-gold/20",
  elite: "bg-silver/10 text-silver border-silver/20",
  respected: "bg-bronze/10 text-bronze border-bronze/20",
  emerging: "bg-primary/10 text-primary border-primary/20",
  struggling: "bg-warning/10 text-warning border-warning/20",
  irrelevant: "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20",
};

// Prestige band colors
export const PRESTIGE_COLORS: Record<string, string> = {
  legendary: "text-gold",
  elite: "text-silver",
  respected: "text-bronze",
  established: "text-primary",
  rising: "text-success",
  obscure: "text-muted-foreground",
};

// Compliance state colors
export const COMPLIANCE_COLORS: Record<string, string> = {
  compliant: "text-success",
  watch: "text-warning",
  investigation: "text-orange-500",
  sanctioned: "text-destructive",
};

// Mood colors
export const MOOD_COLORS: Record<string, string> = {
  confident: "text-success",
  content: "text-primary",
  neutral: "text-muted-foreground",
  anxious: "text-warning",
  obsessed: "text-destructive",
};

// Get heat band color
export function getHeatBandColor(heat: number): string {
  if (heat >= 75) return HEAT_CONFIG.inferno.classes;
  if (heat >= 50) return HEAT_CONFIG.hot.classes;
  if (heat >= 25) return HEAT_CONFIG.warm.classes;
  return HEAT_CONFIG.cold.classes;
}

// Get heat band label
export function getHeatBandLabel(heat: number): string {
  if (heat >= 75) return HEAT_CONFIG.inferno.label;
  if (heat >= 50) return HEAT_CONFIG.hot.label;
  if (heat >= 25) return HEAT_CONFIG.warm.label;
  return HEAT_CONFIG.cold.label;
}
