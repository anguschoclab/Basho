---
name: orchestrate-narrative
description: Runs the Bard Engine orchestrator for narrative content generation
disable-model-invocation: true
---

Run the Bard Engine v2.2 unified orchestrator to expand dynamic narrative content (from the repository root):

```bash
bun scripts/narrative/bard-orchestrator.ts
```

It covers four jobs — event templates (domains), play-by-play matrix, daily news digests, and registry enrichment (descriptions/labels) — across domains such as basho, recruiting, economy, medical, governance, rivalry, lifecycle, welfare, awards, training, management, facility, and narrative. Generated output is merged into `src/engine/bard/registry.json` (note: `archive.json` no longer exists; runtime templates live in `src/engine/bard/domains/*.json`).

**Note**: Requires GEMINI_API_KEY environment variable to be set.

```bash
export GEMINI_API_KEY=your-api-key-here
bun scripts/narrative/bard-orchestrator.ts
```
