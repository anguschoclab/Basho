## 2025-08-09 - Accessible Interactive List Items
**Learning:** Found that custom `div` elements functioning as buttons (`role="button"`) in list cards lacked `aria-label`s, rendering them opaque to screen readers despite having visual text and `onClick` handlers.
**Action:** Always ensure custom interactive elements like clickable rows explicitly forward or define `aria-label` using their primary text content.
## 2025-05-24 - Interactive Card Accessibility
**Learning:** Adding `onClick` to non-semantic components like `<Card>` requires explicit addition of `role="button"`, `tabIndex={0}`, keyboard event handlers (`onKeyDown`), and `focus-visible` styles to ensure full accessibility for screen readers and keyboard navigation.
**Action:** Always implement the full suite of interactive ARIA attributes and keyboard handlers when making semantic components clickable in list views.
