# Basho — Consolidated Mega-Plan (living document)

The single living index of shipped workstreams, open findings, and deferred items across all mega-plan cycles. Update this file in place at the end of every mega-plan session; archive each completed session plan verbatim under `docs/plans/archive/` (historical records — never rewrite their findings).

Last harmonized: 2026-11-18 (sources: the 7 plans in `docs/plans/archive/`).

---

## 1. Shipped workstream index

| Workstream | Scope | Commit(s) | Source plan |
|---|---|---|---|
| W0 | Bout-path harmonization — shared `boutPipeline`, canonical `absentRikishi` fusenshō gate, `TournamentSimulator` on real applier | `0fa2a4da` | archive/plan-af555887… |
| C+D | Honest mono-ii — verdict before enrichment, sashichigae flip, torinaoshi rerun, missed-call reviews | `14846966` | archive/plan-af555887… |
| W A | Playing hurt — injured schedulable, `resolveMorningOfDay`, competing-injury penalties, aggravation | `df1fbd7a` | archive/plan-af555887… |
| W B | Juryo→Makuuchi crossover — `planJuryoCallupForMakuuchi`, `excludeIds`, narrative/UI | `a3262e62` | archive/plan-af555887… |
| W E | Home region — geography constants, hometownTier, mental bonus, beats | `25bce43f` | archive/plan-af555887… |
| W J | Venue/dohyo conditions — firm/slick/heavy clay, physics modulation, UI chip | `92f32535` | archive/plan-af555887… |
| W F | Superlatives — `createDefaultRecords`, consecutive-basho streak, leaderboards, iron-man | `b814472a` | archive/plan-af555887… |
| W G | Grip PBP depth — grip transitions, one-kimarite streak beat, technique callouts | `91567ce7` | archive/plan-af555887… |
| W H | Family/school/practice bonds — sibling generation, hard pairing reject, narrative/UI | `929bc5f4` | archive/plan-af555887… |
| W I | Degeiko — `DegeikoService`, `REQUEST_DEGEIKO`, weekly phase, `DegeikoPanel` | `04bbc00c` | archive/plan-af555887… |
| W K | Day-recap headlines at day advance (`generateDayRecapHeadline` in `MediaBoutService`, hooked in `world.ts` before `day++`) | `64b3481e` | archive/plan-af555887… |
| W L | JSA no-byes scheduling — `planDivisionCallups` cascade, minted maezumo, 8th-bout fallback, NPC degeiko parity | `a79f776c` | archive/plan-af555887… |
| W M | Grip-reputation metrics, lifetime ID resolution, maezumo unattached fix | `63ce7cbb` | (plan not archived — predates Nov-18 set) |
| W N | Day-10 commentary — henka dignity + desperation, pull tracking, lower-body injury beats, sibling leaderboard, phase-two metric, new interview types | `8473ad78`, `2548085f` (spontaneous-henka stigma pin) | archive/plan-day10-kyushu.md |
| W O | Day-11 commentary — H2H breakthrough/chipped-away, giant-killer H2H, recent surge; henka stigma metric + repeat defense + NPC counter-awareness | `0f5f6bef` | (plan not archived) |
| W P | Day-12 commentary — chase-pack/spoiler/demotion-watch/playoff-rematch pre-bout beats, slapathon + valiant-loser + near-miss + followup-delivered + alternating-records + week-two-surge, return-streak ≥3, replay variants, 3 new interview types; **`edgeFinishBonus`** body-type physics (BMI-derived), `edgeFailedConversions` metric + `edge_letdown` beat | `223622ed` | archive/plan-day12-kyushu.md |
| JSA v1→v2 | F1–F15 + A1–A12: kinboshi-hansoku exclusion, ginboshi both senses, mochikyukin 0.5×net-wins + zensho-50 + floors, real sansho (shareable/withholdable/multi-award), tomoe-sen, jun-yusho label-only, era-keyed salaries/prizes/teate, kensho ¥10k/¥50k/¥10k makuuchi-gated, fusenpai=same-day loss, playoff day-15 + higher-rank-east, post-2010 foreign quota, roster-cap + free-agency removal, under-23 debut gate, tsukedashi, myoseki 105-cap + jun-/ichidai-toshiyori + intai-kin, **unified committee framework** (banzuke/sansho/YDC/board + deliberation feed) | `c39d3e83`, `6a0a4be4`, `3b27337f`, `a9612c2d`, `b841c043`, `1e11d6cc`, `0b77c377`, `c72df39e`, `322711c3`, `031d9779`, `e4b9b76e` (recap feed), `e17f15e7`, `d0f39d0e`, `0fb97710` | archive/plan-767fdce7… (v1 audit) + archive/plan-2aaf5bef… (v2 execution) |
| Search + oyakata | Global search → oyakata/staff/recruit buckets + WS7 gating; `/oyakata` directory + `/oyakata/$id` profile + `/stable/oyakata` redirect; talent deep-links; same-heya tenure-aggregation fix | `0a3f0f13`, `09be6ce3`, `70eb96e2` (e2e hardening) | archive/plan-a067c57… + archive/plan-86f2a021… (verification) |
| Avatar polish | Retired-avatar propagation (search + profile), wired browThickness/intense/expression variants, elder weight memory, role-aware default ages, `Oyakata.weight` + summary `nationality`/`weight`, HoF/prestige ClickableName conformance, skin-tone third stops | `81c1ee15` | archive/plan-avatar-system-polish.md |
| ID hygiene | Tombstone aged-out prospects so lifetime ID refs stay resolvable | `a0081a64` | (landed alongside W M era) |
| Housekeeping | Re-export `activeRikishiIds` delta | `33fcd3a3` | — |
| v20 consolidation | Repo-wide review: 441-file delta audited, 21 new findings (14 fixed + pinned), O1/O4/O5 fixed, O2/O3/O7 cleared, 12 PRs dispositioned + branches pruned, save version 1.5.0, `.Jules/` folded | `60ba6bcc`, `36416bbe`, `578ef5f2` | `docs/audit/consolidation-verdict-v20.md` |

