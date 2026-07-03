# Plan 06 — Narration Track Harmonization

## Problem

There are currently two parallel, partially-overlapping narrative generation systems that produce separate arrays on `BoutResult`:

| Track | File | Output field | Phase coverage |
|-------|------|-------------|----------------|
| **Legacy prose** | `src/engine/narrative.ts` | `result.narrative[]` | venue framing, ring entrances, ritual, phase commentary, closing |
| **PbP** | `src/engine/bout/boutNarrative.ts` | `result.pbpLines[]` + `result.pbp[]` | ritual, tachiai, engagement, edge_crisis, finish kimarite, awards |

Problems arising from the split:

1. **Duplication**: Both tracks call `combat.phases.ritual.entrance` and `combat.phases.tachiai`. Sponsors `generateBoutNarrative` → which calls `generateNarrative` → which calls it again.
2. **Incoherence at runtime**: The canvas narration overlay uses `result.pbp` (simple strings) first, ignoring the richer `PbpLine` phase metadata. The modal Commentary tab uses `pbpLines`. The modal Narrative tab uses `result.narrative`. The three surfaces show different content from the same bout.
3. **Venue/city coverage gap**: `narrative.ts` handles venue framing but only Tokyo has templates; `boutNarrative.ts` has no venue awareness at all.
4. **Double-generation in UI**: `BoutNarrativeModal` calls `generateBoutNarrative()` again in a `useMemo` at render time, overwriting whatever `pbpLines` were generated during bout resolution. This is both a correctness risk (the seed is re-used, so output is identical, but this is fragile) and a waste.
5. **Context model divergence**: `narrative.ts` has a rich `NarrativeContext` (voice style: dramatic/formal/understated, locale, day context). `boutNarrative.ts` has no voice awareness — all bouts get the same register.
6. **`result.narrative[]` is a flat string array** — no phase or tag metadata. The modal renders it as a wall of text.

### Goal

Produce a **single generation pass** that outputs one `PbpLine[]` array with:
- Venue framing (opening)
- Ritual (entrance, salt, shikiri)
- Tachiai
- Engagement phase lines
- Edge crisis lines
- Kimarite finish
- Award lines (kinboshi/ginboshi/kensho)
- Closing line

All with `phase`, `tags`, and voice style awareness. Retire `result.narrative[]` from the display layer; keep it on `BoutResult` as a legacy compatibility field (populated from the new lines as plain text) until callers are migrated.

---

## Affected Files

| File | Change |
|------|--------|
| `src/engine/bout/boutNarrative.ts` | Rewrite as the single source of truth; absorb venue + voice from `narrative.ts` |
| `src/engine/narrative.ts` | Deprecate `generateNarrative()`; have it call the new unified path |
| `src/engine/bard/narrativeContext.ts` | Expose `buildNarrativeContext(world, day, eastRikishi, westRikishi)` for use in `boutNarrative.ts` |
| `src/engine/types/basho.ts` | Mark `BoutResult.narrative` as `@deprecated` |
| `src/components/game/BoutNarrativeModal.tsx` | Remove the `useMemo` re-generation; remove the Narrative tab (or merge it into Commentary) |
| `src/components/game/BoutLog.tsx` | Unchanged — Log tab continues to render `result.log` |
| `src/components/game/boutReplay/boutCanvas/narration.ts` | Update to use `pbpLines` exclusively (no `result.pbp` fallback needed once unified) |

---

## Step 1 — Extend `PbpLine` with voice and opening/closing tags

**File: `src/engine/types/basho.ts`**

The existing `PbpLine`:
```typescript
export interface PbpLine {
  text: string;
  id?: string;
  phase?: "tactical" | "tachiai" | "clinch" | "momentum" | "finish";
  tags?: PbpTag[];
}
```

Add new phase values and a `segment` field for UI rendering:

