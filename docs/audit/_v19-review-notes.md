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
