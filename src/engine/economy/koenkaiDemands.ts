/**
 * src/engine/economy/koenkaiDemands.ts
 * ====================================
 * Koenkai (supporter club) demands — monthly interactive asks that surface
 * as `koenkai_demand` pendingDecisions (P2). The demand's kind and fee are
 * re-derived from the decision id at resolution (registry-by-id pattern —
 * nothing executable on world state).
 */

import type { WorldState } from "@/engine/types/world";
import type { ImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { StateImpact } from "@/engine/core/StateImpact";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { RNGRegistry } from "@/engine/core/RNGRegistry";
import { getPlayerHeya } from "@/engine/core/queries";
import { enqueueDecisions } from "@/engine/npc/decision/decisionQueue";
import { clamp } from "@/engine/utils/math";

export type KoenkaiDemandKind = "gala" | "tickets" | "appearance" | "kesho_fund";

export interface KoenkaiDemandDef {
  kind: KoenkaiDemandKind;
  title: string;
  summary: string;
  feeYen: number;
  /** Relative trigger weight in the monthly roll. */
  weight: number;
  /** Satisfaction delta per outcome. */
  complySatisfaction: number;
  declineSatisfaction: number;
  /** Membership churn risk added on decline (percent). */
  declineChurnPct: number;
}

export const KOENKAI_DEMANDS: Record<KoenkaiDemandKind, KoenkaiDemandDef> = {
  gala: {
    kind: "gala",
    title: "Koenkai Requests a Supporters' Gala",
    summary:
      "The supporter club asks the stable to host its annual gala — food, drink, and face-time with the rikishi.",
    feeYen: 250_000,
    weight: 4,
    complySatisfaction: 8,
    declineSatisfaction: -6,
    declineChurnPct: 4,
  },
  tickets: {
    kind: "tickets",
    title: "Koenkai Requests Basho Ticket Blocks",
    summary:
      "Members want the stable to secure a block of arena seats at member rates for the upcoming basho.",
    feeYen: 100_000,
    weight: 5,
    complySatisfaction: 5,
    declineSatisfaction: -4,
    declineChurnPct: 3,
  },
  appearance: {
    kind: "appearance",
    title: "Koenkai Requests a Rikishi Appearance",
    summary:
      "A regional chapter asks for a sekitori to attend its summer festival — goodwill now, fatigue later.",
    feeYen: 0,
    weight: 3,
    complySatisfaction: 6,
    declineSatisfaction: -3,
    declineChurnPct: 2,
  },
  kesho_fund: {
    kind: "kesho_fund",
    title: "Koenkai Proposes a Kensho Fund",
    summary:
      "Leading members offer to pool a kensho fund for your sekitori — seed money from the stable expected.",
    feeYen: 150_000,
    weight: 3,
    complySatisfaction: 7,
    declineSatisfaction: -2,
    declineChurnPct: 1,
  },
};

const KINDS = Object.keys(KOENKAI_DEMANDS) as KoenkaiDemandKind[];

/** Monthly probability of a demand surfacing when the heya has a koenkai. */
export const KOENKAI_DEMAND_PROBABILITY = 0.5;

export function koenkaiDemandDecisionId(kind: KoenkaiDemandKind, world: WorldState): string {
  return `koenkai_demand-${kind}-y${world.year ?? 0}-w${world.week ?? 0}`;
}

function kindFromDecisionId(id: string): KoenkaiDemandKind | null {
  const m = /^koenkai_demand-([a-z_]+)-y\d+-w\d+$/.exec(id);
  return m && (KINDS as string[]).includes(m[1]) ? (m[1] as KoenkaiDemandKind) : null;
}

/**
 * Monthly hook — call inside phase05_monthly_boundary.
 * Emits at most one `koenkai_demand` pendingDecision for the player heya.
 */
export function tickMonthlyKoenkaiDemands(world: WorldState): StateImpact {
  const builder = createImpactBuilder("tickMonthlyKoenkaiDemands");
  if (world._autonomousSim) {
    // Autonomous: resolve silently via the comply outcome when affordable.
    const heya = getPlayerHeya(world);
    if (heya?.koenkaiId) applyDemandOutcome(world, builder, pickKind(world) ?? "tickets", "comply");
    return builder.build();
  }

  const heya = getPlayerHeya(world);
  if (!heya || !heya.koenkaiId) return builder.build();

  const rng = RNGRegistry.getSystemRNG(world, "economics", `koenkai_demand_roll_${world.week ?? 0}`);
  if (rng.next() >= KOENKAI_DEMAND_PROBABILITY) return builder.build();

  const kind = pickKind(world);
  if (!kind) return builder.build();

  const pending = world.pendingDecisions ?? [];
  const id = koenkaiDemandDecisionId(kind, world);
  if (pending.some((d) => d.id === id || d.type === "koenkai_demand")) return builder.build();

  const def = KOENKAI_DEMANDS[kind];
  builder.updateWorldField("pendingDecisions", enqueueDecisions(pending, [
    {
      id,
      type: "koenkai_demand",
      description: `${def.title} — ${def.summary}`,
      deadlineWeek: (world.week ?? 0) + 2,
      required: false,
      options: [
        {
          id: "comply",
          label: def.feeYen > 0 ? `Comply (¥${def.feeYen.toLocaleString("en-US")})` : "Comply",
          impact: `Koenkai satisfaction +${def.complySatisfaction}`,
        },
        {
          id: "decline",
          label: "Decline",
          impact: `Satisfaction ${def.declineSatisfaction}; ~${def.declineChurnPct}% member churn risk`,
        },
      ],
    },
  ]));
  return builder.build();
}

function pickKind(world: WorldState): KoenkaiDemandKind | null {
  const rng = RNGRegistry.getSystemRNG(world, "economics", `koenkai_demand_kind_${world.week ?? 0}`);
  const total = KINDS.reduce((s, k) => s + KOENKAI_DEMANDS[k].weight, 0);
  let pick = rng.next() * total;
  for (const k of KINDS) {
    pick -= KOENKAI_DEMANDS[k].weight;
    if (pick <= 0) return k;
  }
  return KINDS[KINDS.length - 1];
}

/** Apply a demand outcome — shared by interactive resolution and autosim. */
export function applyDemandOutcome(
  world: WorldState,
  builder: ImpactBuilder,
  kind: KoenkaiDemandKind,
  optionId: string
): void {
  const def = KOENKAI_DEMANDS[kind];
  if (!def) return;
  const heya = getPlayerHeya(world);
  if (!heya || !heya.koenkaiId) return;

  const comply = optionId === "comply";
  if (comply && def.feeYen > 0 && (heya.funds ?? 0) < def.feeYen) {
    return; // Can't afford — treat as unresolved (UI gates the button too)
  }

  const koenkai = world.sponsorPool?.koenkais?.get(heya.koenkaiId);
  const satisfactionDelta = comply ? def.complySatisfaction : def.declineSatisfaction;

  if (comply && def.feeYen > 0) {
    builder.updateHeya(heya.id, { funds: Math.round(heya.funds - def.feeYen) });
  }

  if (koenkai) {
    // Satisfaction lives on the Sponsor entities referenced by member rels.
    const sponsors = world.sponsorPool?.sponsors;
    for (const member of koenkai.members ?? []) {
      const sponsor = sponsors?.get(member.sponsorId);
      if (!sponsor) continue;
      builder.updateSponsor(member.sponsorId, {
        satisfaction: clamp((sponsor.satisfaction ?? 50) + satisfactionDelta, 0, 100),
      });
    }
    // Decline → small membership churn (drop the weakest-strength member rel).
    if (!comply && def.declineChurnPct > 0 && (koenkai.members?.length ?? 0) > 1) {
      const churnRng = RNGRegistry.getSystemRNG(
        world,
        "economics",
        `koenkai_churn_${kind}_${world.week ?? 0}`
      );
      if (churnRng.next() * 100 < def.declineChurnPct) {
        const weakest = [...koenkai.members].sort(
          (a, b) => (a.strength ?? 1) - (b.strength ?? 1)
        )[0];
        builder.updateKoenkai(heya.koenkaiId, {
          members: koenkai.members.filter((m) => m.relId !== weakest.relId),
          lastChangedTick: world.dayIndexGlobal ?? 0,
        });
      }
    }
  }

  builder.logEvent(
    "MANAGEMENT_DECISION",
    "sponsor",
    {
      title: `Koenkai: ${def.title}`,
      summary: comply
        ? `The stable complies — the supporters are pleased (+${def.complySatisfaction} satisfaction).`
        : `The stable declines — grumbling in the koenkai ranks (${def.declineSatisfaction} satisfaction).`,
      kind,
      outcome: comply ? "comply" : "decline",
    },
    { heyaId: heya.id, importance: "notable", causalEventId: koenkaiDemandDecisionId(kind, world) }
  );
}

/** Decision-resolution entry point (applyDecisionEffect branch). */
export function resolveKoenkaiDemand(
  world: WorldState,
  builder: ImpactBuilder,
  decisionId: string,
  optionId: string
): void {
  const kind = kindFromDecisionId(decisionId);
  if (!kind) return;
  applyDemandOutcome(world, builder, kind, optionId);
}
