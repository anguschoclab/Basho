## 2025-08-09 - Accessible Interactive List Items
**Learning:** Found that custom `div` elements functioning as buttons (`role="button"`) in list cards lacked `aria-label`s, rendering them opaque to screen readers despite having visual text and `onClick` handlers.
**Action:** Always ensure custom interactive elements like clickable rows explicitly forward or define `aria-label` using their primary text content.

## 2025-08-09 - Keyboard Accessibility for Custom Interactive Cards
**Learning:** Custom interactive components like clickable cards (e.g. `HeyaCard`) often rely solely on `onClick`, rendering them inaccessible to keyboard users navigating list views.
**Action:** Always add `role="button"`, `tabIndex={0}`, `onKeyDown` (for Enter/Space), and `focus-visible` styles to complex custom elements that act as primary interaction targets.
