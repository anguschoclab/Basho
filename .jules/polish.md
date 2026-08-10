## 2024-05-18 - Replacing empty text with EmptyState components
**Issue:** The MyosekiMarketPage had three distinct raw text fallbacks for its empty states ("No shares...", "Your stable...", "No recent transactions").
**Learning:** We need to keep a high bar for polish by reusing existing standardized components rather than simple `<p>` tags for empty states.
**Rule:** When building or fixing pages that display lists or data that can be empty, always use the `<EmptyState>` component from `@/components/ui/EmptyState`.
