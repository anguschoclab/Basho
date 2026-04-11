## 2025-02-26 - Optimize renewSponsorContract performance
**Learning:** `findIndex` inside a loop iterating over all `.values()` of a large Map is extremely slow when the target's ID can be used for O(1) direct lookup.
**Action:** When searching for an inner array relationship (`sponsor.relationships`) by its id, pass the parent entity's id (`sponsorId`) when available in the calling context to skip iterating through unrelated entities.