```typescript
export type PbpPhase =
  | "opening"    // venue framing
  | "entrance"   // fighter ring walks
  | "ritual"     // salt, shikiri
  | "tactical"
  | "tachiai"
  | "clinch"
  | "momentum"
  | "finish"
  | "award"      // kinboshi/ginboshi/kensho
  | "closing";

export type PbpVoice = "dramatic" | "formal" | "understated";

export interface PbpLine {
  text: string;
  id?: string;
  phase?: PbpPhase;
  tags?: PbpTag[];
  voice?: PbpVoice;    // new — drives rendering style
}
```

Mark `narrative` as deprecated:
```typescript
export interface BoutResult {
  // ...
  pbpLines: PbpLine[];
  pbp: string[];
  /** @deprecated Use pbpLines instead. Will be removed in a future release. */
  narrative?: string[];
  // ...
}
```

---

## Step 2 — Expose `buildNarrativeContext` from `narrativeContext.ts`

**File: `src/engine/bard/narrativeContext.ts`**

Currently `NarrativeContext` is defined here but only constructed inside `narrative.ts`. Move the construction logic here:

```typescript
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";

export function buildNarrativeContext(
  world: WorldState,
  day: number,
  eastRikishi: Rikishi,
  westRikishi: Rikishi,
): NarrativeContext {
  const isElite =
    eastRikishi.rank.startsWith("Y") ||
    eastRikishi.rank.startsWith("O") ||
    westRikishi.rank.startsWith("Y") ||
    westRikishi.rank.startsWith("O");

  const voiceStyle: VoiceStyle =
    day >= 13 && isElite ? "dramatic"
    : isElite ? "formal"
    : "understated";

  const venue = world.currentBasho?.bashoName
    ? BASHO_TO_VENUE[world.currentBasho.bashoName] ?? "Tokyo"
    : "Tokyo";

  return {
    voiceStyle,
    venue,
    day,
    eastRikishi,
    westRikishi,
  };
}

const BASHO_TO_VENUE: Record<string, string> = {
  hatsu: "Tokyo",
  haru: "Osaka",
  natsu: "Tokyo",
  nagoya: "Nagoya",
  aki: "Tokyo",
  kyushu: "Fukuoka",
};
```

---

## Step 3 — Unified `generateBoutNarrative` in `boutNarrative.ts`

This is the core change. The new function absorbs everything from `narrative.ts`'s `generateNarrative()` and adds voice awareness.

**File: `src/engine/bout/boutNarrative.ts`** — full rewrite of `generateBoutNarrative`:

