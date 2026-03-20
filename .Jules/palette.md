## 2025-02-14 - Event Log Toggle Accessibility
**Learning:** Adding ARIA states to interactive elements built with `div`/`button` wrappers in complex layouts (like the `EventLogPanel`'s nested groups) ensures that screen readers accurately announce the toggle states.
**Action:** Next time, actively check for custom filter buttons or expand/collapse elements that use conditional classes instead of native interactive states or proper ARIA flags, and add `aria-pressed` or `aria-expanded` attributes respectively.
