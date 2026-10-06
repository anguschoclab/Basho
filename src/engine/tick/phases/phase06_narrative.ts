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
import {
  getHeya,
  getRikishi,
  getRikishiAnywhere,
  getHeyaRoster,
  getOyakataForHeya,
} from "../../queries";
import { spawnNarrativeAgent } from "../../agents/NarrativeAgent";
import { narrativeEventMap } from "../../bard/narrativeEventMap";
import { BardEngine } from "../../bard/BardEngine";
import { rngForWorld } from "../../rng";
import type { NarrativeContext } from "../../types/events";

// ── Phase ─────────────────────────────────────────────────────────────────────

/** Maps agent event types to the achievement whose subject rikishi they celebrate. */
const SUBJECT_BY_EVENT_TYPE: Record<string, string> = {
  championship_celebration: "yusho",
  underdog_victory: "kinboshi",
  retirement_ceremony: "retirement",
  yokozuna_promotion: "yokozuna_promotion",
};

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
      const { list: recentAchievements, subjects } = deriveRecentAchievements(world);
      const narrativeResult = spawnNarrativeAgent({
        oyakata,
        topRikishi,
        recentAchievements,
        currentBashoPhase: world.cyclePhase,
      });
      if (narrativeResult.shouldTriggerEvent && narrativeResult.eventType) {
        const mapEntry = narrativeEventMap[narrativeResult.eventType];
        if (mapEntry) {
          // Prefer the agent's roster pick; otherwise recover the real subject
          // from the achievement's source data (yusho winner, kinboshi bout,
          // retirement/deliberation event). Every mapped template requires
          // %SHIKONA% (+ %HEYA%) — without a subject the event would render
          // [MISSING: SHIKONA], so skip rather than emit a broken headline.
          const subjectId =
            narrativeResult.rikishiId ?? subjects[SUBJECT_BY_EVENT_TYPE[narrativeResult.eventType]];
          const subject = subjectId ? getRikishiAnywhere(world, subjectId) : undefined;
          const heya = getHeya(world, world.playerHeyaId);
          if (!subject || !heya) return builder.build();
          const ctx: NarrativeContext = {
            shikona: subject.shikona,
            rikishiId: subject.id,
            heya: heya.name,
            heyaId: world.playerHeyaId,
            SHIKONA: subject.shikona,
            HEYA: heya.name,
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

function deriveRecentAchievements(world: WorldState): {
  list: string[];
  subjects: Record<string, string>;
} {
  const list: string[] = [];
  const subjects: Record<string, string> = {};
  const lastBasho = world.history[world.history.length - 1];
  if (lastBasho && world.playerHeyaId) {
    const roster = getHeyaRoster(world, world.playerHeyaId);
    const rosterIds = new Set(roster.map((r) => r.id));
    if (lastBasho.yusho && rosterIds.has(lastBasho.yusho)) {
      list.push("yusho");
      subjects.yusho = lastBasho.yusho;
    }
    // kinboshi = a maegashira defeating a yokozuna — surfaced via keyBouts
    // labeled "kinboshi", NOT the shukunsho (fighting-spirit prize).
    const kinboshiWinner = lastBasho.keyBouts
      ?.filter((k) => k.label === "kinboshi")
      .find((k) => rosterIds.has(k.bout.winnerRikishiId));
    if (kinboshiWinner) {
      list.push("kinboshi");
      subjects.kinboshi = kinboshiWinner.bout.winnerRikishiId;
    }
  }
  const recentEvents = (world.events?.log ?? []).slice(-20);
  const retirementEvent = [...recentEvents]
    .reverse()
    .find((e) => e.type === "RETIREMENT_ANNOUNCED");
  if (retirementEvent) {
    list.push("retirement");
    const rid =
      (retirementEvent.data?.rikishiId as string | undefined) ??
      (retirementEvent.rikishiId as string | undefined);
    if (rid) subjects.retirement = rid;
  }
  const deliberationEvent = [...recentEvents]
    .reverse()
    .find((e) => e.type === "PROMOTION_DELIBERATION");
  if (deliberationEvent) {
    list.push("yokozuna_promotion");
    const rid =
      (deliberationEvent.data?.rikishiId as string | undefined) ??
      (deliberationEvent.rikishiId as string | undefined);
    if (rid) subjects.yokozuna_promotion = rid;
  }
  return { list, subjects };
}
