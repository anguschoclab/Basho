# Mason's Journal

## 2026-11-18 - CompareModePanel props lie about what callers pass

**Finding:** `CompareModePanel` declared `rikishiA`/`rikishiB` as `UIRikishi`, and
`RecruitingTabSections` fed it `CandidateDigestEntry` via `as unknown as UIRikishi`.
`TalentCandidate` has no `id`, `shikona`, `heyaName`, or `rankLabel` — its identity
is `candidateId` and its display name is `name`. The cast compiled only because it
bypassed structural checking entirely.
**Learning:** The real contract here is "a roster `UIRikishi` OR a talent
candidate" — it cannot be honestly narrowed to `UIRikishi` because both shapes
legitimately reach the panel. The new `ComparableEntry` interface in
`CompareModePanelSections.tsx` makes every field optional; `resolveBoutParticipant`
(`src/presenters/worldAccess.ts`) takes `{ id?: string; candidateId?: string }` for
the same reason.
**Constraint:** Prospect comparisons render `shikona`/`rankLabel` as blank today
(the fields don't exist on candidates — `name` does). Falling back to `name` in
the header would fix the blank prospect name but IS a behavior change — that
belongs to Polish/another persona, not a mason commit. Any future tightening of
`ComparableEntry` must keep `id` optional or break the recruiting compare path.
