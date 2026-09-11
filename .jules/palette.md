## 2025-08-09 - Accessible Interactive List Items
**Learning:** Found that custom `div` elements functioning as buttons (`role="button"`) in list cards lacked `aria-label`s, rendering them opaque to screen readers despite having visual text and `onClick` handlers.
**Action:** Always ensure custom interactive elements like clickable rows explicitly forward or define `aria-label` using their primary text content.
## 2024-09-12 - Accessible Safety Gates in Holiday Dialog
**Learning:** The `Badge` component was used as a clickable toggle element for "Safety Gates" but lacked accessibility features, making it completely unusable via keyboard and unannounced by screen readers. This is a common pattern when generic elements are adapted for interactive purposes.
**Action:** When attaching `onClick` to non-semantic HTML elements or standard UI components like `Badge` to turn them into buttons, always add `role="button"`, `tabIndex={0}`, an `onKeyDown` handler (listening for 'Enter' and ' ', with `e.preventDefault()`), an appropriate `aria-label`, and `focus-visible` utility classes (e.g., `focus-visible:ring-2`) to ensure full accessibility and usability.
