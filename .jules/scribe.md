## 2024-03-24 - [Tactical Matrix Inaccuracy]
**Gap:** resolveTacticalClash doc claimed a pure 3-tactic rock-paper-scissors triangle (YOTSU/OSHI/HENKA).
**Truth:** Code implements an asymmetric 4-tactic system where NEKODAMASHI counters two tactics (YOTSU, OSHI) and is only neutral to HENKA.
**Watch:** UI components or AI logic that assume a perfectly balanced 3-point RPS matrix will be incorrect.
