# Combat System B+ Code Review

> **Date:** 2026-04-15  
> **Scope:** All new files created for Phase 0–4 of the B+ implementation  
> **Incorporates:** Windsurf review gaps (henka resolution, EngineSnapshot compat, tick guard, spatial conditions, etc.)  
> **Status:** 🔴 BLOCKED — critical bugs must be fixed before Phase 5 or flag flip

---

## Executive Summary

The type architecture (Phase 1) and utility layer (Phase 2) are structurally sound. Phase 3 (grip) is mostly correct but has one critical force-passing bug. Phase 4 (physics engine) has **7 critical bugs** that would cause the engine to produce incorrect, non-deterministic, or always-identical results. None of these prevent the test suite from passing (most tests mock physics directly), which is why they slipped through.

The feature flag in `boutResolver.ts` is currently a **no-op** — both branches call the same function. The old kimarite evaluator is still overriding B+ output on every bout.

---

## 🔴 Critical Bugs (must fix before enabling flag)

### CR-01 — Tachiai winner is deterministic: RNG ignored, wrong stat read

**File:** `boutPhysics.ts` lines 46–49

```typescript
// CURRENT (broken):
const eastPower = (east as Rikishi & { power?: number }).power || 50;
const westPower = (west as Rikishi & { power?: number }).power || 50;
const winner = eastPower >= westPower ? "east" : "west";
```

**Problems:**
1. `power` is not a field on `Rikishi`. The cast always falls through to the `|| 50` fallback, making both values 50. East **always** wins tachiai.
2. No jitter/RNG is used in the tachiai decision — same rikishi pair always produces identical tachiai outcome regardless of seed.

**Fix:**
```typescript
// Read strength from stats, apply jitter — same pattern as old boutPhysics.ts
const stat = (r: Rikishi, key: string, fallback = 50): number => {
  const v = (r.stats as Record<string, unknown>)?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
};

const eastPower = stat(east, 'strength') + stat(east, 'weight') * 0.3 + (rng.next() - 0.5) * 10;
const westPower = stat(west, 'strength') + stat(west, 'weight') * 0.3 + (rng.next() - 0.5) * 10;
const tachiaiWinner: Side = eastPower >= westPower ? 'east' : 'west';
```

---

### CR-02 — Henka resolution is completely absent

**File:** `boutPhysics.ts` — `resolveTachiaiV2` (no henka check)  
**Referenced by:** Windsurf review gap #13, spec doc section "Henka handling"

`BoutContext` carries `playerTactic` and `cpuTacticOverride` but `resolveTachiaiV2` ignores them entirely. Henka (`HENKA` tactic) must be checked at tick 0 — if the trickster fires trick vs. opponent's push, and the technique check passes, the bout resolves immediately with `hatakikomi` before the phase loop even starts.

**Fix — add to `resolveTachiaiV2` after computing `tachiaiWinner`:**
```typescript
// Henka check: only valid at tachiai (tick 0)
const henkaSide: Side | null =
  bout.playerTactic === 'HENKA' ? (bout.playerSide ?? null) :
  bout.cpuTacticOverride === 'HENKA' ? (bout.playerSide === 'east' ? 'west' : 'east') : null;

if (henkaSide) {
  const henkster  = henkaSide === 'east' ? east : west;
  const opponent  = henkaSide === 'east' ? west : east;
  const henkaCheck = stat(henkster, 'technique') + stat(opponent, 'speed') * 1.5 + (rng.next() - 0.5) * 8;
  const defenseCheck = stat(opponent, 'balance') + (rng.next() - 0.5) * 8;

  if (henkaCheck > defenseCheck) {
    // Henka succeeds — early resolution, skip phase loop
    st.phase = {
      tag: 'resolved',
      winner: henkaSide,
      exitVector: { x: henkaSide === 'east' ? 1 : -1, z: 0 },
      technique: 'hatakikomi',
    };
    return; // caller must check for resolved phase before running loop
  }
  // Henka failed — opponent's momentum carries into normal engagement
}
```

`runPhaseLoop` must also check for early resolution:
```typescript
function runPhaseLoop(...): { winner: Side; kimarite: KimariteId } {
  // Check if tachiai already resolved (henka)
  if (st.phase.tag === 'resolved') {
    return { winner: st.phase.winner, kimarite: st.phase.technique };
  }
  for (let i = 0; i < MAX_TICKS; i++) { ... }
}
```

