## 2025-01-26 - [Consistent Scrollbars] **Issue:** [Raw `div` with `overflow-y-auto` used for scrolling] **Learning:** [Causes inconsistent scrollbars across browsers and OSs] **Rule:** [Always use `<ScrollArea>` from `@/components/ui/scroll-area` for vertically scrolling lists/panes with a right padding utility class (like `pr-3` or `pr-4`) on the inner content wrapper]
## 2024-05-18 - Enforce Custom ScrollArea
**Issue:** Inconsistent raw scrollbars due to raw `overflow-y-auto` div usage in `IdentityStep.tsx`.
**Learning:** The project implements a Radix-based custom scroll component.
**Rule:** Always use the `<ScrollArea>` component from `@/components/ui/scroll-area` for vertically scrolling lists/panes with `pr-3` or `pr-4` on the inner wrapper to ensure consistent custom scrollbars.
