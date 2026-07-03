# Plan 05 — "Bout of the Basho" Highlight Reel on the Recap Screen

## Problem

`keyBouts: BoutResult[]` already exists on the post-basho recap data shape but `RecapPage` never renders it. After every tournament the player sees the ceremony, banzuke reveal, and press conference — but no replay of the decisive bout, the biggest upset, or a kinboshi moment. These are the most emotionally significant moments of the basho and they currently vanish without acknowledgment.

---

## Affected Files

| File | Change |
|------|--------|
| `src/presenters/projections/recapProjections.ts` | Add `selectKeyBouts(world): BoutResult[]` presenter function |
| `src/pages/RecapPage.tsx` | Add `KeyBoutsSection` between NarrativeSummary and PressConference |
| `src/components/game/KeyBoutsSection.tsx` | New component — curated moment cards with inline replay |
| `src/engine/types/basho.ts` | Confirm `BoutResult.dramaticContext` exists; add `YushoDecider` flag if missing |

---

## Step 1 — Confirm existing `keyBouts` shape

Search `src/pages/RecapPage.tsx` and the recap data builder for how `keyBouts` is currently populated. The existing `BashoRecapUI` shape has a `keyBouts: BoutResult[]` field — confirm whether it is populated or always empty.

If always empty: the curator in Step 2 populates it. If partially populated: the curator supplements it.

---

## Step 2 — `selectKeyBouts` presenter

**File: `src/presenters/projections/recapProjections.ts`** (new function or new file)

```typescript
import type { WorldState } from "@/engine/types/world";
import type { BoutResult } from "@/engine/types/basho";

export interface KeyBoutMoment {
  label: "yusho_decider" | "biggest_upset" | "kinboshi" | "senshuraku_classic";
  labelText: string;
  bout: BoutResult;
  eastRikishiId: string;
  westRikishiId: string;
}

export function selectKeyBouts(world: WorldState): KeyBoutMoment[] {
  const basho = world.currentBasho;
  if (!basho) return [];

  const completedBouts = basho.matches.filter((m) => m.result != null);
  const moments: KeyBoutMoment[] = [];

  // 1. Yusho decider — the final bout of senshuraku (day 15) that determined the winner
  const day15Bouts = completedBouts.filter((m) => m.day === 15);
  const yushoDecider = day15Bouts.find(
    (m) => m.result?.dramaticContext?.label === "yusho_decider"
        || m.result?.dramaticContext?.score >= 90
  ) ?? day15Bouts.at(-1); // fallback: last bout of day 15

  if (yushoDecider?.result) {
    moments.push({
      label: "yusho_decider",
      labelText: "Yusho-Deciding Bout",
      bout: yushoDecider.result,
      eastRikishiId: yushoDecider.eastId,
      westRikishiId: yushoDecider.westId,
    });
  }

  // 2. Biggest upset — maximum rank differential where lower rank won
  let biggestUpset: (typeof completedBouts)[0] | null = null;
  let maxRankDiff = 0;

  for (const m of completedBouts) {
    if (!m.result?.upset) continue;
    // rank differential: need to compare numerical rank values
    const eastRikishi = world.rikishi.get(m.eastId);
    const westRikishi = world.rikishi.get(m.westId);
    if (!eastRikishi || !westRikishi) continue;

    const rankDiff = Math.abs(
      getRankNumericValue(eastRikishi.rank) - getRankNumericValue(westRikishi.rank)
    );
    if (rankDiff > maxRankDiff) {
      maxRankDiff = rankDiff;
      biggestUpset = m;
    }
  }

  if (biggestUpset?.result && biggestUpset !== yushoDecider) {
    moments.push({
      label: "biggest_upset",
      labelText: "Biggest Upset",
      bout: biggestUpset.result,
      eastRikishiId: biggestUpset.eastId,
      westRikishiId: biggestUpset.westId,
    });
  }

  // 3. Kinboshi — first kinboshi of the basho (if any)
  const kinboshiBout = completedBouts.find((m) => m.result?.isKinboshi);
  if (kinboshiBout?.result
    && kinboshiBout !== yushoDecider
    && kinboshiBout !== biggestUpset
  ) {
    moments.push({
      label: "kinboshi",
      labelText: "Kinboshi — Gold Star",
      bout: kinboshiBout.result,
      eastRikishiId: kinboshiBout.eastId,
      westRikishiId: kinboshiBout.westId,
    });
  }

  return moments.slice(0, 3); // cap at 3 cards
}

// Helper — lower number = higher rank (yokozuna = 1, jonokuchi = 70+)
function getRankNumericValue(rank: string): number {
  // Implement using the existing rank ordering from banzuke types
  // or import from rankUtils if that function exists
  const ORDER = ["Y", "O", "S", "K", "M", "J", "Ms", "Sd", "Jd", "Jk"];
  const prefix = rank.replace(/\d.*/, "");
  const base = ORDER.indexOf(prefix);
  const num = parseInt(rank.replace(/\D/g, ""), 10) || 1;
  return base * 100 + num;
}
```

---

## Step 3 — `KeyBoutsSection` component

**File: `src/components/game/KeyBoutsSection.tsx`** (new file)

