# Bug Registry v15

Findings from the v15 consolidation (megaplan `plan-f8972b591e49b532`). Baseline HEAD `7dafc74c`.

## Baseline

| Gate | Result |
|------|--------|
| `bun run type-check` | ✅ clean |
| `bun run build` | ✅ 7.2s |
| `bun run test` (fast) | ✅ 1003 files / 9293 pass / 1 skip (after removing `src/tests` .DS_Store shells left by stash recovery — repoStructure gate) |
| `bun run lint:strict` | 37 warnings (pre-existing react-refresh in routes.tsx) |
| audit-orphans regen | ⚠️ 234→250 — 22 unclassified candidates → reconciled below |
| `saveLoadIntegrity` | ✅ 13/13 — serializer covers all 84 WorldState fields |

## Bugs fixed

### V15-B01 — Dead exports in staffPosts.ts (severity: LOW, dead code)
`ensureStaffPosts` (zero refs; built a posts object never attached to the heya — buggy if called) and `postVacant` (redundant with `openSlots`/`filledSlots`). **Disposition:** REMOVED (`c017ede8`).

### V15-B02 — Orphan baseline drift (severity: gate failure)
audit-orphans regen: 234→250. 16 new candidates since v14 — all reconciled: 20 classified intentional (koenkaiDemands aux exports, staffPosts internals, types, unticked service signatureKimarite); 6 stale map keys pruned (generateStaff→tickStaffYear rename, now-wired labels/decision types); 2 removed via B01. **Disposition:** FIXED (`c017ede8`).

### V15-B03 — `needsScheduleForDay` day<1 gap (severity: LOW, edge case)
Upper divisions returned `true` for day ≤ 0 — the documented 1-indexed contract was unenforced. Test authored red-first (`schedule.test.ts`), guard added. **Disposition:** FIXED (`875c8cfc`).

### V15-B04 — Vacuous overrideConsumer test (severity: test-quality)
The day-1 "avoid rival" assertion passed trivially — generated Swiss pairings never produce a requester-vs-rival matchup (pairing is rank-positional). Repair path `applyMatchmakingAvoid` unexercised. Added a pinning characterization snapshot for the multi-rival tie composition. **Disposition:** PARTIAL — real repair-path coverage remains DEBT (needs a world composition where Swiss ordering naturally conflicts — pairing ignores rivalry heat).

## DEBT items

| # | Item |
|---|------|
| D1 | `pipelineRunner.ts:133` detects StateImpact via `"metadata" in result` — a metadata-less literal impact would clobber the world as a false WorldState. Latent (ImpactBuilder always sets metadata). |
| D2 | Repair-swap path of `applyMatchmakingAvoid` has no non-vacuous coverage (see B04). |
| D3 | `RecruitingTabSections.tsx:378-379` `as unknown as UIRikishi` (v14 carryover). |
| D4 | 144/460 engine files lack header docs; ~240 orphans retained per archive policy. |
| D5 | `applyImpacts`/`applyImpactToGameState` — zero prod callers (gameHelpers). |
| D6 | Wall-clock `new Date()` sites: Logger.ts:51, MigrationService.ts:55 — save-metadata only; document as boundary exception. |
| D7 | CLAUDE.md test-count drift (recurring). |

## PR verdicts — see consolidation-verdict-v15.md §2

16 PRs ruled: 9 APPROVED-landed (#1154–#1158, #1169, #1170, #1156 = 7 code + consolidated deps), #1153 DISPROVED (redundant + artifacts), 10 dependabot consolidated (`c2df5189`), types/node #1161 merged by maintainer.
