# Plan 01 — Counter-Tactic System + Kyujo Daily Decision

## Problem

Two absences together make `active_basho` a passive spectator experience with zero informed strategic decisions.

**Counter-tactic system:** `TACTICAL_MATRIX` in `src/engine/types/combat.ts:42` defines a complete rock-paper-scissors counter structure (`push` counters `belt`, `belt` counters `trick`/`speed`, `trick` counters `push`, `speed` counters `push`/`belt`), but `tachiai.ts`, `boutPhaseLoop.ts`, and `KimariteSelectionEngine.ts` never read it. The tactic modifier applied in `resolveTachiaiV2` is a flat `tachiaiPowerModifier` integer from `tacticProfiles.ts` — the same regardless of what the opponent is doing. Tactic selection is a cosmetic preference, not a strategic matchup puzzle. `TacticalResult.winProbabilityShift` is defined but never computed or applied anywhere in the engine.

**Kyujo decision:** `isKyujo`, `kyujoReason`, `injured`, `injuryWeeksRemaining`, and `injuryStatus.severity` are all present on the `Rikishi` type. NPC kyujo logic exists (`npcAIWorkers.ts:153`) and withdraws on `severity === "serious" && weeksRemaining > 2`. But the player has no equivalent choice — there is no daily prompt asking whether to enter a hurt wrestler at escalating injury risk or withdraw and protect them. This is the most thematically resonant daily decision in sumo management and it does not exist as a player verb.

---

## Affected Files

| File | Change |
|------|--------|
| `src/engine/types/combat.ts` | Add `TACTIC_TO_FAMILY` map; export counter-resolution function |
| `src/engine/bout/physics/tachiai.ts` | Read opponent's `familyPreferences` max, apply `TACTICAL_MATRIX` counter bonus |
| `src/engine/loop/LoopDecisionEngine.ts` | Add `"kyujo_decision"` blocking decision type in `detectDueDecisions` and `applyDecisionEffect` |
| `src/engine/npcAIWorkers.ts` | Extend NPC kyujo to cover moderate-severity wrestlers (compete/withdraw trade-off) |

---

## Step 1 — Map `BoutTactic` to `TacticalFamily`

**File: `src/engine/types/combat.ts`** — add after the existing `TACTICAL_MATRIX` (line 47):

```typescript
// Maps each player-facing BoutTactic to its underlying TacticalFamily
// so TACTICAL_MATRIX can evaluate counter advantages.
export const TACTIC_TO_FAMILY: Record<BoutTactic, TacticalFamily> = {
  STANDARD:       "push",
  OSHI_THRUST:    "push",
  YOTSU_BELT:     "belt",
  DEFENSIVE_PULL: "trick",
  HENKA:          "trick",
  ALL_OUT:        "push",   // all-out commits to push family
};
```

Add a pure resolution function below the map:

```typescript
/**
 * Returns the tachiai power bonus (positive) or penalty (negative) the player
 * receives based on whether their tactic family counters the opponent's
 * dominant combat family preference.
 *
 * Range: +COUNTER_TACTIC_BONUS when countering, 0 otherwise.
 */
export const COUNTER_TACTIC_BONUS = 5; // points, vs ±4 base jitter

export function resolveCounterTacticBonus(
  playerTactic: BoutTactic,
  opponentProfile: CombatProfile,
): number {
  const playerFamily = TACTIC_TO_FAMILY[playerTactic] ?? "push";
  // Opponent's dominant family = highest familyPreference value
  const opponentFamily = (Object.entries(opponentProfile.familyPreferences) as [TacticalFamily, number][])
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "push";
  const counters = TACTICAL_MATRIX[playerFamily] ?? [];
  return counters.includes(opponentFamily) ? COUNTER_TACTIC_BONUS : 0;
}
```

---

## Step 2 — Apply Counter Bonus in `resolveTachiaiV2`

**File: `src/engine/bout/physics/tachiai.ts`**

Import the new helpers at the top:

```typescript
import { resolveCounterTacticBonus } from "../types/combat";
```

