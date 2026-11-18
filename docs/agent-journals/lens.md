# Lens's Journal

## 2026-11-18 - Two weight fields, and only the boring one is snapshotted
**Data:** `rikishi.weight` (top-level physical kg) vs `rikishi.stats.weight` (combat stat); `CareerSnapshot.weight`
**Learning:** A "weight trajectory" chart looked ideal — WeightJourney ticks weekly toward a target and starvation shaves weight in welfare — but the two writers touch DIFFERENT fields. WeightJourney writes `stats.weight` (never snapshotted); `CareerSnapshot.weight` records `rikishi.weight`, which only moves via `phase01_daily_welfare` starvation. The snapshot series is flat for almost everyone → honest-but-useless chart, dropped.
**Pattern:** Before charting a snapshot field, grep which writers touch it AND which clone the type carries — `X` and `stats.X` are not the same series. careerHistory ordering: appended chronologically, `.slice(-6)`, newest LAST — the "newest-first" comment in useRikishiData is wrong; pick latest by `year*100+month`, never by position.

## 2026-11-18 - careerHistory gives a league-wide per-basho read
**Data:** every rikishi's LATEST `careerHistory` snapshot (bashoId `${bashoName}-${year}`) grouped by `heyaId`
**Learning:** Empirical (advanceDaysFast + endBasho + publishBanzukeUpdate): 1134/1134 rikishi had a snapshot in the last completed basho — coverage is total on the real path. Maezumo fill-ins carry `heyaId: ""` (unattached by design) and must be skipped, not bucketed. Full-record retirees in `historicalRikishi` still hold careerHistory — merge them (non-summary entries) or a stable loses its just-retired rikishi's wins.
**Pattern:** For "who's ahead" league tables, `latest snapshot where bashoId === world.history.at(-1).bashoId` is the league's last published result — populated 100% of the calendar, no live-BashoState dependency.

## 2026-11-07 - academy developmentHistory is a cadence-gated staircase
**Data:** `YouthProspect.developmentHistory` ({week, ability}[], rolling 52 via `applyWeeklyDevelopment`, surfaced through `projectYouthAcademy` → `YouthProspectDTO`)
**Learning:** Two structural quirks before plotting: (1) the phase runs ONLY in `offSeasonPipeline` — basho weeks append nothing, so the `week` axis has 2-4-week holes mid-basho; (2) `ability` is integer-quantized (gains only when `developmentPoints` crosses a 10-boundary), so the series is a staircase, not a curve — and it FREEZES once `ability >= potential` (early-return, no more entries). Also: headless verification needs `endBasho()` between basho — `advanceDaysFast` autonomous mode parks forever in `active_basho` (interactive termination by design), so off-season phases never fire.
**Pattern:** Stepwise integer series → `type="stepAfter"` on the Line (records hold until next reading — smoothing would invent values that never existed). Pair with a dashed `ReferenceLine` at the ceiling (`potential`) so "still climbing vs done" reads at a glance. Rendering test trick for jsdom: `vi.mock("recharts")` and replace `ResponsiveContainer` with a div that `React.cloneElement(child, {width, height})` — the real container injects dims into the child chart, so a plain wrapper renders 0×0 and `.recharts-line` never materializes.

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
