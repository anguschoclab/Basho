# Mega-plan — Day 10 Kyushu transcript (workstream W N)

Transcript source: Grand Sumo Highlights, Kyushu day 10.
**Status: VALIDATED against codebase.** Every claim below carries a verdict
(APPROVED / PARTIAL / DISPROVED) with the file evidence that produced it.

## Audit of the baseline table

| Claim in draft                                   | Verdict                         | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Birthday beats exist                             | ✅ APPROVED                     | `stakes.ts:65–94`, `postbout.ts:968` (`belated_birthday`)                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Henka mechanic + crowd stigma + desperation gate | ⚠️ PARTIAL                      | Henka mechanic + momentum stigma exist (`tachiai.ts:203–280`, `boutTacticAftermath.ts:51`). **"Desperation gate" DISPROVED**: `BoutAI.ts:150` swaps `HENKA→OSHI_THRUST` _unconditionally_ under promotion pressure — the "unless desperate" is a comment only; no desperation input exists in `BoutContext`. Also the stigma requires `tactic === "HENKA"`, so a _spontaneous_ henka (`npc_spontaneous_henka`, `tachiai.ts:229`) escapes it entirely.                                             |
| Injury body areas + aggravation                  | ✅ APPROVED                     | `BodyDefinitions.ts:8`, `InjuryService.ts:142`, `boutResolver.ts:447` (lowerBody gate)                                                                                                                                                                                                                                                                                                                                                                                                            |
| Leaderboard/co-leader beats                      | ✅ APPROVED with caveat         | `postbout.ts:304–365` (sole_leader/ties_leader/falls_out). **Caveat**: `standings` is a flat `Map<Id,{w,l}>` — the leader computation does NOT group by division. A Juryo 9-1 leader reads as "leader" in a Makuuchi narrative. Same flat-map hazard applies to N4.                                                                                                                                                                                                                               |
| Career-bout milestones                           | ✅ APPROVED                     | `context.ts:612`, `postbout.ts` beatPostBoutBoutMilestone                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| H2H rivalry streaks                              | ✅ APPROVED                     | `postbout.ts:499–544` (domination/evened/revenge/continued), `pair.streak` in types                                                                                                                                                                                                                                                                                                                                                                                                               |
| Fan/hometown support                             | ✅ APPROVED                     | `beatHometownWin` (`postbout.ts:945`), `interview.questions.hometown_supporters`                                                                                                                                                                                                                                                                                                                                                                                                                  |
| N1 rank-scaled henka dignity missing             | ✅ APPROVED (gap real)          | No rank check anywhere in the henka path; `post_bout.replay.henka` is rank-agnostic                                                                                                                                                                                                                                                                                                                                                                                                               |
| N2 pull tracking missing                         | ✅ APPROVED with correction     | `pull_attempt` is a **narrative template only** (`frames.ts:150` resolves it when `family === "trick"`); there is no `pull_attempt` log event. Counting must derive from battle-phase log entries with `family: "trick"` (written by `tickPushBattle`/`tickBeltBattle`-adjacent paths) attributed via `data.attackerSide`. **No new BoutResult field needed** — derive inside the narrative pipeline like `beatReplayHighlight` does for `henka_success`.                                         |
| N3 lower-body injury commentary missing          | ⚠️ PARTIAL                      | `beatPostBoutInjury` (`postbout.ts:612`) covers only `result.inBoutInjury` (new in-bout injuries). Gap confirmed for: pre-bout "hampered" line on a _pre-existing_ lower-body injury, post-bout "limping away" flavor, and "competing is a plus" credit.                                                                                                                                                                                                                                          |
| N4 sibling leaderboard missing                   | ✅ APPROVED (gap real)          | `rikishi.siblingIds?: Id[]` verified (`types/rikishi.ts:102`, set by `FamilyBondService`). No bout-narrative file references siblings — `beatBonds` notes "siblings never pair". Leader computation must group `standings` by `rikishi.division` (flat-map caveat above).                                                                                                                                                                                                                         |
| N5 interview contexts missing                    | ⚠️ PARTIAL                      | `selectInterviewType` (`interview.ts:40`) exists. `kinboshi` type already tops the cascade. Gaps: (a) **no sanyaku-streak question** — `sanyakuWinStreak` metric + `sanyaku_streak` beat exist but no `interview.questions.*` variant (the "two consecutive yokozuna" moment); (b) `earliest_kachi` requires `day<=7 && makuuchiTournaments>=2` — a **true debutant** clinching kachi-koshi falls to plain `kachi_koshi`. `debut_kachikoshi` gap confirmed (Dewanoumi's 8-2 day-10 debut clinch). |
| N6 grip-secured win-rate missing                 | ❌ **DISPROVED**                | Fully implemented by W M: `beatSignatureGrip` pre-bout (`stakes.ts:601`) emits `GRIP_WINS`/`GRIP_BOUTS` ("wins N of M with the grip"); `beatSignatureGripAftermath` post-bout (`postbout.ts:1050`). **Remove N6.**                                                                                                                                                                                                                                                                                |
| N7 phase-two metric missing                      | ✅ APPROVED (gap real, simpler) | `result.tachiaiWinner` already on `BoutResult` (`resultBuilders.ts:144`). Metric = pure derivation `tachiaiWinner !== winner` per side in `boutResultApplier`. **No physics work.** NPC-read note: `OpponentModel` builds from `rikishi.history` kimarite only — history entries lack `tachiaiWinner`, so fragility must be read from `boutMetrics` inside `phase01_basho_npc_tactics`'s world context, NOT via `OpponentModel`.                                                                  |
| Form streaks missing (implicit gap)              | ❌ DISPROVED (already exists)   | `currentWinStreak`/`currentLossStreak` fields exist; `streak_continued`/`streak_snapped`/`loss_streak` beats exist and are tested (`boutNarrative.streak.test.ts` B.9–B.12). "Won his last three" is already narrated.                                                                                                                                                                                                                                                                            |
| Yokozuna in sanyaku streak                       | ✅ APPROVED (already works)     | `RANK_HIERARCHY` marks yokozuna/ozeki/sekiwake/komusubi `isSanyaku: true` (`banzuke.ts:116–155`); consecutive yokozuna wins already fire `sanyaku_streak`.                                                                                                                                                                                                                                                                                                                                        |

## Final workstream — W N (post-validation)

### N1 — Desperate measures: henka dignity + desperation input

1. **Mechanics**: add `desperate?: boolean` to the tactic context (set in
   `phase01_basho_npc_tactics` when `currentLossStreak >= 5` or
   `currentBashoLosses >= 8`). In `BoutAI.ts:150`, keep the promotion-pressure
   HENKA→OSHI swap _unless_ `desperate` — making the existing comment true.
   Also bump spontaneous-henka `henkaChance` in `tachiai.ts:217–229` for
   `currentLossStreak >= 5` (bounded by the existing cap; seeded rng).
2. **Stigma fix**: extend `boutTacticAftermath.ts:51` to also penalize a
   _spontaneous_ henka winner — detect via `result.log` `henka_success` when
   `tactic !== "HENKA"`.
3. **Narrative**: `post_bout.henka_dignity` when an `isSanyakuRank` winner
   wins via `henka_success` — "desperate times, desperate measures" /
   "disappointed voices in the crowd" / "looking after his credibility".
   Fire before `beatReplayHighlight` so dignity outranks the generic replay;
   add a `leaping` variant line for `speed >= 70` winners ("leaps to the
   side high in the air"). Lower-rank henka keeps existing stigma only.

### N2 — Pull-sequence tracking

1. **Derivation** (no `BoutResult` change): in a new
   `beatPullSequence` (postbout), count battle-phase `result.log` entries
   with `family === "trick"` per `data.attackerSide`. Winner ≥3 →
   `post_bout.pull_charm` ("determined to pull — the third time's a charm").
   Loser with ≥2 trick engagements while retreating → `post_bout.pull_stigma`
   ("pulling going backwards is not normally recommended").
2. **Metrics**: `boutMetrics.pullWins` in `boutResultApplier` (winner's
   kimarite-family pull wins — reuse `familyFromKimarite` "trick"/pull set)
   for records + NPC reads.

### N3 — Lower-body injury commentary

1. Pre-bout `pre_bout.hurt_lower_body` when a rikishi is `injured` with
   `injuryArea` in {knee, ankle, hip} — "the feet haven't been moving",
   "hampered by the knee". Skip if `morningOfDay` already marked him out.
2. Post-bout `post_bout.limp_away` when the loser has a lower-body
   `inBoutInjury` or a pre-existing aggravated one — "limping away — let's
   hope it's temporary".
3. Post-bout `post_bout.compete_credit` when a pre-injured rikishi wins —
   "the fact that he's competing is a plus".

### N4 — Sibling leaderboard beat

- `pre_bout.sibling_lead` when a rikishi's `siblingIds` resolves to a rikishi
  who leads/co-leads a _different_ division. Leaders computed by grouping
  `standings` entries by `world.rikishi.get(id).division` — **mandatory**
  division grouping given the flat-map caveat. Only fires inside a basho
  narrative (world context present).

### N5 — Interview question types

- `interview.questions.sanyaku_streak` — `sanyakuWinStreak >= 2` post-bout
  (pre-bout metric + this win = streak). Slot before `kinboshi` fallback.
- `interview.questions.debut_kachikoshi` — `makuuchiTournaments <= 1` +
  kachi-koshi clinched + `day <= 10`. Slot before `kachi_koshi`.
- Both wired in `selectInterviewType` before the generic branches; new
  templates in `bard/domains/interview.json`.

### N7 — "Phase two" tendency

1. `boutMetrics.tachiaiWonButLost` counter in `boutResultApplier`:
   `result.tachiaiWinner !== result.winner` → increment for the loser side.
2. Post-bout `post_bout.phase_two` when `tachiaiWonButLost >= 3` this basho —
   "the big hit is there — phase two lets him down".
3. NPC parity: `phase01_basho_npc_tactics` reads opponent's
   `tachiaiWonButLost / bouts` ratio — above a threshold it nudges toward
   `STANDARD`/endurance tactics (outlast the fast starter). Bounded,
   deterministic; `OpponentModel` untouched.

## STRICT TEST-FIRST ORDER (mandatory)

Phase A — write ALL failing tests before touching engine code. Phase B —
implement to green. Phase C — verification battery. No implementation PR
without its RED test committed first.

### Phase A — test files (RED)

| Test file                                                           | Covers                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/unit/engine/bout/boutAI.desperation.test.ts`                 | promotion-pressure keeps OSHI swap normally; `desperate: true` context preserves HENKA choice; spontaneous-henka chance bump fires for 5+ loss streak (deterministic seed)                                                                                                                                                                                                                                                              |
| `tests/unit/engine/bout/boutTacticAftermath.test.ts` (extend)       | spontaneous `henka_success` in log applies `HENKA_MOMENTUM_PENALTY` even when `tactic !== "HENKA"`                                                                                                                                                                                                                                                                                                                                      |
| `tests/unit/engine/bout/boutNarrative.dayTen.test.ts`               | `henka_dignity` fires sanyaku+ only, suppresses neither replay nor stigma; `pull_charm` ≥3 / `pull_stigma` loser ≥2 / none below; `limp_away` + `hurt_lower_body` + `compete_credit` on lower-body areas only; `sibling_lead` only when sibling co-leads a _different_ division (juryo sibling ≠ same-division sibling); `phase_two` at ≥3 tachiai-won-but-lost; interview picks `sanyaku_streak`/`debut_kachikoshi` over `kachi_koshi` |
| `tests/unit/engine/bout/boutResultApplier.streaks.test.ts` (extend) | `tachiaiWonButLost` increments loser only when `tachiaiWinner !== winner`; `pullWins` on pull-family kimarite                                                                                                                                                                                                                                                                                                                           |

Harness: `generateBoutNarrative` via the `boutNarrative.*.test.ts`
convention (MockFactory world + `bout`, `east`, `west` fixtures;
`trainingState` must be a `Map`). No subprocess, no `runAutoSim` — unit tier.
Non-tautological assertions required (`weakAssertionAudit` gate).

### Phase B — implementation (to green)

Order: constants → metrics/applier → physics-adjacent (tachiai henka bump,
aftermath stigma) → narrative beats → interview types → bard templates →
npc_tactics desperate/fragility reads. `PbpTag` additions: `henka_dignity`,
`pull_charm`, `pull_stigma`, `limp_away`, `sibling_lead`, `phase_two`,
`compete_credit`. New thresholds into `src/constants/engine/bout.ts` /
`narrative.ts` (no magic numbers in beats).

### Phase C — verification battery

- `bun run test` fast suite; focused: `tests/unit/engine/bout/`,
  `templateTokenIntegrity.test.ts` (new bard paths), meta gates.
- `bun run test:timings -- unit` to re-baseline the new test file.
- `bun run type-check`, `bun run build`.
- `tests/slow/engine/archival/simulationInvariants.test.ts` +
  `determinismDoubleRun.test.ts` (new rng streams must be seeded — prove it).
- Commit + push W N.

## Player/NPC parity note

N1/N7 feed NPC decisions (desperation tactic input, fragility read) — both
deterministic world reads, no player-only paths. All other items are
observational beats, symmetric by construction.

## Explicitly out of scope (verified already-done)

- Grip-secured win-rate line (N6) — W M shipped it.
- Win/loss form streaks — `currentWinStreak`/`currentLossStreak` + streak beats.
- Birthday/belated-birthday, career-bout milestones, rivalry streaks,
  hometown support, sanyaku win streak beats, kinboshi interview.
