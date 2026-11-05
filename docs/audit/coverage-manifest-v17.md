# Coverage Manifest — v17

## Test artifacts added this cycle (test-first, T1–T6)

| Artifact | Path | Pins |
|----------|------|------|
| V17 regression pins | `tests/unit/engine/consolidation/v17Regressions.test.ts` | F01–F13 engine fixes + F20 succession-stock pin |
| Worker ownership guards | `tests/unit/engine/worker/npcOwnershipGuard.test.ts` | F03 |
| `useTrainingState` resync | `tests/unit/hooks/useTrainingState.test.tsx` | F04 |
| Replay variety | `tests/unit/engine/bout/postBoutReplayVariety.test.ts` | #1178 — ≥4 distinct outputs per `replay.*` path across seeded runs |
| Kinboshi surface | `tests/unit/components/RikishiCareerTab.narrative.test.tsx` | #1177 |
| Debut vitals | `tests/unit/components/RikishiProfileHeader.test.tsx` | #1174 equivalent-verification |
| Narrative banding | `tests/unit/engine/systems/narrative/promotionBands.test.ts`, `tests/unit/engine/economy/runwayBands.test.ts` | v16 payload coverage |

## Production files substantially changed

- `src/engine/bard/domains/post_bout.json` — 7 replay paths × 5 variants
- `src/engine/governance/myosekiMarket.ts`, `services/MyosekiTradingService.ts` — money-flow namespace bridge
- `src/engine/tick/phases/phase01_week_governance.ts` — oyakata-id caller fix
- `src/engine/tick/phases/phase01_week_npc_ai.ts` — sparring map accumulation
- `src/engine/lifecycle/retireeOyakataConversion.ts` — JSA-only stock reuse + split
- `src/engine/legacy/DynastyService.ts` — split + summary filter + elder-stock reseat
- `src/engine/history/history.ts` — milestone crossing + shikona promotion
- `src/engine/economy/mergers.ts` — player exclusion
- `src/engine/narrative/promotionBands.ts` — new (banding engine)
- `src/constants/ui/calendar.ts` — canonical phase label
- `src/presenters/projections/heyaUI.ts`, `presenters/rikishi/transformers/{identity,roster}.ts` — `playerHeyaId` derivation
- `src/pages/{StaffPage,RikishiPage,YouthAcademyPage}.tsx`, `src/hooks/useTrainingState.ts` — UI honesty
- Worker command surface — player-ownership guards
- Snapshots + `docs/audit/test-timings.json` — regenerated

## Gate coverage

Fast: 1018 files / 9,459 tests. Slow: 16/17 (1 pre-existing fail). Perf: 5/14. E2E smoke: 4/4. Determinism: byte-identical ×2 horizons. Timings baseline current.
