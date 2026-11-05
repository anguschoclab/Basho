# Consolidation Verdict — v17

**Date:** 2026 (post-merge)
**Branch:** `consolidation/v17` → merged into `main` via `8836a380` (`--no-ff`)
**Scope:** Exhaustive deep-dive review + consolidation. Zero backwards-compatibility constraints.
**Commits landed:**

| Commit | Payload |
|--------|---------|
| `1768b778` | Test-first stage: failing-first regression pins (T1–T6) |
| `e289fcb2` | Approved PR payloads: #1175, #1176, #1177, #1179/#1180 |
| `91d7135b` | #1178 implemented for real — 7 replay paths × 5 seeded variants |
| `a2693fdf` | Verified deep-dive fixes (F01–F19 pins), red-gate splits |
| `3199a2a7` | Elder-stock reseat on oyakata removal (succession dangle fix) |
| `8836a380` | Merge into `main` |

---

## PR Verdicts (all evidence-verified, closed with comments)

| PR | Verdict | Disposition |
|----|---------|-------------|
| #1174 debut year/years active | **APPROVED — already landed** | Equivalent implementation (Flag icon) verified in tree; no duplicate patch applied |
| #1175 type-guard JSDoc + kinboshi | **APPROVED** | Payload applied `e289fcb2` |
| #1176 advisor roster lookup | **APPROVED** | Payload applied; pinned by `leagueIntel` free/occupied-slot tests |
| #1177 kinboshi count + budget | **APPROVED (partial)** | Kinboshi surface applied; stale budget entry excluded (`loc:179` vs actual 177 — functions split instead) |
| #1178 post-bout replay variety | **DISPROVED as shipped** | PR head was an **empty commit**. Implemented for real: all 7 `replay.*` paths → 5 variants each (`91d7135b`) |
| #1179 loading spinners | **APPROVED** | Payload applied `e289fcb2` |
| #1180 EmptyState loader animation | **APPROVED** | Payload applied `e289fcb2` |

All PR comments were Jules boilerplate; zero human reviews. `.jules/` journals excluded per gitignore contract; snapshot/ratchet hunks excluded and regenerated independently.

**Branches:** all 6 Jules branches deleted on origin; `consolidation/v17` deleted (local + remote); `perf-baseline` retained (CI artifact, never merge). Remotes pruned.

---

## Verification Gate Matrix

| Gate | Command | Result |
|------|---------|--------|
| Type check | `bun run type-check` | ✅ clean |
| Lint | `bun run lint:commit` | ✅ 0 errors, 37 pre-existing Fast Refresh warnings (`src/app/routes.tsx`) |
| Build | `bun run build` | ✅ 17.1s |
| Fast suite | `bun run test` | ✅ 1018 files / 9,459 pass / 1 skip |
| Perf suite | `bun run test:perf` | ✅ 5 files / 14 pass |
| E2E smoke | `bun run test:e2e:smoke` | ✅ 4/4 (56s) |
| Determinism basho | `bun scripts/sim/determinism-double-run.ts basho` | ✅ byte-identical (18,012,274 B) |
| Determinism year | `bun scripts/sim/determinism-double-run.ts year` | ✅ byte-identical (24,787,510 B) |
| Nondeterminism grep | `Math.random(` in `src/engine` | ✅ zero call sites |
| Slow suite | `bun run test:slow` | ⚠️ 16/17 files — `simulationInvariants` ID-integrity fails **pre-existing on `main`** (verified via `main` worktree baseline: identical MH-dup + OY-dangle violations) |

### Pre-existing slow failure (non-blocking, registered debt)

`tests/slow/engine/archival/simulationInvariants.test.ts` → "world maintains ID integrity after 3 simulated years" fails identically on `main` and on this branch. Two violation classes:

1. **Duplicate `mediaState.headlines` ids** (`MH-*`) — same seeded headline appended repeatedly; mechanism unresolved, deterministic on both branches. → **V17-D01**
2. **Dangling `myosekiMarket.stocks` ownerId/holderId** — oyakata removed by `DynastyService.removeOyakata` while stocks still reference them. Fixed the direct path in `3199a2a7` (28→26 violations); residual count is an impact merge-ordering race in `phase06_yearly_boundary` (later absolute `myosekiMarket` writes clobber the swept map). → **V17-D02**

---

## Verified Fixes (all pinned by failing-first tests)