After the existing tactic power modifier is applied to the player side (around line 55), add the counter check. The player side is determined by `bout.playerSide`:

```typescript
// Counter-tactic bonus: player's chosen tactic family vs opponent's dominant family
if (bout.playerTactic && bout.playerTactic !== "STANDARD") {
  const opponentRikishi = bout.playerSide === "east" ? west : east;
  if (opponentRikishi.combatProfile) {
    const counterBonus = resolveCounterTacticBonus(
      bout.playerTactic,
      opponentRikishi.combatProfile,
    );
    if (bout.playerSide === "east") {
      eastTachiaiPower += counterBonus;
    } else {
      westTachiaiPower += counterBonus;
    }
    if (counterBonus > 0) {
      boutLog.push({
        phase: "tachiai",
        event: "counter_tactic_advantage",
        data: { playerTactic: bout.playerTactic, counterBonus },
      });
    }
  }
}
```

The effective counter bonus is +5 tachiai points against ±4 jitter — meaningful (~60% tachiai win when countering) but not deterministic.

---

## Step 3 — Surface Opponent Scouting Data to Tactic Selection

For the counter bonus to matter strategically, the player needs to know the opponent's dominant style before picking a tactic. The `FogOfWarService` already builds `perceptionSnapshot` objects with `perceivedCombatStyle` for scouted opponents.

**File: wherever the bout tactic selection UI lives** (search for `playerTactic` in components):

Extend the pre-bout tactic card to show a one-line scouting hint when a perception snapshot exists for the opponent:

```typescript
// In the tactic selection component:
const perception = world.fogOfWar?.perceptions?.[opponentId];
const scoutHint = perception?.perceivedCombatStyle
  ? `Scouting: likely ${perception.perceivedCombatStyle} fighter`
  : null;
```

Render this as a muted subtitle under the opponent's name on the tactic selection card. No new engine changes — pure UI read from existing `FogOfWarService` output.

---

## Step 4 — Add `"kyujo_decision"` to `LoopDecisionEngine`

**File: `src/engine/loop/LoopDecisionEngine.ts`**

In `detectDueDecisions` (after the `pre_basho_readiness` block, around line 60), add:

```typescript
// Kyujo decision: fires each day of active_basho when a player rikishi
// is injured with moderate+ severity and scheduled to compete today.
if (world.cyclePhase === "active_basho" && world.currentBasho) {
  const todayMatches = world.currentBasho.matches.filter(
    (m) => m.day === world.currentBasho!.day && !m.result,
  );
  for (const match of todayMatches) {
    const playerSide =
      match.eastRikishiId && world.playerHeyaId
        ? world.rikishi.get(match.eastRikishiId)?.heyaId === world.playerHeyaId
          ? "east"
          : world.rikishi.get(match.westRikishiId)?.heyaId === world.playerHeyaId
            ? "west"
            : null
        : null;
    if (!playerSide) continue;

    const rikishiId = playerSide === "east" ? match.eastRikishiId : match.westRikishiId;
    const r = world.rikishi.get(rikishiId);
    if (!r || !r.injured || r.isKyujo) continue;

    const severity = r.injuryStatus?.severity ?? "minor";
    if (severity === "minor") continue; // minor injuries don't warrant a daily prompt

    // Estimate bout injury probability for display
    const injuryRiskPct = severity === "serious" ? 40 : 20;

    decisions.push({
      id: `kyujo_${rikishiId}_${world.currentBasho.day}`,
      type: "kyujo_decision",
      description: `${r.shikona} is injured (${severity}). Competing today carries a ~${injuryRiskPct}% injury risk. Withdraw or compete?`,
      deadlineWeek: world.week ?? 0,
      required: true, // BLOCKING — must resolve before day advances
      options: [
        {
          id: "compete",
          label: "Compete",
          impact: `Bout proceeds at elevated injury risk (~${injuryRiskPct}%)`,
        },
        {
          id: "withdraw",
          label: "Withdraw (Kyujo)",
          impact: "Forfeit today's bout. Protect long-term health.",
        },
      ],
    });
  }
}
```

In `applyDecisionEffect` (after the existing `pre_basho_readiness` block):

