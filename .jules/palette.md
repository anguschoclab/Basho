## 2024-05-24 - Accessibility improvements on PromotionPipelineWidget
**Learning:** Found \`aria-hidden="true"\` on the \`KadobanRow\` item wrapper, which completely hides the vital Kadoban alert information from screen readers. This represents a critical accessibility failure as visually impaired users would miss demotion warnings entirely.
**Action:** Remove \`aria-hidden="true"\` from \`KadobanRow\` wrapper and check other dashboard widgets for similar misuse of aria-hidden on data rows.
## 2024-05-24 - Accessibility improvements on PromotionPipelineWidget and others
**Learning:** Found \`aria-hidden="true"\` on the \`KadobanRow\` item wrapper and several other informational wrappers across the codebase, which completely hides vital alerts and data from screen readers. This represents a critical accessibility failure as visually impaired users would miss warnings entirely.
**Action:** Removed \`aria-hidden="true"\` from all informational data row wrappers and \`Card\` components containing substantive text or interactive content. Ensure \`aria-hidden="true"\` is reserved exclusively for purely decorative visual elements.
