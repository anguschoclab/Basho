/**
 * Constants for CalendarWidget component.
 */

export const BASHO_NAMES: Record<string, string> = {
  hatsu: "January",
  haru: "March",
  natsu: "May",
  nagoya: "July",
  aki: "September",
  kyushu: "November",
};

export const PHASE_LABELS: Record<string, { label: string; dotClass: string }> = {
  interim: { label: "Off-Season", dotClass: "bg-muted-foreground/40" },
  pre_basho: { label: "Pre-Basho", dotClass: "bg-primary" },
  active_basho: {
    label: "Tournament",
    dotClass: "bg-accent animate-pulse-glow",
  },
  post_basho: { label: "Post-Basho", dotClass: "bg-primary/60" },
  basho_recap: { label: "Recap", dotClass: "bg-muted-foreground/40" },
};
