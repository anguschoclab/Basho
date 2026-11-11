> **STALENESS NOTICE**: This audit report references legacy regex/grep methodologies that may have been superseded. It is retained for historical context.

# Bug Registry — v19 Consolidation

Bugs found and fixed during the v19 review + DEBT burn-down. Each entry cites
the pin or verification that proves it. Registered DEBT that could not be
resolved this pass is at the bottom.

## Fixed — engine/simulation

| ID | Bug | Fix | Proof |
|----|-----|-----|-------|
| V19-B1 | `runAutoSim` promotion stop-conditions unreachable — check ran before `publishBanzukeForSim`; `bashoResult.promotions` empty without optional hook | Rank-diff promotions computed post-publish via `RANK_HIERARCHY` tiers; stop-check moved after publish | perf test 344s timeout → 56s; probe shows `stoppedBy: yokozunaPromotion` |
| S5-4 | `bashoSeed` collided on same-named basho in one year — identical seed replayed a byte-identical tournament | `bashoSimulated` serial folded into seed label | slow pin (relocated — runAutoSim banned from unit suite) |
| S5-5 | `nextRand` leaked `seed_` prefix into generated ids | uses injected rng, not world seed | v19Regressions |
| S6-5b | loan id same-batch collision (latent — unreachable via resolved pipeline) | DEBT-RENEWED: `MIN_LOAN` threshold always clears; `seq+1` jump structural | documented in notes |
| S7-23 | `computeTargetBasho` `days:N` arm used `ceil(N/15)` — ~4× the requested span | `ceil(N/60)` world-days; doc corrected | pin + updated autoSimCoreLoop test |
| V19-N1 | `day = basho.day ?? 1` systemic across 3 schedulers — mid-basho torikumi built as day-1 | `day` param threaded from `basho.day` | v19Regressions |
| S7-48 | `getBashoInfo` date arithmetic ignored year | year-aware Nth-Sunday via `getBashoSchedule(year)` | pin |

## Fixed — economy/governance/training

| ID | Bug | Fix | Proof |
|----|-----|-----|-------|
| S7-24 | styleDrift unbounded | clamped [-1,1] | pin |
| S7-27 | academy intake overshot capacity | `ACADEMY_MAX` + `Math.min` cap | pin |
| S7-28 | gyoji rank points double-counted across basho | per-basho seen-set | pin |
| S7-29 | koenkai churn asymmetric (gain-only) | symmetric ± deltas, deterministic | pin |
| S7-31 | gomenfuda count lost when event log pruned | persistent `heya.gomenfudaByYear` counter, reader prefers it | pin |
| S7-35 | ANY suitor deadline expiring resolved the whole negotiation | per-suitor withdrawal; resolution only when all deadlines pass | pin + v18Poaching fixture updated |
| S7-36 | sparring injury dissolved the pair (lost weeksActive chemistry) | injury pauses; only retirement/missing dissolves | pin + SparringService test updated |
| S7-37 | mentorship/sparring growth clamped at `MAX_STAT_CEILING` (ignored talent/PA) and silently reduced above-ceiling stats | `getEffectiveCeiling`; above-ceiling preserved, growth halts at ceiling | pin + mentorshipTick test updated |
| S7-38 | youth academy promotion overflowed 30-rikishi roster | cap guard in `promoteIntake` | pin |
| S7-39 | myoseki market minted `Elder_N` placeholder names | full 105-name kabu list (~137 unique) | pin |
| S7-44 | DramaMatchmaker read dead field aliases (`r.rivalries`, `winStreak`, `justReturnedFromInjury`); rivalry branch unreachable (`applyDramaBudget` called without rivalriesState) | rewired to `rivalriesState.pairs`, `currentWinStreak`, `recentlyReturnedFromInjury`; signature fixed + SwissAlgorithm wired | 2 narrative pins |

## Fixed — UI honesty / persistence / infra

| ID | Bug | Fix | Proof |
|----|-----|-----|-------|
| S8-3a | RecapPage linked legacy `/history` | → `/records/history` | grep |
| S8-3b | SchedulePage selectedDay mount-snapshot + render-phase `setSelectedDay` | override + useEffect reset | grep/tests |
| S8-3c | InfrastructureSections hardcoded `0.8` build-cost multiplier | imports `CONSTRUCTION_COST_LEVEL_MULTIPLIER` | type-check |
| S8-3d | perceptionComponents rendered raw `complianceState` enum | `COMPLIANCE_DISPLAY` labels | component test |
| migration | `migrateSave` ran chained migrations (dead in prod, wrong for old saves) | version gate — current accepted, all others rejected | rewritten tests |
| SIM_FULL_BASHO | dead reducer action path (live path is worker `TICK_MULTIPLE_DAYS`) | action/case/creator/tests removed | suite |

## Fixed — test-infra gates (S9 / Phase-D)

| ID | Bug | Fix |
|----|-----|-----|
| S9-5 | factoryDiscipline regex missed most entity-factory names | expanded + 44 real cases grandfathered |
| S9-6 | knip/circular/bundle audit gates were fail-open (passed when tool didn't run) | fail-closed output assertions |
| V19-B2 | knipGuard could never run (knip not installed; npx ENOENT) | self-contained import-graph dead-file scan |
| V19-B3 | madge 8 writes completion marker to stderr | gate scans combined streams |
| V19-B4 | bundleBudget required chunks rolldown never emits | per-emitted-file budgets + structural existence check |
| S9-7 | root config files escaped type-check | tsconfig.node.json covers them |
| S9-8 | determinism gate ran basho-only | added year-horizon case |
| V19-B5 | orphan tracker missing `mapWithConcurrency` → ORPH-id instability | registered ORPH-0578 |

## DEBT renewed / not fixed

| ID | Item | Why deferred |
|----|------|--------------|
| S6-5b | loan-id same-batch seq jump | unreachable via resolved pipeline; structural fix needs issuance ordering redesign |
| S7-49 | (structural tuning question) | not a correctness defect |
| V17-D01/D02 | duplicate MH-* headline ids; myosekiMarket ownerId dangle | carried from v17; simInvariants passed this run — not reproduced |
