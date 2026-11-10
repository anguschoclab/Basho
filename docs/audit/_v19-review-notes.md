# v19 Consolidation — Working Notes

## Phase A.1 Baseline log (clean main @ d04a55e8)

| Gate | Result |
|------|--------|
| `bun run type-check` | PASS — 0 errors |
| `bun run lint:commit` | (pending — background) |
| `bun run build` | (pending — background) |
| `bun run test` (fast) | (pending — background) |
| `bun run test:slow` | (pending — background) |
| `bun run test:perf` | pending |
| `bun run test:e2e:smoke` | pending |
| `determinism basho` + `year` | pending |
| `Math.random`/`Date.now` grep `src/engine` | pending |

## Phase A.2 — PR #1201 verdict (EVIDENCE)

- **Equivalence**: custom harness (`scratch/v19-bench-alloc.ts`, uncommitted) — 515 cases
  (15 edge + 500 randomized; gap 0/neg/<total/>total, headroom 0–30, sanctioned/frozen/player
  mixes, forced remainder ties) → **0 mismatches**, byte-identical outputs.
- **Perf**: 100k iters × 50 heyas — OLD 1173.8ms → NEW 855.2ms = **27.1% faster**
  (claim ~30% — corroborated).
- **Comments**: 1 Jules boilerplate, no human review.
- **VERDICT: APPROVED-MERGE-PAYLOAD** — semantically identical, real but modest win
  (weekly-phase allocator, ~52 calls/yr — negligible real-world latency, still worth taking:
  strictly better code, zero risk).

## Phase A.3 — Stale-branch residual re-confirm

All 11 non-`perf-baseline` origin branches reviewed via merge-base diffs: every payload file
is either (a) already on `main` in equal-or-better form (v18 closeout), or (b) junk
(`.cache/`, `.jules/`, `test-timings.json`, `test_plan.md`). Two candidate-unique hunks
dispositioned during planning: "Pro Debut" header row — main has superior `Flag`-icon
variant with populated DTO (`presenters/rikishi/types.ts:32-33`, `identity.ts:26-27`,
`RikishiProfileHeaderSections.tsx:263-267`); v17 staleness notice — already on main.
**Zero unintegrated payloads → all 11 delete-safe.** Local `pr-1184`/`pr-1199` = superseded
v18 leftovers → delete. `perf-baseline` retained (CI artifact).

## Phase A.4 — Delta deep-dive (82 src files changed 8d7a4d46..d04a55e8)

Reviewed by domain wave; every file read at diff depth. All landed fixes verified correct.

