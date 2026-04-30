/**
 * src/engine/tick/index.ts
 * =======================
 * Public API for the Simulation Engine.
 */

export {
  advanceOneDay,
  advanceDays,
  enterPostBasho,
  enterInterim,
  type DailyTickReport,
} from "./tickDaily";
export { runPipeline, type PipelinePhase } from "./pipelineRunner";
export * from "./phases";
export * from "./pipelines/offSeasonPipeline";
export * from "./pipelines/bashoPipeline";