---

### CR-03 — `tickPushBattle` never updates `PhysicalBody.leadingFootX`

**File:** `boutPhysics.ts` lines 94–95  
**Impact:** `kimariteClassifier.ts` reads `st.east.leadingFootX` for all spatial decisions — it always reads the initial shikirisen position (0.7m), never the current fight position

```typescript
// CURRENT: updates PushBattleState but NOT PhysicalBody
push.eastLeadFoot += push.eastMomentum * 0.01;
push.westLeadFoot += push.westMomentum * 0.01;
// st.east.leadingFootX is NEVER updated ← bug
```

**Fix — sync back to PhysicalBody every tick:**
```typescript
push.eastLeadFoot += push.eastMomentum * 0.01;
push.westLeadFoot += push.westMomentum * 0.01;

// Keep PhysicalBody in sync so kimariteClassifier reads current position
st.east.leadingFootX = push.eastLeadFoot;
st.west.leadingFootX = push.westLeadFoot;
st.east.x = push.eastLeadFoot;  // x is the canonical position
st.west.x = push.westLeadFoot;
```

---

### CR-04 — Push boundary check uses wrong constant (4.0 vs 4.55)

**File:** `boutPhysics.ts` line 97

```typescript
// CURRENT (wrong):
if (Math.abs(push.eastLeadFoot) > 4.0 || Math.abs(push.westLeadFoot) > 4.0)

// FIX — use the imported constant:
import { TAWARA_RADIUS } from '../types/combat-spatial';
if (push.eastLeadFoot > TAWARA_RADIUS || push.westLeadFoot < -TAWARA_RADIUS)
```

Note the directional signs: east starts at +0.7 and is pushed toward +4.55 (ring edge behind them). West starts at -0.7 and is pushed toward -4.55. Using `Math.abs` on both works but conflates the two edges — use signed comparisons.

---

### CR-05 — Belt battle edge crisis: wrong side assigned, torque is always 0

**File:** `boutPhysics.ts` lines 121–143  
**File:** `boutGrip.ts` line 166–167 (root cause)

**Part A — wrong crisis side:**
```typescript
// CURRENT (inverted):
side: torqueAdvantage > 0 ? "east" : "west",
// If east has MORE torque (positive advantage), WEST is being overwhelmed → west is in crisis
// FIX:
side: torqueAdvantage > 0 ? "west" : "east",
```

**Part B — torque is always 0 (root cause):**
```typescript
// In boutGrip.ts evolveGripGeometry (line 166):
belt.torqueEast = computeNetTorque(belt.eastLeft, belt.eastRight, 0);
belt.torqueWest = computeNetTorque(belt.westLeft, belt.westRight, 0);
//                                                                 ^ force = 0!

// calculateTorque = leverArm × force × gripStrength
// With force = 0, ALL torques are ALWAYS 0.
// torqueAdvantage is always 0, so the > 30 threshold is never reached.
// Belt battle NEVER transitions to edge crisis.
```

**Fix — pass rikishi strength as force:**
```typescript
// In evolveGripGeometry, after computing stat values:
const eastForce = stat(east, 'strength');
const westForce = stat(west, 'strength');
belt.torqueEast = computeNetTorque(belt.eastLeft, belt.eastRight, eastForce);
belt.torqueWest = computeNetTorque(belt.westLeft, belt.westRight, westForce);
```

And in `tickBeltBattle`, the force should come from the push state, not be re-derived:
```typescript
// tickBeltBattle already has access to push.eastForce / push.westForce:
const eastTorque = computeNetTorque(belt.eastLeft, belt.eastRight, push.eastForce);
const westTorque = computeNetTorque(belt.westLeft, belt.westRight, push.westForce);
```

---

### CR-06 — `buildEngineSnapshotV2` produces unclamped balance and stale grapple state

**File:** `boutPhysics.ts` lines 232–244  
**Referenced by:** Windsurf review gap — EngineSnapshot compatibility

**Problem A — no clamping:**
```typescript
balanceEast: 100 - Math.abs(st.east.cogOffset) * 10,
// If cogOffset = 12 → balanceEast = -20. Old kimariteEvaluator can't handle negative.
```

