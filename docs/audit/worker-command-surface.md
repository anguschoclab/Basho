# Worker Command Surface (C3)

## Tick Commands (blocked by pendingTick lock)

| Command            | Handler                                 | Mutates currentWorld | Vulnerable to mid-loop interleaving |
| ------------------ | --------------------------------------- | -------------------- | ----------------------------------- |
| TICK_DAY           | tickOrchestrator                        | Yes                  | N/A (blocked by pendingTick)        |
| TICK_MULTIPLE_DAYS | async loop, advanceDaysFastOrchestrator | Yes                  | N/A (blocked by pendingTick)        |
| AUTO_SIM_DAYS      | async loop, advanceDaysFastOrchestrator | Yes                  | N/A (blocked by pendingTick)        |
| START_BASHO        | startBasho                              | Yes                  | N/A (not a tick)                    |

## Non-Tick Mutating Commands (now blocked by pendingTick — B4.1.3)

| Command                 | Handler              | Mutates currentWorld via resolveImpacts |
| ----------------------- | -------------------- | --------------------------------------- |
| OFFER_CONTRACT          | contract negotiation | Yes                                     |
| SCOUT_POOL              | talent pool scouting | Yes                                     |
| SCOUT_CANDIDATE         | candidate scouting   | Yes                                     |
| POACH_CANDIDATE         | candidate poaching   | Yes                                     |
| RESOLVE_CRISIS          | crisis resolution    | Yes                                     |
| RESOLVE_LOOP_DECISION   | loop decision        | Yes                                     |
| ISSUE_RULING            | governance ruling    | Yes                                     |
| HANDLE_MEDIA_EVENT      | media event          | Yes                                     |
| WITHDRAW_RIKISHI        | rikishi withdrawal   | Yes                                     |
| TREAT_INJURY            | injury treatment     | Yes                                     |
| BUY_MYOSEKI             | myoseki purchase     | Yes                                     |
| LEASE_MYOSEKI           | myoseki lease        | Yes                                     |
| RENEW_SPONSOR           | sponsor renewal      | Yes                                     |
| REQUEST_BAILOUT         | bailout request      | Yes                                     |
| PREPAY_LOAN             | loan prepayment      | Yes                                     |
| HIRE_STAFF              | staff hiring         | Yes                                     |
| FIRE_STAFF              | staff firing         | Yes                                     |
| TRIGGER_SUCCESSION      | heya succession      | Yes                                     |
| SET_TRAINING_STATE      | training state       | Yes                                     |
| REQUEST_POLITICAL_FAVOR | political favor      | Yes                                     |

## Non-Mutating Commands

| Command     | Handler                   | Mutates currentWorld |
| ----------- | ------------------------- | -------------------- |
| START_WORLD | generateWorld + syncWorld | Yes (initial set)    |
| LOAD_WORLD  | migrateWorldState         | Yes (initial set)    |
| PAUSE_SIM   | sets simPaused flag       | No                   |
| RESUME_SIM  | clears simPaused flag     | No                   |
| GET_DIGEST  | emitDigest                | No                   |

## B4.1.3 Fix

All commands (tick and non-tick) are now rejected when `pendingTick` is true. This prevents mid-loop command interleaving during `TICK_MULTIPLE_DAYS`/`AUTO_SIM_DAYS` async loops.
