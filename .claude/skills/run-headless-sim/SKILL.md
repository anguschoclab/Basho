---
name: run-headless-sim
description: Runs the 25-year NPC-only headless simulation diagnostic
disable-model-invocation: true
---

Run the 25-year NPC-only headless simulation diagnostic to validate long-term simulation stability:

```bash
cd "/Users/amauricia/Documents/GitHub/sumo-manager-pro" && bun scripts/headless-sim-25yr.ts
```

This validates economy balance, tournament frequency, rikishi population drift, yokozuna presence, and Global Cup firing over 25 years of simulation.