**Problem B — grapple state never updated during fight:**
`EngineStateV2.grappleState` is initialized to neutral outside grips and never touched by any phase function. After a belt battle, the grapple state still reads `{ gripAdvantage: "neutral" }`. `determineKimarite` in `kimariteEvaluator.ts` uses `engineSnapshot.grappleState` to derive the grip class for all technique selection — the entire old evaluator effectively sees every belt bout as a neutral-grip bout.

**Fix:**
```typescript
function buildEngineSnapshotV2(st: EngineStateV2): EngineSnapshot {
  // Derive grapple state from current belt battle if active
  const beltPhase = st.phase.tag === 'belt_battle' ? st.phase : null;
  const grappleState: GrappleState = beltPhase
    ? deriveGrappleStateFromBelt(beltPhase.state)
    : st.grappleState;

  return {
    stance: st.phase.tag === 'belt_battle' ? 'belt-dominant' : 'push-dominant',
    grappleState,
    balanceEast: Math.max(0, Math.min(100, 100 - Math.abs(st.east.cogOffset) * 10)),
    balanceWest: Math.max(0, Math.min(100, 100 - Math.abs(st.west.cogOffset) * 10)),
    position:    'front',
    advantage:   'none',
    winnerConsecutiveAdvantage: 0,
    loserLastActionFamily:      undefined,
    finalLoserBalanceDrain:     0,
  };
}

function deriveGrappleStateFromBelt(belt: BeltBattleState): GrappleState {
  // Map B+ grip class back to the legacy GrappleState format
  const toHandPos = (isInside: boolean, isBlocked: boolean): HandPosition =>
    isBlocked ? 'blocked' : isInside ? 'inside' : 'outside';

  return {
    east: {
      rightHand: toHandPos(belt.eastRight?.isInside ?? false, belt.eastRight?.isBlocked ?? false),
      leftHand:  toHandPos(belt.eastLeft?.isInside  ?? false, belt.eastLeft?.isBlocked  ?? false),
      depth:     belt.eastDepth === 'maemitsu' ? 'maemitsu' : belt.eastDepth === 'deep' ? 'deep' : 'standard',
    },
    west: {
      rightHand: toHandPos(belt.westRight?.isInside ?? false, belt.westRight?.isBlocked ?? false),
      leftHand:  toHandPos(belt.westLeft?.isInside  ?? false, belt.westLeft?.isBlocked  ?? false),
      depth:     belt.westDepth === 'maemitsu' ? 'maemitsu' : belt.westDepth === 'deep' ? 'deep' : 'standard',
    },
    gripAdvantage:
      belt.eastGripClass === 'morozashi' ? 'moro_zashi_east' :
      belt.westGripClass === 'morozashi' ? 'moro_zashi_west' :
      belt.eastGripClass === 'uwate'     ? 'east_strong' :
      belt.westGripClass === 'uwate'     ? 'west_strong' : 'neutral',
  };
}
```

---

### CR-07 — Feature flag in `boutResolver.ts` is a no-op

**File:** `boutResolver.ts` lines 117–119

```typescript
// CURRENT — both branches call the SAME function:
const { result, engineSnapshot } = ENABLE_COMBAT_BPLUS
  ? resolveBoutPhysics(ctxFinal, eastBout as Rikishi, westBout as Rikishi, basho)
  : resolveBoutPhysics(ctxFinal, eastBout as Rikishi, westBout as Rikishi, basho);
```

The old `boutPhysics.ts` was replaced by the B+ version during implementation but the fallback import was not restored. There's currently no V1 to fall back to. Options:

**Option A (recommended for now)** — Remove the flag, just call B+ directly since it's the only engine:
```typescript
const { result, engineSnapshot } = resolveBoutPhysics(ctxFinal, eastBout as Rikishi, westBout as Rikishi, basho);
```

**Option B** — Keep the flag, import old engine from a preserved copy (requires git restore of old boutPhysics):
```typescript
import { resolveBoutPhysics as resolveBoutPhysicsV1 } from './boutPhysicsV1';
import { resolveBoutPhysics as resolveBoutPhysicsV2 } from './boutPhysics';

const { result, engineSnapshot } = ENABLE_COMBAT_BPLUS
  ? resolveBoutPhysicsV2(...)
  : resolveBoutPhysicsV1(...);
```

