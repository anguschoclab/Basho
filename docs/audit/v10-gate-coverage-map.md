# v10 Gate Coverage Map

> **STALENESS NOTICE**: point-in-time snapshot retained for historical context.
> Gate contents and file counts drift with the codebase; re-derive against
> current sources before relying on specific rows.

Generated: 2026-10-08 · Branch: `audit/v10`
Purpose: enumerate what each existing gate *actually proves* vs. what it cannot
prove, so the v10 audit fan-out does not re-verify gated classes — and so gate
*integrity gaps* are themselves findings.

## Gate inventory

| Gate | Mechanism | Actually proves | Cannot prove / gaps |
|---|---|---|---|
| `typecheck` CI + `bun run type-check` | tsgo `--build --force` | Compiles | Behavioral correctness |
| `lint:strict` (slow gate + CI `lint:commit`) | `eslint . --max-warnings 0` | Style/rules incl. hooks, react-compiler warnings as warnings→gated | Custom semantics; `lint` script has `|| true` (never fails) — only strict/commit variants gate |
| eslint `no-restricted-imports` (engine→UI) | `eslint.config.js:56-93` | Engine never imports UI | — |
| eslint `no-restricted-imports` (UI→engine) | `eslint.config.js:112-166` | UI can't import listed engine subpaths | **Partial denylist**: `@/engine/types/*` other than `world` fully open — UI already value-imports `FACILITY_REGISTRY` (`InfrastructureDashboard.tsx:26`, `GlobalStrategicHub.tsx:10`) and `toRankPosition` fn (`RivalryCard.tsx:17`). `matchmaking/`, `npcAI/` (dir), `governance/`, `training/`, `persistence/`, `worker/`, `simulation/`, `agents/`, `advisor/`, `prestige/`, `loop/`, `actions/`, `data/`, `lifecycle/` and top-level files (`economics`, `schedule`, `EventBus`, `mergers`, `holiday`…) are NOT in the denylist. Latent, not exploited (imports today are types + 2 pure helpers). |
| `importBoundary.test.ts` | fs scan | engine→UI imports absent; no UI `import ... @/engine/types/world` | Doesn't check other engine types/paths — narrower than eslint (redundant but harmless) |
| `mathRandomScan` + eslint `no-restricted-properties` + determinism greps | static | No `Math.random`/`Date.now` in engine | Shared-seed/label-reuse determinism smells (correlated draws) — runtime property |
| `rngDeterminism.test.ts` | behavioral | Seeded replay equality for covered paths | Uncovered stochastic paths |
| `phasePurity.test.ts` + `purity-lint.sh` | static | Phases don't violate purity rules | Phase *ordering*/boundary semantics (WS1) |
| `knipGuard` | subprocess knip | No unused *files*/deps per knip config | Exported-but-uncalled symbols inside used files (that's orphanTracker's job) |
| `orphan-audit` + `orphanTracker` + `unreferenced-exports` | subprocess + CSV registry | New unreferenced exports tracked; baseline classified | **Integrity gap found v10**: mass `candidate`→`intentional` reclassification (`ffe7e08b`) swept **33 fully-dead functions** (def-only, never called anywhere) into `intentional` — incl. entire dead submodules: `kachiNokori.ts` helpers (hasKachiKoshi/isMakeKoshiConfirmed/calculateKachiNokoriForStandings/getYushoRaceLeaders), `MyosekiTradingService` market ops (initializeMyosekiMarket/listMyosekiForSale/returnLeasedMyoseki), `entityAccess.ts` (4 helpers), `ImpactBuilder` convenience wrappers (3), `shikona/helpers` (3), NPC strategy getters (2). Plus 17 `genuine` open items. See registry. |
| `dead-service-wiring`, `*-surface` tests (per-domain) | structural assertions | Named services are wired into tick/handlers | Whether the wiring produces *correct* behavior (semantic) |
| `ci-gates.test.ts` | `toContain` pins on key files | Pinned strings present | Vacuous pass if pin string could appear in a comment; coverage of "required" set is editorial |
| `staleDocs.test.ts` | path resolution + annotation check | `bun run <path>` refs resolve; audit docs w/ regex-methodology mentions carry staleness annotations | **Doc-vs-code content drift** — `worker-command-surface.md` still lists deleted `AUTO_SIM_DAYS`; `phase-dependency-graph.md` ~15 nodes vs ~24 phase files; CLAUDE.md counts stale (860 files → actual 882 test files) |
| `weakAssertionAudit` | 2 pattern checks | No sole-`expect(true)` / all-`toBeTruthy()`<3 files | Tautological table assertions, mock-echo assertions, can't-fail assertions (WS7) |
| `dependencyAudit` | package.json checks | No dep/devDep dupes; no eslint pkgs in deps | Unused deps (`@tanstack/react-query` — provider-only, zero hooks), `bun audit` vulns (53 advisories ungated) |
| `saveLoadIntegrity` | round-trip tests | Covered fields serialize correctly | Full WorldState field census vs serializer; migration/unknown-version behavior |
| `route-reachability` | route tree scan | Routes registered/reachable | Whether route content works (render crashes) |
| `dateArithmeticGuard` | pattern scan | Flagged date patterns | Boundary semantics (day-0, double-fire) |
| `correctnessTraps` | pattern scan (parseInt radix etc.) | Specific enumerated traps | Everything not enumerated |
| `accessibilityAudit`/`dialogAccessibilityGuard` | pattern scans | Specific a11y patterns (aria-hidden color-only etc.) | Semantic a11y (roles, labels, keyboard flows) |
| `reactHygieneScan`, `tailwindAntipatterns`, `stateShapeLeaks`, `noConsoleInEngine`, `event-log-categories`, `dtoCompleteness`, `npc-wiring`, `electron-parity`, `shell-contract` | pattern scans | Their specific enumerated contracts | Anything outside the enumerated patterns |
| `noObsoleteSnapshots`, `agent-behavior`, `orphan-gaps`, `noSubprocessInUnitTests`, `testTimeoutBudget`, `testTimingsBudget`, `factoryDiscipline` | meta/audit | Their specific contracts | — |
| Perf gate (`perf-gate-check` + `bench-pipelines` in CI) | S1/S2/S3 timing vs baseline | No >15% p50/p99 regression on gated scenarios | **Baseline stale** (`perf-baseline.json` = 2026-08-09); nothing gates per-phase time, presenter cost, payload size, memory |
| `bundleBudget` | size thresholds | Chunks under budget | Composition smell (dead deps still bundled — react-query provider) |
| `headless-playthrough`, `simulationInvariants`, `advanceCalendarDays`, `yokozunaPresence`, `yokozunaPromotionAutoSim` | long sims | Sim completes; invariants hold | **yokozuna promotion reachability** — presence test passes while reporting 0 yokozuna in 12 basho; perf sim fails to produce a promotion in 18 basho (pre-existing) |
| Playwright e2e (smoke+soak, not in CI) | 4 specs | golden path, reload-restore, basho lifecycle, year sim | Save import, governance ruling, recruitment, finances, settings, museum — uncovered flows |
| Coverage thresholds (v8) | 70/75/65/70 | measured files meet bars | **~337 files unmeasured**: 237 `components/*.tsx`, 37 `pages/*.tsx` (pages not even in `include`), 63 `constants/*.ts` |
| `engine-reviewer.ts` + its tests | `reviewSource` heuristics | Heuristics correct *on synthetic samples* | **Never scans the real tree** — decorative guard; mutable-state-leak heuristic unenforced |

## Cross-cutting blind spots (what NO gate covers)

1. Semantic correctness of domain logic (WS2's hunt classes).
2. Vertical-slice reachability of each of the 65 worker commands (WS3).
3. Value truthfulness of rendered UI (WS4).
4. Save version/migration behavior + corrupt-store recovery (WS5).
5. Perf outside S1–S3 + bundle composition (WS6).
6. Test tautology + assertion strength (WS7).
7. Scripts/config/CI/docs hygiene (WS8).
8. Spec-vs-implementation deltas (WS9).
