# Macro Parity Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Break the rich-get-richer dynasty loop and unfreeze the stable count so a 25-year NPC sim produces real competitive churn — target ≥9 unique basho winners (was 5–6), no single stable above ~18 yusho (was Futagoyama 35), and a heyaCount that actually moves (was frozen at 45).

**Architecture:** Two root-cause levers, not constant tweaks. (1) **Competitive-balance recruitment** — NPC recruitment is a bid war sorted by `bidAmount` desc, and bids scale with a stable's funds surplus, so the richest stable wins the best recruits and compounds forever. Add a _strength-based_ handicap (a "draft order" effect) that dampens already-strong stables' effective bids and boosts weak ones, decoupling talent acquisition from wealth. (2) **Reliable founding** — new stables only spawn when an accomplished retiree finds an _available_ myoseki, but the fixed myoseki pool is fully held across 45 stables, so founding never fires. Mint a myoseki on merit so accomplished retirees can found stables, injecting fresh competitors.

**Tech Stack:** Vite + React 19 + TypeScript engine. Vitest (`npx vitest run`). Deterministic RNG only (`rngForWorld`/`rngFromSeed`, never `Math.random`/`Date.now`). Mutations via `ImpactBuilder` + `resolveImpacts`. Diagnostic harness: `bun scripts/diagnostic-25yr-sim.ts` (writes `simulation-results.json` with `tuningMetrics.uniqueWinnerCount`, `beyaDominance`, and `yearSnapshots[].heyaCount`).

---

## Why constant-tweaks failed (read before starting)

A prior pass tried lowering operating overhead to reduce wealth inequality. It made parity **worse** (unique winners 6 → 4): cheaper economy → richer dominant stables → they out-bid even harder. Parity and the economy are coupled _through recruitment bidding_. This plan attacks that coupling directly (Lever 1) instead of touching economy constants, so it won't have that side effect. Do **not** "fix" parity by changing `economic.ts` overhead values.

## Verified mechanics (cited — use these)

- Recruitment bid war: `fillVacanciesForNPCWithBidding` (`src/engine/systems/generation/TalentPoolNPCRecruitment.ts`) builds `bids` (line 139), computes each `bidAmount` via `recruitmentStrat.calculateMaxBid(world, heya, oyakata, candidateId, rivalHeyaId)` (lines 151-158), then `bids.sort((a, b) => b.bidAmount - a.bidAmount)` (line 162) and assigns top bids first.
- Bids scale with wealth: `calculateRunwayAwareMaxBid` (`src/engine/npcRecruitmentStrategy.ts`) uses `surplus = max(0, heya.funds - yearlyBurn)`.
- Founding path exists but is gated on an available myoseki: `governanceReview.ts:387-491` — `isAccomplished` retiree (rank sanyaku or `careerWins >= 200`, age ≥ 28) → `Object.values(world.myosekiMarket.stocks).find(s => s.status === "available")` (line 389); only inside that does it `foundStable(...)` + `builder.addHeya(...)` (lines 471-491, gated by `world.heyas.size < HEYA_COUNT_CAP && rng.bool(FOUNDING_CHANCE)`). The fixed myoseki pool is fully `held`, so `availableStock` is undefined and the whole block is skipped — no oyakata conversion, no founding (confirmed: heyaCount 45→45 over 25 years, oyakata promotion rate ~2.2%).
- `getStableRikishi(world, heyaId)` (`src/engine/queries`) returns a heya's roster; sekitori = `division === "makuuchi" || division === "juryo"`.
- `foundStable(world, oyakataId, name, rng)` and `addHeya` already exist (built in the earlier macro plan).

---

### Task 1: Competitive-balance multiplier (pure helper)

**Files:**

