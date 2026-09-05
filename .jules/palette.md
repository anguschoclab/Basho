## 2025-08-09 - Accessible Interactive List Items
**Learning:** Found that custom `div` elements functioning as buttons (`role="button"`) in list cards lacked `aria-label`s, rendering them opaque to screen readers despite having visual text and `onClick` handlers.
**Action:** Always ensure custom interactive elements like clickable rows explicitly forward or define `aria-label` using their primary text content.
## 2025-09-05 - Add ARIA Labels to Dynamic Selectors
**Learning:** Found that custom map-driven `button` elements acting as motif and preset selectors in Kesho-Mawashi Editor lacked `aria-label`s, rendering them opaque to screen readers despite having visual cues and `onClick` handlers.
**Action:** Always ensure custom interactive dynamic element selectors explicitly forward or define `aria-label` using their text content.
