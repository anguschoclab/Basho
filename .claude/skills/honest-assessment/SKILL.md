---
name: honest-assessment
description: >-
  Deliver a brutally honest, evidence-grounded assessment of a codebase, app, or
  game — then a short list of prioritized, actionable improvements. Use this
  whenever the user asks "what do you think of X", "be brutally honest", "assess
  where we are", "review the state of this", "is this any good", "what should we
  fix", "give me N improvements", or otherwise wants candid evaluation rather than
  cheerleading. Also reach for it after a chunk of work lands and the user wants a
  status check, or before planning a roadmap. The defining move is grounding every
  claim in MEASURED reality — run the typecheck/build, count errors, actually run
  the app and click through, separate what renders from what crashes, distinguish
  pre-existing breakage from newly introduced — and refusing to assess from vibes,
  the README, or optimism. Prefer this skill even when the user phrases it softly
  ("how's it looking?") if they clearly want a real evaluation.
---

# Honest Assessment

## The core principle

**Critique from evidence, not vibes.** An assessment is only worth something if
it's grounded in what's actually true *right now* — not what the README claims,
not what the code is supposed to do, not a polite read of the surface. Measure
first, then opine. The most valuable thing you can give is the truth someone
can't see because they're too close to it.

Honesty cuts both ways: name what's genuinely good *and* what's broken. Don't
perform negativity, and don't sugarcoat. Don't catastrophize a small problem or
hand-wave a large one.

## Step 1 — Gather ground truth before forming an opinion

Do the boring measurement first. Depending on the project:

- **Build/typecheck/lint:** run them and *count*. "1,433 type errors across 180
  files" is an assessment; "the types are a bit messy" is a vibe.
- **Actually run it.** Start the app, click through the real screens, and see
  what renders vs. what white-screens. A feature that exists in code but crashes
  on load is not a feature.
- **Separate pre-existing from introduced.** If you just changed something, prove
  whether a failure is yours or was already on `main` (git status/log, revert-test
  if needed). Misattributing breakage destroys trust in the whole assessment.
- **Read the code, not the docs.** Trace the actual data flow. Note where the
  modeled depth isn't wired to anything reachable.
- **Look for the gap between ambition and reality** — impressive engine / dead
  UI, rich systems / no goal, big test suite / red build.

## Step 2 — Write it in this shape

Use this structure. It earns the right to be harsh by first being fair and being
specific.

```
## What's genuinely good
(Credit where due — concrete, not flattery.)

## The brutal truth (measured)
(Evidence-cited problems. Numbers, file:line, quoted code. Lead with the
biggest/most-load-bearing issue. Name the gap between how it looks and how it is.)

## N improvements (prioritized)
(Each: what to do, why it matters, in priority order by leverage. The thing that
unblocks everything else goes first.)

## Recommended next step
(One clear "if you do one thing, do this.")
```

## Step 3 — Make every claim specific and citable

- Cite `file.ts:line`, quote the offending code, give real counts.
- "Multiple screens crash" → name them and the cause (`TopBar.tsx` renders
  `<Star>` but never imports it → `ReferenceError`).
- Quantify the gap: "180 of ~250 files don't typecheck."
- When you praise, be concrete too ("the 50-system deterministic tick pipeline in
  `WeekCoordinator.ts` is genuinely well-separated").

## Step 4 — Prioritize by leverage and reality

Order improvements by what actually matters, not by what's fun:
- A build that doesn't run beats gameplay polish. Table-stakes correctness before
  features.
- The change that unblocks all the others (e.g. a CI build gate) ranks first.
- Re-prioritize across sessions: if a prior review said "improve the gameplay loop"
  but you've since discovered the app doesn't build, say so — the priority moved.
- Each improvement is actionable and carries its **why**, not just a label.

## Anti-patterns to avoid

- **Vibes masquerading as analysis** — "feels a bit rough", "could be cleaner".
  Measure it or don't claim it.
- **Optimism laundering** — softening a real blocker so the user feels good. They
  asked for honest; respect that.
- **Doom with no path** — criticism without prioritized, concrete next steps is
  just complaining.
- **Repeating last review verbatim** — re-measure; the state has changed, and your
  prior fixes (or new breakage) move the priorities.
- **Trusting the README/tests/types** — they describe intent, not current truth.

## Worked example (abbreviated, real)

> **What's better:** the Command Center is now legible and honest — real derived
> market position, no fabricated "SECTOR ALPHA-1" chrome. Credit where due.
>
> **The brutal truth (measured):** we polished the lobby of a building that's on
> fire. `npm run typecheck` → **1,433 errors across 180 files**. Multiple tabs
> white-screen at runtime (`PiracyImpactMonitor.tsx` references `Globe` but never
> imports it — same bug class as the `Star` crash). The hub/visualization screens
> still crash on missing `selectors.ts` exports. None of the actual game-design
> gaps from the first review have been touched.
>
> **5 improvements (prioritized):** 1) Make it build — add a CI typecheck gate
> (highest leverage; everything else regresses without it). 2) Sweep the
> runtime-crash class until every tab renders. 3) Delete the zombie UI that hides
> bugs. 4) Give the player a decision instead of a news feed. 5) Ship a goal +
> onboarding.
>
> **Next step:** #1 — without a build gate, every fix silently regresses.

## Why this matters

People act on assessments. A flattering-but-wrong one sends them to build features
on a foundation that's on fire. A measured, specific, prioritized one tells them
exactly where to spend the next hour. The candor is the value — but only because
it's backed by evidence.
