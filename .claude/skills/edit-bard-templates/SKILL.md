---
name: edit-bard-templates
description: Add or edit BardEngine narrative templates safely. Use whenever touching files in src/engine/bard/domains/*.json, adding %TOKEN% placeholders, adding new template paths, or calling BardEngine.resolve / generateGovernanceHeadline. Prevents the classic failure — a token whose context key the production call site never supplies, which warns and renders [MISSING: KEY] in player-facing text.
---

# Editing BardEngine Narrative Templates

## Layout

Templates live in `src/engine/bard/domains/*.json` (25 files: `kyujo`, `rikishi`, `media`, `institutional`, `post_bout`, etc.). Paths follow a `domain.subdomain.type` hierarchy — e.g. `kyujo.*` paths live in `kyujo.json`. There is **no `archive.json`** — generated/enriched content merges into `src/engine/bard/registry.json` via `bun scripts/narrative/bard-orchestrator.ts`.

## Resolution contract

```ts
BardEngine.resolve(rng, "path.to.template", { heya, severity, amount })
// → { text, id, path }
```

`%TOKEN%` placeholders (`%HEYA%`, `%AMOUNT%`, `%INTENSITY_LABEL%`, `%HEYA_NAME%`, `%SHIKONA%`, …) are valid **only where the production `resolve()` call site actually supplies that context key**. A token with no supplied key warns and renders `[MISSING: KEY]` in player-facing text — the failure is silent at author time.

So before adding a `%FOO%` token: find the production call site for that template path and confirm `foo` is in its context object. If the key isn't supplied, either add it at the call site or don't use the token.

## `generateGovernanceHeadline` — named args only

```ts
// CORRECT:
generateGovernanceHeadline({ world, heyaId, templatePath: "institutional.governance.scandal", severity: "major" });
// WRONG — positional args silently break (severity ends up undefined):
generateGovernanceHeadline(world, heyaId, severity, reason);
```

## Verify

After adding/editing templates, run the integrity gate — it resolves **every production path with its real context keys**, so it catches token/context mismatches:

```bash
bun run test -- tests/unit/engine/bard/templateTokenIntegrity.test.ts
```

For bulk narrative expansion there's the Gemini-backed orchestrator (see `orchestrate-narrative` skill), which writes to `registry.json` — but hand edits to `domains/*.json` need only the integrity test.
