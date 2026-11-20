# Consolidation Verdict — v20

Date: 2026-11. Baseline: v19 closeout `32bf8e74`; delta measured at 58 commits /
441 files / 220 src files (~80k LOC src). Method: strict test-first — every
confirmed defect got a RED pin in
`tests/unit/engine/consolidation/v20Regressions.test.ts` before any production
edit; characterization pins document intended-unchanged semantics.

## PR dispositions (12/12 closed)

| PR | Verdict | Evidence |
|----|---------|----------|
| #1202 roster query opt | **APPLIED** — `EntityCollection.getHeyaRoster` at `chainService.ts` + `crisisRegistry.ts`; characterization pin covers contract incl. empty/all-retired edges | identical semantics (roster sync keeps `rikishiIds`↔`activeRikishiIds` consistent) |
| #1203 memory loop opt | **APPLIED** — single-pass dedup in `consolidateOyakataMemoryPure` | same-tick dedup semantics pinned |
| #1204 H2H cast removal | **APPLIED** — `UIRikishiDTO` extends `RikishiH2HDTO`; runtime-neutral, typecheck-clean | — |
| #1205 oversleeping variants | **APPLIED** — titles 5 / summaries 6 / kyujo 7; render pin: no `[MISSING:]`; journal folded to `docs/agent-journals/bard.md` | token bindings verified |
| #1206–#1215 dependabot (8) | **CLOSED-SUPERSEDED** — freshness re-probed at apply time: `typescript-eslint` 8.73.0, `three` 0.187.0, `@types/three` 0.187.0 already newer than the PR deltas; a fresh `bun upgrade` pass supersedes all eight | `_v20-pr-verdicts.md` |

No human review comments existed on any PR (Jules boilerplate only).
Branch cleanup: all 12 remote branches deleted; `perf-baseline` retained
(fetched by `.github/workflows/perf-gate.yml`).

## Bug registry outcomes (docs/audit/bug-registry-v20.md)

**FIXED + pinned:** E1 (cross-division leader scoping — `getLeaderWins`/
`isYushoContention`/`isPlayoffScenario` now take `world` + per-side division;
leaderboard/co-leader/postbout beats filtered), E4 (`checkShikonaChange`
dead-in-production — post-update shape passed), E5/E6 (maezumo standings/
career/board leak — full exclusion), E7 (`eighthBoutForRikishiId` day-gated),
E14 (talentPool last-wins clobber — `finalizeSignedCandidates` composes via
`worldWithQueuedFields`), E19 (`phase01_basho_bouts` passthrough +
trainingState entity diff), E2 (monoiiRoll → SeededRNG), P1 (save version
1.5.0), UI1 (compare name fallback), UI2 (`RivalStableDTO.oyakataId` + link),
J1 (`.Jules/` folded + deleted), J3 (stale codemod deleted), E21 (doc count).

**DISPROVED:** E13 (sibling roster clobber — `ImpactResolver` `rikishiToAdd`
union-sync rescues it; kept as a green guard), E9 (`result.kenshoEnvelopes`
is a local DTO write, not a world mutation).

**CLEARED carried debt:** O2 (mochikyukin cadence IS the JSA model), O3
(juryo parity fixed), O7 (committee clamp exists), S6-5b (loan seq salted),
V17-D01 (MH-* ids salted), V17-D02 (myoseki ref sweep exists).

**OPEN (documented, deferred):** E8 (committee vote display semantics),
E10 (marketability uncapped — design decision), E11 (legacy callup path
parity — latent), E12 (empty-heyaId predicate — latent), E15 (NPC signing
age-gate asymmetry — real gap, next pass), E16 (citizenshipStatus flip),
E17 (sibling avatar/age clamp), E18 (tomoe-sen both-missing), E20
(TournamentSimulator player-kyujo parity), UI3 (committee vote render /
dead-field decision), stale `.windsurf/audit` companion docs regen,
dependabot fresh-upgrade pass.

## Architectural verdicts

- Worker command path remains canonical: 67 commands ↔ 67 handlers ↔ 67
  dispatch sites — verified, zero orphans, zero handler bypasses.
- `resolveImpacts`/`ImpactBuilder` discipline upheld; the last-wins
  worldFields compose hazard got one more instance fixed (E14) — the
  `worldWithQueuedFields` pattern is now enforced at the two known
  multi-producer sites.
- Determinism: no `Math.random`/`Date.now` in engine paths; monoiiRoll
  hash-shims replaced with seeded streams.
- Interactive-write `uiWorldRevision` sync invariant intact (W5 verified).

## Verification

