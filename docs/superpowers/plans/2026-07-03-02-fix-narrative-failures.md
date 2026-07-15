# Plan 02 — Fix Silent Narrative Failures + Entity Link Rendering

## Problem

Four categories of broken template paths produce silent empty strings at runtime, degrading the in-game narrative experience:

1. **Kinboshi/ginboshi award lines** — `boutNarrative.ts` calls `combat.finish.kinboshi` but the templates live at `combat.phases.finish.kinboshi`. Every kinboshi bout's award moment is silent.
2. **Governance headlines** — all 7 `institutional.governance.*` paths referenced by `MediaEventService` are missing from `archive.json`. Every governance event headline is `""`.
3. **Venue framing** — `world.venues.Osaka`, `Nagoya`, `Fukuoka` have no templates. Three of four basho locations produce no atmospheric opening.
4. **Kensho sponsor names** — `institutional.kensho_sponsors` is missing. The older `narrative.ts` track produces `[MISSING: sponsorName]` in every kensho narrative.

Additionally, BardEngine wraps entity names in `[[entityType:entityId:text]]` markup in `PbpLine.text`, but no UI component resolves this — it renders as raw markup strings in the Commentary tab.

---

## Affected Files

| File                                         | Change                                                           |
| -------------------------------------------- | ---------------------------------------------------------------- |
| `src/engine/bout/boutNarrative.ts`           | Fix wrong template path for kinboshi/ginboshi award lines        |
| `src/engine/bard/archive.json`               | Add ~60 missing templates across 4 categories                    |
| `src/components/game/BoutNarrativeModal.tsx` | Add `resolveEntityLinks` renderer for PbpLine text               |
| `src/presenters/entityLinks.ts`              | New file — pure function, parses and resolves entity link markup |

---

## Part A — Bug Fix: Kinboshi/Ginboshi Path

**File: `src/engine/bout/boutNarrative.ts`**

Locate the award lines section (Step 3 in `generateBoutNarrative`). The current broken call:

```typescript
// BROKEN — combat.finish does not exist as a top-level domain key
const awardLine = BardEngine.resolve(rng, `combat.finish.${result.awardFact}`, context);
```

Fix:

```typescript
// CORRECT — templates live under combat.phases.finish
const awardLine = BardEngine.resolve(rng, `combat.phases.finish.${result.awardFact}`, context);
```

This is a one-line fix. Verify `combat.phases.finish.kinboshi` and `combat.phases.finish.ginboshi` exist in `archive.json` (they do — see Part B which adds variants if needed).

---

## Part B — Archive Template Additions

All additions go into `src/engine/bard/archive.json` under `domains`.

### B1 — Kinboshi/Ginboshi variants (2 → 4 each)

Existing entries under `combat.phases.finish` already have `kinboshi` and `ginboshi` keys with 2 variants each. Add 2 more per key for variety:

```json
"kinboshi": [
  "existing template 1",
  "existing template 2",
  "%WINNER% has done the unthinkable — a gold star earned against a living legend.",
  "The crowd erupts. %WINNER% stands over a fallen yokozuna, history made on this very dohyo."
],
"ginboshi": [
  "existing template 1",
  "existing template 2",
  "A silver star for %WINNER% — the ozeki's pride left in the clay.",
  "%WINNER% silences the hall with a triumph no one saw coming."
]
```

### B2 — Institutional governance templates (7 paths, 3 variants each)

Add under `domains.institutional.governance`:

