# Plan 04 — Economy Rationalisation: Real-Sumo Grounding + Late-Game Pressure

## Background

This plan supersedes the earlier draft, which proposed simple floor-removal without addressing why the floors exist: the income model is broken in ways that make the floors load-bearing. Removing them without fixing the underlying model would make early-game unplayable rather than creating late-game pressure.

The research below used real JSA data (Wikipedia, confirmed 2018–2019 figures) compared against the current codebase constants. Every proposed change is justified against the real system.

---

## Audit: Where the Game Diverges from Real Sumo Economics

### 1. Kensho split is wrong (and internally inconsistent)

**Reality (confirmed 2019 JSA structure):**

- Sponsor pays: ¥70,000 per banner
- JSA administrative fee: ¥10,000 retained
- Winner receives: ¥60,000 total — ¥30,000 immediate cash, ¥30,000 to retirement fund

**Game (`src/constants/engine/economic.ts`):**

```
KENSHO_AMOUNT_PER_ENVELOPE = ¥70,000  ✓
KENSHO_SPLIT = { cash: ¥10,000, retirement: ¥50,000, jsaFee: ¥10,000 }  ✗
```

The game gives only ¥10,000 immediate cash — 3× lower than reality — and diverts ¥50,000 to retirement. Independently, `KENSHO_RIKISHI_SHARE_RATIO = 0.5` and `KENSHO_RETIREMENT_DIVERSION_RATIO = 0.3` imply yet another split (¥35,000 cash / ¥21,000 retirement / ¥14,000 JSA). Both models are internally inconsistent with each other. The `KENSHO_SPLIT` object and the ratio constants need to be reconciled to a single source of truth.

### 2. Mochikyukin multipliers are 3× underscaled

**Reality:**

- ¥4,000/unit/basho = ¥24,000/unit/year ✓ (game matches)
- Kinboshi: +10 units permanently → +¥240,000/year
- Yusho: +30 units → +¥720,000/year from that basho forward
- Rank floors: Yokozuna minimum 150 units (¥3,600,000/year), Ozeki 100 units, Makuuchi 60 units, Juryo 40 units

**Game (`src/constants/engine/economic.ts`):**

```
MOCHIKYUKIN_POINT_VALUE = ¥4,000  ✓
kinboshi: +3 points   ✗  (should be +10)
yusho:    +10 points  ✗  (should be +30)
kachi-koshi: +1 point per net win above even  ✗  (real is +0.5 per net win above even)
```

No rank floor guarantees exist in the game. This means a veteran Yokozuna with 20+ basho wins has negligible mochikyukin compared to reality. Hakuho earned ~¥52M/year from mochikyukin alone at career peak; the game's system would produce under ¥5M/year.

### 3. Non-sekitori receive no per-tournament allowance

**Reality:**

- Makushita: ¥165,000 per basho (×6/year = ¥990,000)
- Sandanme: ¥110,000 per basho (×6/year = ¥660,000)
- Jonidan: ¥88,000 per basho (×6/year = ¥528,000)
- Jonokuchi: ¥77,000 per basho (×6/year = ¥462,000)
- These flow to the wrestler's personal cash, not to the heya

**Game:** `NON_SEKITORI_ALLOWANCE = ¥15,000/week` constant exists but is marked as unused in comments ("replaced by basho teate"). No basho teate code exists. Non-sekitori wrestlers receive no income at all. This means the lower-division pathway has zero financial stakes.

### 4. Heya receives almost no JSA income tied to wrestler rank

**Reality:** JSA pays the oyakata ~¥1,250,000/month salary directly, plus per-sekitori incentives (amounts not public, but described as "scaling with rank"). The heya's revenue from having a yokozuna is substantial — this is how stable finances work.

**Game:**

- `JSA_STABLE_WEEKLY_GRANT = ¥50,000` (¥2.6M/year — correct order of magnitude for base grant)
- `JSA_PER_WRESTLER_SUBSIDY_MONTHLY`: makuuchi ¥150,000, juryo ¥100,000, makushita ¥50,000...
- But `OYAKATA_SALARY_MONTHLY = ¥1,200,000` is explicitly commented as "JSA pays directly (not heya expense)" with **no code that actually processes this payment**. The oyakata salary — the largest and most consistent heya income source — is an orphaned constant.

### 5. Koenkai band is not tied to wrestler prestige

