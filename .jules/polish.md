## 2024-05-24 - Add empty state for Sponsor Draw Card
**Issue:** SponsorDrawCard returned null when there were no top earners.
**Learning:** Returning null for empty data violates the "handle all three data states" rule and causes layout issues.
**Rule:** Always use the EmptyState component for empty data states instead of returning null.
