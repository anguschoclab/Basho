# Plan 05 — Onboarding Expansion + Glossary System

## Problem

The new-game wizard teaches nothing about the game's core verbs, and kimarite terms remain unexplained throughout the entire play session.

**Onboarding gaps:**

The wizard has 4 steps: identity → faction → stable → exhibition bout. Three of these four steps are selection interfaces, not teaching moments. The faction step (`FactionStep.tsx`) shows 5 ichimon options with flavor taglines ("largest and most traditional", "known for wealth and influence") but zero mechanical information. A player choosing Tokitsukaze because it "sounds cool" has no idea they just selected +10% stamina training and a lower political weight in JSA elections. The mechanical consequences of ichimon selection — training stat bonuses, banzuke political weight (Dewanoumi=300, Nishonoseki=250, others=100), and governance bailout eligibility — are never shown.

The `ExhibitionBout.tsx` step is the right idea: it shows a live bout with a 4-overlay mentor walkthrough covering stamina, grip, momentum, and basho_record. But the result banner shows a raw kimarite name ("yorikiri", "tsuridashi", "kotenage") with no explanation, and the "Begin My Career" button jumps directly into the game. There is no connecting explanation of what the player will be doing after the wizard ends — no mention of decisions, phases, or goals.

**Glossary gap:**

`getKimarite(kimariteId)` in `src/presenters/uiDigest.ts` returns a `KimariteDefinition` with a `description` field. This description is looked up in `BoutResultDisplay.tsx` via `kimariteFromLookup?.description` but is never rendered — the component shows only `kimariteName`. There is no `KimariteTag` component. Every bout result in the game shows a Japanese wrestling technique name with zero context for a new player.

No glossary page or popover system exists. Sumo terminology (shikona, oyakata, heya, dohyo, tachiai, kimarite, koenkai, zensho) is used throughout the UI untranslated.

---

## Affected Files

| File | Change |
|------|--------|
| `src/components/wizard/FactionStep.tsx` | Show mechanical bonuses for each ichimon |
| `src/components/onboarding/ExhibitionBout.tsx` | Wrap kimarite name in KimariteTag; add "What's Next" closing step |
| `src/components/ui/KimariteTag.tsx` | New component: kimarite name + tooltip with description |
| `src/components/game/BoutResultDisplay.tsx` | Replace raw kimarite name with KimariteTag |
| `src/pages/GlossaryPage.tsx` | New page: sumo terms A-Z with search |
| `src/routes.tsx` | Add `/glossary` route |
| `src/engine/glossary/GlossaryService.ts` | New service: term definitions + search |

---

## Step 1 — Show Ichimon Mechanical Bonuses in FactionStep

**File: `src/components/wizard/FactionStep.tsx`**

Add a mechanic summary beneath each faction's tagline. Create a constant mapping:

```typescript
const ICHIMON_MECHANICS: Record<string, { bonus: string; politics: string }> = {
  dewanoumi:    { bonus: "+5% Power training", politics: "Highest JSA election weight" },
  nishonoseki:  { bonus: "+5% Speed training", politics: "High JSA election weight" },
  takasago:     { bonus: "+10% Mental training", politics: "Standard election weight" },
  tokitsukaze:  { bonus: "+10% Stamina training", politics: "Standard election weight" },
  isegahama:    { bonus: "+5% Technique & Balance training", politics: "Standard election weight" },
};
```

In the faction card, below the existing description text, render:

```tsx
{ICHIMON_MECHANICS[faction.id] && (
  <div className="mt-2 space-y-1">
    <div className="text-xs font-medium text-amber-400">
      {ICHIMON_MECHANICS[faction.id].bonus}
    </div>
    <div className="text-xs text-muted-foreground">
      {ICHIMON_MECHANICS[faction.id].politics}
    </div>
  </div>
)}
```

This is a pure UI change — the constants are UI-layer copies of the values from `TrainingMath.ts` and `banzuke.ts`. No engine changes needed.

---

## Step 2 — Add "What's Next" Closing Step to ExhibitionBout

**File: `src/components/onboarding/ExhibitionBout.tsx`**

After the bout result is fully revealed and before "Begin My Career" is clickable, show a final info card:

```tsx
{boutRevealed && (
  <div className="mt-4 p-4 border rounded-lg bg-card space-y-3">
    <h3 className="text-base font-semibold">Your Role as Oyakata</h3>
    <ul className="text-sm space-y-2 text-muted-foreground">
      <li>🏆 <strong>Compete in 6 basho per year</strong> — each is 15 days of bouts</li>
      <li>💪 <strong>Train your wrestlers weekly</strong> — set intensity and focus between basho</li>
      <li>💴 <strong>Manage your stable's finances</strong> — sponsors, facilities, and wrestler costs</li>
      <li>⚖️ <strong>Navigate JSA governance</strong> — rulings, scandals, and political alliances</li>
      <li>📋 <strong>Make daily decisions</strong> — injury calls, recruitment, training emphasis</li>
    </ul>
  </div>
)}
```