**Reality:** Koenkai membership is driven almost entirely by the prestige of the heya's sekitori. When a stable's top wrestlers retire, koenkai donors follow. A stable with zero sekitori earns essentially zero koenkai.

**Game:** Koenkai band is determined purely by member count (5 tiers: <5/5–9/10–14/15–19/≥20 members). No mechanism drives member growth or decay based on in-ring results. A heya with 20 jonokuchi wrestlers has the same `powerful` band (¥7M/month) as one with 20 makuuchi wrestlers.

### 6. SEKITORI_OVERHEAD scales incorrectly vs income

A yokozuna costs the heya ¥5,000,000/month in SEKITORI*OVERHEAD, while the heya receives only ¥150,000/month JSA subsidy for them. The gap is ¥4,850,000/month — nearly the sekitori's entire personal salary. In reality, the heya \_profits* from having a yokozuna through JSA incentives and koenkai. The overhead model has the direction of financial pressure backwards.

The overhead abstraction isn't entirely wrong — facilities, food, staff, and tournament logistics are real costs. But at ¥5M/month for a yokozuna (¥60M/year overhead vs ¥36M salary), it's numerically inverted. Reducing sekitori overhead to match reality's food/facilities scale requires a commensurate increase in JSA rank-based income to keep the budget balanced.

### 7. Safety net design (confirmed from original plan)

`MAINTENANCE_SUBSIDY_AMOUNT = ¥500,000/week` and `KOENKAI_SURVIVAL_FLOOR = ¥28,000/week` prevent financial pressure from accumulating. These should be removed — but only once the income model is fixed, otherwise early-game collapses.

### 8. Ichimon provides training bonuses (gameplay fiction, not reality)

**Reality:** Ichimon gives political benefits only — board seats, election blocs, joint degeiko access. No financial transfers, no solidarity funds, no training stat bonuses.

**Gameplay decision:** The game's ichimon training bonuses (+5–10% stat growth by faction) are deliberate fiction to make the faction choice mechanically meaningful. This plan leaves them intact as a gameplay layer. The political weight difference (Dewanoumi=300 banzuke weight vs others=100) is realistic and should be preserved. No change needed here.

---

## Proposed Changes

### Change 1 — Fix Kensho Split (2019 JSA structure)

**File: `src/constants/engine/economic.ts`**

Remove the conflicting ratio constants and standardize on the explicit split:

```typescript
// Remove:
// export const KENSHO_RIKISHI_SHARE_RATIO = 0.5;
// export const KENSHO_RETIREMENT_DIVERSION_RATIO = 0.3;

// Replace KENSHO_SPLIT with:
export const KENSHO_SPLIT = {
  jsaFee: 10_000, // JSA administrative cut
  cash: 30_000, // Immediate cash to winner (was ¥10,000 — now matches 2019 JSA)
  retirement: 30_000, // Deferred to retirement fund (was ¥50,000)
} as const;
// Sum: 70,000 = KENSHO_AMOUNT_PER_ENVELOPE ✓
```

Search for any code consuming `KENSHO_RIKISHI_SHARE_RATIO` or `KENSHO_RETIREMENT_DIVERSION_RATIO` and replace with `KENSHO_SPLIT.cash / KENSHO_AMOUNT_PER_ENVELOPE` and `KENSHO_SPLIT.retirement / KENSHO_AMOUNT_PER_ENVELOPE` respectively.

---

### Change 2 — Scale Mochikyukin to Reality + Add Rank Floors

**File: `src/constants/engine/economic.ts`**

```typescript
// Mochikyukin point awards — aligned to real JSA values
export const MOCHIKYUKIN_POINTS = {
  kachiKoshiPerNetWin: 0.5, // per net win above even (was 1 per kachi-koshi, ambiguous)
  kinboshi: 10, // per kinboshi (was 3 — real: 10 units)
  junYusho: 5, // runner-up (unchanged)
  yusho: 30, // championship (was 10 — real: 30 units)
  zenshoYusho: 50, // perfect record (new — real: 50 units extra)
} as const;

// Minimum guaranteed mochikyukin units by rank (new — real JSA floors)
export const MOCHIKYUKIN_RANK_FLOORS: Record<string, number> = {
  yokozuna: 150,
  ozeki: 100,
  sekiwake: 80,
  komusubi: 70,
  maegashira: 60,
  juryo: 40,
};
```

**File: wherever mochikyukin points are awarded** (search for `mochikyukinPoints` write sites — likely `bashoResultsApplier.ts` or equivalent):

