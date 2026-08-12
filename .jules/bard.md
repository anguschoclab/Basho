## 2024-08-12 - UI String to Array Variants
**Discovery:** UI digest templates for `promotion` and `kadoban` were single strings.
**Rule:** `BardEngine.resolve()` automatically handles arrays of strings for domains without breaking logic, enabling multiple phrasing options without changing the parsing logic.
**Check:** Run JSON validation tests.
