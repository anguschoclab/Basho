## 2025-02-28 - Optimize Array Chaining in Presenters
**Learning:** Chained array methods (like `.map().filter().map()`) create intermediate array allocations that degrade performance, especially on hot paths like UI state projections.
**Action:** Consolidate these operations into a single pass using `.reduce()` or a standard `for` loop to avoid intermediate allocations and achieve significant speedups (e.g., 85% improvement).
## 2025-03-24 - React Context Memoization
**Learning:** Providing inline objects to Context values (like `value={{ theme, setTheme }}`) forces re-renders for all context consumers on every provider render.
**Action:** Wrap context objects in `useMemo` with stable dependencies to prevent unnecessary render cascades.
## 2024-04-07 - Ineffective useMemo with Rest Props
**Learning:** When optimizing React components using `useMemo` for Context Provider values, spreading `props` (e.g., `...props`) into the memoized object where `props` is derived from an object rest spread (like `...props` in arguments) creates a new object on every render, invalidating the memoization.
**Action:** Do not memoize rest spread objects. Extract explicit state/primitive properties, or accept that forwarding rest parameters inside a single value object prevents stable memoization.
## 2025-05-18 - useMemo with ...props

**Learning:** When creating Context Provider values, spreading \`...props\` into a memoized object (e.g. \`useMemo(() => ({ ...props }))\`) where \`props\` is gathered from a component rest parameter creates a new reference on every render, invalidating the memoization. This causes unnecessary re-renders for all context consumers.
**Action:** Do not spread rest parameters into memoized context objects. Explicitly define the properties to be provided in the context.
