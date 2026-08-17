## 2025-08-09 - Accessible Interactive List Items
**Learning:** Found that custom `div` elements functioning as buttons (`role="button"`) in list cards lacked `aria-label`s, rendering them opaque to screen readers despite having visual text and `onClick` handlers.
**Action:** Always ensure custom interactive elements like clickable rows explicitly forward or define `aria-label` using their primary text content.
## 2025-08-17 - Accessible Custom Widgets
**Learning:** Screen readers were announcing interactive list rows and dashboard widget items simply as "button" because they were implemented as `div`s with `role="button"` and `onClick` handlers, but lacked an `aria-label` attribute tying them to their visually presented content.
**Action:** When implementing custom components like list items or clickable cards using `div` elements, always include an `aria-label` attribute describing their specific context (e.g. `event.title` or `entry.shikona`).