---

## 🟡 Significant Issues (fix before Phase 7 flip)

### CI-01 — `classifyEdgeExitKimarite` uses `crisis.escaped` incorrectly

**File:** `boutSpatial.ts` lines 120–129

```typescript
export function classifyEdgeExitKimarite(crisis, _st, _rng): KimariteId {
  if (crisis.escaped) return "koshikudake"; // ← unreachable!
  ...
}
```

This function is only called when `tickEdgeCrisis` determines the fighter DID NOT escape (`rng.next() >= recoveryProbability`). At that point `crisis.escaped` is always `false`. The `koshikudake` branch is unreachable dead code.

Additionally, `koshikudake` means the winner's own hip collapses (self-inflicted loss) — it should be used as the *loser's* classification, not as what happens to the person successfully walking out. 

**Fix — classify by exit geometry instead:**
```typescript
export function classifyEdgeExitKimarite(crisis: EdgeCrisisState, st: EngineStateV2, rng: SeededRNG): KimariteId {
  // Was the loser being belt-walked-out?
  const phase = st.phase;
  if (phase.tag === 'edge_crisis' && phase.prev === 'belt_battle') {
    // Belt grip edge exit → yorikiri (most common)
    return crisis.ticksInCrisis > 5 ? 'yoritaoshi' : 'yorikiri';
  }
  // Pure push edge exit
  if (crisis.ticksInCrisis <= 2) return 'oshidashi';  // clean push-out
  const roll = rng.next();
  if (roll < 0.15) return 'tsukidashi';  // thrust push-out
  return 'oshidashi';
}
```

---

### CI-02 — `deriveGripClass` misidentifies morozashi as uwate

**File:** `boutSpatial.ts` lines 91–97

```typescript
export function deriveGripClass(left, right): GripClass {
  const insideCount = (left?.isInside ? 1 : 0) + (right?.isInside ? 1 : 0);
  if (insideCount === 2) return "uwate"; // ← should be "morozashi"!
  if (insideCount === 1) return "shitate";
  ...
}
```

When **both arms are inside**, that's `morozashi` — the most dominant grip. `uwate` is specifically the outside arm over the opponent's arm (one hand). The spec explicitly defines morozashi as `armReach > 0.15` on both hands. The kimarite classifier checks `grip === 'uwate'` to identify throws — this misclassification prevents morozashi from getting its correct power bonus.

**Fix:**
```typescript
export function deriveGripClass(left: HandGrip | null, right: HandGrip | null): GripClass {
  const insideCount = (left?.isInside ? 1 : 0) + (right?.isInside ? 1 : 0);
  if (insideCount === 2) return "morozashi"; // both arms inside
  if (insideCount === 1) {
    // uwate = dominant inside arm (deep reach), shitate = weaker inside
    const insideGrip = left?.isInside ? left : right;
    return (insideGrip?.armReach ?? 0) > 0.12 ? "uwate" : "shitate";
  }
  if (left || right) return "outside";
  return "none";
}
```

And `GripClass` type in `combat-spatial.ts` needs `"morozashi"` added:
```typescript
export type GripClass = "morozashi" | "uwate" | "shitate" | "outside" | "none";
```

---

### CI-03 — `kimariteClassifier.ts` is never called from `boutPhysics.ts`

**File:** `boutPhysics.ts` — `tickPushBattle`, `tickBeltBattle`

`evaluateKimariteAttempt` from `kimariteClassifier.ts` is imported nowhere and called nowhere. The mid-fight kimarite classification that is the entire architectural point of B+ is not wired in. Currently:
- Push battles terminate when `leadFoot > 4.0` (wrong boundary) → classify via `classifyFallKimarite`
- Belt battles terminate when body falls → classify via `classifyBeltFallKimarite`
- Neither path goes through the spatial classifier

**Fix — call the classifier in each tick function:**
```typescript
import { evaluateKimariteAttempt } from './kimariteClassifier';

function tickPushBattle(rng, east, west, st): ... {
  // ... existing momentum/position updates ...

  // Mid-fight kimarite attempt (the B+ emergent classification)
  const attempt = evaluateKimariteAttempt(east, west, null, null, push, null, st);
  if (attempt) {
    const success = rng.bool(attempt.successProbability);
    if (success) {
      return { winner: attempt.side, kimarite: attempt.technique };
    }
  }

  // Fallback: boundary check
  if (push.eastLeadFoot > TAWARA_RADIUS) return { winner: 'west', kimarite: classifyFallKimarite(push, st, 'east') };
  if (push.westLeadFoot < -TAWARA_RADIUS) return { winner: 'east', kimarite: classifyFallKimarite(push, st, 'west') };
}
```