- Create: `src/engine/systems/generation/competitiveBalance.ts`
- Create: `src/constants/engine/recruitmentBalance.ts`
- Test: `src/tests/unit/engine/recruitment/competitiveBalance.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/engine/recruitment/competitiveBalance.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { recruitmentBalanceMultiplier } from "@/engine/systems/generation/competitiveBalance";
import { makeMockWorld, makeMockHeya, mockRikishi } from "../utils";
import type { WorldState } from "@/engine/types/world";

function worldWithStables(spec: Record<string, number>): WorldState {
  // spec: heyaId -> number of SEKITORI (makuuchi) wrestlers in that stable
  const heyas = new Map();
  const rikishi = new Map();
  for (const [heyaId, sekitoriCount] of Object.entries(spec)) {
    const ids: string[] = [];
    for (let i = 0; i < sekitoriCount; i++) {
      const r = mockRikishi(`${heyaId}-s${i}`, {
        heyaId,
        division: "makuuchi",
        rank: "maegashira",
      });
      rikishi.set(r.id, r);
      ids.push(r.id);
    }
    heyas.set(heyaId, makeMockHeya(heyaId, { rikishiIds: ids }));
  }
  return makeMockWorld({ heyas, rikishi });
}

describe("recruitmentBalanceMultiplier", () => {
  it("handicaps a strong stable below 1 and boosts a weak stable above 1", () => {
    const world = worldWithStables({ strong: 8, weak: 0 });
    const strong = recruitmentBalanceMultiplier(world, "strong");
    const weak = recruitmentBalanceMultiplier(world, "weak");
    expect(strong).toBeLessThan(1);
    expect(weak).toBeGreaterThan(1);
    expect(weak).toBeGreaterThan(strong);
  });

  it("returns ~1 for an average-strength stable", () => {
    // Three stables of equal sekitori count → everyone is average.
    const world = worldWithStables({ a: 3, b: 3, c: 3 });
    expect(recruitmentBalanceMultiplier(world, "a")).toBeCloseTo(1, 1);
  });

  it("is bounded so it never zeroes or explodes a bid", () => {
    const world = worldWithStables({ mega: 30, empty: 0 });
    expect(recruitmentBalanceMultiplier(world, "mega")).toBeGreaterThanOrEqual(0.4);
    expect(recruitmentBalanceMultiplier(world, "empty")).toBeLessThanOrEqual(1.8);
  });
});
```

> Confirm `makeMockHeya`/`makeMockWorld` accept these overrides (`src/tests/unit/engine/utils.ts`). If `makeMockHeya` doesn't take a second arg, build the heya object inline with `{ id, rikishiIds, oyakataId: "oy", funds: 0 } as Heya`.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/tests/unit/engine/recruitment/competitiveBalance.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Add the constants**

Create `src/constants/engine/recruitmentBalance.ts`:

```typescript
/**
 * Competitive-balance ("draft order") tuning. The recruitment bid war otherwise
 * lets the wealthiest stable win every top recruit, concentrating talent and
 * producing 5-dynasty dominance. These bound a strength-based handicap on bids.
 */
export const BALANCE_STRENGTH_SENSITIVITY = 0.12; // per-sekitori deviation from the league mean
export const BALANCE_MULTIPLIER_MIN = 0.4; // strongest stables keep at least 40% bid power
export const BALANCE_MULTIPLIER_MAX = 1.8; // weakest stables bid up to 1.8×
```

- [ ] **Step 4: Implement the helper**

Create `src/engine/systems/generation/competitiveBalance.ts`:

```typescript
import type { WorldState } from "../../types/world";
import { getStableRikishi } from "../../queries";
import {
  BALANCE_STRENGTH_SENSITIVITY,
  BALANCE_MULTIPLIER_MIN,
  BALANCE_MULTIPLIER_MAX,
} from "../../../constants/engine/recruitmentBalance";

/** Sekitori (top-two-division) count is the stable-strength proxy. */
function sekitoriCount(world: WorldState, heyaId: string): number {
  let n = 0;
  for (const r of getStableRikishi(world, heyaId)) {
    if (r.division === "makuuchi" || r.division === "juryo") n++;
  }
  return n;
}

/**
 * Multiplier applied to a stable's recruitment bid. Stronger-than-average stables
 * get < 1 (handicapped); weaker-than-average get > 1 (boosted). This is a sports-style
 * competitive-balance lever: it decouples talent acquisition from raw wealth so hungry
 * mid/low stables can out-bid entrenched dynasties for top recruits. Deterministic —
 * pure function of current rosters.
 */
export function recruitmentBalanceMultiplier(world: WorldState, heyaId: string): number {
  const heyaIds = Array.from(world.heyas.keys());
  if (heyaIds.length === 0) return 1;
  let total = 0;
  for (const id of heyaIds) total += sekitoriCount(world, id);
  const mean = total / heyaIds.length;
  const own = sekitoriCount(world, heyaId);
  // Above mean → handicap; below mean → boost.
  const raw = 1 - (own - mean) * BALANCE_STRENGTH_SENSITIVITY;
  return Math.max(BALANCE_MULTIPLIER_MIN, Math.min(BALANCE_MULTIPLIER_MAX, raw));
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run src/tests/unit/engine/recruitment/competitiveBalance.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/engine/systems/generation/competitiveBalance.ts src/constants/engine/recruitmentBalance.ts src/tests/unit/engine/recruitment/competitiveBalance.test.ts
git commit -m "feat(recruitment): competitive-balance bid multiplier (anti-dynasty)"
```