```typescript
import { buildNarrativeContext } from "@/engine/bard/narrativeContext";
import type { PbpLine, PbpPhase } from "@/engine/types/basho";

export function generateBoutNarrative(
  result: BoutResult,
  east: Rikishi,
  west: Rikishi,
  bashoName: string,
  day: number,
  seed: string,
  world: WorldState,
): void {
  const rng = rngFromSeed(seed, "boutNarrative", "pbp");
  const ctx = buildNarrativeContext(world, day, east, west);
  const lines: PbpLine[] = [];

  const push = (text: string, phase: PbpPhase, tags: PbpTag[] = []) => {
    if (text && !text.includes("[MISSING:")) {
      lines.push({ text, id: rng.uuid("pbp"), phase, tags, voice: ctx.voiceStyle });
    }
  };

  // ── OPENING: venue framing (was: narrative.ts only) ──────────────────────
  const venueEntrance = BardEngine.resolve(
    rng, `world.venues.${ctx.venue}.entrance`, { venue: ctx.venue }
  );
  push(venueEntrance, "opening");

  // ── DYNASTY beat (unchanged from existing boutNarrative.ts Step 0) ───────
  const dynastyLine = tryDynastyBeat(rng, east, west, world);
  if (dynastyLine) push(dynastyLine, "entrance");

  // ── DRAMATIC CONTEXT (unchanged Step 0.5) ────────────────────────────────
  const dramaContext = result.dramaticContext;
  if (dramaContext?.score > 0) {
    const dramaLine = BardEngine.resolve(rng, `combat.drama.${dramaContext.label}`, {
      east: east.shikona, west: west.shikona,
    });
    push(dramaLine, "tactical", ["crowd_roar"]);
  }

  // ── RITUAL: entrance + salt + shikiri ────────────────────────────────────
  const eastEntrance = BardEngine.resolve(rng, "combat.phases.ritual.entrance", {
    shikona: east.shikona, side: "east",
  });
  push(eastEntrance, "entrance");

  const westEntrance = BardEngine.resolve(rng, "combat.phases.ritual.entrance", {
    shikona: west.shikona, side: "west",
  });
  push(westEntrance, "entrance");

  // Salt — only for dramatic/formal voice (understated voice skips ritual detail)
  if (ctx.voiceStyle !== "understated") {
    const saltLine = BardEngine.resolve(rng, "combat.phases.ritual.salt", {});
    push(saltLine, "ritual");
  }

  const shikiriLine = BardEngine.resolve(rng, "combat.phases.ritual.shikiri", {});
  push(shikiriLine, "ritual");

  // ── LOG FRAME PROCESSING (unchanged from existing boutNarrative.ts Step 2) ─
  for (const entry of result.log ?? []) {
    if (entry.phase === "tachiai") {
      if (entry.event === "henka_success") {
        const line = BardEngine.resolve(rng, "combat.engagement.trick", { attacker: ... });
        push(line, "tachiai");
      } else {
        const intensity = BardEngine.calculateIntensity(entry.data?.margin ?? 0.5, [0, 1]);
        const line = BardEngine.resolve(rng, "combat.phases.tachiai", {
          attacker: entry.data?.tachiaiWinner === "east" ? east.shikona : west.shikona,
          intensity,
        });
        push(line, "tachiai");
      }
    }

    if (entry.phase === "engagement") {
      const family = entry.data?.family ?? "push";
      const intensity = BardEngine.calculateIntensity(
        Math.abs(entry.data?.forceDiff ?? entry.data?.torqueAdvantage ?? 0),
        [0, 3],
      );
      const attacker = entry.data?.attackerSide === "east" ? east.shikona : west.shikona;
      const line = BardEngine.resolve(rng, `combat.engagement.${family}`, {
        attacker, intensity,
      });
      push(line, "momentum");
    }

    if (entry.phase === "edge_crisis") {
      const subPath = entry.data?.escaped
        ? "recovery"
        : entry.data?.tawaraToePosition > 0.6
        ? "tawara_drama"
        : "approach";
      const line = BardEngine.resolve(rng, `combat.phases.edge_crisis.${subPath}`, {
        defender: entry.data?.side === "east" ? east.shikona : west.shikona,
      });
      const tags: PbpTag[] = entry.data?.escaped ? [] : ["close_call"];
      push(line, "momentum", tags);
    }
  }

  // ── FINISH: kimarite ──────────────────────────────────────────────────────
  const winner = result.winnerRikishiId === east.id ? east : west;
  const loser  = result.winnerRikishiId === east.id ? west : east;
  const kimariteContext = { winner: winner.shikona, loser: loser.shikona };

  const kimariteLine = BardEngine.has(`combat.kimarite.${result.kimarite}`)
    ? BardEngine.resolve(rng, `combat.kimarite.${result.kimarite}`, kimariteContext)
    : BardEngine.resolve(rng, "combat.phases.finish.common", kimariteContext);

  const finishTags: PbpTag[] = [
    ...(result.upset ? ["upset" as PbpTag] : []),
    ...(result.isKinboshi ? ["kinboshi" as PbpTag] : []),
  ];
  push(kimariteLine, "finish", finishTags);

  // ── AWARDS: kinboshi / ginboshi ───────────────────────────────────────────
  // FIXED path (was broken in original boutNarrative.ts):
  if (result.awardFact === "kinboshi" || result.awardFact === "ginboshi") {
    const awardLine = BardEngine.resolve(
      rng,
      `combat.phases.finish.${result.awardFact}`,  // ← corrected path
      kimariteContext,
    );
    push(awardLine, "award", [result.awardFact as PbpTag]);
  }

  // ── KENSHO ────────────────────────────────────────────────────────────────
  if (result.kenshoEnvelopes > 0) {
    const sponsor = BardEngine.resolve(rng, "institutional.kensho_sponsors", {});
    const kenshoLine = `${result.kenshoEnvelopes} kensho envelopes claimed — sponsored by ${sponsor}.`;
    push(kenshoLine, "award", ["kensho"]);
  }

  // ── CLOSING: venue closing line (was: narrative.ts only) ─────────────────
  if (ctx.voiceStyle === "dramatic") {
    const closingLine = BardEngine.resolve(
      rng, `world.venues.${ctx.venue}.closing`, {}
    );
    push(closingLine, "closing");
  }

  // ── WRITE OUTPUTS ─────────────────────────────────────────────────────────
  result.pbpLines = lines;
  result.pbp = lines.map((l) => l.text);
  // Backward compat: populate deprecated narrative field
  result.narrative = lines
    .filter((l) => ["opening", "entrance", "ritual", "finish", "closing"].includes(l.phase ?? ""))
    .map((l) => l.text);
}
```

