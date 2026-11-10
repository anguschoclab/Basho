# Lens's Journal

## 2026-11-05 - careerHistory scope + sim-path data population
**Data:** `rikishi.careerHistory` (CareerSnapshot[], capped at last 6 by `recordBashoPerformance`), `rikishi.history` (MatchResultLog[], rolling 500 via RIKISHI_BOUT_HISTORY_MAX)
**Learning:** careerHistory snapshots carry no heyaId and no historical record tracks roster membership — per-heya series are only honest as "current roster" aggregates. `rikishi.history` populates ONLY via the real tick path (`applyBoutResult` in phase01_basho_bouts / advanceDaysFast); `runAutoSim`/`TournamentSimulator` inject standings directly and produce ZERO bout logs. Empirical: 438/438 rikishi have history after one basho via advanceDaysFast; ~5/30 roster members per heya have careerHistory snapshots after 3 auto-sim basho (only rikishi in standings get snapshots; generated worlds don't back-fill).
**Pattern:** Verify series population on `advanceDaysFast` worlds for bout-level data, `runAutoSim` worlds only for publish-level data. careerHistory aggregation: group by `bashoId` (`${bashoName}-${year}`), order by `year*100+month`.

## 2026-11-05 - formatMetaTrends is not a per-basho series
**Data:** `formatMetaTrends` in uiFormatters.ts → `world.meta` (tone/drift/globalKimariteStats)
**Learning:** The JSA Trends streamgraph maps the SAME current-era values onto each of the last 6 basho labels — meta history is yearly-only (`meta.history`), no per-basho series exists. The chart looks longitudinal but is a snapshot repeated. Not fabricated constants (reads real meta state), but don't treat it as a trend source.
**Pattern:** For genuinely per-basho world series, `world.history` (BashoResult[]) is the source; meta drift is year-scoped.

## 2026-11-05 - fusensho pollutes kimarite tallies
**Data:** `MatchResultLog.kimarite` / `BoutResult.kimarite` can be `"fusensho"` (default win, opponent absent)
**Learning:** Wins-only tallies that don't filter `fusensho` will surface "fusensho" as a signature technique — it is not a technique. `calculateMostFrequentKimarite` now excludes it from numerator and denominator (chips get slightly truer percentages too). `hansoku` stays — real technique.
**Pattern:** Technique distributions must filter non-technique outcomes (`fusensho`, empty string); keep `hansoku`.

## 2026-11-05 - meta gates that bite on new test files
**Data:** tests/unit/meta gates — `testTimingsBudget`, `factoryDiscipline`
**Learning:** Every new fast-suite test file MUST land in `docs/audit/test-timings.json` (`bun run test:timings -- fast`) or the timings gate fails. New test files may not define local entity factories (`LOCAL_FACTORY_RE` = makeWorld|makeRikishi|makeHeya|mockRikishi|mockHeya|makeMockWorld|makeMockHeya|createMockWorld|createWorld) — snapshot/DTO literal helpers like `snap()`/`bout()` are fine. Also: `mockRikishi` does NOT set `careerHistory` — read `r.careerHistory ?? []` in projections.
**Pattern:** New test file → timings baseline regeneration before commit. Components may NOT import `@/engine/**` except `@/engine/types*` + `@/engine/holiday` (blanket deny, not just npc) — all engine access via presenters.
