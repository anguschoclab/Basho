## 2023-10-24 - Document EntityCollection `getHeyaRoster` behavior
**Gap:** Developers using `EntityCollection.getHeyaRoster` might not realize it uses memoized querying under the hood (unlike other functions) and returns ONLY active rikishi (filtering out retired ones), which contradicts a strict reading of "get roster" if one assumed it meant "all past and present".
**Truth:** `getHeyaRoster` returns only non-retired Rikishi, and delegates to a memoized `queries.getHeyaRoster`, whereas `getRikishi` and others manually iterate over maps and return freshly sorted arrays.
**Watch:** When developers need retired rikishi for a heya, they must use `getRikishi({ heyaId, includeRetired: true })` instead.
