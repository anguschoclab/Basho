## 2025-08-09 - Accessible Interactive List Items
**Learning:** Found that custom `div` elements functioning as buttons (`role="button"`) in list cards lacked `aria-label`s, rendering them opaque to screen readers despite having visual text and `onClick` handlers.
**Action:** Always ensure custom interactive elements like clickable rows explicitly forward or define `aria-label` using their primary text content.
## 2025-08-09 - Accessible Interactive Faction Cards
**Learning:** Found that custom `div` elements functioning as selectable cards in wizards (like FactionStep) lacked `role="button"`, `tabIndex={0}`, `onKeyDown` handlers, and `aria-label`s, rendering them inaccessible to screen readers and keyboard navigation despite having visual state and `onClick` handlers.
**Action:** Always ensure custom interactive elements like selectable wizard cards explicitly provide keyboard support (Enter/Space to select), focus styles (`focus-visible`), and semantic `aria-label` using their primary text content.
