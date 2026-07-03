# Plan 01 — Physics-Driven Animation Replay

## Problem

The bout canvas animation (`useBoutReplay` → `boutCanvas/animation.ts`) runs a fixed 7-phase choreography that ignores the actual physics output in `BoutResult.log`. A quick hatakikomi slap-down plays the exact same keyframe sequence as a slow belt-grinding yorikiri. Every bout is visually identical except for mawashi color and the kimarite banner text.

The `boutLog: BoutLogEntry[]` array already encodes everything needed — tachiai margin, engagement family (push/belt/speed/trick), edge crisis escape/failure, and the final kimarite. The animation layer just needs to consume it.

---

## Affected Files

| File | Change |
|------|--------|
| `src/components/game/boutReplay/boutCanvas/types.ts` | Add `BoutScript`, `BoutKeyframe`, `kimariteFamily` to types |
| `src/components/game/boutReplay/boutCanvas/animation.ts` | Replace hardcoded `getTargetState` with script-driven interpolation |
| `src/components/game/boutReplay/boutCanvas/constants.ts` | Add kimarite family lookup map |
| `src/components/game/boutReplay/useBoutReplay.ts` | Build `BoutScript` from `result.log` on init, pass to animation |
| `src/engine/bout/ReplayMetadata.ts` | Expose `getKimariteFamily(kimarite: string): KimariteFamily` |

---

## Step 1 — Add `KimariteFamily` and `BoutScript` types

**File: `src/components/game/boutReplay/boutCanvas/types.ts`**

Add at end of file:

```typescript
export type KimariteFamily =
  | "force_out"   // yorikiri, oshidashi, okuridashi, tsukidashi
  | "throw"       // uwatenage, shitatenage, kotenage, sukuinage, ipponzeoi
  | "pull"        // hatakikomi, hikitoshi, okuritaoshi, tsukiotoshi
  | "lift"        // tsuridashi, tsuriotoshi
  | "trip"        // ashitori, ketaguri, sotogake, uchigake
  | "generic";    // fallback

// A resolved keyframe override for one phase
export interface PhaseOverride {
  phase: ReplayPhase;
  // East rikishi delta from default target (fractional canvas units)
  eastDelta?: Partial<RikishiState>;
  // West rikishi delta from default target
  westDelta?: Partial<RikishiState>;
  // Duration multiplier vs ReplayMetadata baseline (1.0 = unchanged)
  durationScale?: number;
}

// Pre-computed animation script derived from BoutResult.log
export interface BoutScript {
  kimariteFamily: KimariteFamily;
  winnerSide: "east" | "west";
  // tachiai dominance 0–1 (high = aggressive surge)
  tachiaiMargin: number;
  // Did we have a belt battle? (affects clinch phase posture)
  hasBeltBattle: boolean;
  // Did we have an edge crisis that was escaped?
  hasEdgeCrisisEscape: boolean;
  // Speed bout (hatakikomi / hikitoshi family)?
  isSpeedBout: boolean;
  // Per-phase overrides — animation.ts merges these with defaults
  overrides: PhaseOverride[];
}
```

---

## Step 2 — Add kimarite family lookup

**File: `src/components/game/boutReplay/boutCanvas/constants.ts`**

Add after existing exports:

```typescript
import type { KimariteFamily } from "./types";

const FORCE_OUT_TECHNIQUES = new Set([
  "yorikiri", "oshidashi", "tsukidashi", "okuridashi", "yoritaoshi",
  "oshitaoshi", "tsukitaoshi",
]);
const THROW_TECHNIQUES = new Set([
  "uwatenage", "shitatenage", "kotenage", "sukuinage", "ipponzeoi",
  "uwatedashinage", "shitatedashinage", "kakenage", "kainahineri",
]);
const PULL_TECHNIQUES = new Set([
  "hatakikomi", "hikitoshi", "okuritaoshi", "tsukiotoshi", "abisetaoshi",
  "okurihikitaoshi",
]);
const LIFT_TECHNIQUES = new Set([
  "tsuridashi", "tsuriotoshi",
]);
const TRIP_TECHNIQUES = new Set([
  "ashitori", "ketaguri", "sotogake", "uchigake", "mitokorozeme",
]);

export function getKimariteFamily(kimarite: string): KimariteFamily {
  const k = kimarite.toLowerCase().replace(/[-_\s]/g, "");
  if (FORCE_OUT_TECHNIQUES.has(k)) return "force_out";
  if (THROW_TECHNIQUES.has(k)) return "throw";
  if (PULL_TECHNIQUES.has(k)) return "pull";
  if (LIFT_TECHNIQUES.has(k)) return "lift";
  if (TRIP_TECHNIQUES.has(k)) return "trip";
  return "generic";
}
```

