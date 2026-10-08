---
name: run-e2e-tests
description: Runs Playwright end-to-end tests (smoke or soak projects)
disable-model-invocation: true
---

Run Playwright end-to-end tests (from the repository root):

```bash
bunx playwright test --project=smoke   # fast specs: golden-path, reload-restore
bunx playwright test --project=soak    # long specs: full-basho-lifecycle, year-of-bashos
bunx playwright test                   # all specs
```

The smoke project validates the critical user journey from boot to basho simulation in a real browser environment (~2–4 min). The soak project drives full 15-day bashos and a whole game year through the UI (~8–10 min) — run it adhoc before releases, not on every change. The Playwright config automatically starts the dev server.
