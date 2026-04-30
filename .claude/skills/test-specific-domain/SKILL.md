---
name: test-specific-domain
description: Runs tests for a specific engine domain (banzuke, matchmaking, lifecycle, etc.)
disable-model-invocation: true
---

Run tests for a specific engine domain without running the full test suite:

```bash
cd "/Users/amauricia/Documents/GitHub/sumo-manager-pro" && bun test -- --run src/engine/__tests__/{domain}/*.test.ts
```

Replace `{domain}` with the specific domain you want to test. Examples:
- `src/engine/__tests__/banzuke/*.test.ts`
- `src/engine/__tests__/matchmaking.test.ts`
- `src/engine/__tests__/lifecycle.test.ts`
