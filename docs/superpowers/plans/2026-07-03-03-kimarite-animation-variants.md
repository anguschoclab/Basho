# Plan 03 — Kimarite-Specific Animation Variants

## Problem

`drawRikishi` in `boutCanvas/draw.ts` uses a `BodyPhase` enum (`standing`, `pushing`, `gripping`, `falling`, `thrown`, `ceremony`) but the canvas never knows *which* technique caused the finish. A kotenage (arm-lock throw) and a yorikiri (force-out) both trigger `BodyPhase.thrown` / `BodyPhase.falling` and render identically. There is no visual differentiation between sumo's 82 official kimarite.

This plan extends the canvas draw and animation layers to give each kimarite family a distinct visual signature during the `finish` and `momentum` phases — without requiring new assets, only programmatic canvas drawing.

> **Dependency:** This plan builds on the `KimariteFamily` type and `getKimariteFamily()` lookup introduced in Plan 01. If Plan 01 has not been implemented, those additions must be made first (they are self-contained in `boutCanvas/constants.ts` and `boutCanvas/types.ts`).

---

## Affected Files

| File | Change |
|------|--------|
| `src/components/game/boutReplay/boutCanvas/types.ts` | Add `ExitArc`, extend `RikishiState` with `arcProgress` |
| `src/components/game/boutReplay/boutCanvas/draw.ts` | New `drawRikishiWithFamily` function, family-specific body shapes |
| `src/components/game/boutReplay/boutCanvas/animation.ts` | Family-aware `getTargetState` exit logic |
| `src/components/game/boutReplay/useBoutReplay.ts` | Pass `kimariteFamily` into draw calls |

---

## Step 1 — Extend `RikishiState` with arc data

**File: `src/components/game/boutReplay/boutCanvas/types.ts`**

The existing `RikishiState`:
```typescript
export interface RikishiState {
  x: number;         // 0–1, normalized canvas width
  y: number;         // 0–1, normalized canvas height
  rotation: number;  // degrees
  scale: number;
  opacity: number;
  bodyPhase: BodyPhase;
}
```

Add optional arc fields:
```typescript
export interface RikishiState {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  opacity: number;
  bodyPhase: BodyPhase;
  // For throw techniques: parabolic arc height at peak (normalized)
  arcHeight?: number;
  // 0–1 progress through the arc trajectory (driven by phase progress)
  arcProgress?: number;
}
```

---

## Step 2 — Family-specific body poses in `drawRikishi`

**File: `src/components/game/boutReplay/boutCanvas/draw.ts`**

The existing `drawRikishi(ctx, state, side, shikona, canvasW, canvasH)` function draws a generic stick figure. Extend it to accept `kimariteFamily` and `isLoser` parameters that modify the body shape during the `finish` phase:

```typescript
export function drawRikishi(
  ctx: CanvasRenderingContext2D,
  state: RikishiState,
  side: "east" | "west",
  shikona: string,
  canvasW: number,
  canvasH: number,
  kimariteFamily?: KimariteFamily,  // new
  isLoser?: boolean,                 // new
): void
```

Inside the function, add a family/phase-specific body modification block after computing the base position (just before drawing the torso):

```typescript
// Family-specific pose overlay during finish phase
if (state.bodyPhase === "thrown" || state.bodyPhase === "falling") {
  if (kimariteFamily === "throw" && isLoser) {
    // Arc trajectory: recompute y using parabolic offset
    if (state.arcProgress != null && state.arcHeight != null) {
      const arcOffset = Math.sin(state.arcProgress * Math.PI) * state.arcHeight;
      drawY -= arcOffset * canvasH; // fly upward mid-arc
    }
    // Tumbling rotation is already set in RikishiState.rotation by animation.ts
  }

  if (kimariteFamily === "pull" && isLoser) {
    // Pitch forward: torso leans at extra angle, arms flung ahead
    // Handled via rotation already set in animation.ts — add arm extension here
    drawArmsExtended(ctx, cx, cy, state.rotation, side);
    return; // skip default arm draw
  }

  if (kimariteFamily === "lift" && isLoser) {
    // Compressed legs (feet off the ground)
    drawLiftedLegs(ctx, cx, cy, headRadius);
    return;
  }
}

if (state.bodyPhase === "gripping" && kimariteFamily === "force_out" && !isLoser) {
  // Winner leaning forward, arms extended in over/underarm grip
  drawForceOutGrip(ctx, cx, cy, headRadius, side);
  return;
}
```

