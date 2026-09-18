## 2024-09-18 - [resolveTacticalClash JSDoc missed NEKODAMASHI]
**Gap:** The JSDoc for `resolveTacticalClash` claimed a perfect 3-point Rock-Paper-Scissors matrix, omitting the `NEKODAMASHI` tactic entirely.
**Truth:** The code implements an asymmetric 4-tactic system where `NEKODAMASHI` counters both `YOTSU_BELT` and `OSHI_THRUST`, but is neutral to `HENKA`.
**Watch:** AI logic or UI surfacing that assumes a perfectly balanced 3-point matrix might make incorrect predictions or display wrong tactical advantages.
