# Pass 1: DramaMatchmaker.ts → constants/engine/matchmaking.ts

## Constants to add to `matchmaking.ts`

### Drama day thresholds

- `DRAMA_DAY_SENSHURAKU = 15` — final day
- `DRAMA_DAY_KADOBAN_START = 10` — kadoban check starts
- `DRAMA_DAY_DEMOTION_START = 12` — demotion danger starts
- `DRAMA_DAY_YOKOZUNA_HUNT_START = 10` — yokozuna hunt window start
- `DRAMA_DAY_YOKOZUNA_HUNT_END = 14` — yokozuna hunt window end
- `DRAMA_DAY_RELEGATION_START = 14` — relegation battle starts
- `DRAMA_DAY_WINLESS_START = 5` — winless warrior starts

### Record thresholds

- `DRAMA_MAKE_OR_BREAK_WINS = 7` — 7-7 kachi-koshi wins
- `DRAMA_KADOBAN_WIN_THRESHOLD = 8` — ozeki needs < 8 wins
- `DRAMA_YUSHO_CONTENDER_GAP = 2` — within 2 wins of leader
- `DRAMA_YUSHO_LEADER_MIN_WINS = 10` — leader must have >= 10 wins
- `DRAMA_DEMOTION_WIN_THRESHOLD = 6` — sanyaku < 6 wins
- `DRAMA_RELEGATION_WIN_THRESHOLD = 4` — lower division < 4 wins

### Rivalry thresholds

- `DRAMA_GRUDGE_HEAT_THRESHOLD = 70` — grudge match heat
- `DRAMA_RIVALRY_HEAT_THRESHOLD = 40` — rivalry renewed heat
- `DRAMA_RIVALRY_SCORE_BASE = 50` — rivalry score base
- `DRAMA_RIVALRY_SCORE_CAP = 95` — rivalry score cap
- `DRAMA_RIVALRY_SCORE_DIVISOR = 2` — rivalry score divisor

### Career thresholds

- `DRAMA_ROOKIE_TOTAL_BOUTS = 5` — < 5 total bouts = rookie
- `DRAMA_VETERAN_TOTAL_BOUTS = 200` — > 200 total bouts = veteran
- `DRAMA_DEBUT_MAKUUCHI_BOUTS = 1` — <= 1 makuuchi bout = debut
- `DRAMA_DEBUT_TOTAL_BOUTS = 15` — < 15 total bouts for debut

### Streak threshold

- `DRAMA_STREAK_BREAKER_THRESHOLD = 5` — 5+ win streak

### Drama scores

- `DRAMA_SCORE_MAKE_OR_BREAK = 100`
- `DRAMA_SCORE_GRUDGE_MATCH = 95`
- `DRAMA_SCORE_KADOBAN = 90`
- `DRAMA_SCORE_YUSHO_DECIDER = 85`
- `DRAMA_SCORE_COMEBACK = 65`
- `DRAMA_SCORE_DEBUT_SHOWCASE = 65`
- `DRAMA_SCORE_YOKOZUNA_HUNT = 70`
- `DRAMA_SCORE_SENSHURAKU_FINALE = 70`
- `DRAMA_SCORE_ARCHETYPE_CLASH = 60`
- `DRAMA_SCORE_DEMOTION_DANGER = 60`
- `DRAMA_SCORE_RELEGATION_BATTLE = 60`
- `DRAMA_SCORE_ROOKIE_VS_VETERAN = 55`
- `DRAMA_SCORE_KINBOSHI_HUNT = 50`
- `DRAMA_SCORE_STREAK_BREAKER = 50`
- `DRAMA_SCORE_WINLESS_WARRIOR = 45`
- `DRAMA_SCORE_ORIGIN_MATCHUP = 40`

### Swap budget

- `DRAMA_MAX_SWAPS_DEFAULT = 3`
- `DRAMA_MAX_SWAPS_WITH_RIVALRY = 5`

## Changes to DramaMatchmaker.ts

1. Import all new constants from `constants/engine/matchmaking.ts`
2. Replace all inline magic numbers with the named constants
3. No behavioral changes — values remain identical

## Verification

- Run `npx vitest run` to ensure all tests pass
- Run `npx tsc --noEmit` to verify type checking