```json
"governance": {
  "scandal": [
    "%HEYA% Stable Under JSA Investigation",
    "Misconduct Allegations Rock %HEYA% Stable",
    "JSA Opens Formal Inquiry Into %HEYA%"
  ],
  "status_escalation": [
    "%HEYA% Governance Status Downgraded",
    "Heightened Scrutiny as %HEYA% Faces Probation Warning",
    "JSA Tightens Grip on %HEYA% After Fresh Violations"
  ],
  "low_roster_headline": [
    "%HEYA% Stable Dangerously Thin on Roster",
    "Recruitment Crisis Deepens at %HEYA%",
    "%HEYA% Faces Minimum Roster Warning From JSA"
  ],
  "welfare_headline": [
    "Welfare Concerns Flagged at %HEYA% Stable",
    "%HEYA% Receives Welfare Compliance Notice",
    "JSA Welfare Review Targets %HEYA% Stable"
  ],
  "sanction": [
    "%HEYA% Officially Sanctioned by JSA",
    "Formal Sanctions Handed Down to %HEYA%",
    "JSA Imposes Financial and Operational Penalties on %HEYA%"
  ],
  "probation": [
    "%HEYA% Placed on JSA Probation",
    "Probationary Status for %HEYA% After Repeated Violations",
    "JSA Probation: %HEYA% Given Strict Compliance Deadline"
  ],
  "naturalization_headline": [
    "%HEYA% Files Naturalization Petition for Foreign Recruit",
    "JSA Reviews %HEYA% Foreign Wrestler Citizenship Application",
    "Naturalization Approval Sought by %HEYA% Stable"
  ]
}
```

Note: also add `"emergency_loan"` which is referenced in `GovernanceReview`:

```json
"emergency_loan": [
  "%HEYA% Secures Emergency JSA Stabilisation Loan",
  "JSA Extends Emergency Credit Line to Struggling %HEYA%",
  "%HEYA% Accepts Emergency Loan Terms From JSA"
]
```

### B3 — Venue framing (3 missing cities, 3–4 variants each)

Add under `domains.world.venues`:

```json
"Osaka": {
  "entrance": [
    "The old capital's faithful pack EDION Arena Osaka, its storied walls ringing with anticipation.",
    "Spring sunlight filters into EDION Arena as another Haru Basho reaches its climax.",
    "Osaka's most devoted sumo fans fill every seat, their voices already building to a roar.",
    "The west's spiritual home of sumo bristles with quiet, knowing intensity."
  ],
  "closing": [
    "Another chapter of Osaka sumo history is written today.",
    "The old capital's dohyo has given its verdict."
  ]
},
"Nagoya": {
  "entrance": [
    "Midsummer heat radiates off the streets of Nagoya as the Dolphins Arena crackles with energy.",
    "The Nagoya faithful sweat through another punishing July tournament, undeterred by the heat.",
    "Dolphins Arena hosts some of the most intense sumo of the year — bodies fresher, rivalries simpler.",
    "Nagoya in July: the sun bakes the city, the dohyo bakes the wrestlers."
  ],
  "closing": [
    "The Nagoya verdict is rendered.",
    "Another Aki preview written on the summer clay."
  ]
},
"Fukuoka": {
  "entrance": [
    "The year's final tournament opens at Fukuoka Convention Center, the finish line in sight.",
    "Late autumn chill descends on Fukuoka as careers hang in the year-end balance.",
    "Fukuoka's faithful know what is at stake — promotions, demotions, and the final yusho of the year.",
    "The Convention Center fills for the last time this year, every bout carrying extra weight."
  ],
  "closing": [
    "Fukuoka has spoken — the year's sumo record is sealed.",
    "The final dohyo of the year renders its judgment."
  ]
}
```

### B4 — Kensho sponsor names

Add under `domains.institutional`:

```json
"kensho_sponsors": [
  "Nihon Steel",
  "Fuji Foods",
  "Pacific Maritime",
  "Tokai Motors",
  "Sapporo Brewing",
  "Tōhoku Textiles",
  "Kinki Chemicals",
  "Osaka Trading House",
  "Yomiuri Press Group",
  "Ryūgoku Finance"
]
```

Update `narrative.ts` where `estimateKensho()` is called to reference the correct path:

```typescript
// Existing broken path:
const sponsor = BardEngine.resolve(rng, "institutional.kensho_sponsors", context);

// This should now work once the path exists in archive.json.
// No code change needed if the path is simply added to the archive.
```

### B5 — Missing throw kimarite templates (5 techniques)

Add under `domains.combat.kimarite` (2 variants each, matching existing format):