---

## Step 3 — Build `BoutScript` from `BoutResult.log`

**File: `src/components/game/boutReplay/useBoutReplay.ts`**

Add a new pure function (no side effects) above the hook:

```typescript
import { getKimariteFamily } from "./boutCanvas/constants";
import type { BoutScript, PhaseOverride } from "./boutCanvas/types";

function buildBoutScript(result: BoutResult, winnerSide: "east" | "west"): BoutScript {
  const kimariteFamily = getKimariteFamily(result.kimarite ?? "");

  let tachiaiMargin = 0.5;
  let hasBeltBattle = false;
  let hasEdgeCrisisEscape = false;
  let isSpeedBout = kimariteFamily === "pull";

  for (const entry of result.log ?? []) {
    if (entry.phase === "tachiai" && entry.data?.margin != null) {
      tachiaiMargin = Math.min(1, Math.max(0, entry.data.margin));
    }
    if (entry.phase === "engagement" && entry.data?.family === "belt") {
      hasBeltBattle = true;
    }
    if (entry.phase === "edge_crisis" && entry.data?.escaped === true) {
      hasEdgeCrisisEscape = true;
    }
  }

  const overrides: PhaseOverride[] = [];

  // Tachiai: dominant margin → surge; low margin → stagger
  if (tachiaiMargin > 0.7) {
    // Attacker surges forward aggressively
    const winnerDelta = winnerSide === "east"
      ? { x: 0.08, rotation: -8 }
      : { x: -0.08, rotation: 8 };
    overrides.push({ phase: "tachiai", eastDelta: winnerSide === "east" ? winnerDelta : undefined, westDelta: winnerSide === "west" ? winnerDelta : undefined });
  } else if (tachiaiMargin < 0.35) {
    // Both stagger — minimal forward movement
    overrides.push({ phase: "tachiai", durationScale: 1.3 });
  }

  // Finish exit shape by kimarite family
  if (kimariteFamily === "throw") {
    // Loser traces an arc — handled in animation.ts via bodyPhase "thrown" + exitArc flag
    overrides.push({ phase: "finish", durationScale: 1.2 });
    overrides.push({ phase: "momentum", durationScale: 1.15 });
  } else if (kimariteFamily === "pull") {
    // Winner sidesteps; loser pitches forward
    overrides.push({ phase: "finish", durationScale: 0.85 });
    overrides.push({ phase: "tachiai", durationScale: 0.9 });
  } else if (kimariteFamily === "lift") {
    overrides.push({ phase: "finish", durationScale: 1.3 });
  }

  // Edge crisis escape adds ceremony pause
  if (hasEdgeCrisisEscape) {
    overrides.push({ phase: "ceremony", durationScale: 1.2 });
  }

  return {
    kimariteFamily,
    winnerSide,
    tachiaiMargin,
    hasBeltBattle,
    hasEdgeCrisisEscape,
    isSpeedBout,
    overrides,
  };
}
```

In `useBoutReplay`, compute the script once during init:

```typescript
// Inside useBoutReplay, where the hook initialises:
const winnerSide = result.winnerRikishiId === eastRikishi.id ? "east" : "west";
const boutScriptRef = useRef<BoutScript>(buildBoutScript(result, winnerSide));
```

Pass `boutScriptRef.current` to `getTargetState` calls throughout the RAF loop.

---

## Step 4 — Consume `BoutScript` in `getTargetState`

**File: `src/components/game/boutReplay/boutCanvas/animation.ts`**

