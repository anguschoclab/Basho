## 2024-05-18 - [PipelineRunner Recovery Gap]
**Gap:** `createShallowSnapshot` in `pipelineRunner.ts` only snapshots explicitly defined `ENTITY_MAP_FIELDS`. The JSDoc does not explicitly warn that modifying unlisted fields (or deep properties of listed entities) in-place before throwing an error breaks the rollback guarantee, creating persistent corruption.
**Truth:** If a pipeline phase mutates nested fields (e.g. `rikishi.stats`) or a top-level field not in `ENTITY_MAP_FIELDS` (e.g. `world.seed`), throwing an error will NOT rollback those mutations. The pipeline will proceed with a partially corrupted world state.
**Watch:** All PipelinePhases. In-place mutations are forbidden everywhere.
