## 2025-08-09 - Accessible Interactive List Items
**Learning:** Found that custom `div` elements functioning as buttons (`role="button"`) in list cards lacked `aria-label`s, rendering them opaque to screen readers despite having visual text and `onClick` handlers.
**Action:** Always ensure custom interactive elements like clickable rows explicitly forward or define `aria-label` using their primary text content.

## 2024-03-24 - Interactive Table Rows Need Keyboard Support
**Learning:** Table rows (`<tr>`) that have `onClick` handlers are invisible to keyboard users and screen readers unless explicitly marked up. The `cursor-pointer` class only helps mouse users.
**Action:** When making table rows clickable, always add `role="button"`, `tabIndex={0}`, an `onKeyDown` handler for Enter/Space, and a `focus-visible` ring to the row.
