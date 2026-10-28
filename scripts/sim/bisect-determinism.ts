/**
 * bisect-determinism.ts
 * =====================
 * Replicates runAutoSim's inner loop (basho sim → publish → off-season
 * advance) with a checkpoint after every atomic step, for two sequential
 * in-process runs. Compares a per-top-level-field fingerprint at each
 * checkpoint — INCLUDING non-persisted fields serializeWorld drops —
 * then deep-diffs every divergent field at the first divergent step.
 *
 * Run: bun scripts/sim/bisect-determinism.ts
 */

import { generateInitialWorld } from "@/engine/generation/WorldFactory";
import { simulateEntireBasho } from "@/engine/simulation/TournamentSimulator";
import { advanceOneDay, enterPostBasho, enterInterim } from "@/engine/tick/tickDaily";
import { publishBanzukeUpdate } from "@/engine/banzuke/BanzukePublisher";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { getBashoNumber } from "@/engine/calendar/calendar";
import { nextBashoRecordId } from "@/engine/simulation/AutoSimService";
import { SIMULATION_CONFIG } from "@/engine/core/SimulationConfig";
import type { WorldState } from "@/engine/types/world";
import type { BashoName } from "@/engine/types/basho";

const { BardEngine } = await import("@/engine/bard/BardEngine");
await BardEngine.loadDomains();

const SEED = "determinism-double-run-basho";
const BASHO_COUNT = 2;

interface Checkpoint {
  label: string;
  world: WorldState;
  fp: Map<string, string>;
}

function stable(v: unknown): string {
  return JSON.stringify(v, (_k, val) => {
    if (val instanceof Map)
      return [...val.entries()].sort(([a], [b]) => (String(a) < String(b) ? -1 : 1));
    if (val instanceof Set) return [...val].sort();
    if (typeof val === "function") return "__fn";
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const o: Record<string, unknown> = {};
      for (const k of Object.keys(val).sort()) o[k] = (val as Record<string, unknown>)[k];
      return o;
    }
    return val;
  });
}

function fingerprint(world: WorldState): Map<string, string> {
  const m = new Map<string, string>();
  for (const k of Object.keys(world).sort()) {
    m.set(k, stable((world as unknown as Record<string, unknown>)[k]));
  }
  return m;
}

/** Replica of AutoSimService.publishBanzukeForSim (module-private). */
function publishBanzukeForSim(
  currentWorld: WorldState,
  bashoResult: ReturnType<typeof simulateEntireBasho>,
  bashoName: BashoName
): WorldState {
  const standingsForPublish = new Map<string, { wins: number; losses: number; absences: number }>();
  bashoResult.standings.forEach((stats, id) => {
    standingsForPublish.set(id, {
      wins: stats.wins,
      losses: stats.losses,
      absences: stats.absences ?? 0,
    });
  });
  const worldWithStandings: WorldState = {
    ...currentWorld,
    cyclePhase: "post_basho",
    _postBashoDays: 7,
    currentBasho: currentWorld.currentBasho
      ? { ...currentWorld.currentBasho, standings: standingsForPublish }
      : {
          bashoName,
          year: currentWorld.year,
          bashoNumber: getBashoNumber(bashoName) as 1 | 2 | 3 | 4 | 5 | 6,
          day: 15,
          matches: [],
          standings: standingsForPublish,
          isActive: false,
        },
    history: [
      ...(currentWorld.history || []),
      {
        id: nextBashoRecordId(currentWorld.history ?? [], bashoName, currentWorld.year),
        bashoName,
        year: currentWorld.year,
        bashoNumber: getBashoNumber(bashoName),
        yusho: bashoResult.yushoWinner.id,
        junYusho: bashoResult.junYusho ?? [],
        ginoSho: bashoResult.ginoSho,
        shukunsho: bashoResult.shukunsho,
        kantosho: bashoResult.kantosho,
        prizes: {
          yushoAmount: SIMULATION_CONFIG.prizes.yusho,
          junYushoAmount: SIMULATION_CONFIG.prizes.junYusho,
          specialPrizes: SIMULATION_CONFIG.prizes.specialPrize,
        },
      },
    ],
  };
  const banzukeImpact = publishBanzukeUpdate(worldWithStandings);
  return resolveImpacts(worldWithStandings, [banzukeImpact]);
}

function runOnce(out: Checkpoint[]): WorldState {
  const push = (label: string, world: WorldState) =>
    out.push({ label, world, fp: fingerprint(world) });

  let world = generateInitialWorld(SEED);
  world = { ...world, playerHeyaId: undefined };
  world = { ...world, _autonomousSim: true, _autonomousPolicy: "balanced" };
  push("worldgen", world);

  for (let b = 0; b < BASHO_COUNT; b++) {
    const bashoName = (world.currentBashoName || "hatsu") as BashoName;
    const bashoSeed = `${world.seed}-basho-${world.year}-${bashoName}`;
    const br = simulateEntireBasho(world, bashoName, bashoSeed, {});
    world = br.finalWorld;
    push(`b${b}-post-sim`, world);

    world = publishBanzukeForSim(world, br, bashoName);
    push(`b${b}-post-publish`, world);

    world = enterPostBasho(world);
    for (let i = 0; i < 7; i++) {
      world = advanceOneDay(world);
      push(`b${b}-postbasho-d${i + 1}`, world);
    }
    world = enterInterim(world);
    for (let i = 0; i < 42; i++) {
      world = advanceOneDay(world);
      push(`b${b}-interim-d${i + 1}`, world);
    }
    if (bashoName === "kyushu") {
      const startYear = world.year;
      for (let i = 0; i < 45 && world.year <= startYear; i++) {
        if (world.cyclePhase === "pre_basho" && (world._interimDaysRemaining ?? 0) <= 0) {
          world = { ...world, _interimDaysRemaining: 1 };
        }
        world = advanceOneDay(world);
        push(`b${b}-kyushu-tail-d${i + 1}`, world);
      }
    }
  }
  return world;
}

