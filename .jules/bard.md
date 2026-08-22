## 2024-08-22 - UI Digest Content Missing Array Variety
**Discovery:** Several high-frequency states in the UI Digest (`ui.digest.promotion.ozeki_run` and `ui.digest.kadoban`) were hardcoded as single strings rather than arrays, causing players to see the exact same sentence every time an Ozeki run or Kadoban status appeared. The BardEngine handles arrays natively, but the JSON data didn't provide them.
**Rule:** High-frequency UI digest states must be formatted as arrays with 3-5 distinct variants, avoiding synonym-swap padding.
**Check:** Ensure `ui.digest.*` strings are provided as arrays if they appear frequently across turns.
