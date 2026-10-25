---
name: run-headless-sim
description: Runs the 25-year NPC-only headless simulation diagnostic
disable-model-invocation: true
---

Run the canonical 25-year headless simulation diagnostic to validate long-term simulation stability (from the repository root):

```bash
bun scripts/diagnostic-25yr-sim.ts              # default: 25 years
bun scripts/diagnostic-25yr-sim.ts --duration 5 # shorter horizon for iteration
```

Combines anomaly detection (per-year snapshots), error capture, and tuning metrics, and writes a JSON report. It validates economy balance, tournament frequency, rikishi population drift, yokozuna presence, foreign-rikishi limits, and Global Cup completion over the simulated span.
