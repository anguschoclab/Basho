---
name: test-specific-domain
description: Runs tests for a specific engine domain (banzuke, matchmaking, lifecycle, etc.)
disable-model-invocation: true
---

Run tests for a specific engine domain without running the full test suite:

```bash
cd "/Users/amauricia/Documents/GitHub/sumo-manager-pro" && bunx vitest run src/engine/__tests__/{domain}/*.test.ts
```

Replace `{domain}` with the specific domain you want to test. Examples:

```bash
# Banzuke tests (promotion logic, ranking)
bunx vitest run src/engine/__tests__/banzuke/*.test.ts

# Matchmaking tests
bunx vitest run src/engine/__tests__/matchmaking.test.ts

# Lifecycle tests (retirement, injuries)
bunx vitest run src/engine/__tests__/lifecycle.test.ts

# Bout physics tests
bunx vitest run src/engine/__tests__/bout/*.test.ts

# Economy tests
bunx vitest run src/engine/__tests__/economy/*.test.ts

# Governance tests
bunx vitest run src/engine/__tests__/governance/*.test.ts
```
