
## 2026-08-13 - Standardize Empty States
**Issue:** Found hardcoded layout (`div`, animate-pulse) for the empty roster state in `StablePage.tsx`.
**Learning:** Hardcoded empty states drift from standard design tokens and require manual accessibility/styling upkeep.
**Rule:** When replacing custom empty state layouts, always use the standard `EmptyState` component imported from `@/components/ui/EmptyState` instead of hardcoding `div` structures.