**Do not duplicate:** the 42-domain rules audit (code vs docs vs real JSA) lives in `docs/audit/rules-divergence-report.md` — consult it before planning rule work.

---

## 2. Open findings registry (validated, not yet actioned)

| # | Finding | Evidence | Source | Status |
|---|---|---|---|---|
| O1 | **Leaderboard flat-map hazard** — `beatPostBoutLeaderboard` iterates `standings` flat across divisions; a Juryo 9-1 leader reads as "leader" in a makuuchi narrative. | `src/engine/bout/narrative/postbout.ts:314-362` | day10 (N4 caveat) | **FIXED v20 (E1)** — all leader math division-scoped via `getLeaderWins(basho, world, division)`; beats filtered; pinned |
| O2 | **Mochikyukin payout model unverified** — code pays 50/50 cash/retirement every 2 months while sekitori; real JSA = per-basho lump ×¥4,000/pt. Comment claims "JSA model" unverified. | `src/engine/economy/MochikyukinService.ts:100-147` | 767 row 32 / 2aaf5 Part-3 | **CLEARED v20** — every-2-months cadence IS the real JSA model (points ×¥4,000×6/yr); residual deltas = invented 50/50 split + no terminal lump (documented) |
| O3 | **Juryo `expectedSize` backfill vs parity semantics** — callups satisfy parity (odd→1); expected-size shortfall should only cover pre-tournament roster gaps. Confirm against real generated roster sizes before tightening. | `src/engine/calendar/schedule.ts` `scheduleJuryoWithCrossover` | af555 W L risk | **FIXED** — parity `need++` under 5-cap at `planDivisionCallups` |
| O4 | **Maezumo leak audit** — `isMaezumo` entrants must not leak into banzuke/records/HOF paths. Partial guards exist (`scheduleHelpers.ts:50`, `boutResultApplier`, `postbout:931`); full audit of `performance.ts`/`records.ts`/eligibility queries pending. | `src/engine/banzuke/publish/performance.ts` et al. | af555 W L risk | **FIXED v20 (E5/E6)** — maezumo bouts fully inert for standings/career/boards; pinned |
| O5 | **Rival-oyakata names unlinked** — `OyakataProfileDrawer` (`rival.oyakataName` in SheetDescription) and `RivalOyakataCard` (`heyaName` span) render bare names; route → `/oyakata/$id`. | `src/components/governance/OyakataProfileDrawer.tsx:37`, `RivalOyakataCard.tsx:56` | a067 optional polish | **FIXED v20 (UI2)** — `RivalStableDTO.oyakataId` plumbed; drawer name links `/oyakata/$id` |
| O6 | **Foreign-pool Prospects e2e gap** — `listVisibleCandidates` gates foreign behind `regionalPresence ≥ 40`, unreachable in short games; search-Prospects e2e covers only domestic pools. Unit coverage exists (`entitySearchProjections.test.ts`). | `talentPoolReads.ts:32-44`; `tests/e2e/search-oyakata.e2e.test.ts` | 86f2 soft spot | OPEN — test gap (needs long progression path) |
| O7 | **Committee discretion bounds** — A12 faction discretion is the banzuke-flow tuning knob (`constants/engine/committee.ts`); keep tight, expose for tuning. | `src/engine/committee/committee.ts` | 2aaf5 A12 risk | **CLEARED v20** — clamp exists at `committee.ts:87`; residual vote-display oddity logged as E8 |

