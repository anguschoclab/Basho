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
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import { isSekitoriDivision } from "@/constants/engine/rankDisplay";
import { CrisisService } from "../../systems/narrative/CrisisService";
import { getHeya, getRikishi, getHeyaRoster, getOyakataForHeya } from "../../queries";
import { spawnNarrativeAgent } from "../../agents/NarrativeAgent";
import { narrativeEventMap } from "../../bard/narrativeEventMap";
import { BardEngine } from "../../bard/BardEngine";
import { rngForWorld } from "../../rng";
import type { NarrativeContext } from "../../types/events";

// ── Phase ─────────────────────────────────────────────────────────────────────

export function phase06_narrative(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase06_narrative");
  const deltas = world.transientContext?.deltas;
  if (!deltas) return builder.build();

  // ── Injury headlines ──────────────────────────────────────────────────────
  for (const rId of deltas.injuriesSustained) {
    const r = getRikishi(world, rId);
    if (!r) continue;
    builder.logEvent(
      "LIFECYCLE_EVENT",
      "injury",
      {
        rikishiId: rId,
        heyaId: r.heyaId,
        shikona: r.shikona,
        status: "injury",
        score: r.injuryWeeksRemaining,
      },
      { rikishiId: rId, heyaId: r.heyaId }
    );
  }

  // ── Financial crisis ──────────────────────────────────────────────────────
  if (deltas.expenses > deltas.revenue) {
    const playerHeyaId = world.playerHeyaId;
    const heya = playerHeyaId ? getHeya(world, playerHeyaId) : undefined;
    if (heya && heya.funds < 0) {
      builder.logEvent(
        "FINANCIAL_ALERT",
        "economy",
        {
          incident: "insolvency",
          money: heya.funds,
          heyaname: heya.name ?? heya.id,
        },
        { heyaId: playerHeyaId }
      );
    }
  }

  // ── Notable training milestones ───────────────────────────────────────────
  for (const rId in deltas.statChanges) {
    if (!Object.prototype.hasOwnProperty.call(deltas.statChanges, rId)) continue;
    const changes = deltas.statChanges[rId];
    const bigGains = changes.filter((c) => c.amount >= 1.0);
    if (bigGains.length === 0) continue;
    const r = getRikishi(world, rId);
    if (!r) continue;
    for (const change of bigGains) {
      builder.logEvent(
        "TRAINING_UPDATE",
        "training",
        {
          rikishiId: rId,
          heyaId: r.heyaId,
          shikona: r.shikona,
          incident: "milestone",
          status: change.stat,
          score: change.amount,
        },
        { rikishiId: rId, heyaId: r.heyaId }
      );
    }
  }

  // ── Phase 4: Narrative Crises ─────────────────────────────────────────────
  const crisisImpact = CrisisService.checkForWeeklyCrisis(world);
  builder.merge(crisisImpact);

  // ── Narrative Agent (player heya only) ──────────────────────────────────────
  if (world.playerHeyaId && world.oyakata) {
    const oyakata = getOyakataForHeya(world, world.playerHeyaId);
    if (oyakata) {
      const topRikishi = getHeyaRoster(world, world.playerHeyaId)
        .filter((r) => isSekitoriDivision(r.division))
        .slice(0, 3);
      const recentAchievements = deriveRecentAchievements(world);
      const narrativeResult = spawnNarrativeAgent({
        oyakata,
        topRikishi,
        recentAchievements,
        currentBashoPhase: world.cyclePhase,
      });
      if (narrativeResult.shouldTriggerEvent && narrativeResult.eventType) {
        const mapEntry = narrativeEventMap[narrativeResult.eventType];
        if (mapEntry) {
          const rikishi = narrativeResult.rikishiId
            ? getRikishi(world, narrativeResult.rikishiId)
            : undefined;
          const heya = getHeya(world, world.playerHeyaId);
          const ctx: NarrativeContext = {
            shikona: rikishi?.shikona,
            rikishiId: rikishi?.id,
            heya: heya?.name,
            heyaId: world.playerHeyaId,
          };
          const rng = rngForWorld(
            world,
            "narrative",
            `event-${narrativeResult.eventType}-${world.week}`
          );
          const titleRes = BardEngine.resolve(rng, mapEntry.titlePath, ctx);
          const summaryRes = BardEngine.resolve(rng, mapEntry.summaryPath, ctx);
          builder.logEvent(
            mapEntry.eventType,
            "narrative",
            { ...ctx, title: titleRes.text, summary: summaryRes.text },
            {
              rikishiId: narrativeResult.rikishiId,
              heyaId: world.playerHeyaId,
              importance: mapEntry.importance,
            }
          );
        }
      }
    }
  }

  return builder.build();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function deriveRecentAchievements(world: WorldState): string[] {
  const achievements: string[] = [];
  const lastBasho = world.history[world.history.length - 1];
  if (lastBasho && world.playerHeyaId) {
    const roster = getHeyaRoster(world, world.playerHeyaId);
    const rosterIds = new Set(roster.map((r) => r.id));
    if (lastBasho.yusho && rosterIds.has(lastBasho.yusho)) achievements.push("yusho");
    if (lastBasho.shukunsho && rosterIds.has(lastBasho.shukunsho)) achievements.push("kinboshi");
  }
  const recentEvents = (world.events?.log ?? []).slice(-20);
  if (recentEvents.some((e) => e.type === "RETIREMENT_ANNOUNCED")) achievements.push("retirement");
  if (recentEvents.some((e) => e.type === "PROMOTION_DELIBERATION"))
    achievements.push("yokozuna_promotion");
  return achievements;
}
