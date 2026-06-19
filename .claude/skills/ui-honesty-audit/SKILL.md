---
name: ui-honesty-audit
description: >-
  Audit and fix frontend UI that lies to the user or fights legibility. Use this
  whenever you're reviewing, cleaning up, or building a data-driven interface
  (dashboards, admin panels, game HUDs, status screens, metrics views) and you
  see — or want to prevent — fabricated decorative chrome (fake telemetry, "SECTOR
  ALPHA-1", "LIVE SECURE", blinking "secure" badges), hardcoded values that ignore
  real state (a fixed "MAJOR CHALLENGER" label, a static "STABLE" status),
  SCREAMING_SNAKE_CASE display copy, mislabeled metrics (calling cash share
  "market share"), or illegible styling (numbers in italic, letter-spacing past
  0.15em, giant blur glows, absurd text sizes). Trigger it for requests like
  "make this UI cleaner / more honest / less sci-fi", "the dashboard looks like
  cosplay", "these labels are fake", "audit the UI for hardcoded values", or any
  time you're about to ship a component and want every on-screen value to map to
  real state. Prefer this skill even when the user just says "polish the UI" of a
  numbers-heavy screen.
---

# UI Honesty & Legibility Audit

## The core principle

**Every string and number on screen must map to real state.** A data-driven UI's
credibility comes from never showing the user something untrue or unreadable.
Atmosphere should come from typography, color, spacing, and motion — *never* from
inventing facts. If a decorative string would mislead someone about the real
state of their data, it fails.

This skill is two moves: **audit** (find the lies and the illegibility) and
**remediate** (replace fabrication with derived truth, replace HUD-cosplay with
clarity), then **lock it in** so it can't regress.

## Step 1 — Find the design system first

Before changing anything, locate the project's design tokens and any UI style
guide (CSS variables, Tailwind config, a `*Design*.md` / `UI*.md` doc). You are
**not** reskinning — you're removing dishonesty and illegibility *within* the
existing aesthetic. A dark gold-on-black "institutional terminal" theme can be
perfectly good; the problem is usually the fake copy and the styling drift, not
the palette. Respect the established look; fix what lies and what can't be read.

## Step 2 — Audit: hunt these specific smells

Grep and read for each category. They recur across almost every "AI-built" or
rapidly-iterated UI.

**A. Hardcoded values that pretend to be live** — the worst offense, because it's
a lie. A label baked into JSX that shows regardless of actual state:
- `<span>MAJOR CHALLENGER</span>` shown no matter the studio's real rank.
- `MARKET POSITION: STABLE` with no binding to data.
- Search: literal status/position/rank strings in JSX that aren't interpolations.

**B. Fabricated decorative chrome** — invented ops-room/sci-fi flavor that carries
zero information:
- `SECTOR ALPHA-1`, `LIVE SECURE`, `GLOBAL SURVEILLANCE`, `REAL-TIME FEEDS`,
  fake telemetry, blinking "secure"/"online" indicators, "INITIALIZING..." text.
- It feels like a Blade Runner skin on a spreadsheet. Delete it.

**C. SCREAMING_SNAKE_CASE display copy** — `COMMAND_CENTER`, `FISCAL_PERIOD`,
`TERMINATE_SESSION`, the `{value}_LABEL` idiom (`{count}_ACTIVE_UNITS`).
Underscores read as code/terminal output and reinforce the HUD-cosplay feel.
(Removing these safely across many files is a job for the `safe-codemod` skill —
use it; a blind find/replace will corrupt identifiers and numeric separators.)

**D. Mislabeled metrics** — the number is real but the label is wrong. Calling a
cash/capital share "market share", or "revenue" when it's bookings. Precision in
labels is part of honesty.

**E. Illegibility working against the data:**
- Numbers in `italic` or with letter-spacing — figures must be upright and
  column-comparable (`not-italic`, `tabular-nums`).
- `tracking` past ~`0.15em` on small labels — decorative, not readable.
- Giant blur glows / heavy drop-shadows competing with the numbers for attention.
- Absurd type sizes (`text-7xl` KPI values), everything forced `uppercase italic`
  by a global heading rule.

## Step 3 — Remediate

- **Derive, don't fake.** Replace a hardcoded label with a value computed from
  real state. If you can't derive it, don't show it. Prefer the metric the system
  itself already uses (e.g. if an antitrust system measures dominance by *cash
  share*, rank the player by cash share and label it honestly — don't invent a
  "market share" the engine never computes).
- **Legible numbers.** Upright, `tabular-nums`, `normal-case`, restrained size.
  Numbers are the hero of a numbers screen; let them carry it.
- **Honest empty states.** When there's no data, say so and point to the action
  that produces it ("No activity yet — advance the week to generate headlines"),
  never fill space with fake rows or ambient noise.
- **Restrained accents.** One thin accent bar or a single tasteful hover beats a
  rotating blur-blob array. Cap label tracking at `0.15em`.
- **Label precisely.** Say what the number actually is.

## Step 4 — Verify it's real, not just present

Run the app and look. A value rendering is not proof it's correct — trace it back
to a selector / state field and confirm it changes with the data. Screenshot the
before/after. Watch for the trap where a "fix" still shows a plausible-but-static
number.

## Step 5 — Lock it in

If the project has a UI/style guide, **add the rule you just enforced** so it
doesn't regress — e.g. a "Data Integrity — no fabricated chrome" section, a "no
underscores in display copy" rule, "numbers are upright/tabular", "cap tracking at
0.15em". A fix that isn't written down comes back. (Example precedent: this
project's `docs/UI_UX_Design_Bible.md` §16.5 "Data Integrity — No Fabricated
Chrome".)

## Worked examples (from real remediation)

**Example 1 — hardcoded lie → derived truth**
Before: `<span>MAJOR CHALLENGER</span>` (shown for every studio, always).
After: compute rank + share from real state and label honestly:
`MARKET POSITION — MAJOR PLAYER · Rank #3 of 11 · 23.1% capital`, where the
descriptor is derived from rank and the share is the studio's real cash share.

**Example 2 — HUD cosplay → clarity**
Before: a header reading `RECENT INTELLIGENCE · GLOBAL INDUSTRY SURVEILLANCE ·
REAL-TIME FEEDS` with a blinking `LIVE SECURE` badge.
After: `Industry News · Latest headlines` — same data, no theatre.

**Example 3 — illegible KPI → readable**
Before: `text-7xl font-black uppercase italic tracking-[0.6em]` value with a
`blur-[100px]` rotating glow blob.
After: `text-4xl font-bold not-italic tabular-nums` with a single 3px accent bar
that brightens on hover.

**Example 4 — snake_case → words**
Before: `COMMAND_CENTER`, `FISCAL_PERIOD`, `{count}_ACTIVE_UNITS`.
After: `COMMAND CENTER`, `FISCAL PERIOD`, `{count} ACTIVE UNITS`. (Done via
`safe-codemod` so functional `COMMAND_CENTER:` keys and `1_000_000` numeric
separators are left untouched.)

## Why this matters

Users trust an interface that's legible and truthful. The moment they catch one
fabricated value, every number on the screen becomes suspect — and a numbers app
whose numbers can't be trusted is worthless. Clarity and honesty aren't polish;
they're the product.
