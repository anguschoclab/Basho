## 2026-09-22 - Use ScrollArea for EventFeed
**Issue:** The EventFeed component was using a raw `div` with `overflow-y-auto`, leading to an inconsistent native scrollbar instead of the custom ScrollArea used across the app.
**Learning:** The component missed adopting the design system's `<ScrollArea>` standard.
**Rule:** Always use `<ScrollArea>` from `src/components/ui/scroll-area` for vertically scrolling lists or panes to ensure design consistency and custom scrollbars. Include a right padding wrapper (`pr-3` or `pr-4`) inside it so content doesn't overlap the scrollbar thumb.
