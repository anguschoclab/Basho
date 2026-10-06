/**
 * CrisisService.ts
 * ================
 * Orchestrates random narrative "Crises" and events during the weekly tick.
 * (Phase 4: Media, Narratives & Faction Power)
 */

import { WorldState } from "../../types/world";
import { createImpactBuilder, type ImpactBuilder } from "../../core/ImpactBuilder";
import { StateImpact } from "../../core/StateImpact";
import { RNGRegistry } from "../../core/RNGRegistry";
import { getHeya } from "../../queries";
import { clamp } from "../../utils/math";

import { ActiveCrisis } from "../../types/crises";

/**
 * Bounded ±delta on a 0–100 scale — welfareRisk, scandalScore, reputation,
 * morale, condition, and heyaPressure all share it.
 */
const clampStat = (v: number) => clamp(Math.round(v), 0, 100);

/** Apply heya-scalar deltas (reputation / funds / scandal / political capital / welfare). */
function applyHeyaDelta(
  b: ImpactBuilder,
  world: WorldState,
  heyaId: string,
  d: {
    reputation?: number;
    funds?: number;
    scandalScore?: number;
    politicalCapital?: number;
    welfareRisk?: number;
    morale?: number;
  }
): void {
  const heya = getHeya(world, heyaId);
  if (!heya) return;
  const ws = heya.welfareState;
  b.updateHeya(heyaId, {
    reputation:
      d.reputation !== undefined
        ? clampStat((heya.reputation ?? 50) + d.reputation)
        : heya.reputation,
    funds: d.funds !== undefined ? Math.round((heya.funds ?? 0) + d.funds) : heya.funds,
    scandalScore:
      d.scandalScore !== undefined
        ? clampStat((heya.scandalScore ?? 0) + d.scandalScore)
        : heya.scandalScore,
    politicalCapital:
      d.politicalCapital !== undefined
        ? clampStat((heya.politicalCapital ?? 50) + d.politicalCapital)
        : heya.politicalCapital,
    welfareState:
      ws && (d.welfareRisk !== undefined || d.morale !== undefined)
        ? {
            ...ws,
            welfareRisk: clampStat((ws.welfareRisk ?? 0) + (d.welfareRisk ?? 0)),
            morale: clampStat((ws.morale ?? 50) + (d.morale ?? 0)),
          }
        : ws,
  });
}

/** Apply the same fatigue delta to every active rikishi of `heyaId`. */
function applyRosterFatigue(
  b: ImpactBuilder,
  world: WorldState,
  heyaId: string,
  delta: number
): void {
  for (const rid of world.activeRikishiIds) {
    const r = world.rikishi.get(rid);
    if (!r || r.heyaId !== heyaId || r.isRetired) continue;
    b.updateRikishi(rid, { fatigue: Math.max(0, (r.fatigue ?? 0) + delta) });
  }
}

/** Delta `heyaPressure[heyaId]` on world.mediaState (heya-level press pressure). */
function applyHeyaPressure(
  b: ImpactBuilder,
  world: WorldState,
  heyaId: string,
  delta: number
): void {
  const ms = world.mediaState;
  if (!ms) return;
  b.updateWorldField("mediaState", {
    ...ms,
    heyaPressure: {
      ...ms.heyaPressure,
      [heyaId]: clampStat((ms.heyaPressure?.[heyaId] ?? 0) + delta),
    },
  });
}

/** Pick one active rikishi of `heyaId` deterministically (crisis resolution RNG). */
function pickRikishi(world: WorldState, heyaId: string, label: string): string | undefined {
  const roster = [...world.activeRikishiIds].filter(
    (rid) => world.rikishi.get(rid)?.heyaId === heyaId && !world.rikishi.get(rid)?.isRetired
  );
  if (roster.length === 0) return undefined;
  const rng = RNGRegistry.getSystemRNG(world, "narrative", `crisis_pick_${label}_${world.week}`);
  return roster[rng.int(0, roster.length - 1)];
}

