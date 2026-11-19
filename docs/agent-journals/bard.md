# Bard's Journal

## 2026-11-18 - A supplied token can still fail the integrity gate (bag contexts)

**Discovery:** `emitYdcStatement` in `YokozunaService.ts` builds its resolve context as `{ SHIKONA, rikishiId, CHAIRMAN, ...opts.extraVars }` — `%CHAIRMAN%` IS supplied in production, yet `templateTokenIntegrity.test.ts` renders `[MISSING: CHAIRMAN]` for any template using it. The extractor treats any context object containing a spread as an opaque "bag" and validates it against the hardcoded `BAG_CONTEXT` key list in the test, which does not include `CHAIRMAN`. Trust the gate's model, not the literal context object.
**Rule:** Before using a `%TOKEN%` no sibling template already uses, check how the test extracts the call site's context keys (explicit literal keys → validated; any spread → `BAG_CONTEXT` hardcoded list). A token must be in the test's model of the context, not just in the production object.
**Check:** Search `BAG_CONTEXT` in `tests/unit/engine/bard/templateTokenIntegrity.test.ts` for the token name. If absent and the call site spreads, the template will fail even though production supplies the key.

## 2026-11-18 - Paths invisible to the integrity gate still exist

**Discovery:** `ydc_accountability.warning` and `.demand_reflection` are passed to `emitYdcStatement` via a shorthand `templatePath,` property bound to a ternary (`consecutiveMK >= 2 ? "...demand_reflection" : "...warning"`). The extractor's `propertyLiteralValues("templatePath")` only harvests `templatePath: "lit"` assignments, so NO test row exercises these two paths — a broken template there would pass the gate. `BardEngine.has()` guards don't help: the paths exist, they'd just emit `[MISSING:]` at runtime.
**Rule:** Gate coverage ≠ production coverage. For paths reached through variables/shorthand/ternaries, verify tokens manually against the production context — the test cannot see them.
**Check:** `grep "templatePath"` in the consuming service; if the path is bound to a variable or shorthand property, hand-resolve it via tsx (load domains → `BardEngine.resolve(rng, path, realCtx)`) before shipping.

## 2026-11-18 - Thin template files may be dead content, not enrichment targets

**Discovery:** `medical.json` (6 paths × 3) and most of `events.json` (title/summary pairs like `events.medical.*`, `events.basho.day_*`, `events.lifecycle.retirement_*`, `events.economy.insolvency_*`) have NO production `resolve()` callers — the `EventBus` factories (`medicalReportBase`, `bashoStatus`, `boutResolved`, `awardConferred`, `lifecycleEvent`) are exercised only in tests; production code logs those event types with hardcoded strings (e.g. `physioPurchase.ts`, `phase01_basho_npc_tactics.ts`).
**Rule:** "Low variant count" ≠ "high-value gap." Always locate a live `BardEngine.resolve`/`generateGovernanceHeadline` call site for a path before writing content for it — enriching dead paths ships zero player-facing value.
**Check:** `grep -rn "resolve.*<domain>" src/engine` and `grep -rn "EventBus\.<factory>" src` — if only tests call the factory, the templates are dead.

## 2024-11-11 - Enriching Oversleeping Narratives (folded from .jules/bard.md, PR #1205)
**Discovery:** The oversleeping incident (which is triggered when `world.cyclePhase === "active_basho"` and random chance) lacked variety, leading to repeated fusensho loss descriptions for rikishi.
**Rule:** When adding new narratives for events like kyujo or incident reports, ensure the tone matches the gravity of sumo (e.g. "fusensho scandal", "deeply embarrassing", "unforced error") and only use context tokens that are populated by the engine (`%SHIKONA%` for kyujo, `%SHIKONA%` and `%DAY%` for events).
**Check:** Verify token bindings by running `bun x vitest run tests/unit/engine/bard/templateTokenIntegrity.test.ts`.