Replace point values with `MOCHIKYUKIN_POINTS.kinboshi` / `MOCHIKYUKIN_POINTS.yusho` constants.

**File: `src/engine/tick/phases/monthly/economics/salaries.ts`** — in `payMochikyukinBonuses()`, apply rank floor before payout:

```typescript
// Apply rank floor — a wrestler's mochikyukin account can never be below the
// JSA minimum for their current rank.
const floor = MOCHIKYUKIN_RANK_FLOORS[rikishi.rank?.split(" ")[0] ?? ""] ?? 0;
const effectivePoints = Math.max(rikishi.stats.achievements?.mochikyukinPoints ?? 0, floor);
const payoutAmount = effectivePoints * MOCHIKYUKIN_POINT_VALUE;
```

---

### Change 3 — Implement Non-Sekitori Per-Tournament Allowances

**File: `src/constants/engine/economic.ts`**

```typescript
// Per-tournament allowances paid to non-sekitori wrestlers at each basho (real JSA values)
export const NON_SEKITORI_BASHO_ALLOWANCE: Record<string, number> = {
  makushita: 165_000,
  sandanme: 110_000,
  jonidan: 88_000,
  jonokuchi: 77_000,
};
```

**File: wherever basho results are applied** (the phase that closes out a basho and distributes prize money) — add a loop paying non-sekitori:

```typescript
// Pay per-tournament allowances to non-sekitori
for (const [id, r] of world.rikishi) {
  const allowance = NON_SEKITORI_BASHO_ALLOWANCE[r.division];
  if (!allowance || !r.economics) continue;
  builder.updateRikishi(id, {
    economics: {
      ...r.economics,
      cash: (r.economics.cash ?? 0) + allowance,
      totalEarnings: (r.economics.totalEarnings ?? 0) + allowance,
      currentBashoEarnings: (r.economics.currentBashoEarnings ?? 0) + allowance,
    },
  });
}
```

Remove (or keep as dead code marker) `NON_SEKITORI_ALLOWANCE = ¥15,000/week` since it was never used.

---

### Change 4 — Implement Oyakata Salary as Heya Income

The `OYAKATA_SALARY_MONTHLY = ¥1,200,000` constant exists but is never applied anywhere. In reality this is the primary guaranteed heya income.

**File: `src/engine/systems/economy/FinanceCalculator.ts`** — add to weekly income:

```typescript
// Oyakata salary: JSA pays the stablemaster ~¥1.2M/month regardless of heya performance.
// This is the financial bedrock of the heya. Divided by 4 for weekly calculation.
const weeklyOyakataSalary = OYAKATA_SALARY_MONTHLY / 4; // = ¥300,000/week
```

Include in `effectiveIncome` sum. This adds ¥300,000/week = ¥15.6M/year to every heya — making the survival floor structurally unnecessary (a zero-wrestler heya with just the oyakata still earns enough to not immediately die).

---

### Change 5 — Scale JSA Per-Sekitori Income to Rank

The current JSA per-wrestler subsidy (makuuchi ¥150K/month) is tiny vs the overhead (¥1.5M/month). The JSA actually pays substantial per-sekitori incentives. Raise these to partially offset sekitori overhead:

**File: `src/constants/engine/economic.ts`**

```typescript
// JSA per-sekitori monthly income to heya — represents JSA incentive payments
// that scale with rank, as per the real JSA structure (exact amounts not public).
// Calibrated so a heya with 1 yokozuna nets roughly +¥1.5M/month from rank bonuses
// vs a heya with 1 maegashira.
export const JSA_PER_WRESTLER_SUBSIDY_MONTHLY: Record<string, number> = {
  // Before: makuuchi ¥150K, juryo ¥100K, makushita ¥50K, sandanme ¥30K, jonidan ¥20K, jonokuchi ¥15K
  yokozuna: 2_500_000, // was ¥150K — a yokozuna is a massive revenue generator for the JSA
  ozeki: 2_000_000, // was ¥150K
  sekiwake: 1_200_000, // was ¥150K
  komusubi: 1_000_000, // was ¥150K
  maegashira: 400_000, // was ¥150K — modest but meaningful
  juryo: 200_000, // was ¥100K
  makushita: 50_000, // was ¥50K — unchanged (non-sekitori, minimal JSA investment)
  sandanme: 30_000, // unchanged
  jonidan: 20_000, // unchanged
  jonokuchi: 15_000, // unchanged
};
```

