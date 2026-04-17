/**
 * eventLogHelpers.ts
 *
 * Helper functions and constants for EventLogPanel.
 */

import type { EngineEvent } from "@/engine/types/events";
import type { LucideIcon } from "lucide-react";
import {
  Trophy,
  Swords,
  HeartPulse,
  Coins,
  GraduationCap,
  Scale,
  Star,
  AlertTriangle,
  MessageCircle,
  Search,
  Wrench,
} from "lucide-react";

export const CATEGORY_META: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  match: { icon: Swords, color: "text-primary", label: "Match" },
  basho: { icon: Trophy, color: "text-gold", label: "Basho" },
  training: { icon: GraduationCap, color: "text-success", label: "Training" },
  injury: { icon: HeartPulse, color: "text-destructive", label: "Injury" },
  economy: { icon: Coins, color: "text-warning", label: "Economy" },
  sponsor: { icon: Coins, color: "text-warning", label: "Sponsor" },
  promotion: { icon: Star, color: "text-primary", label: "Rank" },
  discipline: { icon: Scale, color: "text-muted-foreground", label: "Discipline" },
  rivalry: { icon: Swords, color: "text-accent", label: "Rivalry" },
  career: { icon: Star, color: "text-muted-foreground", label: "Career" },
  welfare: { icon: AlertTriangle, color: "text-warning", label: "Welfare" },
  scouting: { icon: Search, color: "text-primary", label: "Scouting" },
  media: { icon: MessageCircle, color: "text-muted-foreground", label: "Media" },
  milestone: { icon: Star, color: "text-gold", label: "Milestone" },
  facility: { icon: Wrench, color: "text-west", label: "Facility" },
  misc: { icon: MessageCircle, color: "text-muted-foreground", label: "Misc" },
};

export function getCategoryMeta(cat: string) {
  return CATEGORY_META[cat] || CATEGORY_META.misc;
}

export function getEventRoute(e: EngineEvent): string | null {
  const cat = e.category;
  const type = e.type?.toLowerCase() ?? "";

  // Match/bout events → basho page
  if (cat === "match" || type.includes("bout") || type.includes("match")) {
    return "/basho";
  }

  // Basho-level events
  if (cat === "basho") {
    if (type.includes("recap") || type.includes("wrap") || type.includes("end")) return "/recap";
    return "/basho";
  }

  // Rikishi-specific events → rikishi profile
  if (e.rikishiId) {
    // Training, injury, career, promotion for a specific rikishi
    if (["training", "injury", "career", "promotion"].includes(cat)) {
      return `/rikishi/${e.rikishiId}`;
    }
  }
  if (cat === "scouting") return "/talent-pool";

  // Economy/sponsor → economy page
  if (cat === "economy" || cat === "sponsor") return "/economy";

  // Rivalry → rivalries page
  if (cat === "rivalry") return "/rivalries";

  // Discipline/governance → governance
  if (cat === "discipline") return "/governance";

  // Welfare → stable page (player's)
  if (cat === "welfare" && e.heyaId) return `/stable/${e.heyaId}`;

  // Media → almanac or stable
  if (cat === "media") {
    if (e.rikishiId) return `/rikishi/${e.rikishiId}`;
    if (e.heyaId) return `/stable/${e.heyaId}`;
  }

  // Milestone → rikishi or stable
  if (cat === "milestone") {
    if (e.rikishiId) return `/rikishi/${e.rikishiId}`;
    if (e.heyaId) return `/stable/${e.heyaId}`;
  }

  // Facility → stable
  if (cat === "facility" && e.heyaId) return `/stable/${e.heyaId}`;

  // Fallback: if we have a rikishi, link there; if heya, link there
  if (e.rikishiId) return `/rikishi/${e.rikishiId}`;
  if (e.heyaId) return `/stable/${e.heyaId}`;

  return null;
}

export function getLinkLabel(e: EngineEvent): string {
  const cat = e.category;
  const type = e.type?.toLowerCase() ?? "";

  if (cat === "match" || type.includes("bout")) return "View bout →";
  if (cat === "basho") {
    if (type.includes("recap") || type.includes("wrap")) return "View recap →";
    return "View tournament →";
  }
  if (cat === "scouting") return "View talent pool →";
  if (cat === "economy" || cat === "sponsor") return "View finances →";
  if (cat === "rivalry") return "View rivalries →";
  if (cat === "discipline") return "View governance →";
  if (e.rikishiId && ["training", "injury", "career", "promotion", "milestone"].includes(cat)) {
    return "View rikishi →";
  }
  if (e.heyaId) return "View stable →";
  if (e.rikishiId) return "View rikishi →";
  return "View details →";
}
