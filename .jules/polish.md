## 2024-05-18 - Hardcoded Era Tone Text in TrendsWidget
**Issue:** `TrendsWidget` has hardcoded "Meta Bias: Oshi-Strong" text. It should dynamically read the current era tone from the simulation state (`world.meta.tone`), similar to how `EraToneBadge` displays it.
**Learning:** Some UI components might have hardcoded placeholders or fabricated values left over from earlier iterations, while the actual data structure (like `EraTone`) and formatting utils exist to surface real simulation state.
**Rule:** When rendering data about the current era or meta, always source it from `world.meta.tone` and use `ERA_TONE_LABELS` and `ERA_TONE_COLORS` instead of hardcoded strings.
