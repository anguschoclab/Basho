# Test Audit Findings — Dead Subject Scan

Generated: 2026-10-08T07:33:54.912Z by `scripts/find-dead-test-subjects.ts`

Scanned 879 test files; 1 files flagged.

**Review required before deleting anything** — a missing path can be an
intentional regression pin asserting a file was deleted (e.g. menu-core.tsx),
not a stale subject.

| File | Kind | Missing subject | Detail |
|------|------|-----------------|--------|
| `src/tests/unit/audit/orphan-gaps.test.ts` | fs-path | `src/components/ui/menu-core.tsx` | join(...) resolves to missing path |
