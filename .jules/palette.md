## 2025-08-09 - Accessible Interactive List Items
**Learning:** Found that custom `div` elements functioning as buttons (`role="button"`) in list cards lacked `aria-label`s, rendering them opaque to screen readers despite having visual text and `onClick` handlers.
**Action:** Always ensure custom interactive elements like clickable rows explicitly forward or define `aria-label` using their primary text content.

## 2025-08-15 - ARIA Labels on Clickable Cards and Rows
**Learning:** Found multiple instances where `role="button"` was added to interactive custom elements (`div`, `Card`, `th`, `Badge`) across dashboard widgets and data tables, but they lacked descriptive `aria-label` attributes. Screen readers would either announce generic text content or nothing, rendering the specific actions opaque.
**Action:** Always ensure that any element given a semantic role of `button` also receives a descriptive `aria-label` that clarifies the action resulting from activation (e.g., "Sort by Name", "View [Rikishi Name]").
