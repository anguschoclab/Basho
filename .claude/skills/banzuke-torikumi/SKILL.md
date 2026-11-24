---
name: banzuke-torikumi
description: Work on the banzuke (ranking sheet) and torikumi (bout scheduling) systems — promotion/demotion logic, division quotas, ozeki/yokozuna rules, sansho prizes, kyujo landing floors, and the rolling daily card builder with its hard pairing rules. Use whenever touching BanzukePublisher, promotionLogic, ozekiLogic, matchmaking/Swiss, schedule.ts torikumi code, conditionalSansho, or banzuke-gai handling — maps every module, the absolute pairing bars, and the tests that guard them.
---

# Banzuke & Torikumi Domain

## Banzuke (`src/engine/banzuke/`)

- `BanzukePublisher.ts` — compiles and publishes the ranking sheet between bashos. Helpers in `publish/`: `movements`, `newRanks`, `performance`, `records`, `snapshot`.
- `promotionLogic.ts` — win/loss → rank movement. `ozekiLogic.ts` — ozeki promotion/demotion/kadoban/reclaim; yokozuna promotion paths (incl. jun-yusho).
- `banzukeCommittee.ts` — committee composition; `specialPrizes.ts` — sansho eligibility/awards; `basho/conditionalSansho.ts` — day-15-AM conditional sansho announcement.
- `banzukeTemplate.ts` + `banzukeSnapshot.ts` — sheet shape; `banzukeMovementNarrative.ts` — rise/fall copy.
- Hard rules encoded as tests: **division quotas are fixed** (sheet always publishes full — `divisionQuota.test.ts`, `capacity.test.ts`), sekitori boundaries (`sekitoriBoundary`), kyujo landing floors (`kyujoLanding`), incumbent bubble preference with crossover evidence (`incumbentAndEvidence`), banzuke-gai (`banzukeGai`).

## Torikumi (`src/engine/matchmaking/` + `src/engine/calendar/schedule.ts`)

- `SwissAlgorithm.ts` — core pairing; `LowerDivisionSwiss.ts` — lower-division cadence; `MatchmakingPhases.ts` — day-by-day phases; `DramaMatchmaker.ts` — storyline pairings.
- `schedule.ts` owns the **rolling torikumi**: each day's card is published through the JSA rolling target day; published torikumi are never re-paired (withdrawal reconciliation instead). Kore-yori contender pairing begins days 13–14.
- **Absolute bars** (`hardRules.test.ts`): no stablemates, no rematches — never violated; cross-division leftover pass exists so the card never forces a violation or declares a bye while a legal pairing remains; even-day west-priority tiebreak (`evenDayWestPriority`).

## Key types

`BashoState` (`types/basho.ts`): `matches[]`, `standings: Map`, `day` 1–15. `Rikishi.rank`/`division`/`side`; banzuke-gai rikishi sit outside quota slots.

## Tuning & tests

Constants: `src/constants/engine/banzuke.ts`, `matchmaking.ts`. Tests: `bun run test -- tests/unit/engine/banzuke tests/unit/engine/matchmaking` (~45 files — division quotas, ozeki flows, sansho, hard pairing rules, koreYoriRamp). The 25-yr diagnostic tracks division funnel + banzuke-gai counts (see `sim-diagnostics`).