Note: `rng.bool(p)` — verify `SeededRNG` has a `.bool(p)` method; if not, use `rng.next() < p`.

---

### CI-04 — `edge_crisis` escape has no phase restoration

**File:** `boutPhysics.ts` `runPhaseLoop` lines 193–196

When `tickEdgeCrisis` returns `{ escaped: true }`, the loop simply continues to the next tick. But the phase is still `edge_crisis`. On the next tick `tickEdgeCrisis` is called again, and the fighter can be pushed out again immediately — there's no recovery. The phase must be restored to the previous state.

**Fix:**
```typescript
const crisisResult = tickEdgeCrisis(rng, east, west, st);
if (crisisResult?.escaped) {
  // Restore to previous phase with reduced momentum (tawara bounce absorbed)
  const prev = (st.phase as Extract<CombatPhase, { tag: 'edge_crisis' }>).prev;
  if (prev === 'push_battle') {
    st.phase = {
      tag: 'push_battle',
      state: {
        ...existingPushState,
        eastMomentum: existingPushState.eastMomentum * 0.4,  // momentum absorbed by tawara
        westMomentum: existingPushState.westMomentum * 0.4,
      }
    };
  }
  // (similar for belt_battle)
  continue; // don't check winner this tick
}
if (crisisResult?.winner && crisisResult?.kimarite)
  return { winner: crisisResult.winner, kimarite: crisisResult.kimarite };
```

To do this, the push/belt state must be preserved before entering edge crisis. Store it on `EngineStateV2` or pass via closure.

---

### CI-05 — Henka logic in `boutResolver.ts` has shadowed variable and logic error

**File:** `boutResolver.ts` lines 181–198

```typescript
// Line 182:
const tacticUsed = bout.playerTactic ?? (bout as BoutContext & { cpuTacticOverride?: string }).cpuTacticOverride;

// Line 185: cpuTacticOverride is REDECLARED, shadowing the outer variable from line 96
const cpuTacticOverride = (bout as BoutContext & { cpuTacticOverride?: string }).cpuTacticOverride;
```

The outer `cpuTacticOverride` (line 96) has already been resolved through `decideBoutTacticOverride`. The inner redeclaration on line 185 reads directly from `bout.cpuTacticOverride` (the raw input), bypassing the NPC strategy decision entirely.

Additionally, the `winnerUsedHenka` condition:
```typescript
const winnerUsedHenka =
  (result.winner === "east" && (bout.playerSide === "east" || (cpuTacticOverride !== undefined && result.winner !== bout.playerSide))) ||
  (result.winner === "west" && (bout.playerSide === "west" || (cpuTacticOverride !== undefined && result.winner !== bout.playerSide)));
```

The `result.winner !== bout.playerSide` check means: "the winner is NOT the player". Combined with `result.winner === "east"`, this means east won AND east is not the player — so the CPU won as east. But `tacticUsed` would be the player's tactic in that case. This is backwards.

**Fix — simplify to clear intent:**
```typescript
// Determine which side used HENKA
const playerHenka = bout.playerTactic === 'HENKA' && result.winner === bout.playerSide;
const cpuHenka    = cpuTacticOverride === 'HENKA' && (
  (bout.playerSide === 'east' && result.winner === 'west') ||
  (bout.playerSide === 'west' && result.winner === 'east') ||
  (!bout.playerSide) // no player in this bout
);

if (playerHenka || cpuHenka) {
  builder.updateRikishi(winner.id, {
    momentum: clamp((winner.momentum ?? 50) - 15, 0, 100),
  });
}
```

---

### CI-06 — Old `determineKimarite` overrides B+ emergent kimarite on every bout

**File:** `boutResolver.ts` lines 121–130

```typescript
// This runs on EVERY bout after physics:
const overrideId = determineKimarite(result, winner, loser, engineSnapshot);
if (overrideId !== result.kimarite) {
  result.kimarite = overrideId;
}
```

