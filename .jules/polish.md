## $(date +%Y-%m-%d) - Standardize EmptyState
**Issue:** RosterList was using a hardcoded div for its empty state instead of the standard component.
**Learning:** Found an existing EmptyState component (@/components/ui/EmptyState) that standardizes the presentation of icons, titles, and descriptions for empty states.
**Rule:** Always use the EmptyState component for empty list/data states instead of manually styling empty fallbacks.
