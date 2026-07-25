# Execution Rules
When running shell commands or passing file paths, **always wrap paths in double quotes**. Never use backslash-escaped spaces. For example, you must use "src/folder with spaces/file.ts" instead of src/folder\ with\ spaces/file.ts.

---

# Sumo Manager Pro — Codebase Reference

## Stack
- **Vite + React 19 + TypeScript** (NOT Next.js — never add "use client")
- **TanStack Router** (routes.tsx), **shadcn/ui + Tailwind**, **Recharts**, **Framer Motion**
- **Vitest** (unit), **Playwright** (E2E), `bun run test` to run all tests (NOT `bun test` — that invokes Bun's native runner, which doesn't understand vitest)
- **Python** is installed and available

## Directory Map
```
src/
├── engine/          Deterministic simulation core
│   ├── types/       All interfaces (WorldState, Rikishi, Heya, BashoState, BoutResult)
│   ├── tick/        advanceOneDay + phase runners + pipelines
│   ├── tick/phases/ 20+ phase files (phase0x_*.ts)
│   ├── systems/     Domain subsystems (bout, economics, health, training, welfare, recruitment, narrative, media)
│   ├── bout/        Bout simulation (boutPhysics, kimariteStrategy, kimariteEvaluator)
│   ├── banzuke/     Rank promotion logic
│   ├── governance/  GovernanceService, governanceReview
│   ├── narrative/   BardEngine + archive.json templates
│   ├── matchmaking/ Swiss pairing algorithm
│   ├── core/        EntityCollection, SimulationRunner, RNGRegistry
│   └── rng.ts       SeededRNG, rngFromSeed(), rngForWorld()
├── pages/           React page components
├── components/      UI components (layout, game, dashboard)
├── presenters/      uiDigest.ts, selectors.ts, uiModels.ts, projections/ — engine→UI translation
├── contexts/        GameContext + reducer slices (coreSlice, timeSlice, bashoSlice, …)
├── routes.tsx       TanStack Router route tree
└── App.tsx          Root with providers
```

## Key Types (src/engine/types/)
| Type | File | Critical Fields |
|------|------|----------------|
| `WorldState` | world.ts | `id`, `seed`, `year`, `week`, `dayIndexGlobal`, `cyclePhase`, `rikishi: Map`, `heyas: Map`, `currentBasho`, `events`, `governanceLog`, `trainingState: Map` |
| `Rikishi` | rikishi.ts | `id`, `shikona`, `heyaId`, `division`, `rank`, `side` (east/west), `stats`, `injured`, `marketability?` |
| `Heya` | heya.ts | `id`, `funds`, `scandalScore`, `governanceStatus`, `welfareState`, `politicalCapital`, `ichimon`, `rikishiIds`, `activeLoans` |
| `BashoState` | basho.ts | `bashoName`, `day` (1–15), `matches[]`, `standings: Map` |
| `BoutResult` | basho.ts | `boutId`, `winnerRikishiId`, `kimarite`, `kimariteName`, `upset`, `isKinboshi`, `kenshoEnvelopes`, `pbp[]`, `narrative[]` |
| `GovernanceStatus` | economy.ts | `"good_standing" \| "warning" \| "probation" \| "sanctioned"` |
| `WelfareState` | economy.ts | `welfareRisk` (0–100), `complianceState` |

**`cyclePhase` values:** `"pre_basho" | "active_basho" | "post_basho" | "interim" | "banzuke_reveal"`
**Basho names:** `"hatsu" | "haru" | "natsu" | "nagoya" | "aki" | "kyushu"` (Jan/Mar/May/Jul/Sep/Nov)

