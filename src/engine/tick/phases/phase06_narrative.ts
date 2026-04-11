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
import { EventBus } from "../../events";
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
    EventBus.lifecycleEvent(next, {
      rikishiId: rId,
      heyaId: r.heyaId,
      shikona: r.shikona,
      status: "injury",
      score: r.injuryWeeksRemaining
    });
  }

  // ── Financial crisis ──────────────────────────────────────────────────────
  if (deltas.expenses > deltas.revenue) {
    const playerHeyaId = world.playerHeyaId;
    const heya = playerHeyaId ? world.heyas.get(playerHeyaId) : undefined;
    if (heya && heya.funds < 0) {
      EventBus.financialAlert(next, playerHeyaId, {
        incident: "insolvency",
        money: heya.funds,
        heyaname: heya.name ?? heya.id
      }, "major");
    }
  }

  // ── Notable training milestones ───────────────────────────────────────────
  for (const [rId, changes] of Object.entries(deltas.statChanges)) {
    const bigGains = changes.filter((c) => c.amount >= 1.0);
    if (bigGains.length === 0) continue;
    const r = world.rikishi.get(rId);
    if (!r) continue;
    const gainStr = bigGains.map((c) => `+${c.amount.toFixed(1)} ${c.stat}`).join(", ");
    EventBus.trainingUpdate(next, {
      rikishiId: rId,
      heyaId: r.heyaId,
      shikona: r.shikona,
      incident: "milestone",
      status: bigGains[0].stat, // main stat gained
      score: bigGains[0].amount // main gain amount
    });
  }

  return next;
}
