---
name: test-coverage
description: Runs tests with coverage reporting
disable-model-invocation: true
---

Run tests with coverage reporting to identify untested code:

```bash
cd "/Users/amauricia/Documents/GitHub/sumo-manager-pro" && bun run test:coverage
```

This measures test coverage for engine components. Coverage thresholds: 85% lines, branches, functions, statements.