function diffValue(a: unknown, b: unknown, path: string, out: string[], depth = 0): void {
  if (out.length > 500_000 || depth > 14) return;
  if (a === b) return;
  const aMap = a instanceof Map;
  const bMap = b instanceof Map;
  if (aMap || bMap) {
    if (!(aMap && bMap)) {
      out.push(`${path}: Map vs non-Map`);
      return;
    }
    const keys = new Set([...a.keys(), ...b.keys()]);
    const sorted = [...keys].sort();
    for (const k of sorted) {
      diffValue(a.get(k), b.get(k), `${path}<${String(k)}>`, out, depth + 1);
    }
    return;
  }
  if (typeof a !== typeof b) {
    out.push(`${path}: type ${typeof a} vs ${typeof b}`);
    return;
  }
  if (a && b && typeof a === "object") {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) out.push(`${path}.length: ${a.length} vs ${b.length}`);
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        diffValue(a[i], b[i], `${path}[${i}]`, out, depth + 1);
      }
      return;
    }
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of [...keys].sort()) {
      diffValue(
        (a as Record<string, unknown>)[k],
        (b as Record<string, unknown>)[k],
        path ? `${path}.${k}` : k,
        out,
        depth + 1
      );
    }
    return;
  }
  out.push(`${path}: ${JSON.stringify(a)} -> ${JSON.stringify(b)}`);
}

// --- main ---
console.log("run 1...");
const run1: Checkpoint[] = [];
const t1 = Date.now();
runOnce(run1);
console.log(`  ${run1.length} checkpoints in ${((Date.now() - t1) / 1000).toFixed(1)}s`);

console.log("run 2...");
const run2: Checkpoint[] = [];
const t2 = Date.now();
runOnce(run2);
console.log(`  ${run2.length} checkpoints in ${((Date.now() - t2) / 1000).toFixed(1)}s`);

if (run1.length !== run2.length) {
  console.error(`CHECKPOINT COUNT MISMATCH: ${run1.length} vs ${run2.length}`);
}

let diverged = false;
const n = Math.min(run1.length, run2.length);
for (let i = 0; i < n; i++) {
  const c1 = run1[i];
  const c2 = run2[i];
  if (c1.label !== c2.label) {
    console.error(`label mismatch at ${i}: ${c1.label} vs ${c2.label}`);
    break;
  }
  const f1 = c1.fp;
  const f2 = c2.fp;
  const diffFields = [...f1.keys()].filter((k) => f1.get(k) !== f2.get(k));
  if (diffFields.length > 0) {
    diverged = true;
    console.log(`\nFIRST DIVERGENCE at checkpoint ${c1.label} (#${i})`);
    console.log(`divergent top-level fields: ${diffFields.join(", ")}`);
    for (const field of diffFields) {
      const out: string[] = [];
      diffValue(
        (c1.world as unknown as Record<string, unknown>)[field],
        (c2.world as unknown as Record<string, unknown>)[field],
        field,
        out
      );
      // Bucket leaf diffs by generalized path (strip ids/indices).
      const buckets = new Map<string, number>();
      const generalize = (p: string) =>
        p
          .replace(/<[^>]*>/g, "<ID>")
          .replace(/\[\d+\]/g, "[N]")
          .replace(/\.\d+/g, ".N");
      for (const l of out) {
        const key = generalize(l.split(":")[0]);
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }
      console.log(`\n--- ${field}: ${out.length} leaf diffs ---`);
      for (const [k, n] of [...buckets.entries()].sort()) {
        console.log(`  ${n}× ${k}`);
      }
      console.log(`  samples:`);
      for (const l of out.slice(0, 15)) console.log(`    ${l}`);
      if (field === "events") {
        const l1 = (c1.world.events?.log ?? []).length;
        const l2 = (c2.world.events?.log ?? []).length;
        console.log(`  events.log lengths: ${l1} vs ${l2}`);
        for (let ei = 0; ei < Math.max(l1, l2); ei++) {
          const e1 = JSON.stringify(c1.world.events?.log?.[ei]);
          const e2 = JSON.stringify(c2.world.events?.log?.[ei]);
          if (e1 !== e2) {
            console.log(`  event[${ei}] run1: ${e1?.slice(0, 2000)}`);
            console.log(`  event[${ei}] run2: ${e2?.slice(0, 2000)}`);
            break;
          }
        }
      }
      if (field === "npcBidPolicies") {
        for (const [hid, p] of Object.entries(c2.world.npcBidPolicies ?? {})) {
          const p1 = (c1.world.npcBidPolicies ?? {})[hid as never];
          if (JSON.stringify(p1) !== JSON.stringify(p)) {
            const oy1 = c1.world.heyas.get(hid)?.oyakataId;
            const o1 = oy1 ? c1.world.oyakata.get(oy1) : undefined;
            const oy2 = c2.world.heyas.get(hid)?.oyakataId;
            const o2 = oy2 ? c2.world.oyakata.get(oy2) : undefined;
            console.log(
              `  ${hid}: ${JSON.stringify(p1)} -> ${JSON.stringify(p)} | plan1=${o1?.memory?.activePlan?.planId} plan2=${o2?.memory?.activePlan?.planId}`
            );
            break;
          }
        }
      }
    }
    break;
  }
}
if (!diverged) console.log("\nNo divergence found across", n, "checkpoints.");
