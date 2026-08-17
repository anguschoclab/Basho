## 2024-08-17 - Replaced custom empty states with EmptyState component
**Issue:** `BashoPage.tsx` and `BanzukePage.tsx` had hardcoded div/table cell structures for empty states (e.g., "No Active Tournament").
**Learning:** This repo has a standard `<EmptyState>` component for handling empty data states consistently across the UI.
**Rule:** When replacing custom empty state layouts, always use the standard `EmptyState` component imported from `@/components/ui/EmptyState` instead of hardcoding `div` structures for missing data or state indicators.