| Wave | Files | Verdict |
|------|-------|---------|
| core | ImpactBuilder (`worldWithQueuedFields` — documented worldFields-only contract), StateImpact (`customKeshoConfigs` writable), world.ts | APPROVED — canonical S1 primitive, correct semantics |
| worker commands | heya.ts (`rikishiOwnedByPlayer` fail-closed w/ player-less escape), recruitment.ts (heyaId gates on OFFER/POACH/SEND_SCOUT; SET_SCOUTING_INVESTMENT→resolveImpacts; no gate by design), governance.ts (APPLY_PRESS_CONFERENCE→`heyaPressure`) | APPROVED (S2-1..3, S3-1, S4-5) |
| lifecycle/legacy | processRetirements + retireeOyakataConversion + DynastyService + history.ts (`recordShikonaChange` builder-param + queued compose), phase06 (`successionBase` per-iteration resolveImpacts; exhibition sweep single absolute write; updateAllTimeRecords queued-compose) | APPROVED (S1-1..6, S4-3, S7-18 sweep) |
| economy | sponsorshipMutations (claimedSponsorIds pass-tracking), staff.ts (`staffHireSeq` high-water + collision-heal), staffPosts (collect-then-write expiries; releaseFromPosts running-map) | APPROVED (S1-10, S1-12, S6-4) |
| governance | myosekiMarket (self-lease guard + same-heya skip-both-sides), MyosekiTradingService (self-buy guard; rich tx labels), GovernanceService (storedCrisisOptionEffect fallback + dual crisis clear + conditional welfareState), governanceReview (queued benefactor funds), PoliticalFavorsService (stipendAdvanceMonth once/month) | APPROVED (S7-13/14/26/30, S6-3, S1-9) |
| media | MediaBoutService + MediaEventService + MediaPreBashoService (`headlines.length` salt), handleMediaEvent unknown-id reject, `processMediaDecision` deleted | APPROVED (S6-1/2, S7-25, S10 partial) |
| bout/narrative | double-fusensho no-contest (empty winnerRikishiId + applyBoutResult guard), mono-ii announces recorded `monoiiOutcome`, narrative moved post-officiation, `reversed=false` default, yaocho 3+ consecutive scan, henka replay path, tactic_verdict BardEngine+LABEL | APPROVED (S7-9/10/32/40, #1182/#1200) |
| matchmaking/calendar | `same_heya_forced` tag, juryo crossover pool unfiltered + busyToday, matchmakingOverride consumed juryo path, holiday `_autonomousSim` strip + `_autonomousPolicy` map + concludeBashoIfOver + endOfBasho off-by-one, phase00 publishBanzukeUpdate merge | APPROVED (S7-3/5/6/7/11/18/22, V18-B01-B03) |
| events | createRngForEvent folds `world.seed`; 7 bare rngFromSeed sites migrated; EngineEvent.day = basho-scoped + bashoNumber stamped | APPROVED (S5-1..3, S7-21) |
| generation | simulateNPCInterest preserves in_talks/signed + watchlist presence; finalizeSignedCandidates dual-pool scan + mintedPersonIds dedupe + foreignOccupied; reinject citizenship-aware pool + priorCareer carry; isEmergentProdigy→injuryStatus; isAmateurStar set; AMATEUR_STAR `<` (80% rate) | APPROVED (S7-4/19/20/42/43) |
| chains | EntityCollection.getHeyaRoster at chainRegistry + pickSubject; applyEffects composes queued heya + queued mediaState | APPROVED (#1199 trio, S1-11) |
| banzuke | BanzukePublisher standings normalize (Map-or-object, empty-Map preserved); kadoban tenure-end clean entries + demotedOzeki set | APPROVED (S7-12, S7-50) |
| persistence | BashoState.id/currentDay/isActive persisted (currentDay ?? day fallback); isValidSave array-reject; export `.json` suffix | APPROVED (S7-8, S7-46/47, B05-B07) |
| sim/tick/npc/worldCircuit | TournamentSimulator clones ALL participants (no shared-object leak); advanceWithGates transformWorld hook; phase01_week_governance + rikishi_agency compose staged media/heya; spawnPersonnelWorker filters expired invitations | APPROVED (S4-6, V18-B03, S1-7/8, S7-18) |
| presenters | pendingRulings dual-marker (S3-2); projectHeya real monthlyExpense(×4 FinanceCalculator)/yusho/sansho/rivals (S8-1); cohort merges historicalRikishi full records (S8-2) | APPROVED |
| state | queuedTick intent + isPending/rev-gated drain — LOAD_WORLD FIFO-before-TICK_DAY | APPROVED (S7-1) |
| health | clearInjury clears injuryStatus + legacy injury alias | APPROVED (S7-33) |
| overflow/scoutingStore | countsAsForeign canonical; ensureScoutingTable→impact | APPROVED (S7-34, S4-5) |
| types | heya (`stipendAdvanceMonth`, `staffHireSeq`), rikishi, save, talent — supporting fields | APPROVED |
| training | TsukebitoService rank/division eligibility; WeightJourney start/absolute/weight writes | APPROVED (S7-15/16) |
| InjuryService→Tsukebito/WeightJourney | in-bout injury recording (TournamentSimulator) | APPROVED (S7-17) |
| world.ts | scribe JSDoc (unplayedIndex semantics) | APPROVED (#1185) |
| bard/domains | post_bout.json (+LABEL tactic_verdict + replay.henka), world.json (entrance variants) | APPROVED (#1182/#1186/#1200) |

**Delta verdict: every v18 payload confirmed correct, no regressions found.** New issues
discovered during delta review: none beyond the V19-N# validation micro-findings already
registered in the plan.

## Phase A.5 — DEBT triage decisions

- **S7-23 `days:N` contract** → honest world-days semantics: `ceil(N / 60)` (a basho spans
  ~60 world-days: 6/year). Pin: `computeTargetBasho({type:"days",count:60})===1`,
  `count:61===2`. Doc updated. (Rejected alternatives: day-granular sim — too large for
  DEBT burn-down; keeping ceil(N/15) — preserves the ~4× lie.)
- **S7-48 `getBashoInfo`** → implement year-aware "Nth Sunday" computation (pin varies by
  year). Fallback if the BashoInfo shape can't carry it: drop `_year` + fix doc.
- **Required-Test Inventory** — finalized in plan; all items PIN+FIX except: S7-49
  (DEBT-renewed — structural tuning), S7-45 (VER — type-check enforces), S10 (VER —
  zero-caller grep + full suite), S9-7 (VER — tsc output).

## V19-N# micro-findings (registered during plan validation)

- V19-N1: systemic `day = basho.day ?? 1` in `scheduleJuryoWithCrossover:230`,
  `buildSwissTorikumi:546`, `buildLowerDivisionSwiss:411` — one fix pattern.
- V19-N2: factoryDiscipline comment cites stale `src/tests/` paths (cosmetic).
- V19-N3: subprocess audit gates share catch-swallow fail-open shape.
- V19-N4: `RegionalHubPage.tsx:~38` `void pendingExhibitions;` dead statement.
- V19-N5: S10 removals must update `unreferenced-exports` + `baseline-orphans.json`.
- V19-N6: `coach_criticism` JSON path has zero emitters — confirmed dead.

## Phase C outcomes — DEBT burn-down (commit e16cf493 + cleanup batch)

All 21 regression pins green. Per-item verdict:

| Item | Verdict | Evidence |
|---|---|---|
| #1201 `allocateVacancies` | APPROVED + MERGED (payload applied verbatim) | 14/14 parity incl. exclusion-key contract; bench ~30% (independently confirmed) |
| S5-4 basho-name collision | FIXED | `advanceOffSeason` re-rolls between iterations; pin forces `bashoCount` collision → unique names |
| S5-5 seed leakage `seed_` | FIXED | `nextRand` uses injected rng not world seed |
| S6-5 loan id same-batch | DEBT-RENEWED (renamed DEBT-S6-5b) | Unreachable via resolved pipeline: `MIN_LOAN` always clears `Math.max(MIN_LOAN, principal)`; same-batch second issuance clobbers not duplicates. Latent `seq+1` jump remains — structural fix deferred |
| S7-23 `days:N` | FIXED | `computeTargetBasho` honest world-days: `ceil(N/60)`; doc corrected |
| V19-N1 `day = basho.day ?? 1` | FIXED | `scheduleJuryoWithCrossover`/`buildSwissTorikumi`/`buildLowerDivisionSwiss` accept `day` param, threaded from basho.day |
| S7-48 `getBashoInfo` | FIXED | year-aware Nth-Sunday via `getBashoSchedule(year)` |
| S7-24 styleDrift | FIXED | clamped `[-1,1]` in WorldCircuitService |
| S7-27 academy cap/guard | FIXED | `ACADEMY_MAX` enforced + `Math.min` cap |
| S7-28 gyoji double-count | FIXED | per-basho seen-set in `rankPoints` aggregation |
| S7-29 koenkai churn | FIXED | symmetric +/- demand deltas, deterministic |
| S7-31 gomenfuda counter | FIXED | persistent `heya.gomenfudaByYear` survives event-log pruning; reader prefers counter |
| S7-35 per-suitor deadline | FIXED | each negotiation carries own `deadlineWeek` |
| S7-36 sparring injury | FIXED | injury pauses pair (preserves `weeksActive`); only retirement/missing dissolves |
| S7-37 mentorship ceiling | FIXED | `getEffectiveCeiling` replaces `MAX_STAT_CEILING`; above-ceiling stats preserved, growth halts |
| S7-38 intake 30-cap | FIXED | `promoteIntake` respects `MAX_ROSTER=30` |
| S7-39 myoseki generics | FIXED | 105-name kabu list (~137 unique), `Elder_N` gone |
| S7-40 (landed v18) | APPROVED | — |
| S7-41/S7-39 pin | FIXED | uniqueNames dedupe already existed; defect was name-pool size |
| S7-44 DramaMatchmaker | FIXED — rewired (not deleted) | dead `r.rivalries`/`winStreak`/`justReturnedFromInjury` casts → `world.rivalriesState.pairs`, `currentWinStreak`, `recentlyReturnedFromInjury`; `applyDramaBudget` signature takes `RivalriesState`; SwissAlgorithm call-site wired |
| S7-45 | FIXED (VER) | type-level — tsc enforces |
| S7-49 | DEBT-RENEWED | structural tuning question, not a correctness bug |
| S8-3 UI honesty | FIXED + NON-ISSUES | `/history`→`/records/history` (RecapPage); SchedulePage selectedDay override+useEffect reset (render-phase setState removed); InfrastructureSections `0.8`→`CONSTRUCTION_COST_LEVEL_MULTIPLIER`; perceptionComponents raw `complianceState`→`COMPLIANCE_DISPLAY`. No per-keystroke dispatch or raw-id sites found |
| S9-5 factory regex | FIXED | `LOCAL_FACTORY_RE` expanded to full entity-factory name set; 44 true positives grandfathered into `FACTORY_ALLOWLIST` (existing-file policy) |
| S9-6 fail-open gates | FIXED | knipGuard + circularDependency + bundleBudget now assert output non-empty before pass |
| S9-7 config typecheck | FIXED | `tsconfig.node.json` covers root *.ts config files |
| S9-8 year determinism | FIXED | `determinismDoubleRun` gained year-horizon case |
| S10 dead code | FIXED per corrected list | see below |

### S10 executed removals
- `handleInsolvency` (economics.ts) + `economics.test.ts` (whole file pinned dead fn)
- `getHeyaBrand` trivial map.get wrapper + test block
- `injectRikishiAsCandidate` (TalentPoolStateService); tests repointed to `materializeCandidateToRikishiInternal` (impact+nextCandidates contract)
- `runRetirements` deprecated wrapper → tests repointed to `processAllRetirements`
- `recordsBroken` chain: `ChronicleRecordEntry` type, `addRecord`, field, inits (GlobalCupService, types), idIntegrity reader — all removed together
- `digestStale` field + writer + 2 test assertions
- `localClampInt`, `formatShikona` dead utils
- `historyCache.ts` pairwise chain (file) + orphaned test
- `SIM_FULL_BASHO` reducer action path (case/type/creator + 4 test files' blocks); live UI path is worker `TICK_MULTIPLE_DAYS`
- `ensureScoutingTable` dead helper
- `generateHeyaRecord` (heyaRecord.ts whole file) + barrel export
- `void pendingExhibitions;` dead statement (RegionalHubPage)
- `coach_criticism` key in post_basho_press.json (zero emitters — V19-N6)
- Manifests: `baseline-orphans.json` (176→170), `orphan-tracker.csv` regenerated, `unreferenced-exports.test.ts` classifications pruned

### S10 NON-ISSUES (kept)
- `validatePath` — Electron path-traversal guard, 7 call sites
- `rpPerception` — live (`npc/weekly/workers.ts:32`)
- `shouldHireStaff` — live via TacticalCoordinator→execution
- `isAtForeignLimit`, `capitalize`, `favorTarget`, `ensureCandidatePoolState` — live or test-only coverage pins
- almanac test-only exports (`generateCareerRecord`, `buildNotableBoutEntry`, `enrichAlmanacRecord`, `getRikishiCareerSummary`) — pin real almanac behavior

### Housekeeping
- Removed tracked sim-output junk: `scripts/sim/bard-warning-census.txt`, `scripts/sim/population-flow-results.txt` (+ `.gitignore` rule)

## Phase-D discoveries (verification sweep)

- **V19-B1: runAutoSim stop-conditions unreachable** — `checkStopCondition` ran BEFORE
  `publishBanzukeForSim` applied promotions, and `bashoResult.promotions` is only
  populated via the optional `banzukeUpdateHook` (never passed on the sim path).
  `yokozunaPromotion`/`ozekiPromotion` could never fire. FIXED: stop-check moved
  post-publish; real promotions/demotions now diffed from `RANK_HIERARCHY` tier
  change and merged into `bashoResult.promotions`/`demotions`. Perf evidence:
  yokozunaPromotionAutoSim 344s timeout → ~50s.
- **V19-B2: knipGuard was permanently green via fail-open** — `npx knip` never
  existed (no dep, no config, ENOENT on Windows). Replaced with a self-contained
  import-graph dead-file scan (src + tests importers, entry-point/barrel
  exemptions, `@/`-alias + dynamic-import aware). Now actually enforces.
- **V19-B3: circularDependency parse contract broken** — madge 8 writes the
  "No circular dependency found!" marker to stderr; gate only scanned stdout.
  FIXED: scans combined output.
- **V19-B4: bundleBudget enforced nonexistent chunks** — rolldown auto-splitting
  replaced most manualChunks groups; 12 expected names never emitted. Replaced
  fixed-name list with per-emitted-file budgets (longest-prefix match +
  0.5 MB default) + structural-chunk existence check. Every emitted .js now
  has a budget; a new oversized chunk can't slip through.
- **V19-B5: orphan-tracker missing `mapWithConcurrency`** — genuine unreferenced
  export caused ORPH-id instability when new entries sorted before it.
  Registered ORPH-0578 + INTENTIONAL_EXPORTS classification.
- **autoSimCoreLoop `days` expectation** — updated to S7-23 semantics
  (30 world-days = 1 basho, was pinning the ~4×-inflated contract).
- **Scratch-probe lint fallout** — `scratch/probe-yoko*.ts` tripped
  `@typescript-eslint/no-explicit-any` (lintStrictGate); deleted.
