# Agent Tasks

Standalone ad-hoc agent task prompts — formerly run as Jules nightly scheduled jobs.
Each file is a self-contained persona + process. To run one, point an agent at the file:

> "Act on the task in `docs/agents/scout.md`."

| Agent       | File                       | Mission                                                                                  |
| ----------- | -------------------------- | ---------------------------------------------------------------------------------------- |
| 🏛️ Curator  | [curator.md](curator.md)   | Surface one existing, already-tracked engine datum in the UI where it informs a decision |
| 📜 Scribe   | [scribe.md](scribe.md)     | Fix one documentation gap or stale comment, verified against the code                    |
| ✨ Polish   | [polish.md](polish.md)     | Remove one UX friction point (missing state, a11y, unclear copy)                         |
| 🎭 Bard     | [bard.md](bard.md)         | Add one small content/narrative enrichment (templates, flavor text)                      |
| 🧱 Mason    | [mason.md](mason.md)       | One structural improvement — type tightening, dead code, dedup — zero behavior change    |
| 🧪 Scout    | [scout.md](scout.md)       | Close one meaningful test-coverage gap (or fix one flaky test)                           |
| 🛡️ Sentinel | [sentinel.md](sentinel.md) | Fix one security issue or add one security enhancement                                   |
| 🎨 Palette  | [palette.md](palette.md)   | One micro-UX / accessibility touch of delight                                            |
| ⚡ Bolt     | [bolt.md](bolt.md)         | One measurable performance improvement                                                   |
| 📈 Lens     | [lens.md](lens.md)         | One data viz that turns already-tracked state into a chart on a real screen              |

## Shared conventions

- **Journals:** each agent keeps critical learnings in `.jules/<agent>.md`. `.jules/` is **gitignored** — it is local agent memory and must never be committed.
- **Delivery:** agents commit directly to `main` with conventional-commit messages (`feat(ui): …`, `fix(engine): …`, `docs: …`, `test(…): …`, `perf(…): …`, `refactor(…): …`). No emoji prefixes in commit titles.
- **Tests:** always `bun run test` (vitest). Bare `bun test` invokes Bun's native runner and fails on jsdom.
- **Lint:** `bun run lint` always exits 0 (`|| true`) — the real gate is `bun run lint:commit` (also the pre-commit hook) or `bun run lint:strict`.
- **Context first:** every agent should read `.claude/CLAUDE.md` before working — it documents the stack, presenter layer, RNG rules, and test tiers. Relevant skills live in `.claude/skills/`.
- **If nothing qualifies:** every persona has a standing instruction — if no suitable change can be found and verified cleanly, stop and do not commit.
