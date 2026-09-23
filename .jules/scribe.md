## 2026-09-23 - Documented H2HRecord streak sign invariant
**Gap:** The `H2HRecord.streak` property was an undocumented `number`, hiding the critical invariant that sign indicates direction (positive = winning, negative = losing).
**Truth:** The code in `updateH2H` and narrative generation relies on `streak > 0` for winning and `streak < 0` for losing, switching directly from positive to -1 or negative to 1 on a streak break.
**Watch:** Any numerical "streak" value in other systems may implicitly encode directionality in its sign.
