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
