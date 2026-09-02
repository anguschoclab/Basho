## 2024-10-25 - Pipeline Phase Metadata Ignoring Pure and Touches Empty Array
**Gap:** `PipelinePhaseMetadata` documented that `pure: true` skips snapshotting and `touches` narrows snapshots.
**Truth:** The `pure` flag is completely ignored in `runPipeline`. Furthermore, providing `touches: []` fails a truthiness/length check (`touches && touches.length > 0`) and causes the runner to fallback and snapshot ALL tracked entity maps, rather than none.
**Watch:** Anywhere developers are trying to optimize pure phases or empty touch lists, as they are inadvertently causing maximum allocation overhead.