The entire point of B+ is that kimarite emerges from the physics. Running the old evaluator on top negates this — the old balance-based conditions override the spatial classifier's output. 

**This should be REMOVED or gated behind a separate flag** once B+ is producing correct kimarite. During the transition, it's acceptable to keep it as a fallback, but the intent is clear: once the spatial classifier is fully wired (CI-03), the old override should be disabled.

```typescript
// Short term: gate it
const overrideId = ENABLE_LEGACY_KIMARITE_OVERRIDE
  ? determineKimarite(result, winner, loser, engineSnapshot)
  : result.kimarite;
```

---

## 🟢 Minor Issues (fix before Phase 8 verification)

### MI-01 — `initBeltBattle` grip preference "none" gives no advantage to tachiai winner

When `combatProfile.preferredGrip === "none"` (or when `combatProfile` is absent), neither the `migi` nor `hidari` branch fires. The tachiai winner gets no inside-arm advantage. Both fighters start with `isInside: false` and identical stats.

**Fix:** Add a fallback that gives the tachiai winner one random inside grip:
```typescript
if (tachiaiWinner === 'east' && preferredGripEast === 'none') {
  // Random inside arm — no preference, just tachiai momentum
  const preferRandom = rng.next() < 0.5 ? 'migi' : 'hidari';
  const hand = preferRandom === 'migi' ? eastRight : eastLeft;
  hand.armReach = 0.10; hand.isInside = true; hand.leverArm = 0.27;
}
```

---

### MI-02 — `computePushForce` multiplies by `stanceWidth` (units problem)

**File:** `boutSpatial.ts` lines 70–75

```typescript
force *= stanceWidth; // stanceWidth is 0.35–0.50m
```

This scales down all push forces by ~40-50%. The force values going into `PushBattleState.eastForce/westForce` are then used as momentum, which drives `contestLine` and `leadingFoot`. With the extra ×0.4 factor, foot movement per tick is ~0.0028m instead of ~0.007m, meaning bouts always hit the 120 tick timeout rather than resolving spatially.

**Fix:** Remove the stanceWidth multiplication from force; use it only for stability (resistance to CoG shift):
```typescript
let force = strength * (w.strength || 0) + weight * (w.weight || 0);
force *= 1 - fatigue * 0.004;
// stanceWidth affects stability, not raw force output
return Math.max(0, force);
```

---

### MI-03 — `buildBoutResultV2` hardcodes `stance` and `tachiaiWinner`

**File:** `boutPhysics.ts` lines 222–229

```typescript
stance: "belt-dominant",  // always, regardless of actual phase
tachiaiWinner: winner,    // always the bout winner, not tracked separately
```

The `EngineStateV2` should track `tachiaiWinner` as a separate field (the old `EngineState` did). The stance should reflect which phase resolved the bout.

**Fix — add tachiaiWinner to EngineStateV2:**
```typescript
// In combat-spatial.ts:
export interface EngineStateV2 {
  tick: number;
  phase: CombatPhase;
  east: PhysicalBody;
  west: PhysicalBody;
  grappleState: GrappleState;
  tachiaiWinner: Side;  // ADD THIS
}

// In initEngineStateV2:
tachiaiWinner: 'east', // placeholder, set in resolveTachiaiV2

// In resolveTachiaiV2:
st.tachiaiWinner = tachiaiWinner;

// In buildBoutResultV2:
tachiaiWinner: st.tachiaiWinner,
stance: st.phase.tag === 'belt_battle' || (st.phase.tag === 'edge_crisis' && st.phase.prev === 'belt_battle')
  ? 'belt-dominant'
  : 'push-dominant',
```

---

### MI-04 — `runPhaseLoop` timeout kimarite is arbitrary

**File:** `boutPhysics.ts` lines 199–203

```typescript
// After 120 ticks:
const kimarite = eastDist > westDist ? "yorikiri" : "oshidashi";
```

Timeout (over 120 ticks) should produce `yorikiri` only if grip was established; otherwise `oshidashi`. Also, per Windsurf review, timeout winner should be the rikishi with **smaller** `cogOffset` (more stable), not just distance from center.

