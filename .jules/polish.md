## 2025-05-18 - Standardize Schedule Empty States
**Issue:** Hardcoded empty states on Schedule page
**Learning:** The empty states (Rest Day and No Bouts) were using custom div structures instead of the global EmptyState component.
**Rule:** Always use the design system EmptyState component for empty/missing lists to ensure consistent UX.
