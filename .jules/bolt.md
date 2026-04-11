## 2026-04-11 - Optimize Nested UI Traversal Iteration Over Arrays
**Learning:** Instantiating a `Set` from an array purely for iteration purposes in a nested loop is a performance anti-pattern in V8. The allocation and insertion cost outpaces array traversal for standard dataset sizes, slowing down UI presenters.
**Action:** Removed Set instantiation when projecting cross-stable matchups (`projectH2HBetweenHeyas`). Reverted to standard array iteration with a safe empty array fallback `|| []` for potential null inputs to optimize traversal latency without altering underlying logic.
