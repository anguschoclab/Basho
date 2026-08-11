## 2024-08-11 - Use Existing Components for Empty States
**Issue:** CandidatePoolPage uses ad-hoc inline div for an empty state instead of the standard `EmptyState` component used across other pages.
**Learning:** We have a shared `EmptyState` component for lists that are empty.
**Rule:** When a page or section has an empty state, always use `EmptyState` from `@/components/ui/EmptyState`.
