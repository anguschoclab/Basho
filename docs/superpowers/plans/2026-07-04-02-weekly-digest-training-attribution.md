# Plan 02 — Weekly Digest Screen + Training Attribution + Succession Modal Fix

## Problem

Three information gaps leave the player managing a black box.

**No weekly digest screen:** `buildWeeklyDigest(world)` → `UIDigest` is fully built in `digestProjections.ts`, types are correct, the presenter layer works — but there is no route or page that shows it. The `DigestWidget.tsx` exists and renders digest sections, but it appears only as a small dashboard widget, not as the primary weekly summary surface players open to understand what happened. Sports management games (FM, OOTP) use the weekly/offseason digest as the primary narrative delivery mechanism; missing this means the game's narrative system is invisible.

**Training attribution gap:** `TRAINING_UPDATE` events only fire when power crosses a `TRAINING_MILESTONE_THRESHOLD` multiple (line 351 in `TrainingService.ts`). A rikishi can gain +0.6 speed, +0.4 technique, and +0.3 balance in a week with zero events logged. The player has no weekly confirmation that training is working. The stat graph in `RikishiCareerTab` shows career history but not this-week deltas. Training feels random — which is the opposite of how management games build investment in wrestlers.

**SuccessionModal close bug:** The succession modal's `onClose` prop receives `() => {}` (an empty function) at its call site, so clicking "Close" or pressing Escape does nothing. The modal cannot be dismissed.

---

## Affected Files

| File | Change |
|------|--------|
| `src/engine/systems/training/TrainingService.ts` | Emit `TRAINING_STAT_DELTA` events each week with per-stat deltas |
| `src/presenters/projections/digestProjections.ts` | Consume `TRAINING_STAT_DELTA` events into a "Training" digest section |
| `src/pages/WeeklyDigestPage.tsx` | New page: full-screen digest viewer |
| `src/routes.tsx` | Add `/digest` route lazy-loaded |
| `src/components/layout/TopNavBar.tsx` (or wherever the nav is) | Add "Weekly Report" nav link |
| Call site of `SuccessionModal` | Pass real `onClose` handler |

---

## Step 1 — Emit `TRAINING_STAT_DELTA` Events

**File: `src/engine/systems/TrainingService.ts`**

Before the milestone check (around line 348), snapshot the prior stats before the training loop and emit a delta event after:

```typescript
// Pre-training snapshot for delta calculation (at the start of the rikishi loop body)
const prevStats = { ...rikishi.stats };

// ... existing growth calculation ...

// After updates.stats is assigned:
if (updates.stats) {
  const deltas: Partial<RikishiStats> = {};
  let hasGrowth = false;
  for (const key of Object.keys(STAT_GROUP) as Array<keyof RikishiStats>) {
    const delta = (updates.stats[key] ?? 0) - (prevStats[key] ?? 0);
    if (Math.abs(delta) >= 0.05) {  // ignore sub-noise changes
      deltas[key] = delta;
      hasGrowth = true;
    }
  }
  if (hasGrowth) {
    builder.logEvent(
      "TRAINING_STAT_DELTA",
      "training",
      {
        rikishiId: rikishi.id,
        heyaId: rikishi.heyaId,
        shikona: rikishi.shikona ?? rikishi.name,
        week: world.week,
        deltas,
        intensity: profile.intensity,
        focus: profile.focus,
      },
      { rikishiId: rikishi.id, heyaId: rikishi.heyaId, importance: "minor" }
    );
  }
}
```

Keep the existing `TRAINING_UPDATE` milestone event — that is for milestone achievements. The new event is for weekly attribution.

---

## Step 2 — Wire Training Deltas into the Weekly Digest

**File: `src/presenters/projections/digestProjections.ts`**

In `buildWeeklyDigest(world)`, add a "Training" section that aggregates the week's `TRAINING_STAT_DELTA` events for the player's heya:

```typescript
// Training section — per-rikishi stat delta summary
const trainingEvents = queryEvents(world, {
  type: "TRAINING_STAT_DELTA",
  category: "training",
  limit: 40,
}).filter((e) => e.data?.heyaId === playerHeyaId);

if (trainingEvents.length > 0) {
  const trainingItems: DigestItem[] = trainingEvents.map((e) => {
    const deltaSummary = Object.entries(e.data?.deltas ?? {})
      .filter(([, v]) => Math.abs(v as number) >= 0.1)
      .map(([k, v]) => `${k} ${(v as number) > 0 ? "+" : ""}${(v as number).toFixed(1)}`)
      .join(", ");
    return {
      id: e.id,
      title: e.data?.shikona ?? "Unknown",
      summary: deltaSummary || "No measurable change",
      category: "training",
      importance: "minor",
      icon: "dumbbell",
    };
  });

  sections.push({
    kind: "training",
    title: "Training Report",
    items: trainingItems,
  });
}
```

---

## Step 3 — Create `WeeklyDigestPage`

**File: `src/pages/WeeklyDigestPage.tsx`** (new file)

```typescript
import { useGameContext } from "@/contexts/GameContext";
import { buildWeeklyDigest } from "@/presenters/projections/digestProjections";
import { DigestWidget } from "@/components/dashboard/DigestWidget";

export default function WeeklyDigestPage() {
  const { state } = useGameContext();
  const digest = buildWeeklyDigest(state.world);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">
        Weekly Report — Week {state.world.week}, {state.world.year}
      </h1>
      <DigestWidget digest={digest} expanded />
    </div>
  );
}
```

The `DigestWidget` already knows how to render `UIDigest` sections. Pass `expanded` if that prop collapses/expands sections — otherwise just render all sections unconditionally.

---

## Step 4 — Add Route

**File: `src/routes.tsx`**

Following the established lazy-load pattern:

```typescript
const WeeklyDigestPage = React.lazy(() => import("./pages/WeeklyDigestPage"));

// In the route tree, alongside /basho, /banzuke, etc.:
{
  path: "/digest",
  component: () => (
    <Suspense fallback={<SpinnerFallback />}>
      <WeeklyDigestPage />
    </Suspense>
  ),
},
```

---

## Step 5 — Add Nav Link

**File: whichever component contains the main navigation** (grep for the `/basho` link to find it):

Add a "Weekly Report" link pointing to `/digest`, shown when `world.week > 0`.

---

## Step 6 — Fix SuccessionModal `onClose`

Grep for `<SuccessionModal` to find the call site. The bug is that `onClose` is `() => {}`. Fix:

```typescript
// Before:
<SuccessionModal ... onClose={() => {}} />

// After:
const [showSuccession, setShowSuccession] = useState(false);
// ...
<SuccessionModal ... onClose={() => setShowSuccession(false)} />
```

The exact state variable name depends on the call site. If the call site already has a state boolean controlling visibility, wire `onClose` to the setter. If it doesn't, add one.

---

## Testing Checklist

- [ ] Run a week of training — confirm `TRAINING_STAT_DELTA` events appear in `world.events` for the player's rikishi
- [ ] Navigate to `/digest` — confirm the Weekly Report page loads and shows a "Training Report" section
- [ ] Digest shows each rikishi's name + stat deltas (e.g. "power +0.3, speed +0.2")
- [ ] Rikishi with no measurable change this week are omitted from the training section
- [ ] Other existing digest sections (governance, health, etc.) still render on the page
- [ ] SuccessionModal: click "Close" — confirm the modal actually closes
- [ ] SuccessionModal: press Escape — confirm the modal closes
- [ ] `npx vitest run` — all tests pass
- [ ] `npx tsc --noEmit` — clean

---

## Estimated Effort

2–3 days. Training event emission is ~20 lines; digest wiring is ~30 lines; the page itself is a thin wrapper over existing components. The route add is 5 lines. SuccessionModal fix is 1–3 lines once the call site is located. Main risk: `DigestWidget` may not accept an `expanded` prop — check its API and adjust the page accordingly.