- **Myoseki money flow:** `purchaseMyoseki`/`buyMyoseki`/`leaseMyoseki` now bridge the oyakata→heya namespace for funds — buyer heya debited, seller heya credited, lease fees credit owner's heya, self-purchase guarded, `fromId`/`toId` corrected; governance caller passes the real oyakata id.
- **Retiree conversion:** only JSA-owned available stock is reused — listed player/NPC stock is never confiscated; chair-vacancy gating fixed without altering founding RNG consumption.
- **Ownership derivation:** `isPlayerOwned` derives from `world.playerHeyaId` in projections (the `Heya.isPlayerOwned` field was write-only).
- **Merger fallback:** `world.playerHeyaId` excluded from forced-merger candidates.
- **Calendar label:** phantom `basho_recap` label → canonical `banzuke_reveal` in `CalendarWidget` mapping.
- **Succession:** summary-only historical entries filtered from non-age successors → trustee fallback; over-budget `triggerSuccession` + `processRetireeOyakataConversion` split under the 150-LOC ratchet; elder stock reseated on oyakata removal.
- **History:** career milestones fire on threshold crossing (not exact equality); shikona promotion detection uses rank semantics (juryo→maegashira), not `rank.includes("makuuchi")`.
- **Worker surface:** heya-scoped stable commands guard `heyaId === playerHeyaId`; NPC paths unaffected (they mutate via tick phases).
- **NPC AI sparring:** `sparringPairs` accumulated across heyas (last-writer-wins stale-base bug).
- **UI honesty:** `StaffPage` blocks unaffordable hires before dispatch; `RikishiPage` read-only for retired/NPC-owned rikishi; `useTrainingState` resyncs on world-provided state change; `YouthAcademyPage` duplicate control cluster removed (panel owns mutations).

## Disproved / Non-issues

- `Dashboard.tsx` `animate-pulse` wraps `SkeletonCard`s — correct skeleton pattern, not a dead loader.
- `commands/lifecycle.ts:102` is the `LOAD_WORLD` handler (world-swap cache clear), not a roster command — advisor cache staleness window is weekly-gate + world-load only.
- `basho_recap` remains valid in `GameState`/basho-slice types — only the calendar-phase label was phantom.

## Explicit architectural verdicts

- **`KNOWN_OVERBUDGET` ratchet policy: VINDICATED** — both Jules PRs (#1176, #1177) tried to fix the red budget gate by *listing* the over-budget functions, which violates the ratchet contract (entries may only be removed). Both additions rejected; the functions were split instead.
- **`.jules/` gitignore contract: VIOLATED by Jules** — every substantive PR carried `.jules/<agent>.md` journal hunks despite `docs/agents/README.md` declaring them local agent memory. All hunks excluded from landing; `git ls-files .jules` verified empty post-merge. Flag for playbook hardening.
- **Memoized `getHeyaRoster` weekly cache: REGISTERED DEBT (V17-D04)** — staleness window confirmed (clears at weekly gate + `LOAD_WORLD` only); mid-week signings read stale rosters. Pre-existing hazard shared by all consumers (welfare, mergers, perception), not introduced by #1176. Follow-up: `clearQueryCaches()` on roster-mutating commands.
- **Dual foreign-slot semantics: REGISTERED DEBT (V17-D03)** — advisor roster-count vs canonical `getForeignCountsByHeya`/`foreignSlotOccupied` (includes signed-pending candidates). #1176 preserved the simpler semantic intentionally; unify in a future pass.
- **Dual command paths (worker vs reducer): RE-VERIFIED** — new worker guards mirror the `retireRikishiCmd` pattern; no new mutations bypass `uiWorldRevision` sync; no reducer-slice engine writes added.
- **Save-format backwards compatibility: OUT OF SCOPE** per directive.
- **lint:strict warnings (37, `routes.tsx` Fast Refresh): PRE-EXISTING + CI-EXEMPT** — the CI gate is `lint:commit` (tolerates warnings); not conflated with consolidation regressions.

## Remaining debt

- V17-D01/D02 above; v16 registered debt (slow-audit swallowers etc.) unchanged; foreign-slot counting divergence (advisor roster-only vs canonical `getForeignCountsByHeya` signed-pending semantics) registered for future unification.
- ~2,200-file prettier/line-ending drift remains unstaged (stashed pre-merge); never an intentional part of this consolidation.