---

### Task 2: Apply the handicap to NPC recruitment bids

**Files:**

- Modify: `src/engine/systems/generation/TalentPoolNPCRecruitment.ts` (the bid loop at lines 150-159)
- Test: `src/tests/unit/engine/recruitment/balancedBidding.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/engine/recruitment/balancedBidding.test.ts` — assert that, given two stables where the strong one has more funds AND more sekitori, the handicap lets the weak stable's effective bid for the same candidate exceed the strong stable's (which raw funds alone would not):

```typescript
import { describe, it, expect } from "vitest";
import { recruitmentBalanceMultiplier } from "@/engine/systems/generation/competitiveBalance";
import { makeMockWorld, makeMockHeya, mockRikishi } from "../utils";

// This is a focused unit check on the multiplier ordering that the bid loop relies on.
describe("balanced bidding ordering", () => {
  it("weak stable's effective bid can overtake a strong stable's after the handicap", () => {
    const heyas = new Map();
    const rikishi = new Map();
    for (let i = 0; i < 8; i++) {
      const r = mockRikishi(`strong-s${i}`, { heyaId: "strong", division: "makuuchi" });
      rikishi.set(r.id, r);
    }
    heyas.set(
      "strong",
      makeMockHeya("strong", { rikishiIds: Array.from({ length: 8 }, (_, i) => `strong-s${i}`) })
    );
    heyas.set("weak", makeMockHeya("weak", { rikishiIds: [] }));
    const world = makeMockWorld({ heyas, rikishi });

    const rawStrongBid = 10_000_000; // strong stable can afford more
    const rawWeakBid = 7_000_000;
    const effStrong = rawStrongBid * recruitmentBalanceMultiplier(world, "strong");
    const effWeak = rawWeakBid * recruitmentBalanceMultiplier(world, "weak");
    expect(effWeak).toBeGreaterThan(effStrong);
  });
});
```

- [ ] **Step 2: Run to verify it fails or passes**

Run: `npx vitest run src/tests/unit/engine/recruitment/balancedBidding.test.ts`
Expected: PASS once Task 1 is in (this documents the intended ordering). If it FAILS, raise `BALANCE_STRENGTH_SENSITIVITY` until an 8-sekitori vs 0-sekitori gap flips a 10M-vs-7M bid, then keep that value.

- [ ] **Step 3: Apply the multiplier in the bid loop**

In `src/engine/systems/generation/TalentPoolNPCRecruitment.ts`, add the import near the top:

```typescript
import { recruitmentBalanceMultiplier } from "./competitiveBalance";
```

Change the bid construction (lines 150-159) to scale each bid by the stable's balance multiplier:

```typescript
const balanceMult = recruitmentBalanceMultiplier(world, heyaId);
for (const candidate of allVisibleCandidates) {
  const rawBid = recruitmentStrat.calculateMaxBid(
    world,
    heya,
    oyakata,
    candidate.candidateId,
    rivalHeyaId
  );
  const bidAmount = Math.round(rawBid * balanceMult);
  bids.push({ heyaId, candidateId: candidate.candidateId, bidAmount, oyakata });
}
```

The `bids.sort` (line 162) and assignment loop are unchanged — they now operate on handicapped bids, so top recruits spread toward hungrier stables.

- [ ] **Step 4: Run the recruitment suite to verify no regression**

Run: `npx vitest run src/tests/unit/engine/recruitment`
Expected: PASS (including the prior population-stability tests — total intake is unchanged, only _who_ wins each recruit shifts).

- [ ] **Step 5: Commit**

```bash
git add src/engine/systems/generation/TalentPoolNPCRecruitment.ts src/tests/unit/engine/recruitment/balancedBidding.test.ts
git commit -m "feat(recruitment): handicap bids by stable strength to spread talent"
```

---

### Task 3: Reliable founding — mint a myoseki on merit when none is available

**Files:**

- Modify: `src/engine/systems/governance/governanceReview.ts` (the accomplished-retiree block, lines 387-492)
- Test: `src/tests/unit/engine/governance/foundingReliability.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/engine/governance/foundingReliability.test.ts` — an accomplished retiree with an **empty** myoseki market still becomes an oyakata and (RNG permitting) founds a stable:

