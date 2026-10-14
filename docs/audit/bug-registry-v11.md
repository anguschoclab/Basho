# Bug Registry v11

**Date:** 2026-10-14
**Branch:** `consolidation/v11`
**Method:** Per `~/.devin/plans/plan-9030f4b0f78d04b8.md` — baseline gates (all green:
932 files / 8,671 tests / 0 failures), 10 workstream greps, full-diff reads of all
34 open PRs, and production-path verification of every claim before
classification.
**Legend:** FIXED = implemented + targeted tests green. OPEN = confirmed, not yet
implemented. DISPROVED = claim did not survive production-path verification.
ASSESSED = evaluated, not a bug (debt note only).
**Staleness note:** grep/regex sweeps below were discovery aids only — every
entry was verified against production call paths before classification; any
entry superseded by later findings is marked as such inline.

---

## Confirmed Findings

### V11-B01 (WS-F, LOW): Residual `as unknown as` casts in MatchDayViewer beyond #1089's scope

- **Files:** `src/components/game/MatchDayViewer.tsx:74` (`as unknown as BoutMatchUI`),
  `:168` (`as unknown as MatchRowData`)
- **Mechanism:** `BoutMatchUI` already carries `h2h`/`rivalry`/`heatBand`/
  `h2hCommentary` (`uiDigestTypes.ts:28-36`); the `mapped` enrichment adds
  `east`/`west`/`scoutHint` — making elements fully `MatchRowData`-assignable
  (`RivalryPairState` satisfies `{tone?, meetings?}`: `constants/engine/rivalry.ts:97,107,119`).
  The :168 cast is unnecessary once the element type is explicit. The :74
  narrowing cast is unsafe-looking but runtime-safe — the object passed IS an
  enriched `BoutMatchUI`; `handleBeginPreview` already demonstrates the clean
  pattern (`:119` find-by-`boutId` → pass real `BoutMatchUI`).
- **Fix:** Type `mapped` elements explicitly (`BoutMatchUI & { east; west; scoutHint? }`),
  drop :168 cast; rewrite `handleBoutClick` to find the original `BoutMatchUI` by
  `boutId` (precedented at :119-121), drop :74 cast. #1089's `?? 1` replaced by
  canonical `toRankPosition` which throws on missing `rankNumber` (`banzuke.ts:58-66`).
- **Evidence:** tsgo compile + `MatchDayViewer` tests stay green.
- **Status:** FIXED — `ViewerMatch` type declared; both casts dropped;
  `onBoutClick` resolves the canonical `BoutMatchUI` via `boutId` lookup;
  sort uses `toRankPosition` re-exported through `presenters/uiDigest`.

### V11-B02 (WS-F, LOW): Weak `(rec as { wins: number })` casts in `rivals.ts` — extended by #1061

- **File:** `src/presenters/rikishi/transformers/rivals.ts:28-31`
- **Mechanism:** `calculateTopRivals` casts the H2H record to inline anonymous
  types instead of `H2HRecord` (`engine/h2h.ts` — has `wins/losses/streak/lastMatch`).
  #1061 adds `streak` via the same weak-cast pattern.
- **Fix:** `rec` is already `H2HRecord` (`r.h2h: Record<string, H2HRecord>`) —
  all four inline casts dropped to direct field access; `streak ?? 0` kept
  for legacy-save tolerance.
- **Status:** FIXED

### V11-B03 (WS-H, DOC): CLAUDE.md status line stale

- "860 test files, 8,330 tests … v8 consolidation" → actual 932 files / 8,671
  tests post-v10. Updated in consolidation commit.

### V11-B04 (WS-H, DOC): `bug-registry-v10.md` header says "(ongoing)"

- Verified zero OPEN/DEFERRED entries (30 FIXED). Header marked CONVERGED.
- **Status:** FIXED

### V11-B05 (WS-F, HYGIENE): Untracked ` 2.*` duplicate files failing typecheck

