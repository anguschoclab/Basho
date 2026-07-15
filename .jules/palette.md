## 2025-03-05 - Missing Dashboard Navigation

**Learning:** Call-to-action buttons in dashboard widgets (like "View Roster for Withdrawals") sometimes visually exist as buttons but lack the actual click handlers to navigate to the relevant views, leading to a frustrating dead-end UX.
**Action:** Always verify that call-to-action buttons not only look interactive but actually connect to the intended route using the application's router.

## 2024-05-18 - Tooltips for disabled conditional buttons

**Learning:** When buttons are conditionally disabled due to resources (like political capital or funds), adding tooltips that explicitly state the required amount greatly improves UX. The custom Button component handles conditional tooltip attributes gracefully using the spread operator on a ternary expression.
**Action:** Always check context-disabled buttons and ensure they use the `tooltip` prop to explain exactly why the action is unavailable.
## 2025-07-15 - Interactive Custom Controls Need ARIA Labels
**Learning:** When building custom interactive components wrapped in `TooltipWrap` (e.g., dossier-paper styled `<button>`s for selecting Training Regimes), standard visually descriptive content isn't sufficient for screen readers. While native `<button>` elements with text content can sometimes be inferred, highly styled multi-element buttons (like those with badges, icons, and muted text) require explicit, concise `aria-label`s to describe their primary action (e.g., "Set intensity to high") instead of relying on the visually complex DOM structure.
**Action:** Always add explicit, action-oriented `aria-label`s to custom interactive `button` elements used for selection or state changes, even if they contain some text elements, to provide clear context for screen-reader users.
