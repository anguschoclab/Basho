# Bug Registry v12

**Date:** 2026-10-20
**Branch:** main (direct, per user instruction)
**Method:** Per `~/.devin/plans/plan-ff8ab1ac12fdbd23.md` — baseline gates (all
green: 963 files / 8,888 tests / 0 failures), workstream greps + deep reads,
full-diff reads of all 27 open PRs, production-path verification of every claim
before classification.
**Legend:** FIXED = implemented + targeted tests green. CONFIRMED = verified,
fix scheduled this cycle. DISPROVED = claim did not survive production-path
verification. ASSESSED = evaluated, not a bug (debt note only).

---

## Confirmed Findings

### V12-B01 (WS-L, MODERATE): "Promotion deliberation available" action item never clears

- **File:** `src/presenters/projections/actionQueue.ts:80-93`
- **Mechanism:** `PROMOTION_DELIBERATION` events are **durable** —
  `isDurableEvent` (`events.ts:174-183`) keeps `category: "promotion"` events
  regardless of the `MAX_LIVE_EVENT_LOG` trim, so once the event fires
  (`BashoHistory.ts:402`), the `.some()` existence check stays true **forever**.
  The action item becomes permanently sticky noise after the first deliberation
  in a save's history.
- **Convention anchor:** the engine's own recency semantic for this exact event
  type is `log.slice(-20)` — `phase06_narrative.ts:202-215` treats a
  deliberation as "recent" only within the last 20 log entries.
- **Fix:** replace `.some()` with recency-windowed canonical extraction —
  `scanRecentEvents(world.events.log.slice(-20), { types: ["PROMOTION_DELIBERATION"], limit: 1 })`.
  Fixes perf (full-log scan → bounded) AND the stale-forever semantic in one
  move. Contract tests pin: within-20 shows, 21+ deep hidden, absent hidden.
- **Status:** CONFIRMED → fix scheduled (subsumes Bolt PRs #1096/#1097/#1100/#1102
  which optimize the scan but preserve the stale semantic — marked SUPERSEDED).

### V12-B02 (WS-D, LOW): Unnecessary `as unknown as` cast on OPFS directory iterator

- **File:** `src/engine/storage/opfsArchive.ts:233-235`
- **Mechanism:** `(dir as unknown as Record<string, () => AsyncIterableIterator<FileSystemHandle>>).values()`
  — but `lib.dom.d.ts:45107-45116` (shipped TS6 dom lib) already declares
  `values()`/`keys()`/`entries()`/`[Symbol.asyncIterator]` on
  `FileSystemDirectoryHandle`. `dir` is `FileSystemDirectoryHandle` (narrowed
  non-null by the `if (!dir) return []` guard) → `dir.values()` typechecks with
  **no cast**. The cast is dead weight hiding the real API.
- **Fix:** `const iterator = dir.values();` — supersedes Mason #1119, which
  tightens the cast shape but keeps the unnecessary coercion.
- **Status:** CONFIRMED → fix scheduled.

### V12-B07 (WS-I, DOC): CLAUDE.md status line + directory map stale

- Status line reads "943 test files, 8,759 tests" — actual **963 / 8,888**.
- Directory map omits `src/engine/npcAI/` (17 files incl. `weekly/`,
  `strategies/`), `src/engine/storage/` (OPFS/electron archive),
  `src/engine/lifecycle/` (BashoHistory, yokozuna promotion paths).
- **Status:** CONFIRMED → fix in consolidation docs commit.

### V12-B08 (WS-I, DOC — folded into #1118 payload): banzuke tiebreak doc numbering

- `resolveBanzukeTie` JSDoc lists 4 levels but the implementation has 5
  (perf-quality level at `banzukeHelpers.ts:85-98` labeled "Level 3.5").
- #1118's doc fix is accurate (5-level list) but misnumbers the code comment —
  corrected on landing: impl comment normalized to match the documented
  1–5 sequence.
- **Status:** CONFIRMED → corrected payload.

---

## Assessed — Not Bugs

| ID | Finding | Verdict |
| --- | --- | --- |
| V12-B03 | `as any` census (2 grep hits) | **DISPROVED** — both hits are comment text (`performance.ts:244`, `identity.ts:5`); zero `as any` in production, v11's claim holds |
| V12-B04 | `Math.random`/`Date.now` in `src/engine` | **DISPROVED** — only comment mentions (`calendar.ts:5`, `RecruitmentController.ts:39`) |
| V12-B05 | `phase06_narrative.ts:213` full-log `.find` on PROMOTION_DELIBERATION | **DISPROVED** — already bounded to `log.slice(-20)`; not a bug, and its recency convention anchors the B01 fix |
| V12-B06 | 108 unreferenced exports | **ASSESSED — DEBT** — identical count to v11 baseline; `KACHI_NOKORI_THRESHOLD` P0 persists (pre-existing debt note, gated by `unreferenced-exports` guard test) |
| V12-B09 | Remaining 13 `as unknown as` sites | **ASSESSED** — data-boundary casts (BardEngine JSON loads, `event.data` narrowing, MigrationService generic record access) — idiomatic boundary debt, not bugs |
| V12-B10 | Command-surface / `uiWorldRevision` coverage | **ASSESSED** — `COMMAND_HANDLERS` map live at `engine.worker.ts:24`, 17 UI files dispatch via `sendCommand`, 13 `uiWorldRevision` bump sites in slices; both surfaces already gated by `commandSurfaceCoverage` (green at baseline) — spot-check found no stranded paths |
| V12-B11 | ` 2.*` Finder-copy artifacts | **DISPROVED for repo** — tracked dirs clean; stray `lib.*.d 2.ts` copies exist in `node_modules/typescript/lib` (untracked local FS artifact, never shipped) |
| V12-B12 | #1116's 23 test-file + 4 source-file edits | **ASSESSED — formatting churn** — every inspected hunk is prettier rewrap (trailing commas, arg/then break-lines), zero semantic change; only `post_bout.json` is payload. Root `update_json{,2,3}.py` scratch scripts excluded |

## Open Verification Notes

- `PROMOTION_DELIBERATION` consumption verified: emitted `BashoHistory.ts:402`
  (stats+pressure criteria), read by `phase06_narrative.ts:213` (bounded) and
  `actionQueue.ts:81` (unbounded — the bug). No "resolved" marker exists — the
  last-20 recency window is the minimal correct semantics consistent with the
  engine's own convention.
