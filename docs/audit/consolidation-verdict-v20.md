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
| `bun run test:e2e:smoke` | 5/6 first pass; `reload-restore` flake under 6-worker load, green on isolated re-run |
| `bun run test:timings` | `test-timings.json` re-baselined |

Not run this pass: `test:perf` (baseline re-seeds via CI on main push),
`test:e2e:soak`, and a determinism double-run — recommended before the
dependabot upgrade lands. One UI wart observed during e2e: duplicate React
keys `b-2026-hatsu-d2-*` in a bout list — origin unverified, flagged for
the next pass.
