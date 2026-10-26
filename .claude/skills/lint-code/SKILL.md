---
name: lint-code
description: Runs ESLint to check code quality and style
disable-model-invocation: true
---

Run ESLint over the codebase (from the repository root):

```bash
bun run lint:strict   # real gate: fails on any warning (--max-warnings 0)
bun run lint:fix      # autofix what's fixable
bun run lint          # report-only: script ends with `|| true`, so it NEVER exits non-zero
```

Note: `bun run lint` always exits 0 regardless of findings — use `lint:strict` when you need a pass/fail signal. Slow-suite `lintStrictGate` enforces the strict variant in `src/tests/slow/`.
