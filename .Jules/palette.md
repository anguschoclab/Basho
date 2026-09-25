## 2026-09-25 - Consistent Custom Scrollbars using ScrollArea
**Learning:** Raw divs with overflow-y-auto cause inconsistent native scrollbar styles across OSs and often overlap content if padding isn't managed. The codebase standardizes on the Radix-based ScrollArea component.
**Action:** Always wrap vertically scrolling lists in a `<ScrollArea>` and apply right padding (e.g. `pr-3`) to the inner content wrapper so scrollbar thumbs don't obscure text.