---

## Step 4 — Deprecate `narrative.ts` `generateNarrative`

**File: `src/engine/narrative.ts`**

Replace the function body with a delegation to the new unified path:

```typescript
/** @deprecated Use generateBoutNarrative from boutNarrative.ts instead. */
export function generateNarrative(
  result: BoutResult,
  east: Rikishi,
  west: Rikishi,
  world: WorldState,
  day: number,
): string[] {
  // If pbpLines are already populated (new path already ran), just extract
  if (result.pbpLines && result.pbpLines.length > 0) {
    return result.pbpLines.map((l) => l.text);
  }
  // Fallback for any caller that bypassed boutResolver:
  generateBoutNarrative(result, east, west, world.currentBasho?.bashoName ?? "", day, result.boutId, world);
  return result.pbp ?? [];
}
```

---

## Step 5 — Remove double-generation in `BoutNarrativeModal`

**File: `src/components/game/BoutNarrativeModal.tsx`**

Locate the `useMemo` block that calls `generateBoutNarrative()`:

```tsx
// REMOVE this entire block:
const pbpLines = useMemo(() => {
  try {
    generateBoutNarrative(result, eastRikishi, westRikishi, ...);
  } catch (e) {}
  return result.pbpLines ?? [];
}, [result, eastRikishi, westRikishi]);
```

Replace with a simple read:

```tsx
const pbpLines = result.pbpLines ?? [];
```

Since `generateBoutNarrative` is now called during bout resolution in `boutResolver.ts`, `pbpLines` is guaranteed to be populated before the modal opens.

---

## Step 6 — Merge or remove the Narrative tab

The `BoutNarrativeModal` has three tabs: **Commentary** (`pbpLines`), **Narrative** (`result.narrative`), **Log** (`result.log`).

With the unified track, `result.narrative` contains the same subset of lines already visible in Commentary. The Narrative tab becomes redundant.

**Options (pick one):**

**Option A — Remove Narrative tab**: The Commentary tab now includes opening/entrance/ritual/closing lines. The Log tab still shows raw physics. Remove the Narrative tab entirely. This is the cleanest outcome.

**Option B — Repurpose Narrative tab as "Prose View"**: Show a filtered subset of `pbpLines` where `phase` is `"opening" | "entrance" | "ritual" | "finish" | "closing"` — the "story arc" without the play-by-play granularity. This preserves the differentiated reading experience.

**Recommendation: Option B** — it keeps two meaningfully different views without code duplication.

Implementation for Option B:

```tsx
// In the Narrative tab render:
const narrativeLines = pbpLines.filter((l) =>
  ["opening", "entrance", "ritual", "finish", "award", "closing"].includes(l.phase ?? "")
);

{narrativeLines.map((line, i) => (
  <p
    key={line.id ?? i}
    className={cn(
      "text-sm leading-relaxed",
      line.voice === "dramatic" && "font-semibold",
      i === narrativeLines.length - 1 && "italic",
    )}
  >
    {line.text}
  </p>
))}
```

