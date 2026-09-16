## 2024-05-18 - [Missing pure phase rollback constraint in pipelineRunner]
**Gap:** The rollback documentation on `createShallowSnapshot` missed the edge case of `pure: true` phases.
**Truth:** Pure phases bypass `createShallowSnapshot` entirely by passing an empty array, meaning if a pure phase throws an error after doing an illegal in-place mutation, it has zero rollback protection.
**Watch:** Anywhere developers rely on pipeline phase error-recovery to catch their sloppy mutations, make sure they don't incorrectly mark the phase as `pure`.
