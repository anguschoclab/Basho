---
name: test-specific-domain
description: Runs tests for a specific engine domain (banzuke, matchmaking, lifecycle, etc.)
disable-model-invocation: true
---

Run tests for a specific engine domain without running the full test suite (from the repository root):

```bash
bun run test -- src/tests/unit/engine/{domain}
```

Tests live under `src/tests/unit/engine/` (mirroring `src/engine/`). Examples:

```bash
# Banzuke tests (promotion logic, ranking)
bun run test -- src/tests/unit/engine/banzuke

# Matchmaking tests
bun run test -- src/tests/unit/engine/matchmaking

# Lifecycle tests (retirement, injuries)
bun run test -- src/tests/unit/engine/lifecycle

# Bout physics tests
bun run test -- src/tests/unit/engine/bout

# Economy tests
bun run test -- src/tests/unit/engine/economy

# Governance tests
bun run test -- src/tests/unit/engine/governance
```

Or pass a single file: `bunx vitest run src/tests/unit/engine/banzuke/promotionLogic.test.ts`
