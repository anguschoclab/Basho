# Avatar System Polish — Propagation Gaps, Dead-Code Sweep & Variety Wiring (validated)

Plan built from an evidence-grounded audit of the v2 pixel-avatar system (`avatarGenerator.ts`, `types/avatar.ts`, `pixelCompose.ts`, `pixelAtlas.ts`, `SumoAvatar.tsx`, ~100 `resolveAvatar` call sites, 44 passing tests). Fixes three propagation gaps, wires unique-but-dead render code instead of deleting it, gives elders weight memory, and pins down the version policy. Strict test-first schedule.

## Context

The avatar system's architecture is sound: seeded `AvatarIdentity` persisted as `avatarConfig` + transient `AvatarStage` derived from live state; dedicated `SeededRNG("avatar-id::"…)` so faces never perturb sim determinism; version-gated backfill in `deserializeWorld`; seed aliases keep faces stable across promotion → retirement → oyakata conversion. The gaps are (a) three surfaces that drop faces the data already supports, (b) dead parameters that promise variety the pixels never deliver, (c) elders losing all body mass on conversion.

**Directive honored:** in the dead-code sweep, anything _unique_ (sole source of a visual variety or the only identity-only render path) is **wired in and used**, not deleted. Only true no-op code is removed.

---

## Part 1 — Verified findings ledger

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                        | Evidence    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| F1  | **Global search drops retired faces.** `entitySearchProjections.ts:240-248` calls `toHit` with no `avatar` for _both_ `RetiredRikishiSummary` and full-`Rikishi` retired entries. Data exists (`ensureAvatarIdentities` backfills `historicalRikishi`; `buildRetiredRikishiSummary.ts:100` carries `avatarConfig`) — projection never resolves it. Active rikishi get faces (`:221-228`); retired get initials.                                | read        |
| F2  | **Retired profile page never renders a face.** `RetiredRikishiProfile.tsx:61` renders `<SumoAvatar size="lg" fallback={summary.shikona} />` — no `avatar`/`config` prop at all → always the initials fallback despite `summary.avatarConfig` being populated.                                                                                                                                                                                  | read        |
| F3  | **`browThickness` 1 and 2 are pixel-identical.** `pixelCompose.ts:187` — `t === 3 ? [7,8] : t === 2 ? [8] : [8]`. Two-thirds of the parameter's range is a no-op. Stored on every identity.                                                                                                                                                                                                                                                    | read        |
| F4  | **`intense` eye offset is dead.** `pixelCompose.ts:146` — `const y = intense ? 10 : 10;`. The squint that was apparently intended (move/shade the eye line) was abandoned; only 2 shadow pixels at `(8,y-1)`/`(16,y-1)` remain (`:177-181`).                                                                                                                                                                                                   | read        |
| F5  | **Expression overrides clone identity mouths.** `confident` ≡ `smile` and `worried` ≡ `frown` pixel-for-pixel (`pixelCompose.ts:249-264` vs `:269-278`). Expression adds nothing the base mouth didn't already show.                                                                                                                                                                                                                           | read        |
| F6  | **`rikishiStageInput` tautology.** `avatarGenerator.ts:443` — `role: r.isRetired ? "rikishi" : "rikishi"`. Not unique; pure dead ternary.                                                                                                                                                                                                                                                                                                      | read        |
| F7  | **Oyakata instantly lose all girth.** `fullness` only applies to `rikishi`/`prospect` (`avatarGenerator.ts:260-262`); `Oyakata` has no weight field and `retireeOyakataConversion.ts` doesn't carry `retiree.weight`. A 180kg retiree stays heavy while a `Rikishi` record (role stays `"rikishi"`) but shrinks to zero on elder conversion. Same for `RetiredRikishiSummary` — no weight carried (`buildRetiredRikishiSummary.ts`).           | read        |
| F8  | **`SumoAvatar` `config`/`stage` props = dead API + footgun.** No call site passes `config=` (grep hits are unrelated props on other components). If used bare, `deriveAvatarStage({}, identity)` defaults `age ?? 30` (`avatarGenerator.ts:251`) → every person renders as a 30-year-old prime-stage face; an elder oyakata would show no wrinkles/gray. This is the _only_ identity-only render path — worth keeping but must be made honest. | read + grep |
| F9  | **Summaries lack `nationality`.** `RetiredRikishiSummary` has `origin` but no `nationality`; `HallOfFamePage.tsx:53` already works around it (`"nationality" in hist ? … : undefined`) → foreign inductees fall back to Japan tone _if_ their stored config is ever rejected/missing. Low-probability path (stored config normally wins) but a real fidelity hole.                                                                             | read        |
| F10 | **No version policy.** `stored.version === AVATAR_VERSION` is the only gate (`avatarGenerator.ts:302`). Bumping to v3 silently regenerates every face in every save — no feature-preserving migration path, and nothing documents that trade-off.                                                                                                                                                                                              | read        |
| F11 | Minor: `expression` prop on `SumoAvatar` spreads a new stage each render (`SumoAvatar.tsx:97-99`), busting the `paths` memo whenever used. Japan `skinTone` is effectively 2 tones (`range[0] === base`, `avatar.ts:119`).                                                                                                                                                                                                                     | read        |