Keep "Begin My Career" gated behind `boutRevealed` as it already is — the closing card appears in the same reveal state.

---

## Step 3 — Create `KimariteTag` Component

**File: `src/components/ui/KimariteTag.tsx`** (new file)

```tsx
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import { getKimarite } from "@/presenters/uiDigest";

interface KimariteTagProps {
  kimariteId: string;
  kimariteName: string;
  kimariteNameJa?: string;
  className?: string;
}

export function KimariteTag({ kimariteId, kimariteName, kimariteNameJa, className }: KimariteTagProps) {
  const definition = getKimarite(kimariteId);
  const content = definition?.description
    ? (
      <div className="max-w-xs space-y-1">
        <div className="font-semibold">{kimariteName}</div>
        {kimariteNameJa && <div className="text-muted-foreground text-xs">{kimariteNameJa}</div>}
        <div className="text-sm">{definition.description}</div>
      </div>
    )
    : kimariteName;

  return (
    <TooltipWrap content={content} delayDuration={300}>
      <span className={`cursor-help underline decoration-dotted ${className ?? ""}`}>
        {kimariteName}
        {kimariteNameJa && <span className="text-muted-foreground ml-1 text-xs">({kimariteNameJa})</span>}
      </span>
    </TooltipWrap>
  );
}
```

---

## Step 4 — Use KimariteTag in BoutResultDisplay

**File: `src/components/game/BoutResultDisplay.tsx`** (and `ExhibitionBout.tsx`)

Replace the raw text rendering of kimarite name with the new tag:

```tsx
// Before (rough pattern):
<span>{boutResult.kimariteName}</span>

// After:
<KimariteTag
  kimariteId={boutResult.kimarite}
  kimariteName={boutResult.kimariteName}
  kimariteNameJa={boutResult.kimariteNameJa}
/>
```

---

## Step 5 — Create GlossaryService

**File: `src/engine/glossary/GlossaryService.ts`** (new file)

```typescript
export interface GlossaryTerm {
  id: string;
  term: string;
  termJa?: string;
  definition: string;
  category: "rank" | "bout" | "stable" | "tournament" | "governance" | "general";
  seeAlso?: string[]; // ids of related terms
}

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  { id: "shikona",   term: "Shikona",   termJa: "四股名", category: "general",    definition: "A wrestler's ring name, chosen at debut. Often references nature, history, or the stable." },
  { id: "oyakata",   term: "Oyakata",   termJa: "親方",   category: "stable",     definition: "The stable master — a retired former wrestler who manages the heya's wrestlers, training, and finances." },
  { id: "heya",      term: "Heya",      termJa: "部屋",   category: "stable",     definition: "A sumo stable. Wrestlers train, live, and compete under their heya's banner." },
  { id: "basho",     term: "Basho",     termJa: "場所",   category: "tournament", definition: "A tournament. Six basho are held per year: Hatsu (Jan), Haru (Mar), Natsu (May), Nagoya (Jul), Aki (Sep), Kyushu (Nov)." },
  { id: "dohyo",     term: "Dohyo",     termJa: "土俵",   category: "bout",       definition: "The raised clay ring where bouts are fought. A wrestler loses when any body part except the soles of the feet touches outside the ring, or touches the ground inside." },
  { id: "tachiai",   term: "Tachiai",   termJa: "立合い", category: "bout",       definition: "The initial charge at the start of a bout. Both wrestlers drive forward simultaneously." },
  { id: "kimarite",  term: "Kimarite",  termJa: "決まり手", category: "bout",      definition: "The winning technique that ended the bout. 82 official kimarite exist, grouped into push, throw, trip, and pull families." },
  { id: "koenkai",   term: "Kōenkai",   termJa: "後援会", category: "stable",     definition: "A fan support association that provides the stable with regular income and resources." },
  { id: "ichimon",   term: "Ichimon",   termJa: "一門",   category: "governance", definition: "A sumo faction — a group of affiliated stables that share political influence in the JSA." },
  { id: "kadoban",   term: "Kadoban",   termJa: "角番",   category: "rank",       definition: "An Ozeki who failed to achieve 8 wins (kachi-koshi) in the previous basho. Must win 8 in the current basho or be demoted." },
  { id: "kyujo",     term: "Kyujo",     termJa: "休場",   category: "bout",       definition: "Withdrawal from a tournament due to injury. A kyujo rikishi forfeits all remaining bouts." },
  { id: "zensho",    term: "Zenshō",    termJa: "全勝",   category: "tournament", definition: "A perfect 15-0 record in a basho. Extremely rare." },
  { id: "yusho",     term: "Yushō",     termJa: "優勝",   category: "tournament", definition: "The tournament championship, awarded to the wrestler with the best record." },
];

export const GlossaryService = {
  all: () => GLOSSARY_TERMS,
  search: (query: string) =>
    GLOSSARY_TERMS.filter(
      (t) =>
        t.term.toLowerCase().includes(query.toLowerCase()) ||
        t.definition.toLowerCase().includes(query.toLowerCase())
    ),
  byCategory: (cat: GlossaryTerm["category"]) => GLOSSARY_TERMS.filter((t) => t.category === cat),
  byId: (id: string) => GLOSSARY_TERMS.find((t) => t.id === id),
};
```

