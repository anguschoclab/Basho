1. *Optimize `BanzukePublisher.ts` to remove `Array.from().filter().length` bottleneck.*
   - In `src/engine/banzuke/BanzukePublisher.ts`, replace the `Array.from(world.rikishi.values()).filter(...)` code inside the promotion logic with a `for...of` loop and early exit. This changes the operation from O(N) memory and full N iterations to O(1) memory and best-case O(1) iterations.
2. *Run tests.*
   - Execute `bun run test` to verify the tests still pass and the banzuke promotion logic is untouched.
3. *Complete pre commit steps*
   - Complete pre commit steps to ensure proper testing, verification, review, and reflection are done.
4. *Submit the change.*
   - Commit and submit the code changes with a descriptive message.
