---
name: bout-combat
description: Work on the bout/combat engine — physics phases, tactics, kimarite selection, special outcomes, pbp narrative. Use whenever touching resolveBout/resolveBoutPhysics, BoutTactic/TACTICAL_MATRIX, CombatProfile archetypes, kimarite classification, kinjite/hiwaza/shinitai/yaocho edge cases, boutTactics, or the SIMULATE_BOUT slice path. Carries the positional-arg trap and the two entry-point distinction.
---

# Bout / Combat Domain (`src/engine/bout/`)

## Two entry points — pick the right one

```ts
// Production: returns { result, impact } — impact applied via resolveImpacts
resolveBout(bout, east, west, basho, playerTactic?, world?)

// One-off helper (tests/scripts): wraps resolveBout over a fake basho
simulateBout(east, west, seed) → { result }
```

**Positional-arg trap:** `playerTactic` is the **5th positional arg** — `resolveBout` overwrites `bout.playerTactic` from it, so setting `ctx.playerTactic` or mutating the bout beforehand is silently ignored. Pass the tactic exactly how `boutResolver.ts` callers do.

## Physics loop (`bout/physics/` + `boutPhysics.ts`)

`resolveBoutPhysics` runs: `initState` → `tachiai` (initial charge) → tick loop over `tickPushBattle`/`tickBeltBattle` → `edgeCrisis` (rope work) → `resultBuilders`. `conditionMultiplier(rikishi)` folds condition/fatigue into physics. Spatial state lives in `boutSpatial.ts`.

## Tactics — player-facing layer

7 `BoutTactic`s: `STANDARD, YOTSU_BELT, OSHI_THRUST, HENKA, DEFENSIVE_PULL, ALL_OUT, NEKODAMASHI` (`types/combat.ts`). Each maps to a `TacticalFamily` (`push|belt|trick|speed`) via `TACTIC_TO_FAMILY`; `TACTICAL_MATRIX` maps each family to what it counters — push⇒belt, belt⇒trick+speed, trick⇒push, speed⇒push+belt. `resolveCounterTacticBonus` grants `COUNTER_TACTIC_BONUS` (5) when the opponent has a clearly dominant family. Per-tactic modifiers: `TACTIC_PROFILES` in `tacticProfiles.ts`.

**Player tactic storage:** `world.boutTactics[boutId]` (Record) — set via `SET_BOUT_TACTIC` in `bashoSlice` (the sanctioned reducer-slice world touch for the interactive bout path; bumps `uiWorldRevision`). `SIMULATE_BOUT` resolves on the main thread for match animation.

## CombatProfile (`types/combat.ts`)

8 `CombatArchetype`s (`oshi, yotsu, trickster, speedster, hybrid, giant, tsuppari, defensive`) with `familyPreferences`, `preferredGrip`/`preferredGripDepth`, `statModifiers`, `favoredKimarite`, `counterFamily`, `archetypeBehavior`, `bodyTypeBehavior`. Grapple state: `GrappleState` (hand positions, `GripDepth`, `gripAdvantage`).

## Kimarite & special outcomes

`KimariteSelectionEngine.ts` (choice), `kimariteClassifier.ts` + `terminalKimarite.ts` (classification), `kimarite/index.ts`, and the edge cases: **`hiwaza.ts`** (5 non-technique results where the loser self-defeats), **`kinjite.ts`** (forbidden techniques → `hansoku` DQ), **`shinitai.ts`** (simultaneous-exit "dead body" rulings), **`yaocho.ts`** (match-fixing scandal trigger), `boutResultApplier.ts` (applies result to standings/world). `BoutResult` carries `kimarite`, `upset`, `isKinboshi`, `kenshoEnvelopes`, `pbp[]`, `narrative[]`.

## Narrative layer (`bout/narrative/`)

Pbp pipeline: `prelude` → `frames` → `resolution` → `postbout`/`postbout2`, plus `ceremony`, `interview`, `stakes`, `context*`. Commentary/AIs: `boutNarrative.ts`, `BoutAI.ts`, `CornerAdvice.ts`, `h2h.*` tests cover head-to-head commentary.

## Tuning & verification

Constants: `src/constants/engine/bout.ts`, `archetype.ts`, `kimarite.ts`, `kimariteFrequencies.ts` (real-world distribution targets), `kimariteTargets.ts`, `matchmaking.ts`. Validate: `bun scripts/compare-engines.ts --count=100 --seed=X` and `bun run measure:kimarite` (see `sim-diagnostics`); unit gates `kimariteFrequencies`, `kimariteRegistry`, `h2h.tacticDeterminism` tests. Recent-history caution: east-win-bias and skill-vs-position outcome bugs were fixed in the tick order — keep bouts order-independent and resolve ambiguity on stats, not position.
