## 2025-05-24 - Document Tactical Clash Asymmetry
**Gap:** The JSDoc for `resolveTacticalClash` claimed a simple rock-paper-scissors triangle (Yotsu > Oshi > Henka > Yotsu) and said only STANDARD provides no modifiers.
**Truth:** `NEKODAMASHI` is highly privileged, countering both `YOTSU_BELT` and `OSHI_THRUST`. Also, `ALL_OUT` and `DEFENSIVE_PULL` are valid tactics but provide zero modifiers here.
**Watch:** Other systems relying on `BoutTactic` that assume symmetrical countering or forget `ALL_OUT` / `DEFENSIVE_PULL` fallbacks.
