## 2024-05-24 - Tightened HeyaPreview Stats Type
**Finding:** `roster` was casted to `as unknown as RikishiPreview[]` in `HeyaPreviewSections.tsx`.
**Learning:** `HEYA_STATS` value/sub functions only use `roster.length` and don't need the specific elements, making `unknown[]` a safer and more honest type constraint than casting incompatible object shapes.
**Constraint:** Use `unknown[]` for arrays when only the length property is required.
