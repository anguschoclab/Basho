---
name: add-engine-command
description: Add a new player-facing engine command end-to-end (worker command path). Use whenever adding a gameplay action the player triggers from the UI — rulings, signings, purchases, facility investments, training assignments. Covers the canonical path — EngineCommand union → commands/<domain>.ts handler → resolveImpacts + syncAndDigest → sendCommand from the UI — and what NOT to do (reducer slices, Math.random, skipping uiWorldRevision sync).
---

# Add an Engine Command (the canonical command path)

Engine mutations run in the **Web Worker**, not the reducer. A feature is only real when the full slice connects:

## 1. Declare the command — `src/engine/worker/types.ts`

Add a variant to the `EngineCommand` union:

```ts
| { type: "MY_ACTION"; heyaId: string; targetId: string; amount: number }
```

## 2. Write the engine service

Domain logic lives in `src/engine/<domain>/`. Services take `world` and return an **impact** (built with `ImpactBuilder` from `src/engine/core/ImpactBuilder.ts`) — they don't mutate in place.

**RNG is non-negotiable:** use `rngForWorld(world, "subsystem", "label")` (tick code) or `rngFromSeed(seedString, "subsystem", "label")`. Never `Math.random()`/`Date.now()`, and never fold player choices into the seed string — choices modulate probabilities *within* the seeded sequence.

## 3. Register the handler — `src/engine/worker/commands/<domain>.ts`

Handlers are grouped by domain (`economy`, `governance`, `heya`, `lifecycle`, `meta`, `recruitment`) and merged into `COMMAND_HANDLERS` in `engine.worker.ts`. Follow the existing pattern:

```ts
MY_ACTION: (cmd) => {
  if (rt.world) {
    const impact = myService.doThing(rt.world, cmd.heyaId, cmd.amount);
    rt.world = resolveImpacts(rt.world, [impact]);   // from "../../core/ImpactResolver"
    rt.syncAndDigest();                              // posts updated world + digest to UI
  }
},
```

For a targeted heya update instead of an impact, `updateHeyaInWorld(world, heyaId, {...})` from `../../queries` is the pattern (see `APPLY_PRESS_CONFERENCE`).

## 4. Dispatch from the UI

```ts
const sendCommand = useGameStore((s) => s.sendCommand);   // src/state/stores/gameStore.ts (zustand)
sendCommand({ type: "MY_ACTION", heyaId, targetId, amount });
```

If the action needs a `GameContext` convenience method, add it like `issueRuling` in `useCommandActions.ts` — a thin wrapper over `sendCommand`, never a reducer case that mutates `world`.

## What NOT to do

- **Don't add engine-mutating actions to `src/state/game/*Slice.ts`.** Slices are for transient UI state (`setPhase`) and the synchronous bout-animation path (`bashoSlice`) only — a reducer-only engine mutation is unreachable from the canonical path and effectively dead code.
- **Don't skip `rt.syncAndDigest()`** — without it the UI never sees the result.
- **If a slice case *does* legitimately touch `world`** (bout animation only), it must bump `state.uiWorldRevision` so GameContext syncs back to the worker via `LOAD_WORLD`.
- **Don't bypass the slice-tracing check** — before declaring done, grep that something clickable actually dispatches the command (see the `verify-implementation` skill).