**Calibration check:** A heya with 1 yokozuna now receives ¥2.5M/month from JSA + ¥1.25M/month oyakata salary = ¥3.75M/month JSA income vs ¥5M/month yokozuna overhead = net -¥1.25M/month from that wrestler. Breakeven requires koenkai income. This matches the real dynamic: a yokozuna needs strong koenkai to be financially worthwhile; JSA income alone doesn't cover operating costs.

---

### Change 6 — Tie Koenkai Band to Roster Prestige

**File: `src/engine/systems/economy/SponsorshipService.ts`** — replace the member-count band with a prestige-weighted calculation:

Current band formula: member count thresholds (0–4/5–9/10–14/15–19/≥20).

New formula runs post-basho and adjusts the `koenkaiGrowthRate` based on roster composition:

```typescript
// Compute heya prestige score — drives koenkai patron recruitment
function computeHeyaPrestigeScore(heya: Heya, world: WorldState): number {
  const rosterPrestige = (heya.rikishiIds ?? []).reduce((sum, id) => {
    const r = world.rikishi.get(id);
    if (!r) return sum;
    // Weight heavily toward high-rank wrestlers — this is what attracts koenkai members
    const rankWeight: Record<string, number> = {
      yokozuna: 40,
      ozeki: 30,
      sekiwake: 20,
      komusubi: 15,
      maegashira: 8,
      juryo: 4,
    };
    return sum + (rankWeight[r.rank?.split(" ")[0] ?? ""] ?? 1);
  }, 0);
  return Math.min(100, rosterPrestige);
}

// Post-basho koenkai band adjustment:
// A prestige-60 stable (e.g. 2 maegashira + 2 juryo) should have moderate-to-strong koenkai.
// A prestige-5 stable (all lower-division) should struggle to maintain weak band.
function targetKoenkaiBandFromPrestige(prestige: number): KoenkaiBandType {
  if (prestige >= 80) return "powerful";
  if (prestige >= 55) return "strong";
  if (prestige >= 30) return "moderate";
  if (prestige >= 10) return "weak";
  return "none";
}
```

Post-basho, if the stable's actual band is above target prestige band, apply churn (member loss). If below target, apply modest growth. This means a yokozuna retirement that drops prestige from 80 to 30 will gradually slide koenkai from `powerful` to `moderate` over 2–3 basho — matching the real pattern of koenkai following stars.

---

### Change 7 — Reduce Sekitori Overhead to Match Reality

The current overhead is calibrated as "total cost" which inverts the P&L direction. Reduce to represent actual heya-side food/facilities/travel costs:

**File: `src/constants/engine/economic.ts`**

```typescript
// Heya's direct monthly cost per sekitori (food, facilities share, travel prep, mawashi, etc.)
// Excludes JSA-funded salary (credited directly to wrestler, not heya cost).
// Real food/chankonabe for a wrestler: ~¥100-200K/month; total facilities/overhead ~¥200-400K.
export const SEKITORI_OVERHEAD_MONTHLY: Partial<Record<string, number>> = {
  // Before: yokozuna ¥5M, ozeki ¥3.5M, sekiwake ¥2.5M, komusubi ¥2M, maegashira ¥1.5M, juryo ¥800K
  yokozuna: 1_500_000, // food + facilities + entourage + tournament logistics
  ozeki: 1_200_000,
  sekiwake: 900_000,
  komusubi: 800_000,
  maegashira: 600_000,
  juryo: 350_000,
};
export const NON_SEKITORI_OVERHEAD_MONTHLY = 80_000; // food + dorm (was ¥100K — minor reduction)
```

**P&L impact of Changes 4+5+7 combined** (example: heya with 1 yokozuna, 10 lower-division):

- Weekly income: ¥300K (oyakata) + ¥625K (yokozuna JSA/4) + ¥50K (base grant) = ~¥975K/week
- Weekly overhead: ¥750K (fixed) + ¥375K (yokozuna, ¥1.5M/4) + ¥200K (10 lower-div, ¥80K×12÷52) = ~¥1.3M/week
- Net: -¥325K/week before koenkai. A `moderate` koenkai (¥1.5M/month = ¥375K/week × 70% = ¥262K/week) brings near-breakeven.
- A `powerful` koenkai (¥7M/month = ¥1.225K/week × 70% = ¥857K/week) produces a healthy ¥530K/week surplus.

