/**
 * AchievementService.ts — player achievement cabinet (T1.5).
 *
 * Awards are derived from real world state (never fabricated): a
 * deterministic yearly check grants each milestone once and appends an
 * event. Cosmetic in both game modes — no stakes attached.
 */

import type { WorldState } from "@/engine/types/world";
import type { StateImpact } from "@/engine/core/StateImpact";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";

export interface PlayerAchievement {
  id: string;
  title: string;
  description: string;
  yearAwarded: number;
}

interface AchievementRule {
  id: string;
  title: string;
  description: string;
  check: (world: WorldState, heyaId: string) => boolean;
}

const RULES: AchievementRule[] = [
  {
    id: "first_sekitori",
    title: "First Sekitori",
    description: "Produce a rikishi ranked juryo or higher.",
    check: (w, h) =>
      [...w.rikishi.values()].some(
        (r) => r.heyaId === h && (r.division === "makuuchi" || r.division === "juryo")
      ),
  },
  {
    id: "sanyaku_stable",
    title: "San'yaku Stable",
    description: "House a rikishi at a san'yaku rank (komusubi or higher).",
    check: (w, h) =>
      [...w.rikishi.values()].some(
        (r) =>
          r.heyaId === h &&
          r.division === "makuuchi" &&
          ["komusubi", "sekiwake", "ozeki", "yokozuna"].includes(r.rank ?? "")
      ),
  },
  {
    id: "grand_champion",
    title: "Grand Champion Stable",
    description: "Raise a yokozuna — the highest honor in the sport.",
    check: (w, h) => [...w.rikishi.values()].some((r) => r.heyaId === h && r.rank === "yokozuna"),
  },
  {
    id: "deep_stable",
    title: "Deep Roster",
    description: "Field five or more sekitori at once.",
    check: (w, h) =>
      [...w.rikishi.values()].filter(
        (r) => r.heyaId === h && (r.division === "makuuchi" || r.division === "juryo")
      ).length >= 5,
  },
  {
    id: "solvent",
    title: "Financially Sound",
    description: "Build stable funds above ¥50M.",
    check: (w, h) => (w.heyas.get(h)?.funds ?? 0) >= 50_000_000,
  },
  {
    id: "respected",
    title: "Respected Oyakata",
    description: "Accumulate 80+ political capital.",
    check: (w, h) => (w.heyas.get(h)?.politicalCapital ?? 0) >= 80,
  },
];

/** Check + award achievements. Runs at the yearly boundary. */
export function checkYearlyAchievements(world: WorldState): StateImpact {
  const builder = createImpactBuilder("checkYearlyAchievements");
  const heyaId = world.playerHeyaId;
  if (!heyaId) return builder.build();

  const awarded = new Set((world.achievements ?? []).map((a) => a.id));
  const next: PlayerAchievement[] = [...(world.achievements ?? [])];
  let changed = false;

  for (const rule of RULES) {
    if (awarded.has(rule.id) || !rule.check(world, heyaId)) continue;
    next.push({
      id: rule.id,
      title: rule.title,
      description: rule.description,
      yearAwarded: world.year,
    });
    builder.logEvent(
      "AWARD_CONFERRED",
      "milestone",
      { achievement: rule.id, title: rule.title },
      { heyaId, importance: "major" }
    );
    changed = true;
  }

  if (changed) builder.updateWorldField("achievements", next);
  return builder.build();
}
