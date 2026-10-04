## 2026-10-03 - Add progressbar role to custom progress elements
**Learning:** Custom div-based progress indicators must use role="progressbar" and include aria-valuenow, aria-valuemin, and aria-valuemax attributes to be accessible to screen readers.
**Action:** Always add proper ARIA roles and value attributes when building non-native progress indicators like those in Control Center StatCard or ProgressRow components.
