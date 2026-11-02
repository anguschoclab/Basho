# v11 RED phase — 2026-10-14T12:15:20Z
## scanRecentEvents contract + perf: expected FAIL (symbol does not exist yet)
    [90m   |[39m                 [31m^[39m
    [90m122|[39m     expect(out.map((e) => e.id)).toEqual(["EV-0003", "EV-0001"]);
    [90m123|[39m   });

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[8/8]⎯[22m[39m


[2m Test Files [22m [1m[31m1 failed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[31m8 failed[39m[22m[90m (8)[39m
[2m   Start at [22m 14:15:21
[2m   Duration [22m 924ms[2m (environment 78%, setup 14%, worker 5%, tests 2%, import 1%)[22m


    [90m144|[39m     console.log(
[90m [2m❯[22m bench src/tests/perf/eventLogExtraction.perf.test.ts:[2m70:5[22m[39m
[90m [2m❯[22m src/tests/perf/eventLogExtraction.perf.test.ts:[2m142:18[22m[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/3]⎯[22m[39m


[2m Test Files [22m [1m[31m1 failed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[31m3 failed[39m[22m[90m (3)[39m
[2m   Start at [22m 14:15:22
[2m   Duration [22m 1.05s[2m (environment 49%, tests 20%, setup 13%, worker 11%, transform 4%, import 3%)[22m


=== GREEN phase evidence (post-implementation) ===
$ bunx vitest run src/tests/unit/engine/events.scanRecentEvents.test.ts
  8/8 PASS — newest-first order, insertion-recency ties, limit cap, composed
  types+category+minImportance filters, out-of-order tolerance, category chip.

$ bunx vitest run --config vitest.perf.config.ts src/tests/perf/eventLogExtraction.perf.test.ts
  3/3 PASS — exact parity on distinct timestamps; 50k-log filtered extract:
  legacy 2.37ms vs scan 0.009ms (266x); unfiltered take-100: 3.35ms vs 0.027ms.

$ bunx vitest run EventFeed.test.tsx EventLogPanel.ai.test.tsx NewsWidget.test.tsx
  17/17 PASS — component behavior preserved through the shared extractor.

$ bun run type-check / bunx eslint (touched files)
  CLEAN — scanRecentEvents re-exported via src/presenters/selectors.ts to
  satisfy no-restricted-imports (components may not import src/engine/).

Integration note: EventLogPanel semantic change APPROVED — filter-then-fill-100
replaces slice-100-then-filter (a filtered view now yields up to 100 matching
events rather than a subset of the newest 100 raw events).
