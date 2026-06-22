---
name: safe-codemod
description: >-
  Perform sweeping mechanical edits across many files safely — bulk rename,
  find/replace a pattern, strip a token, normalize copy, or any large codemod
  where a naive global replace would corrupt code. Use this whenever a change
  touches dozens of files or hundreds of occurrences ("remove all the underscores
  from labels", "rename X to Y everywhere", "replace this pattern across the
  codebase", "strip the prefix from every component", "convert all these strings").
  The defining discipline: never blind-replace. Build an explicit keep-set that
  protects functional tokens (identifiers, object keys, enum/comparison values,
  imports, numeric separators), only transform occurrences that are never used as
  code, verify with typecheck/lint/run-the-app, and if anything corrupts, revert
  cleanly to a known-good state and redo with a fixed script rather than
  forward-patching the damage. Reach for this even when the edit "looks trivial" —
  trivial-looking global replaces are exactly where silent corruption hides.
---

# Safe Large-Scale Code Transforms

## The core principle

A blind global find/replace across a real codebase **will** corrupt something —
an identifier that shares a name with display text, an enum value used in a
comparison, an object key, or a JavaScript numeric separator. The job is to change
exactly the occurrences you mean and **protect everything that's load-bearing**.
When in doubt about a token, keep it; a missed display fix is cosmetic, a corrupted
identifier is a broken build.

## Step 1 — Classify before you transform

Separate the target (what should change) from the protected set (what must not).
For a transform on `SCREAMING_SNAKE` display strings, for example:

- **Change:** display copy — JSX text, `label`/`title`/`tooltip`/`placeholder`
  values, `confirm()` strings.
- **Protect:** `const FOO_BAR =` declarations, object keys (`FOO_BAR:`), enum /
  status / modal-type string values used in `===` / `case`, property access
  (`.FOO_BAR`), imports, and **numeric separators (`1_000_000`)**.

The discriminator is usually *context*, not the token itself — the same string can
be a display label in one place and a key in another. That means you sometimes
need occurrence-level handling, not token-level.

## Step 2 — Script it with a keep-set

Write a script (Python/node) rather than hand-editing dozens of files. The robust
pattern:

1. **First pass — build the keep-set.** Scan *all* files and collect every token
   that appears in a functional context (declaration, key, comparison, `case`,
   property access, call, index, import). These are off-limits.
2. **Second pass — transform.** Replace the target pattern **only** when the token
   is *not* in the keep-set. Add belt-and-suspenders local guards (skip if preceded
   by `.`, followed by `(` `[` `:`).
3. **Require a discriminating feature** in the match regex to exclude footguns —
   e.g. require at least one letter so `1_000_000` numeric separators never match a
   `SCREAMING_SNAKE` pattern.

Print what changed and what was kept, so you can eyeball the decision.

## Step 3 — Know the footguns

These bite every time:

- **Numeric separators** (`1_000_000_000`) look like snake_case to a regex. A
  letterless token must never be transformed. (Real incident: a `[A-Z0-9]+(_[A-Z0-9]+)+`
  pattern turned `1_000_000_000` into `1 000 000 000` — invalid JS — across ~15
  files.)
- **Enum / status / modal-type string literals** (`'ON_AIR'`, `'BIDDING_WAR'`)
  compared with `===` or in `case`. Changing the display but not the comparison (or
  vice-versa) silently breaks logic.
- **Object keys** (`STUDIO_EVENT: {...}`) that map to functional values.
- **Shared names** — a token that's a display label in one file and a config key in
  another. Token-level replace can't fix one without breaking the other; handle the
  display occurrences specifically (verify they're display-only first).
- **Conservative keep-sets over-protect.** Colons in JSX text (`OPENING_CASH:`) or
  `&` splits can make a display string look functional and get wrongly kept. Do a
  small, allow-listed second pass for those — verifying each token has *zero*
  functional uses before touching it.

## Step 4 — Verify, every time

After the transform, prove you didn't break anything:

- **Typecheck:** `tsc --noEmit` (or the project's typecheck). Specifically check
  for **new** corruption: `grep "Cannot find name '<TOKEN_SHAPE>'"`. Compare the
  error *count* to a pre-transform baseline — it must not increase.
- **Lint** the changed files.
- **Run the app / run the tests / screenshot.** A green typecheck doesn't prove the
  rendered output is right.
- **Scan for the corruption signature** directly (e.g. `grep` for `\d \d{3}` to find
  mangled numeric separators).

## Step 5 — If it corrupted, revert and redo — don't forward-patch

When a transform damages files, the trustworthy recovery is **not** to chase the
corruption with more regexes. It's:

1. `git checkout -- <paths>` (or `git stash`) back to a known-good state. Keep any
   unrelated doc/work that lives outside the blast radius.
2. **Fix the script** (e.g. add the letter-requirement to exclude numerics).
3. **Re-apply** any small manual edits you'd made (you know exactly what they were).
4. **Re-run** the corrected script.
5. Verify again (Step 4).

Forward-patching a botched transform leaves subtle residue; a clean redo from a
fixed script is faster to trust and easier to review.

## Step 6 — Clean up

Delete one-shot transform scripts and any screenshot/scratch artifacts when done —
don't leave codemod scripts littering the repo (and add ignore rules if the tooling
tends to regenerate scratch files).

## Worked example (real incident)

Task: remove underscores from ~515 `SCREAMING_SNAKE` display labels across 64 files,
without touching code.

1. Built a keep-set from all functional uses (declarations, keys, `===`/`case`,
   `.access`, imports) — protected `NAV_ITEMS`, `ON_AIR`, `STUDIO_EVENT:`, etc.
2. First run regex `[A-Z0-9]+(_[A-Z0-9]+)+` **also matched `1_000_000_000`** → broke
   ~15 files. Caught it via `grep "\d \d{3}"` and a failing typecheck.
3. **Reverted** `src/` cleanly, **fixed** the regex to require a letter
   (`(?=[A-Z0-9_]*[A-Z])...`), **re-applied** the 5 manual edits, **re-ran**.
4. Verified: `Cannot find name` count unchanged (no identifier corruption), app
   rendered, the matching test assertion updated in sync. Then a small allow-listed
   second pass fixed ~20 display labels the conservative keep-set had over-protected
   (each verified display-only first). Deleted the scripts.

## Why this matters

Sweeping edits are where "it looked trivial" turns into a silently broken build that
ships. The keep-set + verify + clean-redo discipline is what lets you move fast
across hundreds of occurrences *and* trust the result — instead of trading an hour
saved for a day of debugging mystery corruption.
