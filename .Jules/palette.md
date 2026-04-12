## 2024-05-18 - Tab Accessibility Focus Indicator
**Learning:** Custom tab navigation components (like SubNavTabs) often overlook standard keyboard accessibility markers, relying purely on visual active state indicators (underlines/color) instead of semantic markers (`aria-current`) and visible focus outlines.
**Action:** Always ensure that interactive elements manually implementing a custom active state explicitly include `aria-current="page"` (or "step") when active, and define `focus-visible:ring` utilities to maintain distinct keyboard navigation visibility.
