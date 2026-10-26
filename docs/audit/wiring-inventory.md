# Wiring Inventory — Phase 0

> Generated 2026-10-08. Method: import-graph BFS over 881 production files from entry points `main.tsx`, `bootstrap.tsx`, `engine.worker.ts` (+ `electron/main.ts` verified separately — it lives outside `src/`). 845 files reached, 36 unreachable.

## 1. Unreachable files — classified

### DELETE candidates (module genuinely dead — no production importer, no dev-tool role)

| File                                                     | Evidence                                                                                                                                                                                              |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/media/PressConference.tsx`               | Only the `game/PressConference.tsx` variant is reachable; media/ variant has zero importers                                                                                                           |
| `src/components/ui/Sparkline.tsx`                        | Only imported by dead barrel `components/ui/index.ts`; MediaPage uses its own inline `HeatSparkline`; FinancesWidget reference is a comment                                                           |
| `src/components/ui/colorMaps.ts`                         | Dead `HEAT_CONFIG` variant (emoji-icon map) lives here — the live one is `boutCardTypes.tsx`                                                                                                          |
| `src/contexts/domainHooks.ts`                            | Zero importers                                                                                                                                                                                        |
| `src/utils/validatePath.ts`                              | **KEEP** — imported by `electron/main.ts` (outside `src/` BFS); electron-parity test asserts its presence                                                                                             |
| `src/constants/engine/koreYoriSanyaku.ts`                | Zero production importers                                                                                                                                                                             |
| `src/constants/engine/narrativeFlavor.ts`                | Zero production importers (has own test)                                                                                                                                                              |
| `src/constants/ui/kesho.ts`                              | Zero importers                                                                                                                                                                                        |
| `src/constants/ui/presenters.ts`                         | Zero importers                                                                                                                                                                                        |
| `src/engine/bout/honbasho.ts`                            | Dead module (5 GENUINE_ORPHANS); `ExhibitionBashoService.isHonbasho` is the live equivalent                                                                                                           |
| `src/engine/bout/kachiNokori.ts`                         | Dead + divergent `calculateKachiNokori` dup                                                                                                                                                           |
| `src/engine/core/EntityService.ts`                       | Dead (GENUINE_ORPHAN)                                                                                                                                                                                 |
| `src/engine/npcAI/contextBuilder.ts`                     | Dead `buildAIContext` — but `AIContext` is hand-built at 4 sites (`BoutAI`, `boutResolver`, `StrategicPlanner`, `phase01_week_npc_ai`) → either wire as canonical ctor or delete; verdict in registry |
| `src/engine/npcAI/strategies/sponsor/SponsorStrategy.ts` | Dead strategy module                                                                                                                                                                                  |
| `src/engine/systems/economy/infrastructureValidation.ts` | Zero external importers                                                                                                                                                                               |

### Dead barrels (index.ts with zero importers — delete or wire)

`components/charts/index.ts`, `components/game/index.ts`, `components/game/boutReplay/boutCanvas/index.ts`, `components/layout/index.ts`, `components/ui/index.ts`, `components/ui/sidebar/index.ts`, `constants/ui/index.ts`, `engine/almanac/index.ts`, `engine/bout/kimarite/index.ts`, `engine/strategy/index.ts`, `engine/systems/economy/index.ts`, `engine/systems/governance/index.ts`, `engine/systems/keshoMawashi/index.ts`, `engine/systems/narrative/index.ts`, `engine/systems/worldCircuit/index.ts`, `engine/tick/index.ts`.

Note: `engine/almanac/index.ts` is the "clean barrel" previously validated — but no consumer imports it (consumers deep-import `almanac/*` paths). Decision: either migrate consumers to the barrel (public API discipline) or delete barrels. Registry verdict per barrel.

### TOOL classification (intentional, keep — outside app runtime)

`src/engine/simulation/` — `AutoSimService`, `ChronicleService`, `SimTuningService`, `TournamentSimulator`, `run.ts`: dev/diagnostics harness used by `bun run simulate`, `scripts/diagnostic-25yr-sim.ts`, `scripts/yokozuna_sim.ts`, and unit tests. Not wired into the app — by design. `SimTuningService` (253 LOC const-object) still gets a P2 split review since tests exercise it.

### Ambient

`vite-env.d.ts` — ambient types, N/A.

## 2. Symbol-level orphans (prior triage, still valid)

17 `GENUINE_ORPHANS` entries — all inside the dead modules listed above (`honbasho` ×5, `EntityService`, `buildAIContext`, `collectionOperations` ×8, `jsonParser` ×2). `collectionOperations.ts` and `utils/jsonParser.ts` did not appear in the reachability list because they sit in directories with partial reachability — verify: they are exported through barrels that ARE reached (`utils/` barrel?), or reached files import them for re-export. **Action for registry:** confirm reachability status of `collectionOperations.ts`/`jsonParser.ts` (reachable-but-unused vs unreachable) — either way DELETE stands.

## 3. Boilerplate exports — 69 "retained for future wiring" reasons

`src/tests/unit/audit/unreferenced-exports.test.ts` contains 69 reasons matching `retained for future wiring`/`Utility function retained`. Each must get a real verdict in Phase 4 (wire / tool-surface / delete). The gate step for P4 bans these strings outright.

## 4. Service → runtime coverage

- 99 files under `systems/`; 54 tick phase files.
- 55 system files are not name-referenced by tick phases — but direct-importer analysis shows most are consumed by other runtime layers (worker handlers, `uiDigest`, `WorldFactory`, `lifecycle`, `boutResolver`, `npcAI`). Only `infrastructureValidation.ts` + the files in §1 are truly without a production importer.
- Wiring gaps are therefore concentrated: (a) dead modules in §1, (b) boilerplate exports in §3, (c) barrel discipline, NOT broad unticked services.
- `subsystem-service-map.md` should be cross-checked per-domain in the registry pass for intended-vs-actual tick wiring.

---

## Addendum — 2026-10-25 resolution pass

The Oct-8 inventory was re-verified file-by-file. Findings:

**Stale verdicts (listed as dead, actually live):**
- `engine/npcAI/contextBuilder.ts` — imported by `tick/phases/phase01_week_npc_ai.ts:24` (canonical `AIContext` ctor; 7 test files).
- `engine/systems/economy/infrastructureValidation.ts` — imported and used by `InfrastructureService.ts` (`validateConstruction`, `isUnexpectedFailureReason`).
- `components/ui/sidebar/index.ts` — live shadcn barrel; imported by `AppLayout`, `AppSidebar`, `AppSidebarSections`, `TopNavBar`.
- `engine/almanac/index.ts` — live; imported by `engine/historyCache.ts` (+ 3 test files) for `AlmanacSnapshot`.
- `components/game/boutReplay/boutCanvas/index.ts` — live; 5 boutReplay consumers.
- `engine/bout/kimarite/index.ts` — live; imported by `ReplayMetadata.ts`, `KimariteSelectionEngine.ts`.

**Adopted instead of deleted (constants now used):**
- `constants/ui/kesho.ts` — adopted; `keshoEffects.tsx`, `keshoBorders.tsx`, `KeshoMawashiDisplay.tsx` now import the `KESHO_*` constants (inlined magic numbers migrated; stale constants corrected to live values).
- `constants/ui/presenters.ts` — slimmed to `RANK_SCORE_*` and adopted by `presenters/rikishi/transformers/career.ts`. `SPONSOR_*` relocated to `constants/engine/sponsors.ts` and wired into `SponsorContractService`; `BASHO_TOTAL_DAYS`/`PRESTIGE_TIER_*`/`HALL_OF_FAME_SLICE_COUNT`/`ROSTER_LIMIT`/`RANK_SCORE_DEFAULT_SIDE` dropped as stale or duplicated (`BASHO_DAYS`/`BASHO_FINAL_DAY` are canonical).
- `constants/engine/koreYoriSanyaku.ts` — wired: `bashoProjections.ts` now emits `sanyakuCallout` (rendered on BashoPage via `SanyakuCallout`) when the next bout is one of the day's final three.
- `components/ui/Sparkline.tsx` — **kept intentionally** (planned future charts); remains in knipGuard allowlist.

**Deleted:**
- `components/media/PressConference.tsx` (superseded by live `game/PressConference.tsx`)
- `components/ui/colorMaps.ts` (+ its test) — dead variant of live maps
- `contexts/domainHooks.ts` (+ its test) — zero-logic `useGame()` pass-throughs
- `engine/npcAI/strategies/sponsor/SponsorStrategy.ts` — interface, zero implementers
- `constants/engine/narrativeFlavor.ts` (+ its test) — fully redundant: all ~20 artifact descriptions already in `glossary/terms.ts`; seasonal flavor covered by `calendar.ts` `getSeasonalFlavor`; `RANK_HONORIFICS`/`DOHYO_IRI_DESCRIPTIONS` were unconsumed speculation
- Dead barrels (12): `components/{charts,game,layout,ui}/index.ts`, `constants/ui/index.ts`, `engine/{strategy,tick}/index.ts`, `engine/systems/{economy,governance,keshoMawashi,narrative,worldCircuit}/index.ts`

**Related magic-number sweep:**
- `tickDaily.ts` ×2, `bashoSlice.ts`, `recapProjections.ts` ×2 — `day > 15`/`day === 15` → `BASHO_FINAL_DAY`
- `AdvisorService.ts` `MAX_ROSTER = 30` → `HEYA_ROSTER_HARD_CAP` in `constants/engine/roster.ts`
- `WelfarePanelSections.tsx` `HEALTH_COLORS` (duplicate) → `HEALTH_COLOR` from `constants/ui/perception.ts`

`knipGuard.test.ts` allowlist reduced to `Sparkline.tsx` + `testFixtures.ts`. §2–§4 inventories should be regenerated before the next consolidation wave (this file is historical).