This matches the real dynamic: koenkai is the decisive variable, not JSA subsidies.

---

### Change 8 — Remove Safety Nets (Now Structurally Safe)

With the oyakata salary implemented (Change 4), the `KOENKAI_SURVIVAL_FLOOR` is no longer necessary — every heya has a minimum ¥300K/week guaranteed income from their oyakata's JSA salary.

**File: `src/engine/systems/economy/FinanceCalculator.ts`**

```typescript
// Remove: const maintenanceSubsidy = heya.funds < 0 ? MAINTENANCE_SUBSIDY_AMOUNT : 0;
// Remove: Math.max(..., KOENKAI_SURVIVAL_FLOOR)

// After Change 4 adds oyakata salary to effectiveIncome, the floor is structural:
// even with zero koenkai, zero sponsors, and zero per-wrestler subsidies,
// a heya earns ¥300K/week from oyakata salary + ¥50K JSA base = ¥350K/week.
// That's still below ¥750K fixed overhead, so financial pressure remains real —
// it just doesn't drop to zero income.
const effectiveIncome =
  weeklyKoenkai + weeklyJsaSubsidy + weeklySponsorTierIncome + jsaBaseGrant + weeklyOyakataSalary;
```

Deprecate `MAINTENANCE_SUBSIDY_AMOUNT` and `KOENKAI_SURVIVAL_FLOOR` — leave the constants defined but set to 0 so existing references don't break, then remove in a follow-up cleanup.

---

### Change 9 — Lower DEBT_LIMIT to Match Merger Cascade

With the subsidy removed and income model corrected, the hard floor at -¥20M allows 4× the merger threshold (-¥15M) to accumulate silently. Tighten it:

**File: `src/constants/engine/economic.ts`**

```typescript
export const DEBT_LIMIT = -15_500_000;
// Just past the merger threshold (-15M), so the merger fires slightly before the engine clamp.
// Previously -20M — allowed too much unchecked drift past the merger trigger.
```

---

## Complete Budget Impact Scenarios

### Scenario A: Struggling Low-Division Stable (0 sekitori, 8 lower-div wrestlers)

| Source                          | Weekly Amount      |
| ------------------------------- | ------------------ |
| Oyakata salary                  | ¥300,000           |
| JSA base grant                  | ¥50,000            |
| JSA per-wrestler (8 × ¥20K / 4) | ¥40,000            |
| Koenkai (none band)             | ¥0                 |
| **Total income**                | **¥390,000**       |
| Fixed overhead                  | ¥750,000           |
| Roster overhead (8 × ¥80K / 4)  | ¥160,000           |
| **Total expenses**              | **¥910,000**       |
| **Net**                         | **−¥520,000/week** |

Without koenkai, this stable burns through starting funds in ~57 weeks. That's ~1 real year to build up sekitori or face merger — genuine pressure without being instant-fail.

### Scenario B: Mid-Tier Stable (1 maegashira, 1 juryo, 8 lower-div)

| Source                            | Weekly Amount      |
| --------------------------------- | ------------------ |
| Oyakata salary                    | ¥300,000           |
| JSA base grant                    | ¥50,000            |
| JSA maegashira subsidy (¥400K/4)  | ¥100,000           |
| JSA juryo subsidy (¥200K/4)       | ¥50,000            |
| JSA lower-div (8 × avg ¥25K / 4)  | ¥50,000            |
| Koenkai (moderate: ¥1.5M/4 × 70%) | ¥262,500           |
| **Total income**                  | **¥812,500**       |
| Fixed overhead                    | ¥750,000           |
| Maegashira overhead (¥600K/4)     | ¥150,000           |
| Juryo overhead (¥350K/4)          | ¥87,500            |
| Lower-div overhead (8 × ¥80K/4)   | ¥160,000           |
| **Total expenses**                | **¥1,147,500**     |
| **Net**                           | **−¥335,000/week** |

With a `strong` koenkai (¥612,500/week), this flips to +¥277K/week surplus. Koenkai management is the decisive lever — matching reality.

### Scenario C: Elite Stable (1 yokozuna, 2 maegashira, 2 juryo, 8 lower-div)