Precedent for the F1/F2 fix already exists: `HallOfFamePage.tsx:50-56` resolves avatars for historical entries via `resolveAvatar({ id, stored: hist.avatarConfig, role: "rikishi", age: world.year - hist.birthYear })`.

---

## Part 2 — Fix list (ordered)

### B1. Close the retired-avatar propagation gaps (F1, F2, F9)

- **New helper** in `avatarGenerator.ts` next to the other stage-input fns:

  ```ts
  export function retiredSummaryStageInput(
    s: RetiredRikishiSummary,
    currentYear: number
  ): AvatarStageInput {
    return {
      role: "rikishi",
      age: currentYear - s.birthYear, // keeps aging like HallOfFamePage
      isRetired: true, // → suit + short/receding/bald, no topknot
      weight: s.weight, // wired by B3 — may be undefined on old saves
    };
  }
  ```

- **`entitySearchProjections.ts` retired bucket:** summary path → `avatar: s.avatarConfig ? resolveAvatar({ id: s.id, stored: s.avatarConfig, nationality: s.nationality ?? s.origin ?? "Japan", ...retiredSummaryStageInput(s, world.year ?? 0) }) : undefined`; full-Rikishi path → same `rikishiStageInput(r, world.year)` call the active bucket uses.
- **`RetiredRikishiProfile.tsx`:** pass `avatar={resolveAvatar({ id: summary.id, stored: summary.avatarConfig, nationality: summary.nationality ?? summary.origin ?? "Japan", ...retiredSummaryStageInput(summary, world.year) })}` (needs `world` — already in scope for the HoF badges; confirm).
- **F9 (additive):** `RetiredRikishiSummary` gains `nationality?: string` and `weight?: number`; `buildRetiredRikishiSummary` stamps `rikishi.nationality` + `rikishi.weight`. Backfill optional — `ensureAvatarIdentities` doesn't touch these fields; undefined → Japan-tone + slim fallback is the current behavior anyway.
- **Audit sweep (same pass):** grep `<SumoAvatar` for usages with neither `avatar=` nor `config=` and confirm no other person surface is silently faceless.

### B2. Wire the unique dead render code (F3, F4, F5) — do not delete

- **B2a `browThickness` (unique brow-density variety → wire):** `pixelCompose.ts:187` —
  - `t=1` → short 2px dashes per brow (`x8-9`, `x15-16` at row 8),
  - `t=2` → unchanged (row-8 segments),
  - `t=3` → unchanged (rows 7+8).
  - Now `gen()` output meaningfully shifts for ~2/3 of seeds that were previously invisible.
- **B2b `intense` squint (unique eye-geometry expression → wire):** complete the abandoned offset — when `stage.expression === "intense"`, overlay `"skinShadow"` across both eye spans at `y-1` (`x8-9`, `x15-16`), mirroring `narrow`'s lid. Works over every eye style instead of the current 2px corners. Delete the `? 10 : 10` ternary in the same edit.
- **B2c Expression distinctness (wire):** give `confident`/`worried` a secondary cue on top of their mouth shapes so they aren't pixel-clones of `smile`/`frown` — `confident` raises both brow rows 1px (`yy - 1`); `worried` drops the inner brow ends 1px (furrow hint: `px(10, yy+1)`/`px(14, yy+1)` — already what `furrowed` does, apply as an overlay for any brow style). `determined`/`intense` mouths already differ (`flat` bar) — no change needed.

### B3. Weight memory for elders (F7)

