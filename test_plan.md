1. Modify `src/engine/bard/domains/post_bout.json` using `replace_with_git_merge_diff` to add `henka` replay templates under `replay`. The changes will look like:
```
<<<<<<< SEARCH
    "reversal": [
      "What a reversal move by %WINNER%! Look at that hip shift.",
=======
    "henka": [
      "Watch the replay — %WINNER% sidesteps completely at the tachiai.",
      "A textbook henka from %WINNER% at the initial charge, caught on replay.",
      "The slow motion shows %WINNER% shifting laterally the moment the hands touched down.",
      "Let's look at the tachiai again — %WINNER% dodges, and %LOSER% goes flying by.",
      "%WINNER% avoids the charge entirely. A clean henka on the replay."
    ],
    "reversal": [
      "What a reversal move by %WINNER%! Look at that hip shift.",
>>>>>>> REPLACE
```

2. Modify `src/engine/bout/narrative/postbout2.ts` using `replace_with_git_merge_diff` to set `replayPath = "post_bout.replay.henka"` instead of `post_bout.replay.reversal`.
```
<<<<<<< SEARCH
    if (hasHenka) {
      replayPath = "post_bout.replay.reversal";
    } else if (hasEdgeCrisis) {
=======
    if (hasHenka) {
      replayPath = "post_bout.replay.henka";
    } else if (hasEdgeCrisis) {
>>>>>>> REPLACE
```

3. Update `.jules/bard.md` journal directly using bash: `mkdir -p .jules && cat << 'EOF' >> .jules/bard.md` with the required format:
`## YYYY-MM-DD - [Title] **Discovery:** [What] **Rule:** [Constraint] **Check:** [How to verify]`

4. Verify `.jules/bard.md` contents by running `cat .jules/bard.md`.

5. Run typecheck and tests: `bun run type-check && bun run lint && bun x vitest run tests/unit/engine/bout/boutNarrative.replay.test.ts -u` (and general test run `bun run test`).

6. Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

7. Submit PR with the correct structure via `submit` tool.
