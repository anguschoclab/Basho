## 2024-08-11 - Document Pipeline Runner Contracts
**Gap:** PipelinePhase missing explicit documentation for immutability contract, runPipeline missing documentation on its performance tracing effects.
**Truth:** PipelinePhases must not mutate input state, runPipeline checks globalThis.__PERF__ and calls postMessage.
**Watch:** Other core engine files where global side-effects (like postMessage) or strict contracts (like Immutability) are implicit.
