# v14 Review Working Notes (findings feed consolidation-verdict-v14.md)

Buckets: BUG (fix now, test-first) / DEBT (defer, prioritized) / VERIFIED-GOOD / DISPROVED (doc-vs-code mismatch)

## Pre-merge findings (validated during planning)
- getHeyaRoster caller audit: queries.getHeyaRoster returns retired-inclusive roster.
  Direct callers bypassing EntityCollection filter: presenters/projections/heyaProjections.ts:42,
  eventProjections.ts:129 — AUDIT consumer assumptions (potential UI leak of retired rikishi).
- .jules/ journals: gitignored on main; bot PRs force-add them — not carried over. VERIFIED.
- #1151 snap regen: environment noise (characterization green on main). VERIFIED-DROPPED.

## Subsystem sweep
