/**
 * rivalryConstants.ts
 *
 * Constants for rivalry page.
 */

import type { RivalryHeatBand, RivalryTone, RivalryTrigger } from "@/engine/rivalries";

export const HEAT_BAND_CONFIG: Record<
  RivalryHeatBand,
  { label: string; color: string; bgColor: string; barColor: string; glowClass: string }
> = {
  dormant: {
    label: "Dormant",
    color: "text-muted-foreground",
    bgColor: "bg-muted border-border",
    barColor: "bg-muted-foreground/50",
    glowClass: "",
  },
  simmering: {
    label: "Simmering",
    color: "text-warning/80",
    bgColor: "bg-warning/10 border-warning/20",
    barColor: "bg-warning/60",
    glowClass: "",
  },
  heated: {
    label: "Heated",
    color: "text-warning",
    bgColor: "bg-warning/15 border-warning/30",
    barColor: "bg-warning",
    glowClass: "",
  },
  fierce: {
    label: "Fierce",
    color: "text-accent",
    bgColor: "bg-accent/15 border-accent/30",
    barColor: "bg-gradient-to-r from-accent to-destructive",
    glowClass: "",
  },
  legendary: {
    label: "Legendary",
    color: "text-destructive",
    bgColor: "bg-destructive/15 border-destructive/30",
    barColor: "bg-gradient-to-r from-destructive to-accent",
    glowClass: "shadow-[0_0_12px_hsl(var(--destructive)/0.3)]",
  },
};

export const TONE_CONFIG: Record<
  RivalryTone,
  { label: string; description: string; icon: React.ElementType; ja: string }
> = {
  respect: {
    label: "Mutual Respect",
    description: "A rivalry built on admiration and competitive fire.",
    icon: () => null, // Will be replaced with actual icon in component
    ja: "敬意",
  },
  grudge: {
    label: "Grudge",
    description: "Bad blood simmers beneath the surface.",
    icon: () => null,
    ja: "恨み",
  },
  bad_blood: {
    label: "Bad Blood",
    description: "Open hostility — every bout is personal.",
    icon: () => null,
    ja: "因縁",
  },
  mentor_student: {
    label: "Mentor vs Student",
    description: "The student seeks to surpass the master.",
    icon: () => null,
    ja: "師弟",
  },
  unstable: {
    label: "Volatile",
    description: "Unpredictable clashes with explosive outcomes.",
    icon: () => null,
    ja: "不安定",
  },
  public_hype: {
    label: "Fan Favorite",
    description: "The crowd lives for this matchup.",
    icon: () => null,
    ja: "人気",
  },
};

export const TRIGGER_LABELS: Record<RivalryTrigger, string> = {
  repeat_matches: "Frequent bouts",
  close_finish: "Close finishes",
  upset: "Upsets",
  kinboshi: "Kinboshi",
  title_stakes: "Title stakes",
  injury_incident: "Injury incident",
  personal_history: "Personal history",
  heya_feud: "Stable feud",
};