Add the three helper draw functions (all use Canvas 2D arcs/lines):

**`drawArmsExtended`** — arms flung forward, both arcs pointing in direction of fall
**`drawLiftedLegs`** — legs bent up behind, feet above floor line
**`drawForceOutGrip`** — arms extended forward, torso crouching into drive

These are all ~15–20 line canvas drawing functions using existing ellipse/arc/moveTo/lineTo patterns already present in the file.

---

## Step 3 — Family-aware exit trajectories in `getTargetState`

**File: `src/components/game/boutReplay/boutCanvas/animation.ts`**

This step defines *where* each rikishi ends up at the finish phase, by family. The existing `finish` case in `getTargetState` puts the loser at a fixed exit position (off-screen). Replace it with:

```typescript
case "finish": {
  const loserSide = winnerSide === "east" ? "west" : "east";

  // Winner — family-specific stance
  const winnerBase: RikishiState = winnerSide === "east"
    ? { x: 0.38, y: 0.48, rotation: -5, scale: 1.05, opacity: 1, bodyPhase: "pushing" }
    : { x: 0.62, y: 0.48, rotation: 5, scale: 1.05, opacity: 1, bodyPhase: "pushing" };

  // Loser exit — varies by technique family
  const loserExits: Record<KimariteFamily, Partial<RikishiState>> = {
    force_out: {
      x: loserSide === "east" ? 0.08 : 0.92,
      y: 0.54,
      rotation: loserSide === "east" ? -10 : 10,
      bodyPhase: "falling",
    },
    throw: {
      x: loserSide === "east" ? 0.15 : 0.85,
      y: 0.58,
      rotation: loserSide === "east" ? -40 : 40,
      bodyPhase: "thrown",
      arcHeight: 0.12,  // parabolic peak height
      arcProgress: 1.0, // completed arc
    },
    pull: {
      x: loserSide === "east" ? 0.25 : 0.75,
      y: 0.60,
      rotation: loserSide === "east" ? 25 : -25, // pitched forward
      bodyPhase: "thrown",
    },
    lift: {
      x: loserSide === "east" ? 0.12 : 0.88,
      y: 0.55,
      rotation: loserSide === "east" ? -15 : 15,
      bodyPhase: "thrown",
      arcHeight: 0.06,
      arcProgress: 1.0,
    },
    trip: {
      x: loserSide === "east" ? 0.28 : 0.72,
      y: 0.62,
      rotation: loserSide === "east" ? 30 : -30,
      bodyPhase: "falling",
    },
    generic: {
      x: loserSide === "east" ? 0.10 : 0.90,
      y: 0.54,
      rotation: loserSide === "east" ? -12 : 12,
      bodyPhase: "falling",
    },
  };

  const loserExit = loserExits[script.kimariteFamily];

  // Apply winner family pose
  if (script.kimariteFamily === "force_out") {
    winnerBase.bodyPhase = "pushing";
    winnerBase.rotation = winnerSide === "east" ? -12 : 12;
  } else if (script.kimariteFamily === "throw") {
    winnerBase.bodyPhase = "gripping";
    winnerBase.scale = 1.08;
  } else if (script.kimariteFamily === "lift") {
    winnerBase.bodyPhase = "gripping";
    winnerBase.scale = 1.1;
    winnerBase.y = 0.50; // planted low
  }

  const loserFull: RikishiState = {
    x: 0.5, y: 0.5, rotation: 0, scale: 0.98, opacity: 1,
    bodyPhase: "falling",
    ...loserExit,
  };

  return winnerSide === "east"
    ? { east: winnerBase, west: loserFull }
    : { east: loserFull, west: winnerBase };
}
```

---

## Step 4 — Arc progress animation during `finish` phase

