## 2024-05-18 - [Missing Documentation]
**Gap:** No scribe entries exist yet.
**Truth:** This is the first entry.
**Watch:** N/A
## 2024-05-18 - [H2HRecord streak directionality invariant]
**Gap:** H2HRecord.streak was typed as `number` without indicating its signed semantics.
**Truth:** Uses signed integer logic (positive = winning, negative = losing) and resets to 1 or -1, avoiding 0. Used for narrative generation.
**Watch:** Other properties counting streaks that might use signed logic instead of separate boolean flags.
