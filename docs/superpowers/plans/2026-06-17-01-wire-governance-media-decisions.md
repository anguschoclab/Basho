# Wire Governance Rulings & Media Events to the UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the player actually issue governance rulings and respond to media events — the engine logic has existed unused since day one; this connects it to the canonical (worker) command path and surfaces it in `GovernancePage` and `MediaPage`.

**Architecture:** Add two commands to the Web Worker `COMMAND_HANDLERS` (the canonical command path), each calling the already-built engine functions. Add "respond" buttons in `GovernancePage` (for unresolved `governanceLog` rulings) and `MediaPage` (for unresolved media events). No new engine logic.

**Tech Stack:** Vite + React 19 + TS, Web Worker engine, Zustand `useGameStore().sendCommand`, shadcn/ui.

---

## Background facts (verified — use these)

- `issueGovernanceRuling(world, rulingId, severity: "lenient" | "standard" | "harsh"): StateImpact` — `src/engine/systems/governance/ScandalService.ts:269`, re-exported as `worldEngine.issueGovernanceRuling` (`src/engine/world.ts:45`). Operates on `world.governanceLog` entries by `id`.
- `handleMediaEvent(world, eventId, choice: string): StateImpact` — `src/engine/systems/media/MediaEventService.ts:78`, re-exported from `src/engine/world.ts:32`. Operates on `world.governanceLog` + `world.mediaState`.
- `GovernanceRuling` (`src/engine/types/economy.ts:55`): `{ id, date, heyaId, type: "fine"|"suspension"|"warning"|"closure", severity, reason, effects, playerChoice?, playerResponse? }`. **A ruling is unresolved iff `playerChoice` is undefined.**
- Both functions are ALSO wired in the dead legacy reducer path (`src/contexts/mediaSlice.ts`) but **no UI dispatches them**. The canonical path is the worker (`src/engine/worker/engine.worker.ts`), reached via `useGameStore((s) => s.sendCommand)`.
- `GovernancePage` (`src/pages/GovernancePage.tsx`) already imports `sendCommand` and maps `world.governanceLog` for display. `MediaPage` (`src/pages/MediaPage.tsx`) is read-only (`const { state } = useGame()` only).
- Worker command pattern: each handler is `KEY: (cmd) => { ... resolveImpacts(currentWorld, [impact]); emitDigest(); syncWorld(); }` and the command type is added to the union in `src/engine/worker/types.ts`.

---

### Task 1: Add `ISSUE_RULING` and `HANDLE_MEDIA_EVENT` to the worker command path

**Files:**

