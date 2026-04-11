🧪 **Add tests for checkStopCondition in AutoSimService**

🎯 **What:**
The `checkStopCondition` logic in `AutoSimService.ts` was not covered by any tests, which left important auto-simulation logic (such as stopping upon Yusho, rank promotions, star retirements, and scandals) untested.

📊 **Coverage:**
A new comprehensive test file `src/engine/simulation/__tests__/AutoSimService.test.ts` was added to cover all major conditions and branches within the `checkStopCondition` logic. The tests successfully execute against mocked components like `WorldState`, `BashoSimResult`, and `AutoSimConfig`. Cases covered include:
- `yusho`
- `yokozunaPromotion`
- `ozekiPromotion`
- `stableInsolvency`
- `scandal`
- `retirementOfStar`
- `unknown conditions`

✨ **Result:**
Test coverage and stability for core engine logic around stopping automated tournament simulations has greatly improved, reducing risk for future refactors or enhancements related to conditions.