```typescript
import { describe, it, expect } from "vitest";
import { runGovernanceReview } from "@/engine/systems/governance/governanceReview";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, makeMockHeya, mockRikishi } from "../utils";

describe("founding reliability with exhausted myoseki", () => {
  it("an accomplished retiree founds a stable even when no myoseki is 'available'", () => {
    // A retirement-age, high-careerWins maegashira whose stable will lose them.
    const retiree = mockRikishi("legend", {
      heyaId: "old-heya",
      rank: "maegashira",
      division: "makuuchi",
      birthYear: 1980, // age 45 at world.year 2025 → mandatory retirement
      careerWins: 400,
    });
    const heyas = new Map([
      ["old-heya", makeMockHeya("old-heya", { rikishiIds: ["legend"] })],
      ["filler", makeMockHeya("filler", { rikishiIds: [] })],
    ]);
    const world = makeMockWorld({
      year: 2025,
      heyas,
      rikishi: new Map([["legend", retiree]]),
      // myoseki market exists but EVERY stock is held — the bug condition.
      myosekiMarket: { stocks: {}, history: [] } as any,
    });

    const before = world.heyas.size;
    const impact = runGovernanceReview(world);
    const next = resolveImpacts(world, [impact]);
    // Either a stable was founded (heyaCount up) OR at minimum the retiree converted to oyakata.
    const founded = next.heyas.size > before;
    const foundEvent = (impact.events ?? []).some(
      (e) => (e.data as { status?: string })?.status === "stable_founded"
    );
    expect(founded || foundEvent).toBe(true);
  });
});
```

