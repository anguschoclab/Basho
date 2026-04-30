---
name: run-e2e-tests
description: Runs Playwright end-to-end golden path tests
disable-model-invocation: true
---

Run Playwright end-to-end golden path tests:

```bash
cd "/Users/amauricia/Documents/GitHub/sumo-manager-pro" && bunx playwright test
```

This validates the critical user journey from boot to basho simulation in a real browser environment. The Playwright config automatically starts the dev server.