- `Oyakata` gains `weight?: number` (comment: kg at retirement — drives avatar fullness only).
- `retireeOyakataConversion.ts`: `newOyakata.weight = retiree.weight` when present.
- `oyakataStageInput(o)` adds `weight: o.weight`.
- `deriveAvatarStage` fullness rule: apply to `rikishi`/`prospect` as today **plus** `oyakata` when `input.weight` is defined (same 125/165 bands). NPC-factory oyakata stay undefined → unchanged slim look (they're fictional generated elders; optionally `WorldFactory` could seed `weight` ~N(140,20) — listed as optional below).
- `RetiredRikishiSummary.weight` (from B1/F9) feeds `retiredSummaryStageInput` → archived heavies keep their build.

### B4. Honest `config`-only fallback — wire the unique API, don't delete (F8)

- `deriveAvatarStage` gets role-aware default ages instead of a flat `?? 30`: `rikishi 25, prospect 17, oyakata 60, gyoji 50, shimpan 60, staff 45`. `attireFor`/`hairstyleFor` already key off `identity.role`, so a `config`-only render then produces a plausible neutral portrait (elder oyakata actually looks elder) instead of everyone-is-30.
- Document `config`+`stage` props on `SumoAvatar` as the thin-data path (identities without a live entity); leave them in the API now that they're honest. `RetiredRikishiProfile`/search use the richer resolved stage from B1 regardless.

### B6. Clickable-name conformance on person/stable render points (user-requested)

Every person or stable name rendered on the surfaces this work touches must route through the `ClickableName` family (`RikishiName` → `/rikishi/$id`, `StableName` → `/stable/$id`, `OyakataName` → `/oyakata/$id`, existence-gated) — matching the convention already used in `RikishiLineage`, `BashoHistoryCard`, and `InducteeCards`. Exceptions that are already correct: the page subject's own name (profile `<h1>`), and search dropdown rows where the whole row is the click target (nested links there would be wrong).

- **`NarrativeSummarySections.tsx:157`** — prestige card renders `{item.heya.name}` bare. `getPrestigeChanges` (`recapEventGroups.ts:88-97`) already returns the full `Heya`; widen the declared type to include `id` and render `StableName`.
- **`InducteeCards.tsx:92-95`** — `Stable: <span>{inductee.heyaName}</span>` bare. `UIHofInductee` needs `heyaId` added in `hofProjection.ts` (the `heya` lookup already exists at `:39`) → `StableName`.
- **`InducteeCards.tsx:162`** — `f.opponentName` bare in "Notable Bouts". `greatestFights` already has `m.opponentId` at build time (`hofProjection.ts:53`) — carry `opponentId` through the DTO → `RikishiName` (retired opponents still resolve via `/rikishi/$id`).
- **`RetiredRikishiProfile`** — already uses `StableName` for the heya (`:84`); subject `shikona` stays an `<h1>`. Confirm no new bare names are introduced by the B1 avatar wiring.

### B5. Delete the true no-op + policy docs (F6, F10, F11)

- `avatarGenerator.ts:443` → `role: "rikishi"` (delete ternary).
- `SumoAvatar.tsx` expression override → wrap `resolvedStage` in `useMemo` keyed on `[avatar?.stage, stage, identity, expression]` so the `paths` memo isn't busted every render.
- Versioning policy comment at `AVATAR_VERSION` (`types/avatar.ts:17`): bumping regenerates every stored face; if a future v3 must preserve faces, map v2 fields forward rather than reseeding. One paragraph — no code.
- Optional cosmetic: widen Japan `skinTone.range[0]` slightly so the pick yields 3 tones (`avatar.ts:119`); seed `weight` for `WorldFactory`-generated oyakata.

---

## Part 3 — Implementation sequence (strict test-first)

> **Rule:** failing tests exist and are confirmed red before each production change. Follow repo test conventions (right tier = `tests/unit`, seeded determinism, no `Math.random`, no tautological assertions; existing avatar tests use literal objects + `as never` — match that style).

**P1-T — Write all failing tests first; confirm red:**

1. `tests/unit/components/avatar/pixelCompose.test.ts` — extend:
   - `browThickness` 1 vs 2 vs 3 each produce different `composeAvatar` output on the same identity (red today: 1≡2).
   - `expression: "intense"` differs from `"neutral"` for **every** eye style, not just via the 2 corner pixels (assert eye-span shadow row present — e.g. output for `upturned` eyes + intense ≠ base; today it differs only by 2px, strengthen to assert the lid row).
   - `confident` ≠ `smile`-mouthed neutral compose; `worried` ≠ `frown`-mouthed neutral compose (red today).
2. `tests/unit/engine/systems/generation/avatarGenerator.test.ts` — extend:
   - `oyakataStageInput` with `weight: 170` → `fullness === 2`; without weight → 0.
   - `retiredSummaryStageInput` → `isRetired`, `attire` resolves `"suit"`, age derives from `currentYear - birthYear`.
   - `deriveAvatarStage({}, oyakataIdentity)` → elder `ageStage`/wrinkle tier (red today: 30yo prime).
3. `tests/unit/presenters/avatarPropagation.test.ts` — extend (it already audits avatar coverage across projections):
   - retired bucket (both a `RetiredRikishiSummary` fixture and a full retired `Rikishi`) yields `hit.avatar` defined with `identity === stored` seed.
4. Component test for `RetiredRikishiProfile` (nearest existing: `tests/unit/components/avatar/SumoAvatar.test.tsx` patterns) — renders `[data-avatar]` svg, not the fallback, when `summary.avatarConfig` exists.

**P1 — Land in order:**

1. B3 schema/fields (`Oyakata.weight`, `RetiredRikishiSummary.nationality`/`weight`, `buildRetiredRikishiSummary` stamps, `retireeOyakataConversion` stamp).
2. B4 role-aware default ages in `deriveAvatarStage` (unblocks honest fallback).
3. B2 pixel wiring (browThickness, intense squint, expression cues).
4. B5 deletions/comments/memo fix.
5. B1 propagation: `retiredSummaryStageInput` helper → search retired bucket → `RetiredRikishiProfile` → faceless-surface audit sweep.
6. B6 clickable names: `recapEventGroups`/`UIHofInductee` type widening → `StableName`/`RikishiName` swaps in `NarrativeSummarySections` + `InducteeCards`.

**P2 — Optional extras** (only if P1 lands clean): tsukedashi-style weight seeding for generated oyakata; Japan skin-tone third stop; `nationality` backfill for pre-existing summaries (regen path only — stored identities already carry correct tone).

## Verification

- `bun run typecheck`, `bun run lint`, targeted `vitest` → green; then **full** unit suite.
- Meta-gates: no tautological assertions (the pixel-diff tests are the trap — assert _where_ output differs, not just `not.toEqual`), no `Math.random`, correct tier.
- Determinism: no world-RNG consumption added anywhere (`weight`/`nationality` stamps are data copies; `WorldFactory` weight seeding, if done, must use the existing seeded world rng stream at creation — flag for determinism double-run if P2 lands).
- UI spot-check: global search on a retired name shows the face; retired profile page shows the face at `lg`; an elder oyakata shows gray + wrinkles; an injured rikishi shows bandage + worried; a sekitori shows oichomage.

## Risks / notes

- **Pixel-diff tests are brittle-by-design** — they assert on composed output, not specific cells; if a future paint order change shifts overlapping pixels (e.g. brows vs hairline at rows 7-8), tests may need coordinate-level assertions instead of whole-map equality.
- **B2b/B2c touch shared paint paths** — `paintBrows` handles both identity style and expression overlays; keep the overlays inside `paintBrows` (single place where `yy` is computed) rather than spreading expression logic into `paintEyes`.
- **`weight` on `Oyakata` is avatar-only** — don't let it leak into sim/economy logic; name/comment should say so (`weight` at retirement, cosmetic).
- **Serialization** — new optional fields on `Oyakata`/`RetiredRikishiSummary` flow through `SerializationService` automatically (plain JSON fields), but confirm the summary builder is the only construction site.
- Old saves: summaries/oyakata without `weight`/`nationality` still resolve — undefined falls back to current behavior. No migration required.

---

## Implementation progress

- [x] **P1-T** failing tests written first — 9 red for intended reasons (pixelCompose browThickness/intense/expression clones, generator role-defaults/oyakata-weight/retiredSummaryStageInput, retired search avatar, retired profile svg, hofProjection link ids)
- [x] **B3** schema/stamps: `Oyakata.weight`, `RetiredRikishiSummary.nationality`/`weight`, `buildRetiredRikishiSummary` + `retireeOyakataConversion` stamps, oyakata fullness via `oyakataStageInput`
- [x] **B4** `DEFAULT_AGE_BY_ROLE` in `deriveAvatarStage` — config-only renders no longer default everyone to 30
- [x] **B2** pixel wiring: `browThickness` 1/2/3 distinct (dash/line/double-row), intense = real skinShadow lid over both eye spans, confident raises brows, worried drops inner brow tips
- [x] **B5** `isRetired` tautology deleted, `SumoAvatar` stage resolution folded into one `useMemo`, `AVATAR_VERSION` regeneration policy documented
- [x] **B1** `retiredSummaryStageInput` → search retired bucket (summary + full records) → `RetiredRikishiProfile` face wired
- [x] **B6** `UIHofInductee.heyaId`/`opponentId` → `StableName`/`RikishiName` in `InducteeCards`; `getPrestigeChanges` heya `id` → `StableName` in `NarrativeSummarySections`
- [x] **P2 (partial)** skin-tone third stops for all 7 nationalities whose `base === range[0]` (were effectively 2 tones); oyakata weight backfill moved into `ensureAvatarIdentities` — prefers real weight from `world.rikishi`/`historicalRikishi` via `formerRikishiId`, else seeded 110–175kg (covers generated elders, pre-stamp conversions, and old saves uniformly; deterministic, idempotent)
- [ ] **P2 (skipped)** `nationality` backfill for pre-existing summaries — no reliable source to backfill from (origin is a region string); stored identities already carry correct tone, and the v3 policy note covers the regen path
- [x] **Verify** `bun run type-check` clean; eslint clean on touched files; targeted suite 249/249 (33 files); **full unit suite 10190/10190 (1098 files)** after regenerating `docs/audit/test-timings.json` for the two new test files