Change signature:
```typescript
// Before:
export function getTargetState(phase: ReplayPhase, winnerSide: "east" | "west"): { east: RikishiState; west: RikishiState }

// After:
export function getTargetState(
  phase: ReplayPhase,
  winnerSide: "east" | "west",
  script: BoutScript,
): { east: RikishiState; west: RikishiState }
```

Inside the function, after computing the default `east` and `west` target states from the existing `switch(phase)` block, apply overrides:

```typescript
const override = script.overrides.find((o) => o.phase === phase);
if (override?.eastDelta) {
  Object.assign(east, { ...east, ...override.eastDelta,
    x: east.x + (override.eastDelta.x ?? 0),
    y: east.y + (override.eastDelta.y ?? 0),
    rotation: east.rotation + (override.eastDelta.rotation ?? 0),
  });
}
if (override?.westDelta) {
  Object.assign(west, { ...west, ...override.westDelta,
    x: west.x + (override.westDelta.x ?? 0),
    y: west.y + (override.westDelta.y ?? 0),
    rotation: west.rotation + (override.westDelta.rotation ?? 0),
  });
}
```

Add kimarite-family-specific loser exit path in the `finish` case:

```typescript
case "finish": {
  // Default positions computed as before...

  // Throw: loser gets upward arc (y temporarily decreases then overshoots)
  if (script.kimariteFamily === "throw") {
    loser.y -= 0.06; // "lifted" mid-arc — completed by the lerp overshooting to final
    loser.rotation = loserSide === "east" ? -35 : 35; // tumbling
    loser.bodyPhase = "thrown";
  }

  // Pull/slap-down: winner sidesteps, loser pitches forward into the sand
  if (script.kimariteFamily === "pull") {
    const sideStep = winnerSide === "east" ? -0.04 : 0.04;
    winner.x += sideStep;
    loser.rotation = loserSide === "east" ? 20 : -20; // pitch forward
    loser.bodyPhase = "thrown";
  }

  // Lift: loser rises briefly
  if (script.kimariteFamily === "lift") {
    loser.y -= 0.08;
    winner.scale = 1.08; // planted, leaning back under the load
  }
  break;
}
```

---

## Step 5 — Phase duration scaling

**File: `src/engine/bout/ReplayMetadata.ts`**

Export a new function that accepts a `BoutScript` and returns adjusted durations:

```typescript
export function applyScriptDurations(
  base: Record<ReplayPhase, number>,
  script: BoutScript,
): Record<ReplayPhase, number> {
  const result = { ...base };
  for (const override of script.overrides) {
    if (override.durationScale != null && override.phase in result) {
      result[override.phase] = Math.round(result[override.phase] * override.durationScale);
    }
  }
  return result;
}
```

Call this in `useBoutReplay` where phase durations are computed, replacing the current direct call to `getReplayPhaseDurations`.

---

## Step 6 — HiDPI fix (bonus, same file)

While touching `useBoutReplay.ts`, fix the retina blurring:

```typescript
// In the canvas setup effect:
const dpr = window.devicePixelRatio ?? 1;
canvas.width = CANVAS_W * dpr;
canvas.height = CANVAS_H * dpr;
canvas.style.width = `${CANVAS_W}px`;
canvas.style.height = `${CANVAS_H}px`;
ctx.scale(dpr, dpr);
```

---

## Testing Checklist

- [ ] Run 10 bouts of each kimarite family in-game, confirm distinct exit trajectories
- [ ] Dominant tachiai (margin > 0.7) shows clear surge vs low-margin stagger
- [ ] Belt bout: clinch phase shows grip posture, not push posture
- [ ] Edge crisis escape: ceremony phase extends noticeably
- [ ] Throws: loser tumbles vs force-outs: loser slides
- [ ] Pull/slap-down: winner sidestep is visible
- [ ] `npx tsc --noEmit` passes
- [ ] `npx vitest run` — all 1703 tests pass (these are pure presentation changes; no engine tests touched)
- [ ] Visually check on a HiDPI screen — canvas should no longer be blurry

---

## Estimated Effort

3–4 days. The type scaffolding and `buildBoutScript` are straightforward. The main risk is tuning the delta values in `getTargetState` so transitions feel natural rather than jarring — expect an afternoon of visual calibration.