**File: `src/components/game/boutReplay/useBoutReplay.ts`**

For throws and lifts, the loser's arc should animate (not jump to `arcProgress: 1.0`). In the RAF loop, when `currentPhase === "finish"` and `kimariteFamily` is `"throw"` or `"lift"`:

```typescript
// Compute arc progress as a fraction of finish phase progress
// arc completes at 70% of finish phase, then loser hits the ground
const finishProgress = currentPhaseProgress; // 0–1
const arcProgress = Math.min(1, finishProgress / 0.7);

// Interpolate arcHeight: peaks at arcProgress=0.5, zero at 0 and 1
const liveArcHeight = Math.sin(arcProgress * Math.PI) * 0.12;

// Apply to current loser state
loserCurrentState.arcProgress = arcProgress;
loserCurrentState.arcHeight = liveArcHeight;
```

This drives the parabolic y-offset in `drawRikishi` to animate the throw arc in real time.

---

## Step 5 — Particle burst differentiation by family

**File: `src/components/game/boutReplay/boutCanvas/draw.ts` — `drawParticles` function**

The existing particle system emits `impact` and `dust` particles at bout end. Modify `triggerImpactParticles` (in `useBoutReplay.ts`) to pass a `family` hint:

```typescript
// Throws → "spark" burst (bright yellow streaks) instead of impact circles
// Force-outs → "dust" heavy (brown burst at edge, not center)
// Pull/slap-downs → "impact" flash (large, at center-forward)
// Lifts → brief "zabuton" rain (crowd throws cushions)

switch (script.kimariteFamily) {
  case "throw":
    spawnParticles("spark", 18, loserExitX, loserExitY);
    break;
  case "force_out":
    spawnParticles("dust", 12, TAWARA_X, CENTER_Y);
    break;
  case "pull":
    spawnParticles("impact", 14, CENTER_X, CENTER_Y);
    break;
  case "lift":
    if (result.upset || result.isKinboshi) spawnParticles("zabuton", 8, CENTER_X, 0.1);
    break;
  default:
    spawnParticles("impact", 10, CENTER_X, CENTER_Y);
}
```

---

## Step 6 — Pass `kimariteFamily` down to `drawRikishi` calls

**File: `src/components/game/boutReplay/boutCanvas/draw.ts` — main `drawFrame` function**

The `drawFrame(ctx, state, canvasW, canvasH)` call chain needs to pass `kimariteFamily` and `isLoser` through to `drawRikishi`. Update the call signature and thread the values from `useBoutReplay` where `drawFrame` is called.

---

## Visual Design Reference

| Family | Winner Pose | Loser Exit | Particle |
|--------|-------------|------------|----------|
| force_out | Forward drive crouch | Slides off edge | Dust at tawara |
| throw | Gripping stance, planted | Parabolic arc, tumble rotation | Spark burst |
| pull | Sidestep, arm raised | Pitches forward, face-down | Impact flash |
| lift | Planted low, arms under | Rises then drops, feet up | Zabuton (upsets only) |
| trip | One leg behind, planted | Lateral fall, sideways rotation | Dust |
| generic | Forward lean | Slides off | Impact |

---

## Testing Checklist

- [ ] Simulate 5 bouts each of force_out, throw, pull, lift, trip families
- [ ] Confirm loser exit direction and pose matches the table above
- [ ] Throw arc: loser visibly rises then falls (not instant jump to exit position)
- [ ] Pull: winner sidestep is visible before loser pitches
- [ ] Force_out: winner body stays forward in drive until completion
- [ ] Particles match family type (dust at edge vs spark burst etc.)
- [ ] All existing animation phases (ritual → ceremony) still complete without errors
- [ ] `npx tsc --noEmit` passes
- [ ] `npx vitest run` — all 1703 tests pass

---

## Estimated Effort

3–4 days. The data model and exit position values are the easy part; the `drawRikishi` helper functions (`drawArmsExtended`, `drawLiftedLegs`, `drawForceOutGrip`) and visual calibration of arc heights and rotations will need iterative visual testing. Plan 01 should be merged first so `KimariteFamily` and `BoutScript` are available.