---

## Step 6 — Create GlossaryPage and Route

**File: `src/pages/GlossaryPage.tsx`** (new file)

```tsx
import { useState } from "react";
import { GlossaryService } from "@/engine/glossary/GlossaryService";

export default function GlossaryPage() {
  const [query, setQuery] = useState("");
  const terms = query ? GlossaryService.search(query) : GlossaryService.all();

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Sumo Glossary</h1>
      <input
        className="w-full border rounded px-3 py-2 text-sm"
        placeholder="Search terms..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="space-y-4">
        {terms.map((t) => (
          <div key={t.id} className="p-3 border rounded-lg">
            <div className="flex items-baseline gap-2">
              <span className="font-semibold">{t.term}</span>
              {t.termJa && <span className="text-muted-foreground text-sm">{t.termJa}</span>}
              <span className="ml-auto text-xs text-muted-foreground capitalize">{t.category}</span>
            </div>
            <p className="text-sm mt-1 text-muted-foreground">{t.definition}</p>
          </div>
        ))}
        {terms.length === 0 && <p className="text-muted-foreground text-sm">No results.</p>}
      </div>
    </div>
  );
}
```

**File: `src/routes.tsx`** — add lazy-loaded route:

```typescript
const GlossaryPage = React.lazy(() => import("./pages/GlossaryPage"));
// In route tree:
{ path: "/glossary", component: () => <Suspense fallback={<SpinnerFallback />}><GlossaryPage /></Suspense> }
```

Add a "Glossary" link in the footer or help menu.

---

## Step 7 — First-Hover Tooltips for Key Terms In-Game

For the highest-value unknown terms that appear frequently (shikona, kimarite, basho, tachiai), add a `TooltipWrap` anywhere they appear as static labels:

**Approach:** Create a `<GlossaryTip termId="tachiai">tachiai</GlossaryTip>` convenience component:

```tsx
import { GlossaryService } from "@/engine/glossary/GlossaryService";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";

export function GlossaryTip({ termId, children }: { termId: string; children: React.ReactNode }) {
  const term = GlossaryService.byId(termId);
  if (!term) return <>{children}</>;
  return (
    <TooltipWrap content={term.definition} delayDuration={500}>
      <span className="cursor-help underline decoration-dotted">{children}</span>
    </TooltipWrap>
  );
}
```

Apply `<GlossaryTip termId="tachiai">Tachiai</GlossaryTip>` in the bout PbP display wherever "Tachiai" appears as a phase label. Apply sparingly — only for terms a first-time player would not know.

---

## Testing Checklist

- [ ] FactionStep: all 5 ichimon show training bonus + political weight
- [ ] Selecting Tokitsukaze: "+10% Stamina training" is visible on the card
- [ ] ExhibitionBout: after full reveal, "Your Role as Oyakata" card appears with 5 bullet points
- [ ] "Begin My Career" still requires full reveal before becoming clickable
- [ ] KimariteTag: hover over a kimarite name in BoutResultDisplay — tooltip shows description
- [ ] KimariteTag: kimarite with no description in `getKimarite` — shows name only, no error
- [ ] Navigate to `/glossary` — 13+ terms render, Japanese characters display correctly
- [ ] Search "tachiai" — shows tachiai entry; search "bout" — shows all bout-category terms
- [ ] GlossaryTip component: hover over "Tachiai" label in bout PbP — shows definition tooltip
- [ ] `npx vitest run` — all tests pass
- [ ] `npx tsc --noEmit` — clean

---

## Estimated Effort

2–3 days. FactionStep bonus display is ~20 lines. `KimariteTag` is ~30 lines. `GlossaryService` is a data file (~100 lines). `GlossaryPage` is ~40 lines. `ExhibitionBout` closing card is ~20 lines. The `GlossaryTip` convenience component is 10 lines. No engine changes, no new routes that require complex wiring, no new test fixtures. Main risk: `getKimarite` may not return `description` for all 82 kimarite — audit and fill any missing entries in the kimarite lookup data.
