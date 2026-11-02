# Decision Feedback Loop — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every loop decision report its consequence. When the player resolves a decision, emit an authoritative `DECISION_RESOLVED` event (with real numbers) that appears in the Event Feed, and show an immediate toast — so the player can learn the tradeoffs instead of choosing blind.

**Architecture:** Engine: `resolveLoopDecision` builds a human-readable consequence summary from the actual world state and logs a `DECISION_RESOLVED` event. UI: the two resolve surfaces (`ActionQueueWidget`, `CrisisModal`) fire a sonner toast on resolve; the Event Feed shows the persisted event.

**Tech Stack:** TS engine + `ImpactBuilder.logEvent`, `EngineEventType` union, sonner `toast`, `EventFeed` widget.

---

## Background facts (verified — use these)

- `resolveLoopDecision(world, decisionId, optionId): StateImpact` lives in `src/engine/loop/LoopDecisionEngine.ts`; decision types `pre_basho_readiness` / `insolvency_response` / `weekly_training_emphasis` / `welfare_diet`; option ids `rest`/`push`, `loan`/`austerity`, `intensive`/`conservative`, `premium`/`maintenance`.
- `ImpactBuilder.logEvent(type, category, data, { heyaId, importance })` (`src/engine/core/ImpactBuilder.ts:393`).
- `EngineEventType` union is in `src/engine/types/events.ts`.
- `EventFeed` (`src/components/dashboard/EventFeed.tsx`) renders `workerWorld.events.log`, styled by `importance`, icon by `type` (falls back to `typeIcons.default`).
- Toast: `import { toast } from "sonner"` — `<Sonner />` is already mounted in `src/App.tsx`.
- Resolve dispatch sites: `src/components/dashboard/ActionQueueWidget.tsx` and `src/components/game/CrisisModal.tsx`, both `sendCommand({ type: "RESOLVE_LOOP_DECISION", decisionId, optionId })`.

---

### Task 1: Emit a `DECISION_RESOLVED` event with a real consequence summary

**Files:**

- Modify: `src/engine/types/events.ts` (add event type)
- Modify: `src/engine/loop/LoopDecisionEngine.ts` (`resolveLoopDecision`)
- Test: `src/engine/loop/__tests__/LoopDecisionEngine.test.ts`

- [ ] **Step 1: Write the failing test**

Add:

```typescript
describe("resolveLoopDecision — feedback event", () => {
  it("logs a DECISION_RESOLVED event with a non-empty summary", () => {
    const r = makeRikishi("r1", "makushita", "Tired");
    (r as unknown as { fatigue: number }).fatigue = 80;
    const world = makeWorld({
      seed: "s",
      playerHeyaId: "h1",
      heyas: new Map([["h1", makeHeya("h1", ["r1"])]]),
      rikishi: new Map([["r1", r]]),
      pendingDecisions: [
        {
          id: "pbr-1",
          type: "pre_basho_readiness",
          description: "x",
          deadlineWeek: 2,
          required: true,
          options: [{ id: "rest", label: "Rest", impact: "x" }],
        },
      ],
    });
    const impact = resolveLoopDecision(world, "pbr-1", "rest");
    const ev = (impact.events ?? []).find((e) => e.type === "DECISION_RESOLVED");
    expect(ev).toBeDefined();
    expect(String((ev as { data?: { summary?: string } }).data?.summary ?? "")).not.toEqual("");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/engine/loop/__tests__/LoopDecisionEngine.test.ts -t "feedback event"`
Expected: FAIL — no such event.

- [ ] **Step 3: Add the event type**

