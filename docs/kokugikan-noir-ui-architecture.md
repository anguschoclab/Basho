# "Kokugikan Noir" UI/UX & Component Architecture (`src/components/`, `src/pages/`)

Basho's UI is governed by `docs/design-bible.md` and policed mechanically by
`scripts/audit/designScan.ts` and `tests/unit/audit/designBible.test.ts` —
a zero-violation gate that runs in the default `bun run test` suite (16 rules
across `pages`, `components`, `state`, `hooks`, `presenters`, `constants`,
and `engine` for display copy).

- Use `SWE-2 Flash Max` as Your Default Frontend Workhorse:
  - FrontierCode 2.0 grades models on mergeability — repo style, scope
    discipline, correctness — and SWE-2 Flash edges out SWE-2 Max on that
    benchmark (vendor-reported, Nov 2026).
  - When building or updating cards, tables, and views under the three-pane
    FM-style layout (`AppLayout` → `AppSidebar`, `TopNavBar`,
    `MainContentPane`, `EventLogPanel`), the mechanical negative constraints
    are:
    - Only CSS variable HSL tokens (`hsl(var(--primary))`, `--east`,
      `--west`, `--gold`) — never `text-white`, `bg-black`, numeric `hsl()`,
      or `rgba()` shadows (`hex-color`, `rgb-color`, `banned-gradient`,
      `hardcoded-palette`, `hardcoded-hsl`, `raw-white-black`, `rgba-shadow`
      gates; sole literal-color exemption is `constants/ui/drawingPalette.ts`).
    - Three-font hierarchy: `Shippori Mincho B1` (`font-display`) for
      headings, `Spectral` (`font-body`) for prose, `JetBrains Mono`
      (`font-mono` + `tabular-nums`) for all numbers, badges, and `≤0.15em`
      uppercase labels (`banned-font`, `oversized-tracking`,
      `inline-oversized-tracking`, `arbitrary-text-size` gates).
    - No banned "cosplay-copy" strings — `Control Center`, `Institution`
      (for the player's heya), `Intelligence`, `Scout Intel` — and no
      `SNAKE_CASE` display copy (`cosplay-copy`, `screaming-copy`; scoped to
      `pages`/`components`/`constants`/`hooks`/`engine`/`presenters`, so
      engine-generated display strings like digest section titles are
      covered too).
    - "No Fabricated Chrome": bind exclusively to real snapshot/presenter
      outputs (e.g. `HeyaFinanceResult.income`/`outgoings` in
      `IncomeExpensesCards`) and use `—` (em dash) for missing data —
      `"N/A"` is mechanically gated by `na-placeholder`.
- Escalate to `SWE-2 High` Only for Multi-Surface Fog-of-War Views:
  - When building a view that combines observability rules across multiple
    entities — such as the stable-vs-stable Compare tabs in
    `src/components/scouting/PerceptionOverview.tsx`, or the rikishi
    `CompareModePanel` used by `RosterWidget` / `RecruitingTab` — use SWE-2
    High to keep engine-truth scalars out of component state. The real
    vocabulary:
    - **Scouted attributes** degrade by `ConfidenceLevel`
      (`"certain" | "high" | "medium" | "low" | "unknown"` —
      `FogOfWarService.getConfidenceLevel`), rendered through
      `resolveScoutedAttribute` → `{ value, confidence, narrative }`
      ("appears …", "may be …" qualifiers), plus `ScoutingBias` ±20 offsets
      that decay as observations accumulate.
    - **Rival-stable surfaces** show only qualitative bands via
      `buildPerceptionSnapshot` (`healthBand`, `momentum`, `prestigeBand`,
      `rosterStrengthBand`, `runwayBand`, `statureBand`, `mediaHeatBand`,
      `rivalryPressureBand`, `complianceState`, `styleBias`) — the same
      banded snapshot NPC AI consumes (Constitution A7.1).
    - **Never render `world.rikishi.get(id).stats.*` for non-owned
      rikishi** — `CompareStats` is gated to `world.playerHeyaId` for this
      reason; anything else shows "Stats unavailable".
    - Injuries and kyūjō durations are NOT public in compare views —
      rival health surfaces only as a condition-derived `healthBand`.
      Don't surface `injured`/`injuryWeeks` without an explicit design
      decision.
