# Unify the Command Path (Remove Dead Legacy Handlers) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the dead half of the dual command system — remove the legacy reducer handlers that no UI dispatches (`UPGRADE_HEYA`, `RECRUIT_STAFF`) and the legacy `mediaSlice` (`ISSUE_RULING`/`HANDLE_MEDIA_EVENT`, made redundant once they live in the worker) — and codify a one-line rule so new engine mutations don't land in the dead path again.

**Architecture:** Pure deletion + documentation. No behavior change. The reducer keeps the genuinely-live legacy paths (synchronous bout simulation, time advance, facilities, mentors, sparring, UI selection); the worker remains the canonical path for everything else.

**Tech Stack:** TS reducer slices (`src/contexts/*Slice.ts`), `GameContext`, Vitest.

---

## Prerequisite

**This plan MUST run after `2026-06-17-01-wire-governance-media-decisions.md`**, which moves `ISSUE_RULING`/`HANDLE_MEDIA_EVENT` into the worker. Deleting `mediaSlice` before that would remove the only working path.

## Verified live/dead audit (do not re-derive — but re-confirm in Task 1)

Legacy actions dispatched from the UI via `GameContext` wrapper methods (**LIVE — keep**):
`simulateBout`, `setBoutTactic` (`bashoSlice`); `advanceDay`, `advanceInterim`, `RUN_HOLIDAY`, `RUN_AUTO_SIM` (`timeSlice`); `buildInfrastructure` (`financeSlice`); `assignMentor`, `removeMentor`, `addSparringPair` (`rosterSlice`); `selectRikishi`, `selectHeya`, `setPlayerHeya` (UI state).

Confirmed **DEAD** (no UI caller — safe to remove):

- `upgradeHeya` / `UPGRADE_HEYA` (`financeSlice`)
- `recruitStaff` / `RECRUIT_STAFF` (`financeSlice`)
- `mediaSlice` entirely (`ISSUE_RULING`, `HANDLE_MEDIA_EVENT`) — redundant after the worker handles them.

Slices present: `bashoSlice`, `financeSlice`, `heyaSlice`, `mediaSlice`, `rosterSlice`, `timeSlice` (no `coreSlice` — the CLAUDE.md reference is stale).

## Explicitly out of scope (deferred — large, risky)

Migrating the **live** legacy engine paths (synchronous bout simulation, time advance, facilities, mentors) into the worker. The bout path returns results synchronously to drive match animation; moving it to the async worker is a significant architectural change with low immediate user value. Task 4 documents the convention so this can be tackled deliberately later.

---

### Task 1: Re-confirm the dead handlers before deleting

**Files:** none (audit only)

- [ ] **Step 1: Confirm zero UI callers**

Run: `grep -rn "upgradeHeya\|recruitStaff\|issueRuling\|handleMediaEvent\|ISSUE_RULING\|HANDLE_MEDIA_EVENT" src/pages src/components | grep -v test`
Expected: **no output** (after plan 01, governance/media UI calls `sendCommand`, not these reducer methods). If anything prints, stop — that path is live; do not delete it.

- [ ] **Step 2: Confirm the worker now owns rulings/media**

Run: `grep -n "ISSUE_RULING\|HANDLE_MEDIA_EVENT" src/engine/worker/engine.worker.ts`
Expected: both present (from plan 01). If absent, run plan 01 first.

---

### Task 2: Remove `UPGRADE_HEYA` and `RECRUIT_STAFF`

**Files:**

- Modify: `src/contexts/financeSlice.ts` (remove the two `case` blocks)
- Modify: `src/contexts/gameActions.ts` (remove `upgradeHeya`, `recruitStaff` creators)
- Modify: `src/contexts/gameTypes.ts` (remove the two union members)
- Modify: `src/contexts/GameContext.tsx` (remove `upgradeHeya`/`recruitStaff` methods + context type entries)

- [ ] **Step 1: Delete the reducer cases**