- Modify: `src/engine/worker/types.ts` (command union)
- Modify: `src/engine/worker/engine.worker.ts` (handlers + imports)
- Test: `src/engine/worker/__tests__/governanceMediaCommands.test.ts` (new — tests the engine fns the handlers call, since the worker globals aren't unit-testable)

- [ ] **Step 1: Write the failing test (engine-level, exercises what the handlers call)**

Create `src/engine/worker/__tests__/governanceMediaCommands.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { issueGovernanceRuling } from "../../systems/governance/ScandalService";
import { resolveImpacts } from "../../core/ImpactResolver";
import { generateInitialWorld } from "../../systems/generation/WorldFactory";
import type { GovernanceRuling } from "../../types/economy";

function worldWithUnresolvedRuling() {
  const world = generateInitialWorld("gov-cmd-test");
  const heyaId = world.playerHeyaId!;
  const ruling: GovernanceRuling = {
    id: "ruling-1",
    date: "2026-01",
    heyaId,
    type: "fine",
    severity: "medium",
    reason: "test",
    effects: { fineAmount: 1_000_000 },
  };
  return { world: { ...world, governanceLog: [ruling] }, heyaId };
}

describe("issueGovernanceRuling (worker handler target)", () => {
  it("records the player's severity choice on the ruling", () => {
    const { world } = worldWithUnresolvedRuling();
    const impact = issueGovernanceRuling(world, "ruling-1", "harsh");
    const next = resolveImpacts(world, [impact]);
    const ruling = next.governanceLog?.find((r) => r.id === "ruling-1");
    expect(ruling?.playerChoice).toBeDefined();
  });
});
```

> Confirm `resolveImpacts` import path against `src/engine/core/ImpactResolver.ts` (the worker imports it the same way). If `issueGovernanceRuling` does not set `playerChoice`, read its body (`ScandalService.ts:269`) and assert on the field it actually mutates (e.g. `severity` or an effects delta) instead.

- [ ] **Step 2: Run to verify it fails or passes**

Run: `npx vitest run src/engine/worker/__tests__/governanceMediaCommands.test.ts`
Expected: PASS if the engine fn already sets `playerChoice`; if it FAILS, adjust the assertion to the field actually mutated (this test documents the contract the worker relies on).

- [ ] **Step 3: Add the command types**

In `src/engine/worker/types.ts`, add to the `EngineCommand` union:

```typescript
  | { type: "ISSUE_RULING"; rulingId: string; severity: "lenient" | "standard" | "harsh" }
  | { type: "HANDLE_MEDIA_EVENT"; eventId: string; choice: string }
```

- [ ] **Step 4: Add the worker handlers**

In `src/engine/worker/engine.worker.ts`, add imports near the other engine imports:

```typescript
import { issueGovernanceRuling } from "../systems/governance/ScandalService";
import { handleMediaEvent } from "../systems/media/MediaEventService";
```

Add to the `COMMAND_HANDLERS` object (next to `REQUEST_POLITICAL_FAVOR`):

```typescript
    ISSUE_RULING: (cmd) => {
      if (currentWorld) {
        const impact = issueGovernanceRuling(currentWorld, cmd.rulingId, cmd.severity);
        currentWorld = resolveImpacts(currentWorld, [impact]);
        emitDigest();
        syncWorld();
      }
    },
    HANDLE_MEDIA_EVENT: (cmd) => {
      if (currentWorld) {
        const impact = handleMediaEvent(currentWorld, cmd.eventId, cmd.choice);
        currentWorld = resolveImpacts(currentWorld, [impact]);
        emitDigest();
        syncWorld();
      }
    },
```

- [ ] **Step 5: Verify it compiles & the test still passes**

Run: `npx vitest run src/engine/worker/__tests__/governanceMediaCommands.test.ts && npx tsc --build --force 2>&1 | grep -i "engine.worker\|worker/types" || echo "no worker type errors"`
Expected: test PASS; no type errors referencing the worker files.

- [ ] **Step 6: Commit**

```bash
git add src/engine/worker/types.ts src/engine/worker/engine.worker.ts src/engine/worker/__tests__/governanceMediaCommands.test.ts
git commit -m "feat(worker): add ISSUE_RULING and HANDLE_MEDIA_EVENT commands"
```

---

### Task 2: Surface ruling responses in `GovernancePage`

**Files:**

- Modify: `src/pages/GovernancePage.tsx`

- [ ] **Step 1: Add a derived list of unresolved rulings**

In `src/pages/GovernancePage.tsx`, near the existing `governanceLog` mapping (~line 87), add:

```typescript
const unresolvedRulings = (state.world?.governanceLog ?? []).filter(
  (r) => r.heyaId === state.world?.playerHeyaId && !r.playerChoice
);
```

- [ ] **Step 2: Render a response panel with three severity buttons per unresolved ruling**

Add a section (above the existing read-only ruling history list) that renders, for each `unresolvedRulings` entry, the reason plus three buttons:

```tsx
{
  unresolvedRulings.length > 0 && (
    <div className="space-y-3">
      {unresolvedRulings.map((r) => (
        <div key={r.id} className="rounded border border-primary/30 bg-primary/5 p-3">
          <div className="text-sm font-bold">
            {r.type.toUpperCase()} — {r.reason}
          </div>
          <div className="mt-2 flex gap-2">
            {(["lenient", "standard", "harsh"] as const).map((sev) => (
              <Button
                key={sev}
                size="sm"
                variant="outline"
                onClick={() => sendCommand({ type: "ISSUE_RULING", rulingId: r.id, severity: sev })}
              >
                {sev}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

> `Button` is already imported in this file (it renders the political-favor "Request" button). If not, add `import { Button } from "@/components/ui/button";`.

- [ ] **Step 3: Manual verify**

Run: `bun run dev`. Seed/trigger a scandal so an unresolved ruling appears in `world.governanceLog` for the player heya → the response panel shows three buttons → clicking one removes the ruling from "unresolved" (it now has `playerChoice`) and applies the effect (funds/scandal change visible).

- [ ] **Step 4: Commit**

```bash
git add src/pages/GovernancePage.tsx
git commit -m "feat(governance): let the player issue rulings on pending cases"
```

---

### Task 3: Surface media-event responses in `MediaPage`

**Files:**

- Modify: `src/pages/MediaPage.tsx`

- [ ] **Step 1: Read the page to find where media events are listed**

Run: `grep -n "governanceLog\|mediaState\|useGame\|map(" src/pages/MediaPage.tsx`
Expected: identify the array the page renders. Media events are `governanceLog` entries surfaced via `world.mediaState`; an event is unresolved when `playerChoice` is undefined (same convention as rulings).

- [ ] **Step 2: Add `sendCommand` and an unresolved-events list**

In `src/pages/MediaPage.tsx`, add near the existing `useGame` line:

```typescript
import { useGameStore } from "@/store/gameStore";
// ...
const sendCommand = useGameStore((s) => s.sendCommand);
const unresolvedMedia = (state.world?.governanceLog ?? []).filter(
  (r) => r.heyaId === state.world?.playerHeyaId && !r.playerChoice
);
```

> If media events live on a different array than `governanceLog`, use that array (confirm via the grep in Step 1). The `handleMediaEvent` engine fn looks them up in `governanceLog` first (`MediaEventService.ts:81`), so `governanceLog` is the correct source unless the grep shows a dedicated `mediaState.events` list.

- [ ] **Step 3: Render response buttons**

For each `unresolvedMedia` entry, render the standard three media responses (the `choice` string is free-form; use the conventional set the engine recognizes — `"no_comment"`, `"deny"`, `"apologize"`):

```tsx
{
  unresolvedMedia.map((e) => (
    <div key={e.id} className="rounded border border-border p-3">
      <div className="text-sm font-medium">{e.reason}</div>
      <div className="mt-2 flex gap-2">
        {["no_comment", "deny", "apologize"].map((choice) => (
          <Button
            key={choice}
            size="sm"
            variant="outline"
            onClick={() => sendCommand({ type: "HANDLE_MEDIA_EVENT", eventId: e.id, choice })}
          >
            {choice.replace("_", " ")}
          </Button>
        ))}
      </div>
    </div>
  ));
}
```

> Confirm the accepted `choice` values by reading `handleMediaEvent` (`MediaEventService.ts:78`). If it switches on specific strings, use those exact strings; if it stores the choice verbatim with no branching, any label is fine.

- [ ] **Step 4: Manual verify**

Run: `bun run dev`. Trigger a media event for the player heya → response buttons appear → clicking applies the engine effect and the event leaves the unresolved list.

- [ ] **Step 5: Commit**

```bash
git add src/pages/MediaPage.tsx
git commit -m "feat(media): let the player respond to media events"
```

---

## Final verification

- [ ] `npx vitest run` — full suite green.
- [ ] `npx vite build` — clean.
- [ ] Manual: `GovernancePage` and `MediaPage` both let the player resolve a pending item, and the world state reflects the choice (`playerChoice` set, effects applied).

## Self-review notes

- **Coverage:** Task 1 (worker commands) + Task 2 (governance UI) + Task 3 (media UI) cover the whole "wire it up" spec.
- **Type consistency:** command names `ISSUE_RULING` / `HANDLE_MEDIA_EVENT` and their payload fields (`rulingId`/`severity`, `eventId`/`choice`) match the engine fn signatures and the worker union exactly.
- **Reuse:** uses existing `issueGovernanceRuling` / `handleMediaEvent` engine fns, existing `sendCommand`, existing `Button`. No new engine logic.
- **Note for the cleanup plan:** the dead duplicates in `src/contexts/mediaSlice.ts` (`ISSUE_RULING`/`HANDLE_MEDIA_EVENT`) are intentionally left here and removed by the command-path-unification plan (`2026-06-17-03`).
