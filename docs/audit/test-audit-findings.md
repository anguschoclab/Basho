# Test Audit Findings — Dead Subject Scan

Generated: 2026-10-28T13:27:07.838Z by `scripts/find-dead-test-subjects.ts`

Scanned 995 test files; 10 files flagged.

**Review required before deleting anything** — a missing path can be an
intentional regression pin asserting a file was deleted (e.g. menu-core.tsx),
not a stale subject.

| File | Kind | Missing subject | Detail |
|------|------|-----------------|--------|
| `tests\unit\audit\accessibilityAudit.test.ts` | fs-path | `..\..\..\..\..\n` | join(...) resolves to missing path |
| `tests\unit\audit\designBible.test.ts` | fs-path | `..\..\..\..\..\n` | join(...) resolves to missing path |
| `tests\unit\audit\duplicateExportGate.test.ts` | fs-path | `..\..\..\..\..\n` | join(...) resolves to missing path |
| `tests\unit\audit\engineReviewerSelfTest.test.ts` | fs-path | `..\..\..\..\..\n` | join(...) resolves to missing path |
| `tests\unit\audit\npc-legacy-path.test.ts` | fs-path | `src/engine/npcAI.ts` | readSrcFile target missing |
| `tests\unit\audit\orphan-gaps.test.ts` | fs-path | `..\..\..\..\..\n` | join(...) resolves to missing path |
| `tests\unit\audit\orphan-gaps.test.ts` | fs-path | `src\components\ui\menu-core.tsx` | join(...) resolves to missing path |
| `tests\unit\audit\unreferenced-exports.test.ts` | fs-path | `..\..\..\..\..\n` | join(...) resolves to missing path |
| `tests\unit\meta\factoryDiscipline.test.ts` | fs-path | `..\..\..\..\..\n` | join(...) resolves to missing path |
| `tests\unit\meta\repoStructure.test.ts` | fs-path | `src\engine\_archive` | join(...) resolves to missing path |
| `tests\unit\meta\repoStructure.test.ts` | fs-path | `src\engine\systems` | join(...) resolves to missing path |
| `tests\unit\meta\repoStructure.test.ts` | fs-path | `src\engine\data` | join(...) resolves to missing path |
| `tests\unit\meta\repoStructure.test.ts` | fs-path | `src\utils` | join(...) resolves to missing path |
| `tests\unit\meta\repoStructure.test.ts` | fs-path | `src\store` | join(...) resolves to missing path |
| `tests\unit\meta\repoStructure.test.ts` | fs-path | `src\contexts` | join(...) resolves to missing path |
| `tests\unit\meta\repoStructure.test.ts` | fs-path | `src\tests` | join(...) resolves to missing path |
| `tests\unit\meta\repoStructure.test.ts` | fs-path | `e2e` | join(...) resolves to missing path |
| `tests\unit\meta\repoStructure.test.ts` | fs-path | `src\engine\_archive\README.md` | join(...) resolves to missing path |
| `tests\unit\meta\testTimingsBudget.test.ts` | fs-path | `..\..\..\..\..\n` | join(...) resolves to missing path |
