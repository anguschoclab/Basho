# BardEngine Warning Census — 1.3 GB popflow-console.log synthesis

## Provenance

`scripts/sim/popflow-console.log` — console output of the 15-year
`population-flow.ts` run (seed `baseline-25yr-a`, 90 basho), generated
2026-11-06 before the succession-closure work landed.

| Metric | Value |
|---|---|
| File size | 1,302,925,052 bytes (1.21 GiB) |
| Total lines | 15,970,087 |
| BardEngine "No options found" warnings | 15,969,185 (**99.994%**) |
| Pipeline transition lines | 180 (2 per basho) |
| Other | 1 `[Recruitment] Emergency` notice + 1 `done` |
| Errors / exceptions / NaN | **0** (11,549 apparent matches were `-i NaN`
hitting the "nance" substring inside `governance`/`dominance`) |

## Root cause — NOT missing templates

`BardEngine.resolve()` reads `domainCache`, which is only populated by the
**async** `BardEngine.loadDomains()` (`await import` per domain JSON).
`bootstrap.tsx` and `engine/simulation/run.ts` preload it; **`population-flow.ts`
called `runAutoSim` directly and never preloaded.** Every `resolve()` therefore
hit an empty cache, warned, and returned `""` — roughly 20 resolves per bout ×
~800K bouts ≈ 16M warnings.

Verification: **all 159 unique censused paths exist** in
`src/engine/bard/domains/*.json` (checked programmatically, including
intensity-band fallbacks like `engagement.belt.common`). Zero genuinely-missing
templates.

## Fix applied

Added the standard preload (`await BardEngine.loadDomains()` + comment) to the
four scripts that drive bout simulation without it:

- `scripts/sim/population-flow.ts`
- `scripts/sim/yokozuna_sim.ts`
- `scripts/measure/compare-engines.ts`
- `scripts/measure/measure-kimarite-distribution.ts`

Verified post-fix: `compare-engines --count=100` → 0 warnings (was ~1,500+).

## Residual value extracted

The census doubles as a **requested-path map** for the pbp pipeline — every
template path the narrative layer actually resolves during a bout, with real
frequencies. Kept as `scripts/sim/bard-warning-census.txt` (170 lines).

### Domain rollup

| Domain | Warnings | Share |
|---|---:|---:|
| `combat.*` | 10,468,424 | 65.5% |
| `pre_bout.*` | 2,151,821 | 13.5% |
| `post_bout.*` | 1,925,267 | 12.1% |
| `world.*` + `h2h.*` + `interview.*` | 1,251,263 | 7.8% |
| `npc.*` / `media.*` / `institutional.*` / `strategy.*` / `events.*` / `oyakata.*` / `dynasty.*` | 172,410 | 1.1% |

### Top 15 paths (91% of volume)

| Count | Path | Call site |
|---:|---|---|
| 4,130,409 | `combat.engagement.belt` (i1) | `bout/narrative/frames.ts` (`combat.engagement.${family}`) |
| 1,402,143 | `combat.engagement.stamina` (i2) | `frames.ts` |
| 591,454 | `combat.phases.tachiai` (i1) | `frames.ts` |
| 580,898 | `pre_bout.career_phase_debut` | `context2.ts` (`pre_bout.career_phase_${phase}`) |
| 446,349 | `combat.phases.fatigue.early` | `frames.ts` |
| 436,981 | `post_bout.records.winner_improves` / `loser_falls` | `postbout.ts` |
| 436,981 | `post_bout.reaction` | `postbout.ts` |
| 436,981 | `h2h.first_meeting` | `bout/h2h.ts`, `prelude.ts` |
| 436,981 | `combat.phases.ritual.shikiri` | `ceremony.ts` |
| 436,981 | `combat.phases.finish` | `frames.ts` |
| 436,930 | `pre_bout.opening_day` | `stakes.ts` |
| 377,301 | `interview.neutral` | `interview.ts` |
| 357,829 | `combat.phases.counter_tactic` | `frames.ts` |
| 330,011 | `pre_bout.physical_comparison` | `context.ts` |
| 239,458 | `world.venues.Tokyo.entrance` | `prelude.ts` |

### Per-bout resolve sequence (ordered beats)

Extracted from the log head — the fixed narrative pipeline order per bout:

```
world.venues.<Venue>.entrance → h2h.first_meeting →
pre_bout.physical_comparison / style_matchup / archetype_counter /
storylines.* / career_phase_* / opening_day →
combat.phases.ritual.entrance|salt|shikiri → combat.phases.tachiai →
combat.engagement.<family> / combat.phases.clinch|counter_tactic|
edge_crisis|momentum|fatigue.* → combat.phases.finish(.dramatic) →
combat.phases.ceremony.common|dramatic →
post_bout.reaction|records.*|replay.*|storylines.* → interview.neutral ×3
```

## Optional follow-ups (not done)

- **Warn-once dedup**: `resolve()` warns per-call; a `Set<path+intensity>`
  dedup inside `warn` would make any future preload miss cost ≤159 lines
  instead of 16M. Behavioral change to engine logging — left out of this fix.
- Any script driving sims through `runAutoSim`/`resolveBoutPhysics` directly
  must preload domains; consider a lint note or a shared `simPrelude()` helper.
