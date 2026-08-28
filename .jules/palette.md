## 2025-08-09 - Accessible Interactive List Items
**Learning:** Found that custom `div` elements functioning as buttons (`role="button"`) in list cards lacked `aria-label`s, rendering them opaque to screen readers despite having visual text and `onClick` handlers.
**Action:** Always ensure custom interactive elements like clickable rows explicitly forward or define `aria-label` using their primary text content.
## 2025-08-09 - Accessible Interactive List Items (Cards)
**Learning:** Found that custom `Card` elements functioning as selection buttons (`onClick`, `onDoubleClick`) lacked keyboard navigation and `aria-label`s, rendering them opaque to screen readers.
**Action:** When a Card component acts as a primary selection button, always add `role="button"`, `tabIndex={0}`, `onKeyDown` support (Enter/Space), and `focus-visible` ring styling to ensure keyboard accessibility.