In `src/engine/types/events.ts`, add `"DECISION_RESOLVED"` to the `EngineEventType` union (and `"DECISION_AUTO_RESOLVED"` too if the fast-forward plan `2026-06-17-04` hasn't already added it).

- [ ] **Step 4: Build the summary and log the event**

In `src/engine/loop/LoopDecisionEngine.ts`, add a pure summary helper and call it at the end of `resolveLoopDecision` (after the effect is applied, before `return builder.build()`):

```typescript
function decisionConsequenceSummary(
  world: WorldState,
  decisionType: string,
  optionId: string
): string {
  const heya = world.playerHeyaId ? world.heyas.get(world.playerHeyaId) : undefined;
  switch (decisionType) {
    case "pre_basho_readiness": {
      if (optionId !== "rest") return "Pushed for rank — no rest, injury risk accepted.";
      const n = (heya?.rikishiIds ?? []).filter((id) => {
        const r = world.rikishi.get(id);
        return !!r && ((r.fatigue ?? 0) > 60 || r.injured);
      }).length;
      return `Rested ${n} at-risk wrestler${n === 1 ? "" : "s"} (−20 fatigue each, −5 momentum).`;
    }
    case "insolvency_response":
      return optionId === "loan"
        ? "Emergency loan secured — monthly repayments now apply."
        : "Switched to austerity diet to cut costs (welfare risk rises).";
    case "weekly_training_emphasis":
      return `Training emphasis set to ${optionId}.`;
    case "welfare_diet":
      return `Diet set to ${optionId} (welfare risk ${optionId === "premium" ? "eases" : "unchanged"}).`;
    default:
      return "Decision resolved.";
  }
}
```

Then in `resolveLoopDecision`, after applying the effect:

```typescript
builder.logEvent(
  "DECISION_RESOLVED",
  "narrative",
  {
    status: "resolved",
    decisionType: decision.type,
    optionId,
    summary: decisionConsequenceSummary(world, decision.type, optionId),
  },
  world.playerHeyaId
    ? { heyaId: world.playerHeyaId, importance: "notable" }
    : { importance: "notable" }
);
```

> `decisionConsequenceSummary` reads `world` _before_ the impact is applied, which is correct for "how many were at-risk" / "what we switched to". Confirm `EventImportance` includes `"notable"` (used as the EventFeed default).

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run src/engine/loop/__tests__/LoopDecisionEngine.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/engine/types/events.ts src/engine/loop/LoopDecisionEngine.ts src/engine/loop/__tests__/LoopDecisionEngine.test.ts
git commit -m "feat(loop): emit DECISION_RESOLVED event with consequence summary"
```

---

### Task 2: Immediate toast feedback on resolve (Action Queue + Crisis Modal)

**Files:**

- Modify: `src/components/dashboard/ActionQueueWidget.tsx`
- Modify: `src/components/game/CrisisModal.tsx`

- [ ] **Step 1: Add a shared client-side label helper**

Create `src/components/game/decisionFeedback.ts`:

```typescript
/** Short client-side acknowledgement shown in a toast the instant a decision is resolved.
 *  (The authoritative summary with real numbers is the engine's DECISION_RESOLVED event.) */
export function decisionToastMessage(optionLabel: string): string {
  return `Decision applied: ${optionLabel}. See the Event Feed for the result.`;
}
```

- [ ] **Step 2: Fire a toast from the Action Queue on resolve**

In `src/components/dashboard/ActionQueueWidget.tsx`, where it dispatches `RESOLVE_LOOP_DECISION` (the `kind === "resolve"` branch, ~line 82), add the toast:

```typescript
import { toast } from "sonner";
import { decisionToastMessage } from "@/components/game/decisionFeedback";
// ... inside the resolve handler, after sendCommand({ type: "RESOLVE_LOOP_DECISION", ... }):
toast.success(decisionToastMessage(chosenOptionLabel));
```

> `chosenOptionLabel` is the label of the option the player clicked — it's already in scope where the option button is rendered (the `item.options.map((o) => ...)` loop exposes `o.label`). Pass `o.label` into the handler.

- [ ] **Step 3: Fire a toast from the Crisis Modal on resolve**

In `src/components/game/CrisisModal.tsx`, in the `handleResolve` path that sends `RESOLVE_LOOP_DECISION` (~line 98), add after the dispatch:

```typescript
import { toast } from "sonner";
import { decisionToastMessage } from "@/components/game/decisionFeedback";
// after sendCommand({ type: "RESOLVE_LOOP_DECISION", ... }):
toast.success(decisionToastMessage(chosenOption.label));
```

> Use the label of the option the player selected (the modal already has the option object when rendering the choice buttons).

- [ ] **Step 4: Manual verify**

Run: `bun run dev`. Resolve a decision from the Action Queue and from a blocking Crisis Modal → a toast appears immediately, and a matching entry (with real numbers, e.g. "Rested 2 at-risk wrestlers…") shows in the dashboard Event Feed.

- [ ] **Step 5: Commit**

```bash
git add src/components/game/decisionFeedback.ts src/components/dashboard/ActionQueueWidget.tsx src/components/game/CrisisModal.tsx
git commit -m "feat(ui): toast feedback when a loop decision is resolved"
```

---

### Task 3: Make `DECISION_RESOLVED` legible in the Event Feed

**Files:**

- Modify: `src/components/dashboard/EventFeed.tsx`

- [ ] **Step 1: Add an icon for the new event type**

In `src/components/dashboard/EventFeed.tsx`, add an entry to the `typeIcons` map (~line 37) so the event renders with a distinct icon instead of the default. Use an existing lucide icon already imported there, or import one (e.g. `Gavel` or `CheckCircle2`):

```typescript
  DECISION_RESOLVED: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
```

Add `CheckCircle2` to the lucide import at the top of the file if not present.

- [ ] **Step 2: Confirm the event renders the summary text**

Verify the feed row prints the event's title/summary. If `EventFeed` renders `event.title` rather than `event.data.summary`, set a `title` on the event in Task 1 instead of (or in addition to) `data.summary` — read the row JSX (~line 59) to confirm which field is shown, and align Task 1's `logEvent` payload to it.

Run: `grep -n "event.title\|event.summary\|data.summary\|\.title" src/components/dashboard/EventFeed.tsx`
Expected: identify the displayed field; ensure the `DECISION_RESOLVED` event populates it (adjust Task 1's payload if needed — e.g. pass the summary as the event `title`).

- [ ] **Step 3: Manual verify**

Run: `bun run dev`. After resolving a decision, the Event Feed shows the green-check `DECISION_RESOLVED` row with the consequence text.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/EventFeed.tsx
git commit -m "feat(ui): render DECISION_RESOLVED events in the Event Feed"
```

---

## Final verification

- [ ] `npx vitest run` — full suite green.
- [ ] `npx vite build` — clean.
- [ ] Manual: resolving any of the four decisions (queue or blocking) produces (a) an immediate toast and (b) an Event Feed row with the real consequence (counts/amounts), so the tradeoff is legible after the fact.

## Self-review notes

- **Coverage:** engine consequence event (T1), immediate toast on both resolve surfaces (T2), feed legibility (T3) = every resolution now reports its outcome.
- **Type consistency:** `DECISION_RESOLVED` added to `EngineEventType` and used identically in `logEvent` (T1) and the `EventFeed` icon map (T3); decision-type/option-id strings match the existing `LoopDecisionEngine` taxonomy.
- **Truthfulness:** the engine event computes real numbers from world state (at-risk count, chosen diet/intensity); the toast is a lightweight client acknowledgement that defers to the feed for specifics — no fabricated metrics.
- **Reuse:** `ImpactBuilder.logEvent`, existing `EventFeed`, existing sonner `toast`. Independent of the other four plans (works whether or not `2026-06-17-04` has landed; if it has, both `DECISION_RESOLVED` and `DECISION_AUTO_RESOLVED` coexist).

```

```