```json
"uwatenage": [
  "%WINNER% seizes the overarm grip and spins %LOSER% to the clay with crushing force.",
  "An overarm throw of textbook precision — %WINNER% turns %LOSER%'s momentum into defeat."
],
"shitatenage": [
  "%WINNER% snakes the underarm grip and hurls %LOSER% off-balance in a low, sweeping throw.",
  "The underarm throw lands perfectly — %LOSER% crashes to the sand with no answer."
],
"kotenage": [
  "%WINNER% locks the arm and levers %LOSER% over in a brutal arm-lock throw.",
  "The arm lock catches %LOSER% completely unprepared — a violent, efficient finish."
],
"sukuinage": [
  "%WINNER% scoops under and lifts, sending %LOSER% crashing with a beltless scoop throw.",
  "A sudden change of level: %WINNER% bends low and scoops %LOSER% into the clay."
],
"shitatedashinage": [
  "%WINNER% pulls the underarm grip and swings %LOSER% past, a graceful pulling throw to end it.",
  "Underarm pulling throw — %WINNER% reads the momentum perfectly and redirects %LOSER% out of the ring."
]
```

---

## Part C — Entity Link Renderer

### C1 — New presenter function

**File: `src/presenters/entityLinks.ts`** (new file)

```typescript
import type { WorldState } from "@/engine/types/world";

// BardEngine emits: [[rikishi:id:text]], [[heya:id:text]], [[rival:id:text]]
const ENTITY_LINK_RE = /\[\[(\w+):([^:]+):([^\]]+)\]\]/g;

export type ResolvedSegment =
  | { type: "text"; content: string }
  | { type: "link"; entityType: string; entityId: string; label: string; href: string };

export function parseEntityLinks(text: string, world: WorldState): ResolvedSegment[] {
  const segments: ResolvedSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(ENTITY_LINK_RE)) {
    const [full, entityType, entityId, label] = match;
    const start = match.index!;

    if (start > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, start) });
    }

    let href = "#";
    if (entityType === "rikishi" || entityType === "winner" || entityType === "loser") {
      href = `/rikishi/${entityId}`;
    } else if (entityType === "heya" || entityType === "stable") {
      href = `/stable/${entityId}`;
    }

    segments.push({ type: "link", entityType, entityId, label, href });
    lastIndex = start + full.length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  return segments;
}
```

### C2 — React renderer component

Add a small inline component in `BoutNarrativeModal.tsx` (or co-locate in `entityLinks.ts` as a `.tsx` file if preferred):

```tsx
import { parseEntityLinks } from "@/presenters/entityLinks";
import { Link } from "@tanstack/react-router";

function PbpLineText({ text, world }: { text: string; world: WorldState }) {
  const segments = parseEntityLinks(text, world);
  return (
    <>
      {segments.map((seg, i) =>
        seg.type === "text" ? (
          <span key={i}>{seg.content}</span>
        ) : (
          <Link
            key={i}
            to={seg.href as any}
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            {seg.label}
          </Link>
        )
      )}
    </>
  );
}
```

### C3 — Use in Commentary tab

In `BoutNarrativeModal.tsx`, replace the current plain text render of each PbpLine:

```tsx
// Before:
<span>{line.text}</span>

// After:
<PbpLineText text={line.text} world={world} />
```

`world` is already available in `BoutNarrativeModal` via `useGame()` or passed as a prop. If not currently passed in, add it as a prop.

---

## Testing Checklist

- [ ] Trigger a kinboshi bout — confirm award line text appears in Commentary tab and canvas narration overlay
- [ ] Trigger a ginboshi bout — same
- [ ] Open a governance event notification — confirm headline is non-empty
- [ ] Check an Osaka, Nagoya, or Fukuoka basho opening — confirm venue entrance text appears in Narrative tab
- [ ] Trigger a kensho bout in `narrative.ts` path — confirm sponsor name is a real name, not `[MISSING: ...]`
- [ ] Simulate a bout with uwatenage/kotenage/sukuinage kimarite — confirm per-technique finish line appears
- [ ] Check a PbpLine containing `[[rikishi:...]]` markup — confirm it renders as a clickable link
- [ ] Click the link — confirm navigation to `/rikishi/$id` works
- [ ] `npx tsc --noEmit` passes
- [ ] `npx vitest run` — all existing tests pass

---

## Estimated Effort

1–2 days. The template additions are content work (the bulk), the path bug fix is 1 line, and the entity link renderer is ~60 lines of new code. Risk is low — all changes are purely additive except the one-line path fix.