export const CrisisService = {
  /**
   * Probability of a crisis event triggering per week.
   */
  TRIGGER_PROBABILITY: 0.12,

  /**
   * Main entry point for the weekly crisis check.
   */
  checkForWeeklyCrisis(world: WorldState): StateImpact {
    const builder = createImpactBuilder("checkForWeeklyCrisis");
    // pendingCrisis is an interactive player gate — suppress during autonomous
    // sims, matching evaluatePendingDecisions' _autonomousSim guard.
    if (world._autonomousSim) return builder.build();
    const rng = RNGRegistry.getSystemRNG(world, "narrative", `crisis_roll_${world.week}`);

    if (rng.next() > this.TRIGGER_PROBABILITY) return builder.build();

    // Select a random event from the registry
    const event = this.rollEvent(world);
    if (!event) return builder.build();

    // In a real implementation, we would register this event in a
    // "pendingChoices" queue in the world state for the UI to consume.
    builder.logEvent(
      "NARRATIVE_CRISIS_TRIGGERED",
      "narrative",
      {
        eventId: event.id,
        title: event.title,
        description: event.description,
        incident: `An unexpected situation has developed: ${event.title}`,
      },
      { importance: "major" }
    );

    // Store only serializable fields — the registry options carry
    // `impactGenerator` functions which cannot survive structuredClone
    // (worker WORLD_UPDATED postMessage) or JSON save/load. Resolution
    // re-derives the generator from the registry by crisis id.
    builder.updateWorldField("pendingCrisis", {
      ...event,
      options: event.options.map(({ id, label, description }) => ({ id, label, description })),
    });

    return builder.build();
  },

  rollEvent(world: WorldState): ActiveCrisis | null {
    const rng = RNGRegistry.getSystemRNG(world, "narrative", `crisis_select_${world.week}`);
    const events = this.getRegistry();
    return events[rng.int(0, events.length - 1)];
  },

  getRegistry(): ActiveCrisis[] {
    return [
      {
        id: "stomach_flu",
        title: "Stomach Flu Outbreak",
        description:
          "A nasty virus is sweeping through the stables. Several rikishi are showing symptoms.",
        options: [
          {
            id: "quarantine",
            label: "Quarantine & Rest",
            impactGenerator: (w: WorldState, heyaId?: string) => {
              const b = createImpactBuilder("stomach_flu_quarantine");
              if (!heyaId) return b.build();
              // Rest week: fatigue bleeds off, welfare pressure eases.
              applyRosterFatigue(b, w, heyaId, -10);
              applyHeyaDelta(b, w, heyaId, { welfareRisk: -5, morale: 2 });
              return b.build();
            },
          },
          {
            id: "push_through",
            label: "Push Through",
            impactGenerator: (w: WorldState, heyaId?: string) => {
              const b = createImpactBuilder("stomach_flu_push");
              if (!heyaId) return b.build();
              // Train sick: whole roster fatigues, one rikishi goes down.
              applyRosterFatigue(b, w, heyaId, 15);
              applyHeyaDelta(b, w, heyaId, { welfareRisk: 8 });
              const victim = pickRikishi(w, heyaId, "stomach_flu_push");
              const r = victim ? w.rikishi.get(victim) : undefined;
              if (victim && r && !r.injured) {
                b.updateRikishi(victim, { injured: true, injuryWeeksRemaining: 1 });
                b.updateRikishiNestedField(victim, "injuryStatus", {
                  type: "illness",
                  isInjured: true,
                  severity: "minor",
                  location: "internal",
                  weeksRemaining: 1,
                  weeksToHeal: 1,
                });
              }
              return b.build();
            },
          },
        ],
      },
      {
        id: "dojo_duel",
        title: "The Dojo Challenge",
        description:
          "A rival stable master has criticized your training methods and challenged your top rikishi to a private duel.",
        options: [
          {
            id: "accept",
            label: "Accept the Challenge",
            impactGenerator: (w: WorldState, heyaId?: string) => {
              const b = createImpactBuilder("dojo_duel_accept");
              if (!heyaId) return b.build();
              // Extra sparring sharpens the champion but costs condition.
              const duelist = pickRikishi(w, heyaId, "dojo_duel");
              const r = duelist ? w.rikishi.get(duelist) : undefined;
              if (duelist && r) {
                b.updateRikishi(duelist, {
                  fatigue: Math.max(0, (r.fatigue ?? 0) + 8),
                  condition: clampStat((r.condition ?? 50) - 5),
                });
              }
              applyHeyaDelta(b, w, heyaId, { reputation: 3 });
              b.logEvent("OYAKATA_MOOD_SHIFT", "narrative", { newMood: "furious" });
              return b.build();
            },
          },
          {
            id: "decline",
            label: "Ignore the Distraction",
            impactGenerator: (w: WorldState, heyaId?: string) => {
              const b = createImpactBuilder("dojo_duel_decline");
              if (!heyaId) return b.build();
              // Ducking the challenge reads as weakness.
              applyHeyaDelta(b, w, heyaId, { reputation: -4, morale: -3 });
              return b.build();
            },
          },
        ],
      },
      {
        id: "scandal_nightlife",
        title: "Nightlife Scandal",
        description:
          "A popular rikishi was spotted at a late-night club during a strict training period.",
        options: [
          {
            id: "suspend",
            label: "Issue Suspension",
            impactGenerator: (w: WorldState, heyaId?: string) => {
              const b = createImpactBuilder("scandal_suspend");
              if (!heyaId) return b.build();
              // Visible discipline reassures the JSA but sours the room.
              applyHeyaDelta(b, w, heyaId, { reputation: 4, welfareRisk: -5, morale: -3 });
              applyHeyaPressure(b, w, heyaId, -4);
              b.logEvent("GOVERNANCE_RULING", "discipline", { status: "suspended" });
              return b.build();
            },
          },
          {
            id: "defend",
            label: "Publicly Defend",
            impactGenerator: (w: WorldState, heyaId?: string) => {
              const b = createImpactBuilder("scandal_defend");
              if (!heyaId) return b.build();
              // Loyalty inside the walls, scandal outside them.
              applyHeyaDelta(b, w, heyaId, { reputation: -3, scandalScore: 8, morale: 5 });
              applyHeyaPressure(b, w, heyaId, 10);
              b.logEvent("OYAKATA_MOOD_SHIFT", "narrative", { newMood: "stubborn" });
              return b.build();
            },
          },
        ],
      },
      {
        id: "sponsorship_friction",
        title: "Sponsorship Tension",
        description:
          "A major sponsor is unhappy with the stable's recent public image and is threatening to pull funding.",
        options: [
          {
            id: "renegotiate",
            label: "Renegotiate Terms",
            impactGenerator: (w: WorldState, heyaId?: string) => {
              const b = createImpactBuilder("sponsor_renegotiate");
              if (!heyaId) return b.build();
              // Buy goodwill: a concession payment keeps the sponsor aboard.
              applyHeyaDelta(b, w, heyaId, { funds: -200_000, reputation: 2 });
              applyHeyaPressure(b, w, heyaId, -3);
              return b.build();
            },
          },
          {
            id: "call_bluff",
            label: "Call Their Bluff",
            impactGenerator: (w: WorldState, heyaId?: string) => {
              const b = createImpactBuilder("sponsor_bluff");
              if (!heyaId) return b.build();
              // The sponsor walks — lost disbursement plus bad press.
              applyHeyaDelta(b, w, heyaId, { funds: -400_000, reputation: -3, scandalScore: 3 });
              applyHeyaPressure(b, w, heyaId, 5);
              return b.build();
            },
          },
        ],
      },
      {
        id: "injury_training",
        title: "Training Mishap",
        description:
          "A freak accident during the morning practice has left several rikishi shaken and one potentially injured.",
        options: [
          {
            id: "halt_training",
            label: "Halt Training",
            impactGenerator: (w: WorldState, heyaId?: string) => {
              const b = createImpactBuilder("training_halt");
              if (!heyaId) return b.build();
              // A lost week of conditioning, but the roster settles.
              applyRosterFatigue(b, w, heyaId, -8);
              applyHeyaDelta(b, w, heyaId, { welfareRisk: -4, morale: 3 });
              return b.build();
            },
          },
          {
            id: "continue",
            label: "Continue with Caution",
            impactGenerator: (w: WorldState, heyaId?: string) => {
              const b = createImpactBuilder("training_continue");
              if (!heyaId) return b.build();
              // Pressing on costs a rikishi — minor injury, 1 week out.
              applyHeyaDelta(b, w, heyaId, { welfareRisk: 8 });
              const victim = pickRikishi(w, heyaId, "training_continue");
              const r = victim ? w.rikishi.get(victim) : undefined;
              if (victim && r && !r.injured) {
                b.updateRikishi(victim, { injured: true, injuryWeeksRemaining: 1 });
                b.updateRikishiNestedField(victim, "injuryStatus", {
                  type: "sprain",
                  isInjured: true,
                  severity: "minor",
                  location: "ankle",
                  weeksRemaining: 1,
                  weeksToHeal: 1,
                });
              }
              return b.build();
            },
          },
        ],
      },
      {
        id: "media_firestorm",
        title: "Media Firestorm",
        description:
          "A journalist is preparing an expose on the 'toxic culture' within the modern sumo stables.",
        options: [
          {
            id: "exclusive",
            label: "Offer Exclusive Interview",
            impactGenerator: (w: WorldState, heyaId?: string) => {
              const b = createImpactBuilder("media_exclusive");
              if (!heyaId) return b.build();
              // Controlled narrative defuses the story but spends capital.
              applyHeyaDelta(b, w, heyaId, { reputation: 3, politicalCapital: -3 });
              applyHeyaPressure(b, w, heyaId, -6);
              return b.build();
            },
          },
          {
            id: "no_comment",
            label: "No Comment",
            impactGenerator: (w: WorldState, heyaId?: string) => {
              const b = createImpactBuilder("media_no_comment");
              if (!heyaId) return b.build();
              // Silence lets the story run free.
              applyHeyaDelta(b, w, heyaId, { reputation: -5, scandalScore: 5 });
              applyHeyaPressure(b, w, heyaId, 12);
              return b.build();
            },
          },
        ],
      },
      {
        id: "governance_audit",
        title: "Compliance Audit",
        description:
          "The Sumo Association has announced a surprise audit of stable welfare and financial records.",
        options: [
          {
            id: "cooperate",
            label: "Full Cooperation",
            impactGenerator: (w: WorldState, heyaId?: string) => {
              const b = createImpactBuilder("audit_cooperate");
              if (!heyaId) return b.build();
              // Open books: compliance risk eases, political goodwill earned,
              // at a modest administrative cost.
              applyHeyaDelta(b, w, heyaId, {
                welfareRisk: -8,
                politicalCapital: 6,
                funds: -100_000,
              });
              return b.build();
            },
          },
          {
            id: "stonewall",
            label: "Stonewall",
            impactGenerator: (w: WorldState, heyaId?: string) => {
              const b = createImpactBuilder("audit_stonewall");
              if (!heyaId) return b.build();
              // Refusing an audit reads as guilt.
              applyHeyaDelta(b, w, heyaId, {
                welfareRisk: 15,
                politicalCapital: -8,
                scandalScore: 8,
              });
              applyHeyaPressure(b, w, heyaId, 8);
              return b.build();
            },
          },
        ],
      },
    ];
  },
};