```tsx
import { useState } from "react";
import type { KeyBoutMoment } from "@/presenters/projections/recapProjections";
import type { UIRikishi } from "@/presenters/uiModels";
import { BoutNarrativeModal } from "./BoutNarrativeModal";
import { BoutResultDisplay } from "./BoutResultDisplay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Play } from "lucide-react";

interface KeyBoutsSectionProps {
  moments: KeyBoutMoment[];
  getRikishi: (id: string) => UIRikishi | null;
}

const MOMENT_BADGE_VARIANT: Record<string, string> = {
  yusho_decider: "bg-yellow-500/20 text-yellow-700 border-yellow-500/40",
  biggest_upset:  "bg-red-500/20 text-red-700 border-red-500/40",
  kinboshi:       "bg-amber-400/20 text-amber-700 border-amber-400/40",
  senshuraku_classic: "bg-blue-500/20 text-blue-700 border-blue-500/40",
};

export function KeyBoutsSection({ moments, getRikishi }: KeyBoutsSectionProps) {
  const [replayMoment, setReplayMoment] = useState<KeyBoutMoment | null>(null);

  if (moments.length === 0) return null;

  const replayEast = replayMoment ? getRikishi(replayMoment.eastRikishiId) : null;
  const replayWest = replayMoment ? getRikishi(replayMoment.westRikishiId) : null;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold tracking-tight">Bouts of the Basho</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {moments.map((moment) => {
          const east = getRikishi(moment.eastRikishiId);
          const west = getRikishi(moment.westRikishiId);
          if (!east || !west) return null;

          return (
            <Card key={moment.bout.boutId} className="overflow-hidden">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <Badge
                  variant="outline"
                  className={MOMENT_BADGE_VARIANT[moment.label]}
                >
                  {moment.labelText}
                </Badge>
              </CardHeader>

              <CardContent className="space-y-3">
                <BoutResultDisplay
                  result={moment.bout}
                  eastRikishi={east}
                  westRikishi={west}
                  compact
                />

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => setReplayMoment(moment)}
                >
                  <Play className="h-3.5 w-3.5" />
                  Watch Replay
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {replayMoment && replayEast && replayWest && (
        <BoutNarrativeModal
          result={replayMoment.bout}
          eastRikishi={replayEast}
          westRikishi={replayWest}
          autoPlay={false}
          open
          onClose={() => setReplayMoment(null)}
        />
      )}
    </section>
  );
}
```

Note: `BoutResultDisplay` may need a `compact` prop added if it doesn't exist — it should suppress the description text and show only winner/loser names, kimarite, and result badge.

---

## Step 4 — Add section to `RecapPage`

**File: `src/pages/RecapPage.tsx`**

Import and add `KeyBoutsSection` between `<NarrativeSummary>` and `<PressConference>`:

```tsx
import { KeyBoutsSection } from "@/components/game/KeyBoutsSection";
import { selectKeyBouts } from "@/presenters/projections/recapProjections";
import { projectRikishi } from "@/presenters/uiModels";

// In the component, derive moments:
const keyMoments = useMemo(
  () => selectKeyBouts(world),
  [world]
);

const getRikishi = useCallback(
  (id: string) => {
    const r = world.rikishi.get(id);
    return r ? projectRikishi(r, world) : null;
  },
  [world]
);

// In JSX, between NarrativeSummary and PressConference:
<NarrativeSummary ... />

<KeyBoutsSection moments={keyMoments} getRikishi={getRikishi} />

<PressConference ... />
```

---

## Step 5 — BoutResultDisplay `compact` prop

**File: `src/components/game/BoutResultDisplay.tsx`**

The component is ~230 lines. Add a `compact?: boolean` prop:

```tsx
interface BoutResultDisplayProps {
  result: BoutResult;
  eastRikishi: UIRikishi;
  westRikishi: UIRikishi;
  compact?: boolean;
}
```

When `compact` is true, omit:
- The kimarite description text
- Duration and stance detail rows
- Kensho envelope count (or show inline)

Render only: winner/loser shikona (bold), kimarite name badge, win type (upset/kinboshi badge).

---

## Edge Cases

- **No yusho decider identifiable** (e.g. yusho clinched before day 15): fall back to the highest `dramaticContext.score` bout across all days
- **No kinboshi in the basho**: section shows 1–2 cards, not 3 — this is fine; the component caps at 3 but handles fewer
- **Rikishi no longer in `world.rikishi`** (retired mid-basho): `getRikishi` returns null; the card for that moment is skipped silently
- **`currentBasho` is null** on the RecapPage (shouldn't happen but defensive): `selectKeyBouts` returns `[]`, section renders nothing

---

## Testing Checklist

- [ ] Complete a basho that has a kinboshi — confirm section shows 2–3 cards
- [ ] Complete a basho with a major upset — confirm it appears with "Biggest Upset" badge
- [ ] Click "Watch Replay" — `BoutNarrativeModal` opens with that specific bout
- [ ] Modal closes via onClose — section still visible
- [ ] Basho with no kinboshi and no obvious upset — section shows 1 card (yusho decider only)
- [ ] `compact` BoutResultDisplay is noticeably shorter than full version
- [ ] `npx tsc --noEmit` passes
- [ ] `npx vitest run` — all existing tests pass
- [ ] Add unit test for `selectKeyBouts` covering: yusho decider selection, upset ranking, kinboshi detection, empty basho

---

## Estimated Effort

2–3 days. `selectKeyBouts` and `KeyBoutsSection` are new but straightforward; the main uncertainty is whether `dramaticContext` is consistently populated on `BoutResult` and whether `BoutNarrativeModal` already accepts an `onClose` prop. Check those two points before starting.
