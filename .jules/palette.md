## 2025-03-05 - Missing Dashboard Navigation

**Learning:** Call-to-action buttons in dashboard widgets (like "View Roster for Withdrawals") sometimes visually exist as buttons but lack the actual click handlers to navigate to the relevant views, leading to a frustrating dead-end UX.
**Action:** Always verify that call-to-action buttons not only look interactive but actually connect to the intended route using the application's router.

## 2024-05-18 - Tooltips for disabled conditional buttons

**Learning:** When buttons are conditionally disabled due to resources (like political capital or funds), adding tooltips that explicitly state the required amount greatly improves UX. The custom Button component handles conditional tooltip attributes gracefully using the spread operator on a ternary expression.
**Action:** Always check context-disabled buttons and ensure they use the `tooltip` prop to explain exactly why the action is unavailable.
## 2026-07-17 - Keyboard Accessible Event Log
**Learning:** In this app, clickable div elements (like event log items) often lack keyboard support (tabIndex, role, onKeyDown) preventing users from navigating lists via keyboard.
**Action:** Add `role="button"`, `tabIndex={0}`, `onKeyDown` space/enter handlers, and `focus-visible` classes to custom interactive list elements.
