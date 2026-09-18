## 2025-05-24 - pipelineRunner pure phases
**Gap:** The logic that bypasses state snapshotting for pure pipeline phases was untested.
**Learning:** Pure phases have zero rollback protection and are completely vulnerable to state corruption if they illegally mutate state in-place before throwing an error.
**Pattern:** Verify that intentionally breaking the pure flag causes the fallback to snapshot, making the test fail when asserting that the illegal mutation persists.
