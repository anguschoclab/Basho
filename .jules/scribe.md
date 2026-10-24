## 2024-10-24 - Fix JSDoc parameters in CandidateGenerator and world
**Gap:** JSDoc parameters incorrectly documented for `rollDevelopmentProfile` in `CandidateGenerator.ts` and `resolveAndApplyBout` in `world.ts`.
**Truth:** `rollDevelopmentProfile`'s JSDoc block applied incorrectly to it instead of `generateCandidate`. `resolveAndApplyBout` had a duplicate documentation block describing `simulateBoutForToday`'s parameters.
**Watch:** Be careful with where the JSDoc blocks are placed relative to functions, and don't duplicate JSDoc comments describing other functions.
