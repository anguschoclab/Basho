## 2024-05-15 - Empty State Consistency **Issue:** Many widgets hardcode their own empty states instead of using `EmptyState`. **Learning:** The project has an `EmptyState` component designed for this, with a `compact` mode specifically for inline widget use. **Rule:** In this project, always reuse the global `EmptyState` component (`@/components/ui/EmptyState`) for "no data" states within dashboard widgets to ensure consistency with padding, icons, and typography, rather than hardcoding custom empty states.
## 2024-05-15 - Widget Empty States
**Issue:** Hardcoded paragraphs ("No recent events", "No stable selected.", etc.) were used in several dashboard widgets (`EventFeed`, `PromotionPipelineWidget`, `KenshoManagementWidget`, `InstitutionWidget`) instead of the standard `EmptyState` component.
**Learning:** These widgets handle missing arrays/null state, but didn't visually indicate a unified layout matching other panels.
**Rule:** Always use the `<EmptyState icon={...} title={...} compact />` component for null or length-zero list fallback renders within dashboard widgets to ensure consistency with padding and typography across the dashboard.
## 2024-07-11 - Empty State Consistency in Game Panels
**Issue:** Game panels (`SponsorContractsPanel`, `InjuryRecoveryPanel`) hardcoded custom empty states in cards instead of using `EmptyState`.
**Learning:** The previous rule for dashboard widgets applies equally to generic game panels to maintain consistent typography, margins, and icons.
**Rule:** Extend the use of the `<EmptyState compact />` component to all empty list fallbacks across all `src/components/game` panels.
