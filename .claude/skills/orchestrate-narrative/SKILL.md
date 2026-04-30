---
name: orchestrate-narrative
description: Runs the Bard Engine orchestrator for narrative content generation
disable-model-invocation: true
---

Run the Bard Engine orchestrator to generate dynamic narrative templates:

```bash
cd "/Users/amauricia/Documents/GitHub/sumo-manager-pro" && bun scripts/bard-orchestrator.ts
```

This generates narrative templates for event domains (basho, recruiting, economy, medical, governance, rivalry, lifecycle, welfare, awards, training, management, facility, narrative) and expands archive.json.

**Note**: Requires GEMINI_API_KEY environment variable to be set.
