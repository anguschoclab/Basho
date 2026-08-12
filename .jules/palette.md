## 2025-08-09 - Accessible Interactive List Items
**Learning:** Found that custom `div` elements functioning as buttons (`role="button"`) in list cards lacked `aria-label`s, rendering them opaque to screen readers despite having visual text and `onClick` handlers.
**Action:** Always ensure custom interactive elements like clickable rows explicitly forward or define `aria-label` using their primary text content.
## 2025-08-12 - Add aria-label to buttons in ActionQueueWidget
**Learning:** Icon-heavy action queues with interactive components often lack descriptive ARIA labels, rendering them inaccessible for screen readers.
**Action:** Always add descriptive `aria-label` to buttons handling navigation or expansions to make the UI intuitive for all users.