---

## 3. Deferred items registry (documented, deliberately not built)

### JSA real-rule gaps (catalog)
- **Yokozuna joi back-loading** — real yokozuna face top opponents late; schedule only has the 5-man joi cap (`schedule.ts:426`).
- ~~**Oyakata sanyo advisory extension to age 70**~~ — **LANDED `b54358f7`**: `elderStatus: "sanyo"` + `sanyoExpiryYear`; stockholding elders stay emeritus in the registry until 70 across both succession paths.
- **Real 3-bout maezumo preliminary** — game uses minted filler (`MAEZUMO_MINT_CAP`); documented as deviation.
- **Azukari / itamiwake / mizu-iri outcomes** — torinaoshi covers the realistic case.
- **Hair-down automatic loss** — physics balance-collapse approximates it.
- **Rikishi-ken** (wrestler council) — unmodeled.
- **Torikumi posting cadence** — real pairings announced ~1.5–2 days ahead rolling; game posts per-day.
- ~~**JSA board size**~~ — **LANDED `8ec9336c`**: `BOARD_COMMITTEE.size` 5→10 riji (auditors unmodeled).
- ~~**Hair-down automatic loss**~~ — **LANDED `8ec9336c`**: `result.hairDown` flagged on down-type finishes at real incidence (~1/2-3 basho) + `post_bout.hair_down` line.
- **Banzuke-gai** — documented; can't trigger with fixed-size jonokuchi.

### Documented intentional deviations (keep, tagged)
Minted maezumo + 8th-bout + unpaired-odd-man edge · kensho fame-envelope mechanics (heat bonus + star-upset minimums) · ginboshi informal status (no ledger/mochikyukin) · banzuke-committee faction discretion within merit bounds · recruitment windows · mandatory retirement ages (45/40) · myoseki market formalization · welfare/scandal/political-capital meters · Global Cup · drama matchmaker · era drift · dynamic division sizes · travel-allowance flattening · 50/50 prize splits · NPC appetite targets (`MAX_ROSTER_SIZE`/`ROSTER_VACANCY_TARGET` = discretion, not caps) vs `TARGET_ROSTER_SIZE` demographic floor · tsukebito ¥ cost.

