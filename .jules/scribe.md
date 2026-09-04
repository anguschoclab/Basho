## 2024-09-04 - pipelineRunner pure flag ignored
**Gap:** Docs claim `pure: true` skips snapshotting by passing `touches: []`.
**Truth:** The code ignores the `pure` flag entirely. Furthermore, setting `touches: []` does not skip snapshotting; due to a length check, it triggers a fallback that snapshots all trackable entity fields.
**Watch:** Anywhere `PipelinePhaseMetadata` is used.