In `src/contexts/financeSlice.ts`, delete the `case "UPGRADE_HEYA":` and `case "RECRUIT_STAFF":` blocks (keep `case "BUILD_INFRASTRUCTURE":` — it's live).

- [ ] **Step 2: Delete the action creators**

In `src/contexts/gameActions.ts`, delete the `upgradeHeya` (≈ lines 256-265) and `recruitStaff` (≈ lines 290-294) exported functions.

- [ ] **Step 3: Delete the action-type union members**

In `src/contexts/gameTypes.ts`, delete the `UPGRADE_HEYA` (≈ line 109) and `RECRUIT_STAFF` (≈ line 119) entries from the `GameAction` union.

- [ ] **Step 4: Delete the GameContext methods**

In `src/contexts/GameContext.tsx`, delete the `upgradeHeya`/`recruitStaff` callback definitions, their entries in the context value object, and their declarations in the context type interface.

- [ ] **Step 5: Verify it compiles and nothing references them**

Run: `grep -rn "upgradeHeya\|recruitStaff\|UPGRADE_HEYA\|RECRUIT_STAFF" src | grep -v test` → expect no output.
Run: `npx tsc --build --force 2>&1 | grep -iE "financeSlice|gameActions|gameTypes|GameContext" || echo "clean"` → expect "clean".

- [ ] **Step 6: Commit**

```bash
git add src/contexts/financeSlice.ts src/contexts/gameActions.ts src/contexts/gameTypes.ts src/contexts/GameContext.tsx
git commit -m "refactor(state): remove dead UPGRADE_HEYA and RECRUIT_STAFF actions"
```

---

### Task 3: Remove the legacy `mediaSlice`

**Files:**

- Delete: `src/contexts/mediaSlice.ts`
- Modify: the reducer aggregator that calls `mediaSlice` (find it in Step 1)
- Modify: `src/contexts/gameActions.ts` (remove `handleMediaEvent`, `issueRuling` creators ≈ lines 303, 316)
- Modify: `src/contexts/gameTypes.ts` (remove `HANDLE_MEDIA_EVENT` ≈ line 122, `ISSUE_RULING` ≈ line 123)
- Modify: `src/contexts/GameContext.tsx` (remove any `handleMediaEvent`/`issueRuling` methods if present)

- [ ] **Step 1: Find where `mediaSlice` is combined**

Run: `grep -rn "mediaSlice" src/contexts`
Expected: an import + a call in `gameReducer` (likely `src/contexts/gameReducer.ts` or `GameContext.tsx`). Note the file and the line that invokes it.

- [ ] **Step 2: Remove the slice from the reducer aggregator**

Delete the `mediaSlice` import and its invocation line in the aggregator found in Step 1.

- [ ] **Step 3: Delete the slice file and its action creators/types**

- Delete `src/contexts/mediaSlice.ts`.
- In `src/contexts/gameActions.ts`, delete the `handleMediaEvent` and `issueRuling` exported creators.
- In `src/contexts/gameTypes.ts`, delete the `HANDLE_MEDIA_EVENT` and `ISSUE_RULING` union members.
- In `src/contexts/GameContext.tsx`, delete any `handleMediaEvent`/`issueRuling` methods + context-type entries (only if present).

- [ ] **Step 4: Verify**

Run: `grep -rn "mediaSlice\|issueRuling\|handleMediaEvent" src/contexts` → expect no output.
Run: `npx tsc --build --force 2>&1 | grep -iE "mediaSlice|gameReducer|gameActions|gameTypes|GameContext" || echo "clean"` → expect "clean".

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(state): remove legacy mediaSlice (rulings/media now worker-owned)"
```

---

### Task 4: Codify the command-path convention

**Files:**

- Modify: `.claude/CLAUDE.md` (the "State Management" section)

- [ ] **Step 1: Add the rule**

In `.claude/CLAUDE.md`, under "## State Management", append:

```markdown
### Command path convention

- **Engine mutations go through the Web Worker** (`src/engine/worker/engine.worker.ts` `COMMAND_HANDLERS` + `src/engine/worker/types.ts`), dispatched from the UI via `useGameStore((s) => s.sendCommand)`.
- **The reducer (`src/contexts/*Slice.ts`) is only for:** transient UI state (`selectRikishi`, `selectHeya`, `setPhase`) and the synchronous bout-simulation/time-advance path that drives match animation (`bashoSlice`, `timeSlice`).
- Do NOT add new engine-mutating actions to the reducer slices — they will not be reachable from the canonical command path. (This is the bug class that left `ISSUE_RULING`/`UPGRADE_HEYA` dead for months.)
```

- [ ] **Step 2: Commit**

```bash
git add .claude/CLAUDE.md
git commit -m "docs: codify worker-vs-reducer command path convention"
```

---

## Final verification

- [ ] `npx vitest run` — full suite green (deletion must not break tests; if a test referenced the removed actions, delete that test or its assertions).
- [ ] `npx vite build` — clean.
- [ ] `grep -rn "UPGRADE_HEYA\|RECRUIT_STAFF\|mediaSlice\|issueRuling" src | grep -v test` → no output.
- [ ] Manual smoke: governance rulings (plan 01) still work; facilities build, mentor assignment, bout simulation, and time advance still work (live legacy paths untouched).

## Self-review notes

- **Coverage:** Removes every confirmed-dead handler (Task 2 + 3) and prevents recurrence (Task 4). Live paths explicitly preserved.
- **Type consistency:** all four artifacts per action (slice case, creator, union member, GameContext method) are removed together so the `GameAction` union and context type stay consistent.
- **Scope honesty:** full migration of live legacy engine paths is deferred with rationale; this plan delivers the safe, valuable subset (dead-code removal + convention) that directly fixes the "stranded features" critique.
- **Dependency:** gated behind plan 01 (Step 1/Task 1 enforces it).