### Skipped optional extras
- ~~**Avatar `nationality` backfill**~~ — **LANDED `b54358f7`**: oyakata inherit former-rikishi nationality; academy prospects derive from `region` (international ORIGINS names). Officials correctly remain Japan.
- ~~**`OyakataName.heyaId` prop**~~ — **LANDED `8ec9336c`**: vestigial prop removed (no production callers).

---

## 4. Institutional knowledge (validated gotchas worth keeping)

- **`sendCommand` drops non-tick commands while `pendingTick` is set** (`gameStore.ts:171-179`) — serialize e2e dispatches with `pendingTick` waits.
- **`page.goto` performs a full document reload** → autosave→deserialize→`RequireWorld` restore; `__BASHO_WORLD__` is briefly null during restore; `talentPool` round-trips wholesale via `SerializationService:153,317`.
- **Cross-pool candidate grafts must keep single pool membership** — `idIntegrity` flags a candidate listed in two pools.
- **`isSanyaku` covers Y/O/S/K** — "first cross into sanyaku" fires only once; tenure counters use explicit first-time-rank checks (`newRanks.ts`).
- **Test-mock surface traps:** search mocks need every bucket or `.map` crashes; router mocks need `useSearch`; `factoryDiscipline` meta-gate bans local `make*`/`create*` factory names — use `MockFactory.*`; `trainingState` must be a `Map`; never stub `window` under vmThreads.
- **`lint:commit` is the real gate** (pre-commit hook); regenerate `docs/audit/test-timings.json` whenever test files are added/moved.
- **`AVATAR_VERSION` bump regenerates every stored face** — v3 policy documented at `types/avatar.ts`; pixel-diff avatar tests are brittle-by-design — assert *where* output differs, not whole-map inequality.
- **Determinism contract:** zero `Math.random`/`Date.now` in `src/engine`; seeded RNG only; world-RNG consumption is reviewable in every PR.

---

## 5. Standing verification battery (applies to any future mega-plan phase)

`bun run type-check` · `bun run lint:commit` · `bun run build` · `bun run test` full fast suite + `bun run test:timings` regen for new test files · determinism double-run (basho + year horizons, byte-identical) · `bun run test:slow` gates (lintStrict, knipGuard, circularDependency, orphan-audit, engineReviewerGate, commandSurfaceCoverage, simulationInvariants, headless-playthrough, bundleBudget) · `bun run test:e2e:smoke` + `test:e2e:soak` for UI-touching work · `diagnostic-25yr-sim` when economy/promotion/scheduler semantics change.

---

## 6. Archive manifest

| Archived file (this dir) | Era | Final status | Where its content landed |
|---|---|---|---|
| `archive/plan-af555887c15103ee.md` | Nov-17 | All workstreams shipped | §1 rows W0–W L; §2 O3/O4; §5 battery |
| `archive/plan-767fdce733b588d4.md` | Nov-17 | Superseded — F-items shipped via 2aaf5 | `docs/audit/rules-divergence-report.md`; §1 JSA row; §3 deferred |
| `archive/plan-2aaf5befcc416c43.md` | Nov-18 | COMPLETE (all P0–P3) | `docs/audit/rules-divergence-report.md`; §1 JSA row; §2 O2/O7; §3 deviations |
| `archive/plan-a067c57ca8e4de02.md` | Nov-18 | Executed + verified | §1 search row; §2 O5; §4 mock traps |
| `archive/plan-day10-kyushu.md` | Nov-18 | Executed (`8473ad78`+`2548085f`) | §1 W N row; §2 O1 |
| `archive/plan-avatar-system-polish.md` | Nov-18 | Executed (`81c1ee15`) | §1 avatar row; §3 skipped extras; §4 avatar gotchas |
| `archive/plan-86f2a021cad4384b.md` | Nov-18 | Executed — verification pass | §1 search row (verify); §2 O6; §4 e2e gotchas |