```typescript
if (decisionType === "kyujo_decision") {
  // Extract rikishiId from the decision id: "kyujo_<id>_<day>"
  const parts = decisionId?.split("_") ?? [];
  const rikishiId = parts.slice(1, -1).join("_") as Id; // handles ids with underscores
  if (optionId === "withdraw") {
    const r = world.rikishi.get(rikishiId);
    if (r) {
      builder.updateRikishi(rikishiId, {
        isKyujo: true,
        kyujoReason: "injury",
        medicalCertificate: {
          injury: r.injuryStatus?.type ?? "unknown",
          severity: r.injuryStatus?.severity ?? "moderate",
          treatmentWeeks: r.injuryWeeksRemaining,
          submittedDate: world.calendar?.currentWeek ?? 0,
        },
      });
    }
  } else if (optionId === "compete") {
    // Accept risk: boost the per-bout injury multiplier for this rikishi today.
    // Stored as a transient modifier that boutResultApplier reads via
    // result.tacticInjuryRiskMultiplier (already threaded in boutResultApplier.ts:170).
    // The tachiai.ts tactic profiles set this; we mirror the pattern by writing
    // to a session-scoped map in world.transientContext.
    const existing = world.transientContext?.dailyInjuryRiskOverrides ?? {};
    builder.mergeTransientContext({
      dailyInjuryRiskOverrides: {
        ...existing,
        [rikishiId]: (r?.injuryStatus?.severity === "serious" ? 2.0 : 1.5),
      },
    });
  }
}
```

> **Note on `applyDecisionEffect` signature:** the function currently receives `(world, builder, decisionType, optionId)` — you need the decision `id` to extract `rikishiId`. Update the signature to also accept `decisionId?: string` and thread it through `resolveLoopDecision` (line 269).

---

## Step 5 — Extend NPC Kyujo for Moderate Injuries

**File: `src/engine/npcAIWorkers.ts`** — in `spawnPersonnelWorker` (line 153), the current gate is `severity === "serious" && weeksRemaining > 2`. Extend to:

```typescript
// NPC moderate-injury trade-off: probabilistic based on archetype risk tolerance
const isSerious = severity === "serious" && weeksRemaining > 2;
const isModerate = severity === "moderate" && weeksRemaining > 1;
const riskTolerance = oyakata?.traits?.risk ?? 50;

if (isSerious || (isModerate && rng.next() > riskTolerance / 100)) {
  withdrawalIds.push(r.id);
}
```

This makes conservative oyakata (low `risk` trait) withdraw moderate-injury wrestlers while gamblers push them through — mirroring the player's choice.

---

## Testing Checklist

- [ ] Pick `YOTSU_BELT` against a known push fighter — confirm +5 tachiai bonus fires and is logged
- [ ] Pick `OSHI_THRUST` against a belt fighter — confirm no bonus (incorrect counter)
- [ ] `STANDARD` tactic — confirm no counter bonus regardless of opponent
- [ ] Scouting hint shows on tactic UI when opponent has a `perceptionSnapshot`
- [ ] With an injured (moderate+) player rikishi scheduled today, advance day — confirm blocking kyujo decision modal appears
- [ ] Choose "withdraw" — confirm `isKyujo: true` on the rikishi, bout forfeited
- [ ] Choose "compete" — confirm bout proceeds, injury risk multiplier elevated in bout result
- [ ] Minor injury rikishi — confirm no kyujo decision fires
- [ ] NPC conservative oyakata withdraws moderate-injury wrestlers; gambler does not
- [ ] `npx vitest run` — all tests pass
- [ ] `npx tsc --noEmit` — clean

---

## Estimated Effort

3–4 days. Counter-tactic logic is ~50 lines across 2 files. Kyujo decision is ~80 lines in `LoopDecisionEngine.ts` with a signature change threading `decisionId`. The NPC extension is a one-line gate change. Main risk: the `transientContext.dailyInjuryRiskOverrides` map may not exist — verify `WorldState.transientContext` type and add the field if needed, or use a simpler approach (write directly to a rikishi field cleared after the bout resolves).
