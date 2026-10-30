/**
 * src/engine/events/chains/chainService.ts
 * ========================================
 * Weekly event-chain engine. Runs inside `phase06_narrative` beside
 * `checkForWeeklyCrisis`:
 *
 *  - Due stages surface as `type:"chain_stage"` pendingDecisions
 *    (non-blocking; deadline = next week; option fees rendered on labels).
 *  - `resolveChainStage` re-derives stage/option from the registry by id —
 *    nothing executable ever lives on WorldState (V6 / pendingCrisis pattern).
 *  - Every resolution logs an outcome event carrying `causalEventId` back to
 *    the decision that produced it — the first real producer of the field.
 *  - `_autonomousSim` chains auto-resolve via the stage's first option so
 *    long sims accumulate chains without stalling on player gates.
 */

import type { WorldState } from "@/engine/types/world";
import type { ImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { StateImpact } from "@/engine/core/StateImpact";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { RNGRegistry } from "@/engine/core/RNGRegistry";
import { rngForWorld } from "@/engine/core/rng";
import { BardEngine } from "@/engine/bard/BardEngine";
import type { NarrativeContext } from "@/engine/types/events";
import { getHeya, getPlayerHeya, getRikishiAnywhere } from "@/engine/core/queries";
// NOTE: chain RNG uses the "narrative" system key — SystemRNGKey is a closed
// union, so chain rolls ride the narrative channel.
const CHAIN_RNG = "narrative" as const;
import { clamp } from "@/engine/utils/math";
import { getChainDef, EVENT_CHAIN_REGISTRY } from "@/engine/events/chains/chainRegistry";
import type {
  ActiveChain,
  ChainEffects,
  ChainOption,
  EventChainDef,
} from "@/engine/events/chains/types";

/** Weekly probability that the chain trigger roll fires at all. */
export const CHAIN_ROLL_PROBABILITY = 0.55;
/** Max concurrently-active chain instances. */
export const MAX_ACTIVE_CHAINS = 3;

const clampStat = (v: number) => clamp(Math.round(v), 0, 100);

/** Deterministic instance id for a chain fired in a given week. */
function makeInstanceId(chainId: string, world: WorldState): string {
  return `chain-${chainId}-y${world.year ?? 0}-w${world.week ?? 0}`;
}

/** Decision id for a chain instance's pending stage. */
export function chainDecisionId(instanceId: string): string {
  return `chain_${instanceId}`;
}

function instanceIdFromDecisionId(decisionId: string): string | null {
  return decisionId.startsWith("chain_") ? decisionId.slice("chain_".length) : null;
}

/** Narrative context for resolving a chain's bard paths. */
function chainContext(world: WorldState, chain: ActiveChain): NarrativeContext {
  const heya = chain.heyaId ? getHeya(world, chain.heyaId) : getPlayerHeya(world);
  const rikishi = chain.rikishiId ? getRikishiAnywhere(world, chain.rikishiId) : undefined;
  const ctx: NarrativeContext = {
    heya: heya?.name ?? "the stable",
    heyaId: heya?.id,
    HEYA: heya?.name ?? "the stable",
  };
  if (rikishi) {
    ctx.shikona = rikishi.shikona;
    ctx.SHIKONA = rikishi.shikona;
    ctx.rikishiId = rikishi.id;
  }
  return ctx;
}

function resolveText(
  world: WorldState,
  titlePath: string,
  ctx: NarrativeContext,
  label: string
): string {
  const rng = rngForWorld(world, CHAIN_RNG, `${label}_${world.week ?? 0}`);
  if (!BardEngine.has(titlePath)) return titlePath; // registry test guarantees paths exist
  return BardEngine.resolve(rng, titlePath, ctx).text;
}

/** Pick the subject rikishi for a needsRikishi chain (deterministic). */
function pickSubject(world: WorldState, heyaId: string, chainId: string): string | undefined {
  const roster = [...world.activeRikishiIds].filter((id) => {
    const r = world.rikishi.get(id);
    return !!r && r.heyaId === heyaId && !r.isRetired;
  });
  if (roster.length === 0) return undefined;
  const rng = RNGRegistry.getSystemRNG(world, CHAIN_RNG, `pick_${chainId}_${world.week ?? 0}`);
  return roster[rng.int(0, roster.length - 1)];
}

/** Is a chain eligible to fire this week? */
function chainEligible(world: WorldState, def: EventChainDef): boolean {
  const active = world.activeChains ?? {};
  if (Object.values(active).some((c) => c.chainId === def.id)) return false;
  const last = (world.chainCooldowns ?? {})[def.id];
  if (last !== undefined && (world.week ?? 0) - last < def.cooldownWeeks) return false;
  if (def.trigger.phases && !def.trigger.phases.includes(world.cyclePhase)) return false;
  const heya = getPlayerHeya(world);
  if (!heya) return false;
  if (def.trigger.guard && !def.trigger.guard(world, heya)) return false;
  if (def.trigger.needsRikishi && !pickSubject(world, heya.id, def.id)) return false;
  return true;
}

/** Harmony-aware trigger weighting (P2 link): discord breeds darker chains. */
const DISCORD_CHAINS = new Set([
  "bullying",
  "tsukebito_abuse",
  "succession_tension",
  "injury_coverup",
  "koenkai_defection",
]);

function defWeight(def: EventChainDef, world: WorldState): number {
  const morale = getPlayerHeya(world)?.welfareState?.morale;
  if (morale !== undefined && morale < 35 && DISCORD_CHAINS.has(def.id)) {
    return def.trigger.weight * 1.5;
  }
  return def.trigger.weight;
}

/**
 * Weekly tick: trigger new chains + surface due stages as pendingDecisions.
 * Autonomous worlds resolve silently (no decisions can be presented).
 */
export function tickWeekEventChains(world: WorldState): StateImpact {
  const builder = createImpactBuilder("tickWeekEventChains");
  let activeChains: Record<string, ActiveChain> = { ...(world.activeChains ?? {}) };
  const pendingDecisions = [...(world.pendingDecisions ?? [])];
  const currentWeek = world.week ?? 0;

  if (world._autonomousSim) {
    // Autonomous: advance due stages immediately via the stage's first option.
    for (const [instanceId, chain] of Object.entries(activeChains)) {
      if (chain.nextStageDueWeek > currentWeek) continue;
      resolveChainStage(world, builder, chainDecisionId(instanceId), "first");
    }
    return builder.build();
  }

  // ── Surface due stages as chain_stage pendingDecisions ────────────────────
  for (const [instanceId, chain] of Object.entries(activeChains)) {
    if (chain.nextStageDueWeek > currentWeek) continue;
    const def = getChainDef(chain.chainId);
    const stage = def?.stages[chain.stageIdx];
    if (!def || !stage) {
      // Orphaned instance — drop it without a dynamic-key delete.
      activeChains = Object.fromEntries(
        Object.entries(activeChains).filter(([k]) => k !== instanceId)
      ) as Record<string, ActiveChain>;
      continue;
    }
    const decisionId = chainDecisionId(instanceId);
    if (pendingDecisions.some((d) => d.id === decisionId)) continue;

    const ctx = chainContext(world, chain);
    const title = resolveText(world, stage.titlePath, ctx, `t_${instanceId}_${chain.stageIdx}`);
    const summary = resolveText(world, stage.summaryPath, ctx, `s_${instanceId}_${chain.stageIdx}`);
    const total = def.stages.length;
    pendingDecisions.push({
      id: decisionId,
      type: "chain_stage",
      description: `[Chapter ${chain.stageIdx + 1}/${total}] ${title} — ${summary}`,
      deadlineWeek: currentWeek + 1,
      required: false,
      options: stage.options.map((o) => ({
        id: o.id,
        label: resolveText(world, o.labelPath, ctx, `o_${instanceId}_${chain.stageIdx}_${o.id}`),
        impact: o.feeYen ? `Cost: ¥${o.feeYen.toLocaleString("en-US")}` : describeEffects(o),
      })),
    });
  }

  // ── Trigger roll ──────────────────────────────────────────────────────────
  if (Object.keys(activeChains).length < MAX_ACTIVE_CHAINS) {
    const roll = RNGRegistry.getSystemRNG(world, CHAIN_RNG, `roll_${currentWeek}`);
    if (roll.next() < CHAIN_ROLL_PROBABILITY) {
      const eligible = EVENT_CHAIN_REGISTRY.filter((d) => chainEligible(world, d));
      if (eligible.length > 0) {
        const totalWeight = eligible.reduce((s, d) => s + defWeight(d, world), 0);
        let pick =
          RNGRegistry.getSystemRNG(world, CHAIN_RNG, `pick_def_${currentWeek}`).next() * totalWeight;
        let chosen = eligible[eligible.length - 1];
        for (const d of eligible) {
          pick -= defWeight(d, world);
          if (pick <= 0) {
            chosen = d;
            break;
          }
        }
        const heya = getPlayerHeya(world);
        const rikishiId =
          chosen.trigger.needsRikishi && heya ? pickSubject(world, heya.id, chosen.id) : undefined;
        const instanceId = makeInstanceId(chosen.id, world);
        activeChains[instanceId] = {
          chainId: chosen.id,
          stageIdx: 0,
          heyaId: heya?.id,
          rikishiId,
          nextStageDueWeek: currentWeek,
        };
      }
    }
  }

  builder.updateWorldField("activeChains", activeChains);
  builder.updateWorldField("pendingDecisions", pendingDecisions);
  return builder.build();
}

function describeEffects(o: ChainOption): string {
  const e = o.effects;
  if (!e) return "Let events take their course.";
  const parts: string[] = [];
  if (e.funds) parts.push(`${e.funds > 0 ? "+" : "−"}¥${Math.abs(e.funds).toLocaleString("en-US")}`);
  if (e.reputation) parts.push(`${e.reputation > 0 ? "+" : ""}${e.reputation} reputation`);
  if (e.morale) parts.push(`${e.morale > 0 ? "+" : ""}${e.morale} morale`);
  if (e.welfareRisk) parts.push(`${e.welfareRisk > 0 ? "+" : ""}${e.welfareRisk} welfare risk`);
  if (e.scandalScore) parts.push(`${e.scandalScore > 0 ? "+" : ""}${e.scandalScore} scandal`);
  if (e.momentum) parts.push(`${e.momentum > 0 ? "+" : ""}${e.momentum} momentum`);
  if (e.rosterFatigue) parts.push(`${e.rosterFatigue > 0 ? "+" : ""}${e.rosterFatigue} fatigue`);
  if (e.heyaPressure) parts.push(`${e.heyaPressure > 0 ? "+" : ""}${e.heyaPressure} press heat`);
  if (e.politicalCapital)
    parts.push(`${e.politicalCapital > 0 ? "+" : ""}${e.politicalCapital} capital`);
  return parts.length ? parts.join("; ") : "Let events take their course.";
}

/** Apply an option's serializable effect descriptor to the builder. */
function applyEffects(
  world: WorldState,
  builder: ImpactBuilder,
  chain: ActiveChain,
  effects: ChainEffects
): void {
  const heyaId = chain.heyaId ?? world.playerHeyaId;
  const heya = heyaId ? getHeya(world, heyaId) : undefined;
  if (heya) {
    const update: Partial<typeof heya> = {};
    if (effects.funds !== undefined) update.funds = Math.round(heya.funds + effects.funds);
    if (effects.reputation !== undefined)
      update.reputation = clampStat((heya.reputation ?? 50) + effects.reputation);
    if (effects.scandalScore !== undefined)
      update.scandalScore = clampStat((heya.scandalScore ?? 0) + effects.scandalScore);
    if (effects.politicalCapital !== undefined)
      update.politicalCapital = clampStat((heya.politicalCapital ?? 50) + effects.politicalCapital);
    const ws = heya.welfareState;
    if (ws && (effects.welfareRisk !== undefined || effects.morale !== undefined)) {
      update.welfareState = {
        ...ws,
        welfareRisk: clampStat((ws.welfareRisk ?? 0) + (effects.welfareRisk ?? 0)),
        morale: clampStat((ws.morale ?? 50) + (effects.morale ?? 0)),
      };
    }
    if (Object.keys(update).length > 0) builder.updateHeya(heya.id, update);
  }
  if (effects.rosterFatigue && heyaId) {
    for (const rid of world.activeRikishiIds) {
      const r = world.rikishi.get(rid);
      if (!r || r.heyaId !== heyaId || r.isRetired) continue;
      builder.updateRikishi(rid, { fatigue: Math.max(0, (r.fatigue ?? 0) + effects.rosterFatigue) });
    }
  }
  if (effects.momentum && chain.rikishiId) {
    const r = world.rikishi.get(chain.rikishiId);
    if (r) {
      builder.updateRikishi(chain.rikishiId, {
        momentum: clampStat((r.momentum ?? 50) + effects.momentum),
      });
    }
  }
  if (effects.heyaPressure && heyaId && world.mediaState) {
    const ms = world.mediaState;
    builder.updateWorldField("mediaState", {
      ...ms,
      heyaPressure: {
        ...ms.heyaPressure,
        [heyaId]: clampStat((ms.heyaPressure?.[heyaId] ?? 0) + effects.heyaPressure),
      },
    });
  }
}

// The builder stages worldFields on the impact, not on world — when several
// chain resolutions compose inside one builder (expired-queue sweep, an
// autonomous week with multiple due stages) we need the staged maps, not
// world.activeChains. Keyed by builder, per-resolution.
const stagedChains = new WeakMap<ImpactBuilder, Record<string, ActiveChain>>();
const stagedCooldowns = new WeakMap<ImpactBuilder, Record<string, number>>();

function currentActive(world: WorldState, builder: ImpactBuilder): Record<string, ActiveChain> {
  return stagedChains.get(builder) ?? { ...(world.activeChains ?? {}) };
}
function currentCooldowns(world: WorldState, builder: ImpactBuilder): Record<string, number> {
  return stagedCooldowns.get(builder) ?? { ...(world.chainCooldowns ?? {}) };
}

/**
 * Resolve a `chain_stage` pendingDecision.
 * `optionId` may be a registry option id or the sentinel `"first"` (queue
 * default / autonomous default → stage.options[0]).
 */
export function resolveChainStage(
  world: WorldState,
  builder: ImpactBuilder,
  decisionId: string,
  optionId: string
): void {
  const instanceId = instanceIdFromDecisionId(decisionId);
  if (!instanceId) return;
  const chain = currentActive(world, builder)[instanceId];
  if (!chain) return;
  const def = getChainDef(chain.chainId);
  const stage = def?.stages[chain.stageIdx];
  if (!def || !stage) return;

  const option =
    stage.options.find((o) => o.id === optionId) ??
    (optionId === "first" || optionId === "__default__" ? stage.options[0] : undefined) ??
    stage.options[0];
  if (!option) return;

  // Fee gating — unaffordable paid options fall back to a free option.
  const heya = chain.heyaId ? getHeya(world, chain.heyaId) : getPlayerHeya(world);
  let effective = option;
  if (option.feeYen && heya && (heya.funds ?? 0) < option.feeYen) {
    effective = stage.options.find((o) => !o.feeYen) ?? option;
  }

  const ctx = chainContext(world, chain);
  const title = resolveText(world, stage.titlePath, ctx, `rt_${instanceId}_${chain.stageIdx}`);

  // Outcome event — causalEventId links back to the resolved decision (W19).
  builder.logEvent(
    "CHAIN_STAGE_RESOLVED",
    "narrative",
    {
      title,
      summary: `${title} — resolved: ${effective.id}.`,
      chainId: chain.chainId,
      stageId: stage.id,
      optionId: effective.id,
      ...ctx,
    },
    {
      heyaId: chain.heyaId,
      rikishiId: chain.rikishiId,
      importance: "notable",
      causalEventId: decisionId,
    }
  );

  if (effective.feeYen) applyEffects(world, builder, chain, { funds: -effective.feeYen });
  if (effective.effects) applyEffects(world, builder, chain, effective.effects);

  // Advance or complete the chain.
  const next = effective.nextStage;
  const active = Object.fromEntries(
    Object.entries(currentActive(world, builder)).filter(([k]) => k !== instanceId)
  ) as Record<string, ActiveChain>;
  if (next) {
    const nextIdx = def.stages.findIndex((s) => s.id === next.stageId);
    if (nextIdx >= 0) {
      active[instanceId] = {
        ...chain,
        stageIdx: nextIdx,
        nextStageDueWeek: (world.week ?? 0) + Math.max(1, next.delayWeeks),
      };
    }
  } else {
    const cooldowns = { ...currentCooldowns(world, builder), [chain.chainId]: world.week ?? 0 };
    stagedCooldowns.set(builder, cooldowns);
    builder.updateWorldField("chainCooldowns", cooldowns);
  }
  stagedChains.set(builder, active);
  builder.updateWorldField("activeChains", active);
}
