# V18 PR Verdict Matrix (20 open PRs)

All evidence from direct diff/trace inspection on `consolidation/v18`. Dispositions: MERGE-PAYLOAD (apply payload manually, close PR), DUPLICATE (superseded payload, close), FOLD-INTO-BUMP (dependabot consolidation), DOCS-ONLY-VERIFY, REJECT.

| PR | Branch | Verdict | Evidence | Action |
|----|--------|---------|----------|--------|
| #1181 | scout-almanac-career | MERGE-PAYLOAD | Almanac career tests; `generateCareerRecord(rng: () => number)` signature verified matching. Tests use deterministic rng — verify MockFactory discipline on apply | Cherry-pick test payload; run new tests |
| #1182 | bard-tactic-verdict | MERGE-PAYLOAD + test-layer fix | ~28K-line diff ≈99% junk (`.cache/` XML 25K, test-timings churn, `.jules/`). Payload: verdict-narrative variants + `%LABEL%` token. **`templateTokenIntegrity` will fail — `"LABEL"` absent from `BAG_CONTEXT` key set (test lines ~660-724)** | Apply JSON/template payload only; add `"LABEL"` to BAG_CONTEXT in same commit; exclude `.cache/.jules/timings` |
| #1183 | bolt-entitycollection-memoization | SELECT-WINNER → MERGE-UNIQUE-SITES | Competing roster-lookup approach on same 3 files as #1184/#1199. Compare semantics/ordering/perf vs winner; port only sites the winner lacks | Payload-compare vs #1199; port unique call sites; close PR |
| #1184 | bolt/optimize-roster-lookups | DUPLICATE of #1199 | Semantically identical payloads verified by diff-of-diffs: same 3 files, same `EntityCollection.getHeyaRoster` + `.id` edits; only import placement differs (different merge bases) | Close as DUPLICATE w/ link to #1199 evidence |
| #1185 | scribe-simulateBoutForToday | MERGE-PAYLOAD (docs) | Doc verified against `world.ts:197-243`: `unplayedIndex` = index into today's UNPLAYED matches — doc correct. Minor imprecision: `boutTactics` keyed by boutId; `result` optional | Apply doc; amend 2 precision notes during apply |
| #1186 | bard-venue-narrative | MERGE-PAYLOAD | Edits `venues.<loc>.entrance` (NOT "opening" — draft corrected); live path via `prelude.ts:15`, lowercase `east`/`west` keys map to `%EAST%/%WEST%` tokens (snapshot proves render) | Apply template payload; verify token integrity + snapshot |
| #1187–#1196 | dependabot ×10 | FOLD-INTO-BUMP | Freshness rule: target = max(PR-proposed, latest ≥7 days old). As of audit: tailwindcss/@tailwindcss/vite 4.3.5 + framer-motion 14.10.1 published Nov 6 (3d old — under threshold, eligible Nov 13+); other 7 PRs already at latest | One consolidated bump + single `bun.lock` regen; close all 10; framer-motion (runtime dep) gated by e2e smoke |
| #1197 | scout-simulate-bouts | MERGE-PAYLOAD | Fixture `events` array → `{ version, log, dedupe }` verified against `EventsState`/`WorldState` — correct modernization | Apply |
| #1198 | scout-simulate-bouts-day | MERGE-PAYLOAD | `simulateBoutsForDay` tests verified: all literal fields valid per `BashoState`/`BoutResult`; assertions match `world.ts:254-305` contract (unplayed filtering, ordering, persistence, standings, tactic consumption) | Apply |
| #1199 | performance-heya-roster-query | MERGE-PAYLOAD (winner of roster trio) | Same payload as #1184 (verified identical); supersedes #1183's competing approach after unique-site check. NOTE: changes pick ordering (Set order → Map order) → accepted deterministic drift, document in verdict | Apply payload manually (controls import placement); close #1184 dup; #1183 after unique-site port |
| #1200 | scout-henka-replay | MERGE-PAYLOAD − scratch | Real bug fix verified: `beatReplayHighlight` (`postbout2.ts:495-537`) routes henka to `post_bout.replay.reversal` — PR adds dedicated `post_bout.replay.henka` content + reroutes. Strip root-level `test_plan.md` scratch file | Apply content + reroute; exclude test_plan.md |

## Branch dispositions (post-merge)

- `perf-baseline` — RETAIN (CI artifact branch, `always()` re-seeds on main pushes).
- All 20 PR head branches + any stale local tracking branches — DELETE after closeout.
- `consolidation/v18` — DELETE after `--no-ff` merge to main + push.

## Dependabot freshness table (audit date Nov 9)

| Package | Current | PR-proposed | Registry latest | ≥7d? | Bump target |
|---------|---------|-------------|-----------------|------|-------------|
| tailwindcss + @tailwindcss/vite | — | 4.3.4 | 4.3.5 (Nov 6) | NO (3d) | 4.3.4 (re-check at exec) |
| framer-motion | — | 14.9.1 | 14.10.1 (Nov 6) | NO (3d) | 14.9.1 (re-check at exec) |
| electron, babel, globals, postcss, typescript-eslint, eslint-plugin, vitest | — | PR versions | = PR versions | YES | PR versions |

Execution-time rule: re-run `npm view <pkg> version` + `npm view <pkg>@latest time` before applying; take newer only if ≥7 days old.
