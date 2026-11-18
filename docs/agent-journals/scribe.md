# Scribe's Journal

## 2026-11-18 - Phantom tick-phase numbers propagate across agent-facing docs

**Gap:** `.claude/CLAUDE.md`, `.claude/skills/train-rikishi/SKILL.md`, and `.claude/skills/manage-stable/SKILL.md` all described a monolithic numeric tick order with `phase01_economy`, `phase03_progression`, `phase04_welfare`, and `phase05_monthly_*` — none of which exist in `src/engine/tick/phases/` (no `phase03_*`/`phase04_*` files at all). train-rikishi also had the order backwards (training/health before `phase02_context`).
**Truth:** `advanceOneDay` runs `phase00_preflight` → `phase01_daily_micro` (fused econ/welfare/sponsors/drama) → basho tactics+bouts, then on weekly gates spreads in the whole `bashoPipeline`/`offSeasonPipeline` array — both open `phase01_week_economy → phase02_context` and close `phase06_narrative`. Month/year boundary phases (`phase05_monthly_boundary`, `phase01_monthly_market`, `phase06_yearly_boundary`) are appended to the weekly tick that carries the boundary — never standalone cadences.
**Watch:** Phase-number docs anywhere else (skills, plans, audit graphs) may still describe the pre-pipeline-array layout. The `phaseNN_` prefix is a historical numbering, not an execution order — `phase01_week_*` runs after `phase02_context` inside the same pipeline array. `docs/audit/phase-dependency-graph.md` is already corrected; treat it as the reference.