**Fix:**
```typescript
// Timeout resolution — most stable rikishi wins
const eastInstability = Math.abs(st.east.cogOffset) / st.east.footSpread;
const westInstability = Math.abs(st.west.cogOffset) / st.west.footSpread;
const winner: Side = eastInstability <= westInstability ? 'east' : 'west';

// Kimarite: was grip involved?
const hadBelt = st.phase.tag === 'belt_battle' ||
  (st.phase.tag === 'edge_crisis' && st.phase.prev === 'belt_battle');
const kimarite: KimariteId = hadBelt ? 'yorikiri' : 'oshidashi';
```

---

### MI-05 — Import duplication in `boutSpatial.ts`

**File:** `boutSpatial.ts` lines 4–5

```typescript
import type { CombatAction } from "../types/combat";
import type { KimariteId } from "../types/combat";
```

Merge into one import line.

---

### MI-06 — `kimariteClassifier.ts` re-declares `SpatialBoutContext` locally

**File:** `kimariteClassifier.ts` lines 56–65

`SpatialBoutContext` is already exported from `combat-spatial.ts`. The classifier declares a second, incompatible local version (missing `torqueDiff`, `atEdge`). Import and use the canonical type.

```typescript
// Remove local interface declaration, import instead:
import type { SpatialBoutContext, KimariteAttempt } from '../types/combat-spatial';
```

Then extend `SpatialBoutContext` in `combat-spatial.ts` to include `torqueDiff` and `atEdge` that the classifier needs.

---

## Missing from Windsurf Review that also applies

### MW-01 — Max tick guard unspecified for timeout outcome

The Windsurf review flagged missing tick guard spec. It exists (`MAX_TICKS = 120`) but the *outcome* logic is wrong (see MI-04 above).

### MW-02 — `EngineSnapshot` compatibility check was skipped

The Windsurf review flagged this. CR-06 above covers the fix. The specific fields `determineKimarite` reads that must be correct:
- `engineSnapshot.grappleState.gripAdvantage` → used to derive winner grip class
- `engineSnapshot.balanceEast/West` → used for `edgeDistance` estimation  
- `engineSnapshot.winnerConsecutiveAdvantage` → used for `forwardMomentum`
- `engineSnapshot.loserLastActionFamily` → used for `overCommitting` check
- `engineSnapshot.finalLoserBalanceDrain` → used for kimarite weight adjustment

Fields 3–5 are hardcoded to 0/undefined in `buildEngineSnapshotV2`. These should be tracked in `EngineStateV2`.

### MW-03 — Cross-engine comparison script missing

`scripts/compare-engines.ts` referenced in Phase 7.2 does not exist yet. Since B+ replaced V1 in-place, this now needs to compare B+ output with and without the legacy kimarite override (CI-06). Create `scripts/validate-kimarite-distribution.ts` instead.

---

## Fix Priority Order

Before enabling the flag (Phase 7):

| Priority | ID | Fix time | Blocking? |
|----------|-----|----------|-----------|
| 1 | CR-01 | 15 min | Yes — tachiai is deterministic |
| 2 | CR-02 | 30 min | Yes — henka completely unhandled |
| 3 | CR-03 | 10 min | Yes — classifier reads stale positions |
| 4 | CR-05B | 10 min | Yes — all torques are 0 |
| 5 | CR-04 | 5 min | Yes — wrong ring boundary |
| 6 | CR-05A | 5 min | Yes — wrong edge crisis side |
| 7 | CR-06 | 45 min | Yes — snapshot incompatible with evaluator |
| 8 | CI-03 | 20 min | Yes — classifier never called |
| 9 | CI-04 | 30 min | Yes — escape has no phase restoration |
| 10 | CI-02 | 15 min | High — morozashi misidentified as uwate |
| 11 | CI-01 | 10 min | Medium — edge exit misclassified |
| 12 | CI-05 | 20 min | Medium — henka resolver shadow var |
| 13 | CI-06 | 5 min | Medium — add legacy override flag |
| 14 | MI-02 | 10 min | Medium — forces scaled down 50% |
| 15 | MI-03 | 15 min | Low — hardcoded stance/tachiaiWinner |
| 16 | MI-04 | 10 min | Low — timeout kimarite arbitrary |
| 17 | CR-07 | 5 min | Low — flag is no-op (no V1 to fall back to) |

Total estimated fix time: ~4–5 hours of focused work.
