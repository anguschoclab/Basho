/**
 * phase06_narrative.ts
 * ====================
 * Pipeline Phase 6 — Delta Analysis → Inbox / News Events
 *
 * Reads `transientContext.deltas` (written by phases 1–4) and generates
 * engine events that the UI surfaces as Inbox items and news tickers.
 *
 * Decision tree:
 *   - deltas.injuriesSustained has entries → generate injury headline(s)
 *   - deltas.expenses > deltas.revenue AND heya.funds < 0 → financial crisis event
 *   - deltas.statChanges has notable gains (Δ ≥ 1.0) → training milestone event
 *
 * This phase is the ONLY place these events are generated; it never re-reads
 * pre-phase world state or performs its own calculations.
 */

import type { WorldState } from "../../types/world";
import { logEngineEvent } from "../../events";
import { BardEngine } from "../../narrative/BardEngine";
import { rngFromSeed } from "../../rng";

// ── Phase ─────────────────────────────────────────────────────────────────────

export function phase06_narrative(world: WorldState): WorldState {
  const deltas = world.transientContext?.deltas;
  if (!deltas) return world;

  // Work on a shallow clone for the events array
  const next: WorldState = { ...world };

  // ── Injury headlines ──────────────────────────────────────────────────────
  for (const rId of deltas.injuriesSustained) {
    const r = world.rikishi.get(rId);
    if (!r) continue;
    const injRng = rngFromSeed(`injury-phase6-${rId}-${world.year}-${world.week}`, "narrative", "event");
    const injSummary = BardEngine.resolve(injRng, "events.health.injury_sustained", { shikona: r.shikona }).text;
    logEngineEvent(next, {
      type: "INJURY_SUSTAINED",
      category: "health",
      importance: "notable",
      scope: "rikishi",
      rikishiId: rId,
      heyaId: r.heyaId,
      title: BardEngine.resolve(injRng, "events.titles.INJURY_SUSTAINED", { SHIKONA: r.shikona }).text,
      summary: injSummary,
      data: { weeksOut: r.injuryWeeksRemaining },
      tags: ["injury"],
    });
  }

  // ── Financial crisis ──────────────────────────────────────────────────────
  if (deltas.expenses > deltas.revenue) {
    const playerHeyaId = world.playerHeyaId;
    const heya = playerHeyaId ? world.heyas.get(playerHeyaId) : undefined;
    if (heya && heya.funds < 0) {
      const finRng = rngFromSeed(`financial-crisis-${playerHeyaId}-${world.year}-${world.week}`, "narrative", "event");
      const finSummary = BardEngine.resolve(finRng, "events.health.financial_crisis", { heyaname: heya.name ?? heya.id }).text;
      logEngineEvent(next, {
        type: "FINANCIAL_CRISIS",
        category: "economy",
        importance: "major",
        scope: "heya",
        heyaId: playerHeyaId,
        title: BardEngine.resolve(finRng, "events.titles.MONTHLY_DEFICIT").text,
        summary: finSummary,
        data: { funds: heya.funds, revenue: deltas.revenue, expenses: deltas.expenses },
        tags: ["finance", "crisis"],
      });
    }
  }

  // ── Notable training milestones ───────────────────────────────────────────
  for (const [rId, changes] of Object.entries(deltas.statChanges)) {
    const bigGains = changes.filter((c) => c.amount >= 1.0);
    if (bigGains.length === 0) continue;
    const r = world.rikishi.get(rId);
    if (!r) continue;
    const gainStr = bigGains.map((c) => `+${c.amount.toFixed(1)} ${c.stat}`).join(", ");
    const trainRng = rngFromSeed(`training-milestone-${rId}-${world.year}-${world.week}`, "narrative", "event");
    const trainSummary = BardEngine.resolve(trainRng, "events.training.milestone", { shikona: r.shikona }).text + ` (${gainStr})`;
    logEngineEvent(next, {
      type: "TRAINING_MILESTONE",
      category: "training",
      importance: "minor",
      scope: "rikishi",
      rikishiId: rId,
      heyaId: r.heyaId,
      title: BardEngine.resolve(trainRng, "events.training.breakthrough_title", { SHIKONA: r.shikona }).text,
      summary: trainSummary,
      data: { gains: bigGains },
      tags: ["training", "milestone"],
    });
  }

  return next;
}