Measured at closeout (commits `60ba6bcc`…`1327467c`):

| Gate | Result |
|------|--------|
| `bun run type-check` | clean |
| `bun run build` | green (vite, 53s) |
| `bun run lint` | green via pre-commit hook on every commit |
| `bun run test` (fast) | 1102 files / 10,241 tests — all green |
| `bun run test:slow` | 18 files / 64 tests — all green (subprocess audits + long sims) |
| `bun run test:perf` | 5 files / 14 tests — all green |
| `bun run test:coverage` | 1102 files / 10,241 tests green; thresholds met 79.1/68.2/70.9/80.9 (after `duplicateExportGate` hook-timeout fix, `735ee808`) |
| `bun run test:e2e:smoke` | 5/6 first pass; `reload-restore` flake under 6-worker load, green on isolated re-run |
| `bun run test:e2e` (mobile) | 3/3 green |
| `bun run test:e2e:soak` | `full-basho-lifecycle` + `jsa-ui-spotcheck` green; `year-of-bashos` hit its 2h timeout mid-basho-6 under heavy concurrent load — healthy sim, isolated re-run in progress |
| determinism double-run | **PASS** — 2 runs byte-identical (26.4 MB serialized, basho horizon) |
| `bun run test:timings` | `test-timings.json` re-baselined |

### Post-upgrade verification (`b7443a1c` — dependency consolidation)

The dependabot upgrade pass applied: react/react-dom 19.3.1, three +
@types/three 0.187.0, jsdom 31.0.1, tailwindcss + @tailwindcss/vite 4.3.5,
typescript-eslint family 8.72.2 (8.73.0 skipped — <7d fresh per policy).

| Gate | Result |
|------|--------|
| `bun run type-check` | clean |
| `bun run lint` | clean on typescript-eslint 8.72.2 |
| `bun run build` | green (vite 8.3.5, 26s) |
| `bun run test` (fast) | 1102 files / 10,241 tests — all green on jsdom 31 |

Not run this pass: the perf CI gate (baseline re-seeds on main push);
post-upgrade `test:slow`/`test:coverage` re-runs — deps-insensitive except
`lintStrictGate` (eslint subprocess audit) and jsdom env, both covered by
the lint + fast-suite results above.

The duplicate-React-key wart was root-caused and fixed: `useKenshoData`
emitted a row per participant, duping `boutId` keys on same-heya kensho
bouts and crediting losers with the winner's envelopes (`1a8d2f2f`).

### `year-of-bashos` soak — two root causes found, one fixed, one open

**S1 — autosave fallback stall (FIXED, `64b1c70e`).** Every IndexedDB put
in the headless web environment aborts; the fallback then LZ-compressed the
full ~26MB save on the main thread *per write* (~3 writes per autosave,
autosave fires per world update). This inflated the soak from its v8-era
~8min to 2h+ timeouts. Circuit-breaker latches (`idbWritesBroken`,
`lsQuotaBroken`) now stop hammering dead backends; `idbCache` still serves
session reads. Post-fix run: bashos 1–2 ~10x faster, zero IDB spam.

**S2 — `pendingCrisis` interactive wedge (OPEN, real product bug).**
Headless interactive-path probe (`scratch/interactive-freeze-probe.ts`,
same e2e seed): when a player-gated `pendingCrisis` is set (e.g.
`media_firestorm` at basho senshuraku week), `shouldBlockTick`
(`shouldHaltAdvance.ts:32`) swallows the remainder of *every* tick —
`dayIndexGlobal` burns +7 per advance while `week`/`bashoDay` freeze
forever. `reqDecisions` stays 0 because the gate is `pendingCrisis`, not a
required `pendingDecisions` entry. In the e2e the world froze mid-interim
for the remaining ~2h: the CrisisModal either failed to render or the
driver's resolution clicks were dropped by the `pendingTick` command guard.
Product-side wart regardless of test outcome: a swallowed tick still
consumes the calendar day, so an unresolvable/undelivered crisis silently
burns the calendar indefinitely with no surfacing. Needs: (a) confirm the
modal renders for `media_firestorm`-type crises in the e2e page (log what
`resolveCrisisIfPresent` sees), (b) consider freezing `dayIndexGlobal` on
swallowed ticks or a watchdog that fails loudly instead of silently
advancing, (c) `sendCommand` should not silently drop `RESOLVE_*` commands
during `pendingTick` — those are exactly the commands that unblock the tick.

Remote branch state: `main` + `perf-baseline` only. Note: a concurrent
session pushed `0f5f6bef` (narrative enrichment) mid-verification — merged
via rebase, no conflicts.