- **Files:** `src/presenters/rikishi/types 2.ts`, `src/presenters/rikishi/transformers/rivals 2.ts`,
  `src/components/rikishi/RikishiCombatTab 2.tsx` — stale macOS-style copy
  artifacts, untracked by git but inside tsconfig's `src/**` include, so they
  are typechecked and rot silently (the stale `rivals 2.ts` lacked `streak`
  after #1061's `UIRivalEntry` change).
- **Status:** FIXED — deleted; unimported by any source file.

### V11-B06 (DEPENDABOT, GATE): `typescript` 7.0.2 bump rejected

- **PR #1078:** TS7 removes the JS compiler API surface
  (`ts.isCallExpression`, `createSourceFile`, visitors). Six consumers depend
  on it: `templateTokenIntegrity.test.ts`, `deep-nesting.test.ts` (gate tests)
  and `scripts/{analyzeNarrativeDeps,duplicateExports,emitNarrativeModules,measureFunctions}.ts`.
  Reproduced: 480+ typecheck errors on `typescript@7.0.2`.
- **Resolution:** `typescript` pinned back at `^6.0.3` (serves API consumers
  only; typecheck itself runs on `@typescript/native` independently).
- **Status:** REJECTED — documented; revisit when API consumers migrate to a
  TS7-compatible AST surface (e.g. tsgo API or an alternative parser).

## Assessed — Not Bugs

| ID | Finding | Verdict |
|---|---|---|
| A01 | `Math.random()` in `keshoEffects.tsx:102,114` | DISPROVED — cosmetic particle rendering, never feeds sim; engine grep clean |
| A02 | `new Date()` in `calendar.ts:250`, `MigrationService.ts:55`, `Logger.ts:51` | DISPROVED — `getSecondSunday` is pure calendar math on args (no wall-clock read); others stamp non-sim metadata |
| A03 | `events.log` append-only invariant | CONFIRMED TRUE — only writers `events.ts:148` (push) + `:160` (order-preserving filter-eviction). Backward-scan extraction safe; ordering contract pinned by new test |
| A04 | `window` stubbing in tests (`globalThis`/`global` defineProperty) | DISPROVED — allowed; CLAUDE.md caveat covers `window.window` self-reference only |
| A05 | `Math.random()` in 6 test files | DISPROVED — covered by `mathRandomScan.test.ts` gate; allowlisted/comment usages |
| A06 | BardEngine `Missing token` warnings in events.test.ts stderr | DISPROVED — `enrichEventContext` (`eventBus/context.ts:13`) resolves names from real entities; MockFactory worlds lack the heya → test-fixture artifact, production path supplies keys |
| A07 | `COMMAND_HANDLERS` census | GATED — composed of 6 command-group factories; `commandSurfaceCoverage.test.ts` asserts every `EngineCommand` has a dispatch site or exemption (green) |
| A08 | `uiWorldRevision` slice audit | CONFIRMED CLEAN — every world-mutating bashoSlice case bumps (`:35,:44,:53,:74,:85,:103,:122,:168`); `LOAD_WORLD` bumps (`gameReducer.ts:35`); `END_DAY`/`SET_PHASE`/`UPDATE_WORLD` correctly don't |
| A09 | `out/`, `dist/`, `*.tsbuildinfo`, `.jules` tracking | DISPROVED — all gitignored (`.gitignore:15,18,35,84`); `.jules` only enters via bot-branch force-adds (dropped on cherry-pick) |
| A10 | 108 unreferenced exports | DEBT — matches baseline, gated by `unreferenced-exports.test.ts`; P0 item `KACHI_NOKORI_THRESHOLD` noted for future sweep |
| A11 | `MigrationService` back-compat shims | ASSESSED — zero-compat mandate *permits* removal but doesn't require it; retained as forward-version scaffolding. Explicit decision: keep |
| A12 | V9/V10 fix persistence | CONFIRMED INTACT — `loadWorldDirect` required prop (`useSaveSlotManager.ts:17,77`), electron storage write-through cache, `$$map`/`$$set` codec (`collectionCodec.ts:12-13`), v10-R09 `dispatchWorldMutation` gating |

## Deferred — none this cycle
