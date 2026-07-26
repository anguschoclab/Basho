# Polish Learnings Log

## 2024-05-15 - Empty State Consistency

**Issue:** Many widgets hardcode their own empty states instead of using `EmptyState`.
**Learning:** The project has an `EmptyState` component designed for this, with a `compact` mode specifically for inline widget use.
**Rule:** In this project, always reuse the global `EmptyState` component (`@/components/ui/EmptyState`) for "no data" states within dashboard widgets to ensure consistency with padding, icons, and typography, rather than hardcoding custom empty states.

## 2024-05-15 - Widget Empty States

**Issue:** Hardcoded paragraphs ("No recent events", "No stable selected.", etc.) were used in several dashboard widgets (`EventFeed`, `PromotionPipelineWidget`, `KenshoManagementWidget`, `InstitutionWidget`) instead of the standard `EmptyState` component.
**Learning:** These widgets handle missing arrays/null state, but didn't visually indicate a unified layout matching other panels.
**Rule:** Always use the `<EmptyState icon={...} title={...} compact />` component for null or length-zero list fallback renders within dashboard widgets to ensure consistency with padding and typography across the dashboard.

## 2024-07-11 - Empty State Consistency in Game Panels

**Issue:** Game panels (`SponsorContractsPanel`, `InjuryRecoveryPanel`) hardcoded custom empty states in cards instead of using `EmptyState`.
**Learning:** The previous rule for dashboard widgets applies equally to generic game panels to maintain consistent typography, margins, and icons.
**Rule:** Extend the use of the `<EmptyState compact />` component to all empty list fallbacks across all `src/components/game` panels.

## 2025-07-12 - Polish Dashboard Widgets Empty States

**Issue:** RosterWidget, BanzukeWidget had blank or unhandled states when no items were available. ActionQueueWidget would render null causing layout shifts.
**Learning:** The widgets were incorrectly handling empty arrays of items, returning null or missing EmptyState.
**Rule:** Always handle empty arrays in UI rendering to display an EmptyState with correct spacing.

## 2024-05-20 - Disabled Button Tooltips

**Issue:** Disabled buttons without tooltips leave users guessing why an action is unavailable (e.g. Infrastructure upgrade button).
**Learning:** The custom `<Button>` component accepts a `tooltip` prop, which simplifies adding context to disabled states.
**Rule:** When a `<Button>` is disabled due to contextual logic (e.g., insufficient funds, unselected items, or ongoing construction), always provide a `tooltip` describing why the action is unavailable.

## 2025-07-12 - Action Queue Widget Consistency

**Issue:** `ActionQueueWidget` handled its empty and non-empty state inconsistently by wrapping content directly in a custom `Card` rather than the standard `BaseWidget`.
**Learning:** This caused structural inconsistency with other widgets in the dashboard that use `BaseWidget`.
**Rule:** Always use `BaseWidget` as the top-level wrapper for all dashboard widgets to maintain consistent layout, headers, and padding for both populated and empty states.

## 2025-07-25 - Yusho Race Widget consistency

**Issue:** `YushoRaceWidget` handled its empty and non-empty state inconsistently by returning `null` when no contenders existed, creating a hole in the layout. It also wrapped content in a `Card` instead of `BaseWidget`.
**Learning:** Returning `null` on widgets inside a dashboard causes inconsistent visual shifts, and bypassing the `BaseWidget` wrapper loses dashboard uniformity.
**Rule:** Dashboard widgets must always use `BaseWidget` as the top-level element, and handle empty data scenarios with the `EmptyState` component for predictable layout.

## 2025-07-12 - Empty State Consistency in ListCard

**Issue:** `ListCard` hardcoded an empty state paragraph instead of using the standard `EmptyState` component.
**Learning:** Shared UI layout components like `ListCard` must enforce the same `EmptyState` consistency rules as standalone dashboard widgets.
**Rule:** Ensure all reusable list container components, not just top-level widgets, rely on `@/components/ui/EmptyState` for empty data fallbacks.
## 2025-02-05 - Use Standard EmptyState Component
**Issue:** Hardcoded empty state implementations were found in various components like `RivalriesEmptyState`, creating visual inconsistencies across the app.
**Learning:** Some views manually re-implemented empty state layouts instead of using the standard `EmptyState` component.
**Rule:** Always use the global `EmptyState` component from `@/components/ui/EmptyState` instead of hardcoded bespoke elements to maintain consistent padding, typography, and visual hierarchy. Use `<EmptyState compact />` for inline dashboard widgets or reusable list containers if needed.
