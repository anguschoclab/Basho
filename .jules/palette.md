## 2024-03-28 - Missing ARIA Labels on Icon-Only Buttons
**Learning:** Found multiple instances of icon-only buttons (Play/Pause, Panel Open) and filter toggles lacking `aria-label` or `aria-pressed` states. This reduces accessibility for screen readers navigating the dashboard and replay viewers.
**Action:** Always add `aria-label` to buttons where the primary visual is an icon, and use `aria-pressed` or `aria-expanded` for stateful buttons/toggles.

## 2024-03-30 - Inaccessible Internal Links Without Focus Indicators
**Learning:** Found that internal navigation links leveraging `@tanstack/react-router` `Link` components were missing keyboard focus indicators. This severely impacts keyboard users who cannot easily see which element is currently focused when tabbing through tables and dashboards.
**Action:** Always ensure that `Link` or custom clickable components explicitly define `focus-visible` styles (e.g., `focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none`) so keyboard focus paths remain visually distinct.
