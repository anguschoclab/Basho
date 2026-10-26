---
name: format-code
description: Runs Prettier to format code consistently
disable-model-invocation: true
---

Run Prettier to format code consistently across the codebase (from the repository root):

```bash
bun run format        # write fixes
bun run format:check  # verify only (exits non-zero on unformatted files)
```

This maintains consistent code formatting for TypeScript, JavaScript, JSON, CSS, and Markdown files under `src/`.
