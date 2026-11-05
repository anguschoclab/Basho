# Worker Command Surface (C3)

> **Status:** Updated to current architecture. The `pendingTick` rejection lock described in earlier revisions no longer exists — the worker now runs commands through `COMMAND_HANDLERS` in `src/engine/worker/engine.worker.ts` (handlers split across `commands/{lifecycle,recruitment,governance,heya,economy,meta}.ts`) over a shared `WorkerRuntime` (`runtime.ts`). The canonical command union is `EngineCommand` in `src/engine/worker/types.ts`.

## Concurrency model

- The worker is single-threaded; `rt.world` is the only mutable state.
- `TICK_MULTIPLE_DAYS` is the only async command. When `rt.simPaused` is false it runs to completion synchronously (no interleaving possible). When paused it yields between 7-day chunks via `setTimeout`, and `RESUME_SIM` clears the flag — pause is strictly between-chunk so no partial advancement is re-run (B4.1.4 invariant, `commands/lifecycle.ts`).
- There is **no** command-rejection lock: other commands can be processed while a paused `TICK_MULTIPLE_DAYS` is yielded. World-mutating commands apply via `resolveImpacts` + `rt.syncAndDigest()`.

## Tick Commands (worker)

| Command            | Handler                                   | Mutates currentWorld |
| ------------------ | ----------------------------------------- | -------------------- |
| TICK_DAY           | `tickOrchestrator`                        | Yes                  |
| TICK_MULTIPLE_DAYS | loop of `tickOrchestrator` / `advanceDaysFastOrchestrator` (fast path for ≥7-day chunks) | Yes |

## Interactive basho commands — NOT worker commands

`START_BASHO`, `SIMULATE_BOUT`, `END_BASHO` are `GameAction`s handled by `bashoSlice` on the **main thread** (match animation path), not `EngineCommand`s. World-mutating slice cases bump `uiWorldRevision`, which `GameContext` syncs back to the worker via `LOAD_WORLD`.

## Non-Tick Mutating Worker Commands (via `resolveImpacts`)

Representative set — the full union is `EngineCommand` in `types.ts` (~55 commands):

| Command                 | Domain        |
| ----------------------- | ------------- |
| OFFER_CONTRACT          | recruitment   |
| SCOUT_POOL / SCOUT_CANDIDATE / POACH_CANDIDATE / SEND_SCOUT / HIRE_STAFF_CANDIDATE | recruitment |
| RESOLVE_CRISIS          | governance    |
| RESOLVE_LOOP_DECISION   | npc decision  |
| ISSUE_RULING            | governance    |
| HANDLE_MEDIA_EVENT      | media         |
| WITHDRAW_RIKISHI / RETIRE_RIKISHI / TRIGGER_SUCCESSION | lifecycle |
| TREAT_INJURY / BUY_PHYSIO / SET_RIKISHI_DIET / SET_RIKISHI_EFFORT | health |
| BUY_MYOSEKI / LEASE_MYOSEKI / LIST_MYOSEKI_FOR_SALE / RETURN_MYOSEKI_LEASE | economy |
| RENEW_SPONSOR / RECRUIT_SPONSOR / REQUEST_BAILOUT / PREPAY_LOAN | economy |
| HIRE_STAFF / FIRE_STAFF / HIRE_ACADEMY_STAFF | staff |
| SET_TRAINING_STATE / ASSIGN_MENTOR / REMOVE_MENTOR / ADD_SPARRING_PAIR / REMOVE_SPARRING_PAIR | training |
| REQUEST_POLITICAL_FAVOR / SPEND_POLITICAL_CAPITAL | governance |
| INVEST_IN_FACILITY / BUILD_INFRASTRUCTURE / REPAIR_INFRASTRUCTURE / BUILD_FOREIGN_ACADEMY / BUILD_YOUTH_ACADEMY / UPGRADE_YOUTH_ACADEMY / INVEST_ACADEMY | facilities |
| ACCEPT_EXHIBITION / DECLINE_EXHIBITION / FINISH_EXHIBITION / COMPLETE_TUTORIAL / APPLY_PRESS_CONFERENCE / SET_HEYA_DIET / SET_TSUKEBITO / REMOVE_TSUKEBITO / SET_KESHO_CONFIG / SET_SCOUTING_INVESTMENT / GO_ON_HOLIDAY / BOOKMARK_ENTITY / UNBOOKMARK_ENTITY / UPDATE_BOOKMARK_NOTE / ADVANCE_TUTORIAL_STEP / SET_TUTORIAL_FLAG / PROMOTE_INTAKE / MANAGE_ACADEMY / READY | misc |

## Non-Mutating / Lifecycle Worker Commands

| Command     | Behavior                                              |
| ----------- | ----------------------------------------------------- |
| START_WORLD | generateWorld + initial sync                          |
| LOAD_WORLD  | `migrateWorldState` + `clearQueryCaches` + emitDigest |
| PAUSE_SIM   | sets `rt.simPaused`                                   |
| RESUME_SIM  | clears `rt.simPaused`                                 |

> There is no `GET_DIGEST` command — digests are pushed to the main thread as `TICK_COMPLETED` events carrying `{ digest, digestRevision }`.
