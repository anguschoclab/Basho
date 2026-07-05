## 2024-07-05 - Consistent Empty States in Widgets
**Issue:** The "Tournament" widget manually implemented a custom empty state rather than reusing the design system component.
**Learning:** Hardcoded empty states drift from design system updates and introduce visual inconsistency across dashboard components.
**Rule:** Always reuse the global `EmptyState` component (`@/components/ui/EmptyState`) for "no data" states within widgets to ensure consistency with padding, icons, and typography.