> If `FOUNDING_CHANCE` (0.35) makes this RNG-flaky for the test seed, the assertion is on `founded || foundEvent`; if it still flakes, temporarily assert only that the retiree became an oyakata (an `addOyakata` impact / `elder_stock_acquired` event), which is the necessary precondition this task unblocks.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/tests/unit/engine/governance/foundingReliability.test.ts`
Expected: FAIL — with no `available` stock, the entire `if (availableStock)` block is skipped, so no oyakata conversion and no founding.

- [ ] **Step 3: Mint a myoseki on merit when none is available**

In `src/engine/systems/governance/governanceReview.ts`, replace the available-stock lookup (lines 388-392) so an accomplished retiree who finds no available stock gets a newly-issued one (models the JSA granting a merit elder name). Change:

```typescript
        if (world.myosekiMarket) {
          const availableStock = Object.values(world.myosekiMarket.stocks).find(
            (s) => s.status === "available"
          );
          if (availableStock) {
```

to:

```typescript
        if (world.myosekiMarket) {
          const rngMyoseki = rngForWorld(world, "governance", `myoseki_${id}`);
          const existing = Object.values(world.myosekiMarket.stocks).find(
            (s) => s.status === "available"
          );
          // Merit issuance: a yokozuna/ozeki/sekiwake-class retiree always gets an elder
          // name. Without this the fixed pool stays fully held and no new stables ever form.
          const availableStock = existing ?? {
            id: rngMyoseki.uuid("MY"),
            name: `${r.shikona ?? r.name ?? id}-myoseki`,
            status: "available" as const,
            ownerId: undefined,
            holderId: undefined,
            askingPrice: undefined,
          };
          if (availableStock) {
```

> Confirm the `MyosekiStock` shape (`src/engine/types/` — search `interface MyosekiStock`). Match its required fields exactly in the minted object; the four above (`id`, `name`, `status`, owner/holder) are the ones the existing code reads/writes at lines 421-428. If the type has additional required fields, populate them with the same defaults a freshly-generated stock uses in `WorldFactory`/the myoseki generator.

The existing code below (lines 421-446) already writes `nextStocks[availableStock.id] = { ...availableStock, ownerId, holderId, status: "held" }`, so a minted stock is correctly recorded as held by the new oyakata.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/tests/unit/engine/governance/foundingReliability.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the governance suite for regressions**

Run: `npx vitest run src/tests/unit/engine/governance`
Expected: PASS (existing myoseki-available path is unchanged; only the empty-pool fallback is new).

- [ ] **Step 6: Commit**

```bash
git add src/engine/systems/governance/governanceReview.ts src/tests/unit/engine/governance/foundingReliability.test.ts
git commit -m "feat(governance): issue merit myoseki so accomplished retirees can found stables"
```

---

### Task 4: Full-sim validation and balance tuning

This is the integration gate. The unit tests prove the mechanisms; only the 25-year sim proves parity moved.

**Files:**

- Tune (values only, if needed): `src/constants/engine/recruitmentBalance.ts`, `src/constants/engine/economic.ts` (`FOUNDING_CHANCE`)

- [ ] **Step 1: Run the full suite**

Run: `npx vitest run`
Expected: all green (no new failures beyond documented pre-existing ones).

- [ ] **Step 2: Run the 25-year diagnostic**

Run: `bun scripts/diagnostic-25yr-sim.ts`

- [ ] **Step 3: Assert parity + churn improved**

Run:

```bash
node -e '
const r=require("./simulation-results.json");
const tm=r.tuningMetrics, ys=r.yearSnapshots;
const heyaMin=Math.min(...ys.map(s=>s.heyaCount)), heyaMax=Math.max(...ys.map(s=>s.heyaCount));
const topYusho=Math.max(...Object.values(tm.beyaDominance||{}).map(Number).concat([0]));
console.log("uniqueWinners", tm.uniqueWinnerCount);
console.log("heyaCount range", heyaMin, "-", heyaMax);
console.log("top stable yusho", topYusho);
'
```

Expected: `uniqueWinnerCount >= 9` (was 5–6); `heyaCount` range is **not** flat (min !== max — founding/merger now move it); top stable yusho **≤ ~18** over 150 basho (was 35).

- [ ] **Step 4: Tune if targets missed**

If `uniqueWinnerCount` is still < 9, raise `BALANCE_STRENGTH_SENSITIVITY` (e.g. 0.12 → 0.18) and/or lower `BALANCE_MULTIPLIER_MIN` (0.4 → 0.3) to handicap dynasties harder, then re-run Steps 2-3. If `heyaCount` never rises, raise `FOUNDING_CHANCE` (0.35 → 0.6). Do not exceed the guardrails the diagnostic enforces (`heyaCount >= HEYA_FLOOR`, `rikishiActive >= 100`). Each retune is a constant-only change validated by re-running the diagnostic.

- [ ] **Step 5: Commit the tuned constants**

```bash
git add src/constants/engine/recruitmentBalance.ts src/constants/engine/economic.ts
git commit -m "tune(parity): calibrate competitive-balance + founding for unique-winner target"
```

---

## Optional stretch (only if Tasks 1-4 don't reach ≥9 winners): Dynasty decline on succession

If handicapped recruitment + founding still leave one stable dominant, add a transition penalty: when a stable's oyakata is replaced (`recordOyakataHandover`), apply a temporary reduction to that stable's recruitment/training edge (e.g. a multi-basho `prestigeBand` step-down or a flag the balance multiplier reads). Scope as a separate task with its own test + diagnostic check; only pursue if measured parity is still short, to avoid over-engineering.

## Verification (end-to-end)

- [ ] `npx vitest run` — full suite green.
- [ ] `npx vite build` — clean.
- [ ] `bun scripts/diagnostic-25yr-sim.ts` then the Step-3 assertions: `uniqueWinnerCount >= 9`, `heyaCount` dynamic, top stable ≤ ~18 yusho.
- [ ] Determinism: run the diagnostic twice with the fixed seed; `uniqueWinnerCount` and final `heyaCount` byte-identical. `grep -rn "Math.random\|Date.now" src/engine/systems/generation/competitiveBalance.ts src/engine/systems/governance/governanceReview.ts` → nothing.

## Self-review notes

- **Spec coverage:** Lever 1 = Tasks 1-2 (anti-dynasty recruitment); Lever 2 = Task 3 (reliable founding); Task 4 is the integration gate that proves parity actually moved (the thing constant-tweaks failed to do). Stretch covers the residual-dominance case.
- **Avoids the prior failure:** no economy-overhead changes — parity is fixed at the recruitment-coupling source, so it won't regress wealth/parity the way the overhead cut did.
- **Type/name consistency:** `recruitmentBalanceMultiplier(world, heyaId)` signature is identical across the helper, both tests, and the bid loop. Constants (`BALANCE_STRENGTH_SENSITIVITY`, `BALANCE_MULTIPLIER_MIN/MAX`) named identically in the constants file and helper. The minted-myoseki object matches the fields the existing founding code reads (`id`,`name`,`status`,`ownerId`,`holderId`,`askingPrice`).
- **Determinism:** the balance multiplier is a pure function of rosters; the merit-myoseki id uses `rngForWorld`, never `Math.random`/`Date.now`.
- **Reuse:** `getStableRikishi`, `foundStable`, `addHeya`, `recordOyakataHandover`, the existing bid pipeline — no new infrastructure beyond one helper + one constants file.
- **Honest scope:** the only verification that counts is the 25-year diagnostic (Task 4). Unit-green is necessary but not sufficient — this is a balance problem, so the plan ends on the sim metric, not the test suite.