---

## Step 7 — Update canvas narration

**File: `src/components/game/boutReplay/boutCanvas/narration.ts`**

With unified output, `result.pbpLines` is always populated. Simplify:

```typescript
export function getNarrationLines(result: BoutResult): string[] {
  // Primary source: unified pbpLines
  if (result.pbpLines && result.pbpLines.length > 0) {
    return result.pbpLines.map((l) => l.text);
  }
  // Fallback for bouts resolved before this migration (saves in progress, tests)
  return result.pbp ?? FALLBACK_NARRATION_LINES;
}
```

Remove the `result.narrative` fallback entirely — it is now always a subset of `pbpLines`.

---

## Step 8 — `ExhibitionBout` onboarding fix

**File: `src/components/onboarding/ExhibitionBout.tsx`**

Currently `pbpLines` may be empty because `generateBoutNarrative` is not called before the onboarding bout is displayed. Now that `boutResolver.ts` calls `generateBoutNarrative` internally (verify this is the case; if not, add the call to `resolveBout`), `pbpLines` will be populated automatically.

If `resolveBout` does not call `generateBoutNarrative` for exhibition bouts, add:
```typescript
// In resolveBout, after buildBoutResultV2:
generateBoutNarrative(result, east, west, "exhibition", 1, result.boutId, world);
```

---

## Migration Checklist — Backward Compatibility

| Caller | Uses | Migration |
|--------|------|-----------|
| `BoutNarrativeModal` Commentary tab | `pbpLines` | No change — already using new format |
| `BoutNarrativeModal` Narrative tab | `result.narrative` | Switch to filtered `pbpLines` (Step 6) |
| `boutCanvas/narration.ts` | `result.pbp` first, `result.narrative` second | Switch to `pbpLines` (Step 7) |
| `ExhibitionBout` | `pbpLines` | Ensure `generateBoutNarrative` is called (Step 8) |
| Any test that asserts `result.narrative` content | `result.narrative` | Update assertions to use `pbpLines` |

---

## Testing Checklist

- [ ] Simulate 10 normal bouts — confirm `pbpLines` has 8–18 lines with correct phase tags
- [ ] Confirm Tokyo basho opening text appears in Commentary tab
- [ ] Confirm Osaka/Nagoya/Fukuoka opening text appears for those bashos (requires Plan 02 B3 templates)
- [ ] Dramatic voice (day 13+, elite rank): confirm more elaborate phrasing than day 1 maegashira
- [ ] Understated voice: confirm ritual lines (salt) are skipped
- [ ] Kinboshi bout: award line appears with correct text (was broken before Plan 02 A fix)
- [ ] Kensho bout: sponsor name appears in `award` phase line
- [ ] No `[MISSING: ...]` strings in any rendered pbpLine
- [ ] `BoutNarrativeModal` opens without calling `generateBoutNarrative` again (remove the useMemo, verify in profiler)
- [ ] ExhibitionBout in onboarding shows PbP lines step-through correctly
- [ ] Canvas narration overlay shows text from `pbpLines`
- [ ] `result.narrative` deprecated field is still populated (backward compat for any saved-game consumers)
- [ ] `npx tsc --noEmit` passes
- [ ] `npx vitest run` — all 1703 tests pass
- [ ] Add/update unit tests: `generateBoutNarrative` with dramatic vs understated voice, venue framing, award lines, fallback for missing kimarite template

---

## Estimated Effort

3–5 days. The rewrite of `generateBoutNarrative` is medium-complexity (it absorbs `narrative.ts` logic but most of the BardEngine calls are already written). The riskiest part is ensuring no caller is left relying on `result.narrative` as a populated array after the migration. Recommend doing a `grep -r "result\.narrative\|\.narrative\["` across `src/` before starting to enumerate all consumers.
