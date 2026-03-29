## 2024-03-28 - Missing ARIA Labels on Icon-Only Buttons
**Learning:** Found multiple instances of icon-only buttons (Play/Pause, Panel Open) and filter toggles lacking `aria-label` or `aria-pressed` states. This reduces accessibility for screen readers navigating the dashboard and replay viewers.
**Action:** Always add `aria-label` to buttons where the primary visual is an icon, and use `aria-pressed` or `aria-expanded` for stateful buttons/toggles.
