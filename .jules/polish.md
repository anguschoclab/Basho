## 2026-09-26 - PreBashoAssessment ScrollArea Polish
**Issue:** PreBashoAssessment component was using a raw `div` with `overflow-y-auto` for a scrollable area instead of the Design System's `ScrollArea` component.
**Learning:** Custom scrollbars ensure consistency across the application. Not using `ScrollArea` bypasses this custom styling.
**Rule:** Avoid using raw `div`s with `overflow-y-auto` for scrollable areas. Always use the custom `<ScrollArea>` component from `@/components/ui/scroll-area` with a right padding utility class (e.g., `pr-3`) on the inner content wrapper so content doesn't overlap the scrollbar thumb.