| Source                          | Weekly Amount      |
| ------------------------------- | ------------------ |
| Oyakata salary                  | ¥300,000           |
| JSA base grant                  | ¥50,000            |
| JSA yokozuna subsidy (¥2.5M/4)  | ¥625,000           |
| JSA 2× maegashira (¥400K×2/4)   | ¥200,000           |
| JSA 2× juryo (¥200K×2/4)        | ¥100,000           |
| JSA lower-div                   | ¥50,000            |
| Koenkai (powerful: ¥7M/4 × 70%) | ¥1,225,000         |
| **Total income**                | **¥2,550,000**     |
| Fixed overhead                  | ¥750,000           |
| Yokozuna overhead (¥1.5M/4)     | ¥375,000           |
| 2× maegashira overhead          | ¥300,000           |
| 2× juryo overhead               | ¥175,000           |
| Lower-div overhead              | ¥160,000           |
| **Total expenses**              | **¥1,760,000**     |
| **Net**                         | **+¥790,000/week** |

Elite stable generates ~¥41M/year surplus — affluent but not trivially so. The yokozuna could retire and drop the koenkai to `strong`, cutting the surplus to roughly +¥177K/week — financially tight and motivating succession planning.

---

## Affected Files

| File                                                   | Change                                                                                                                                                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/constants/engine/economic.ts`                     | Fix kensho split, scale mochikyukin, add basho allowances, add oyakata salary, reduce sekitori overhead, raise JSA per-sekitori income, lower DEBT_LIMIT, add mochikyukin rank floors |
| `src/engine/systems/economy/FinanceCalculator.ts`      | Add oyakata salary to income, remove maintenance subsidy, remove survival floor                                                                                                       |
| `src/engine/systems/economy/SponsorshipService.ts`     | Tie koenkai band progression to prestige score post-basho                                                                                                                             |
| `src/engine/tick/phases/[basho results phase]`         | Add non-sekitori basho allowance payment to wrestlers                                                                                                                                 |
| `src/engine/tick/phases/monthly/economics/salaries.ts` | Apply mochikyukin rank floor before payout                                                                                                                                            |
| `src/engine/types/rikishi.ts`                          | Add `lastYushoWeek?: number` for koenkai prestige calculation                                                                                                                         |

---

## Testing Checklist

- [ ] Kensho: win a bout with 2 banners — confirm ¥60,000 received (¥30K cash + ¥30K retirement), not ¥20K
- [ ] `KENSHO_RIKISHI_SHARE_RATIO` and `KENSHO_RETIREMENT_DIVERSION_RATIO` no longer referenced anywhere after removal
- [ ] Kinboshi: earn a kinboshi — confirm mochikyukin gains +10 points (not +3)
- [ ] Yusho: win a basho — confirm mochikyukin gains +30 points (not +10)
- [ ] Mochikyukin payout for a yokozuna with 200 points: ¥4,000 × max(200, 150) × bimonthly = ¥800,000
- [ ] Mochikyukin payout for a yokozuna with only 50 points: floor kicks in, pays based on 150 points = ¥600,000
- [ ] End of basho: jonokuchi wrestler receives ¥77,000 credited to their cash
- [ ] Makushita wrestler receives ¥165,000
- [ ] Heya with zero wrestlers still earns ¥350K/week (oyakata + base grant) — no longer zero
- [ ] New game, no management: stable declines but doesn't hit merger in first year
- [ ] Yokozuna retires: koenkai band declines over 2–3 basho, reflects prestige drop
- [ ] Elite stable with 1 yokozuna nets approximately ¥790K/week surplus (within ±20%)
- [ ] Finance tests in `src/tests/unit/engine/` pass — run `npx vitest run src/tests/unit/engine`
- [ ] `npx tsc --noEmit` — clean (new `mochikyukinRankFloors` and modified constant types)

---

## Estimated Effort

5–6 days. This is a multi-file economy overhaul touching constants, the weekly finance calculator, the sponsorship service, the salary phase, and the basho results phase. The constant changes are the easiest part; the koenkai prestige system and the verification that all downstream consumers of `JSA_PER_WRESTLER_SUBSIDY_MONTHLY` handle the new values correctly are the main risks. The mochikyukin floor requires finding all write sites for `mochikyukinPoints` — search for them before starting. A full playtest session from new game to year 5 is required before this is considered done.

## Note on Ichimon

Ichimon's training bonuses (+5–10% stat growth by faction) are retained as **deliberate gameplay fiction**. In reality, ichimon provides only political and social benefits — no financial transfers or training advantages. The game's design decision to give them training meaning is fine for differentiation; this plan does not change it. The banzuke political weight difference (Dewanoumi=300 vs others=100) is realistic and should be preserved.