## Tick Pipeline (src/engine/tick/tickDaily.ts)
`advanceOneDay(world)` runs in this order:
1. **phase00_preflight** — increment day, check phase transitions
2. **phase01_daily_*` — economy micro-tick, sponsors, welfare decay (every day)
3. **phase01_week_*** — training, health, governance, recruitment, rivalries, welfare (every 7 days)
4. **phase01_economy** — weekly financial settlement (every 7 days)
5. **phase02_context** — compute ActiveModifiers (multipliers from facilities + oyakata)
6. **phase03_progression** — apply training gains, injury/recovery
7. **phase04_welfare** — risk scoring, compliance transitions
8. **phase05_monthly_*** — salaries, rent, loan payments (every 30 days)
9. **phase06_yearly_*** — Hall of Fame, era labels (year boundary)
10. **phase06_narrative** — BardEngine story generation

**Specialized pipelines:** `bashoPipeline` (active tournament days), `offSeasonPipeline` (interim)
**Entry for worker/slices:** `src/engine/tick/tickOrchestrator.ts` — `cloneWorldForTick()` (structuredClone) + `tickOrchestrator()` (clone + advanceOneDay)

## Presenter Layer
- **`uiDigest.ts`** — `buildWeeklyDigest(world)` → `UIDigest` (news items grouped by category). Also exports helper fns: `formatFinePenalty`, `getStatusColor`, `getStatusLabel`, `spendPoliticalCapital`, `toPrizeBand`, `toScandalBand`, `projectMergerWarnings`
- **`selectors.ts`** — memoized selectors via `createSelector()` wrapper. Key exports: `selectInjuredRikishi`, `selectRecentEvents`, `selectPromotionCandidates`, `selectKadobanRikishi`, `selectTopRivals`, `selectRetiredRikishi`, `selectHeyasWithCriticalWelfare`, `selectMergerCandidates`
- **`uiModels.ts`** — `UIRikishi` shape + `projectRikishi(rikishi, world)` projection

## State Management
- **`GameContext`** (contexts/GameContext.tsx) — single React context with `useReducer`
- **`GameState`** shape: `{ phase, world, digest, … }`
- **Slices:** `coreSlice`, `timeSlice`, `bashoSlice`, `heyaSlice`, `financeSlice`, `rosterSlice`, `bookmarkSlice`

### Command path convention
- **Engine mutations go through the Web Worker** (`src/engine/worker/engine.worker.ts` `COMMAND_HANDLERS` + `src/engine/worker/types.ts`), dispatched from the UI via `useGameStore((s) => s.sendCommand)`.
- **The reducer (`src/contexts/*Slice.ts`) is only for:** transient UI state (`setPhase`) and the synchronous bout-simulation/time-advance path that drives match animation (`bashoSlice`, `timeSlice`).
- Do NOT add new engine-mutating actions to the reducer slices — they will not be reachable from the canonical command path.
- **`gameReducer`** combines slices + calls engine functions
- **`issueRuling`** is exposed via `GameContext` and sends `ISSUE_RULING` command to the worker (used by GovernancePage).

## RNG — Critical Convention
**ALWAYS use seeded RNG. Never `Math.random()`.**
```typescript
// From world (preferred in tick code):
const rng = rngForWorld(world, "subsystem", "label");

// From explicit seed (UI / tests / one-off):
const rng = rngFromSeed(`nat_${r.id}_${world.year}`, "naturalization", "chance");

// Direct class (replay, worker):
const rng = new SeededRNG("seed-string");

// API: rng.next() → [0,1), rng.int(min,max), rng.bool(p), rng.uuid("prefix")
```

## EventBus Pattern
```typescript
// Log an event:
logEngineEvent(world, { type: "rikishi_injury", category: "health", phase: "weekly",
  importance: "major", heyaId, rikishiId, title, summary, data: {…}, truthLevel: "public" });

// EventBus shortcuts (for governance/basho/media):
EventBus.governanceRuling(world, heyaId, { incident, reason, score }, "major");

// Query events:
queryEvents(world, { category: "health", limit: 50 });
```

## BardEngine Narrative
- Templates live in `src/engine/narrative/archive.json` (domain.subdomain.type hierarchy)
- `BardEngine.resolve(rng, "path.to.template", { heya, severity, amount })` → `{ text, id, path }`
- Token format in templates: `%HEYA%`, `%AMOUNT%`, `%INTENSITY_LABEL%` (NOT `%HEYA_NAME%`)
- **generateGovernanceHeadline** takes a **named-args object**: `{ world, heyaId, templatePath, severity }` — NOT positional args

## generateGovernanceHeadline — Correct Call Signature
```typescript
// CORRECT:
generateGovernanceHeadline({ world, heyaId, templatePath: 'institutional.governance.scandal', severity: "major" });
// WRONG (breaks silently — severity ends up as undefined):
generateGovernanceHeadline(world, heyaId, severity, reason);
```

## Test Setup
- **Runner:** `bun run test` (Vitest, jsdom environment). Do NOT use `bun test` — that invokes Bun's native test runner, which doesn't understand vitest's jsdom environment or setup files.
- **Mock factory:** `src/engine/__tests__/utils.ts` → `mockRikishi(id, overrides?)`
- **trainingState in mocks** must be `new Map([["heyaId", {...}]])` — it's a Map, not a plain object
- **Coverage thresholds:** lines 60%, branches 50% (v8 provider)
- **Current status:** 195 test files, 1703 tests, all passing. `npx tsc --noEmit` clean. `npx vite build` succeeds.

## Routing (routes.tsx — TanStack Router)
Key routes: `/` Dashboard, `/stable/roster`, `/basho`, `/banzuke`, `/office/finances`, `/jsa/governance`, `/history`, `/rikishi/$rikishiId`, `/hall-of-fame`
**Lazy loading:** All page components except `MainMenu`, `NewGameWizard`, and `Dashboard` are lazy-loaded via `React.lazy()` + `Suspense` with a spinner fallback. This splits the bundle into per-route chunks.
**Vendor chunks:** `vite.config.ts` defines manual chunks for `vendor-react`, `vendor-recharts`, `vendor-framer`, `vendor-lucide`.

## Known Issues & Gotchas
1. **`economics.ts`** — `processHeyaFinances()` and `tickWeekEconomics()` are dead (replaced by FinanceCalculator). Don't call them.
2. **`as any` in `descriptorBands.ts`** — `|| ("Average" as any)` and `|| ("Fresh" as any)` — unjustified, should be typed.
3. **BardEngine token mismatches** — some archive.json governance templates may use `%HEYA_NAME%` but code passes `heya` context key. Audit before adding new templates.
4. **HistoryDashboard** — `src/pages/HistoryDashboard.tsx` is complete but routed at `/museum` — confirm before adding UI links.
5. **`FogOfWarService.ts`** imports BardEngine from `"../../narrative/BardEngine"` (not `"../narrative/BardEngine"` — systems/narrative is different from engine/narrative).
6. **`rivalriesProjections`** — reads `world.rivalriesState.heyaRivalryPairs` (structured `Record<string, RivalryPairState>`). Do NOT confuse with the old flat `world.heyaRivalryPairs` field which was removed.
7. **`engine/index.ts` barrel removed** — import directly from subsystem files (e.g. `@/engine/systems/recruitment/ScoutingService`).

## Refactoring Plan Status
Plan file: `.claude/plans/encapsulated-herding-origami.md`

| Phase | Items | Status |
|-------|-------|--------|
| P0 (bootstrap) | EconomicConstants, FinanceCalculator, remove pbp export | ✅ Done |
| P1 (critical) | FinanceCalculator integration, BardEngine tokens, dead code, HistoryDashboard route | ✅ Done |
| P1 (type safety) | `as any` casts, naturalization RNG | ⏳ Pending |
| P1 (tests) | Centralize mocks, banzuke tests, basho lifecycle tests, governance tests, coverage config | ⏳ Pending |
| P2 (modularization) | matchmaking.ts split, kimariteStrategy split, BoutReplayViewer split, selectors, merger UI | ✅ Done |
| Dead Code Audit | Engine modules, components, constants, context actions, CSS, barrel cleanup, lazy loading, vendor chunks | ✅ Done |

## New UI Components Added (May 2026)
Dashboard widgets: `PromotionPipelineWidget` (rank distribution funnel + Ozeki/Yokozuna/Kadoban lists)
Economy: `FinancialTrendsChart` (12-week income vs burn), `SponsorSatisfactionChart` (horizontal bars), `FacilityROIChart` (cost vs efficiency per axis), `DebtSection` now has payoff progress bars
Training: `InjuryRiskHeatmap` (condition/fatigue/risk score grid)
Basho: `BashoStandingsEvolution` (day-by-day cumulative wins LineChart, active_basho only)
Banzuke: `YokozunaTrajectory` (Ozeki promotion run cards with yusho track + support bars)
Rikishi: `RikishiCareerTab` now has a real ComposedChart (rank line + win-rate bars, dual Y-axis)
