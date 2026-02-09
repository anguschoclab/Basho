# Basho Constitution — Unified Canonical Megacontract v1.0 (Harmonized, Non‑Lossy)
**Build date:** 2026-01-12  
**Status:** HARMONIZED / NON‑LOSSY / IMPLEMENTATION‑GRADE  
**Project name:** **Basho** (all legacy naming normalized to “Basho” throughout this edition)

---

## What this document is
This “Constitution” is the **binding integration contract** for Basho’s simulation, UI, and institutional world. It harmonizes the following **eight** canonical documents into one coherent hierarchy **without deleting anything**.

### Included canonical sources (embedded verbatim in Part B)
1. [Foundations, World Entry, UI & Observability ↔ Time/Calendar/SaveLoad](#system-1-foundations-world-entry-ui-observability-time-calendar-saveload)
2. [Banzuke/Scheduling/Awards ↔ Historical Memory/Almanac](#system-2-banzuke-scheduling-awards-historical-memory-almanac)
3. [Beya Staff/Welfare ↔ NPC Manager AI](#system-3-beya-staff-welfare-npc-manager-ai)
4. [Identity/Tactical/Reputation/Lineage ↔ Talent Pools ↔ Rikishi Development](#system-4-identity-tactical-reputation-lineage-talent-pools-rikishi-development)
5. [Play-by-Play (PBP) ↔ Institutional Power/Governance/Media](#system-5-play-by-play-pbp-institutional-power-governance-media)
6. [Master Context ↔ System Interaction Megacontract ↔ Technical Addenda](#system-6-master-context-system-interaction-megacontract-technical-addenda)
7. [Combat & Kimarite](#system-7-combat-kimarite)
8. [Unified Economy / Kenshō / Sponsors (incl. Governance & Scandals)](#system-8-unified-economy-kensh-sponsors-incl-governance-scandals)

### Non‑lossy guarantee
- **Part A** (this section) is a curated, hierarchical constitution that:
  - defines shared primitives and cross‑system interfaces,
  - documents *interaction ordering* and event emission contracts,
  - clarifies discrepancies and precedence,
  - adds missing “glue” where the sources meet.
- **Part B** embeds **all eight source documents verbatim** (no deletions), so nothing is lost.

---

# PART A — THE CONSTITUTION (Curated, Cross‑System, Binding)

## A0. Constitutional Design Laws (apply to everything)
### A0.1 Determinism, replay safety, and auditability
1) **Determinism is absolute.** Same `WorldSeed` + same player/NPC decisions + same calendar advancement → identical:
- sim outcomes, banzuke, awards, economy ledgers, AI decisions,
- history events/snapshots, and *presentation ordering* (digests, headlines, PBP selection order).

2) **Event sourcing is the backbone.** Systems emit immutable events; downstream systems consume events and build snapshots.  
3) **No UI leaks engine truth.** UI shows bands, descriptors, and explainable “why” — never hidden weights, thresholds, or raw probabilities.  
4) **Separation of concerns is sacred.**
- **Combat produces facts** (kimarite, stance, impulse arc, injury events).
- **Narrative/PBP renders facts** and must never feed back into resolution.
- **Governance rules**, **economy ledgers**, and **history** are inputs to narrative, not outputs of it.

### A0.2 Timescales are real (no same‑tick paradoxes)
All feedback loops must be time‑gated (weekly/monthly/basho/end/year) to prevent causal loops where narrative changes the outcome that created the narrative.

### A0.3 Institutions behave like institutions
Beya/staff/governance/sponsors remember patterns. “Short‑term gains” can be paid back later via deterministic scrutiny, sanctions, sponsor churn, and legacy damage.

---

## A1. Shared primitives (single vocabulary)
### A1.1 Seeds and deterministic randomness (standardized)
- `WorldSeed` is the root of the entire universe.
- `DaySeed = hash(WorldSeed, dayIndexGlobal)` is the canonical day root.
- `BoutSeed = hash(WorldSeed, bashoId, day, boutIndex)` is the canonical bout root (combat-only).
- Presentation can derive **UI seeds** (e.g., `hash(DaySeed, uiContextId)`) but **must not** mutate sim state.

### A1.2 Canonical clock (SimTime)
Time advances only via explicit commands:
- Advance One Day
- Advance to Next Scheduled Event
- Holiday
- Auto‑Sim

**UI browsing may never advance time.** If a screen needs “freshness,” it must request a *snapshot* at the current time, not tick.

### A1.3 Canonical identities and immutability
- All core entities have immutable IDs (`RikishiId`, `BeyaId`, `StaffId`, `SponsorId`, `EventId`, etc.).
- Names (shikona, sponsor display names, role titles) are presentation and may change without breaking identity.

---

## A2. Unified dataflow: “Facts → Events → Snapshots → UI”
### A2.1 The one-way truth pipeline
1) **Sim systems** change state deterministically.
2) They emit **immutable events** (append‑only).
3) Snapshot builders compile:
- Almanac snapshots
- Beya operational snapshots
- Economy ledgers
- Governance ruling ledgers
4) UI reads snapshots and **banded/visibility‑gated projections**.

### A2.2 Forbidden pattern
UI (or narrative generation) computing “live truth” from raw hidden state at render time is forbidden. If a view needs data, it must come from an approved snapshot or a banded, observability‑safe projection.

---

## A3. Global tick ordering (the “Big Eight” integration)
Every day tick is a deterministic pipeline. The Constitution defines the global order; each subsystem defines its internal order.

### A3.1 Daily tick (authoritative top-level)
When `AdvanceOneDay()` executes:

**0) Preflight**
- verify world integrity
- compute `DaySeed`
- resolve phase transitions (enter/leave basho windows)

**1) Scheduled institutional events (non-combat)**
- governance docket items due today
- loan payments due today
- sponsor relationship expirations due today
- staffing/facility maintenance due today (if daily modeled)

**2) Training & welfare micro‑effects (if daily modeling exists)**
- apply daily fatigue drift and recovery tick hooks (but keep major progression weekly/monthly)

**3) Basho tournament day (if in basho days 1–15)**
- torikumi generation (if needed)
- bout resolution (combat)
- injury events, kyūjō updates
- kenshō computation + sponsor banner allocation + payouts
- PBP fact packet queued

**4) Post‑bout / post‑day downstream updates**
- rivalry heat updates
- crowd memory updates
- media headline queue updates
- AI learning signals and meta recognition counters
- history event emission for all public facts (bout results, injuries, withdrawals)

**5) Economy cadence (daily)**
- daily expenses/micro-income (if modeled)
- ledger entries finalized

**6) Save checkpoints**
- autosave policy evaluation
- checkpoint is written **after** all day pipelines complete

**7) UI digest batch (observability-gated)**
- generate digests and notifications **only after** state is committed
- never interrupt mid-pipeline except for “critical gate” interrupts defined in Time canon

### A3.2 Weekly boundary (authoritative)
On week increment:
- compute staff fatigue/coverage dilution, welfare risk drift, compliance state transitions
- derive PerceptionSnapshot for managers/player (bands only)
- run NPC Manager AI weekly decision loop OR apply player weekly decisions
- scouting/observability estimate refresh (banded)
- weekly economy postings (operating costs, some payroll items if weekly)
- autosave weekly (if enabled)

### A3.3 Monthly boundary (authoritative)
On month boundary:
- salaries/allowances (league → rikishi accounts)
- kōenkai/supporter income (→ beya funds)
- rent/maintenance and facility upkeep postings
- loans/interest schedules
- governance monthly docket refresh (if configured)

### A3.4 Basho lifecycle boundaries (authoritative)
**Pre‑basho window**
- banzuke is treated as locked for the upcoming basho preview surfaces
- sponsor allocations (kenshō expectations) are computed as bands, not explicit odds

**Basho days 1–15**
- daily torikumi + combat + kenshō + PBP
- injury and withdrawal events are public and logged

**Post‑basho window**
- playoffs resolve (if needed)
- awards lock (yūshō, sanshō, trophies)
- banzuke recompute and lock for next basho
- snapshots written (Almanac)
- records/streaks/HoF eligibility recompute (post-lock only)
- recruitment windows and institutional reviews fire (player + NPC)

### A3.5 Year boundary (authoritative)
- yearly intake/pool expansions
- era/decade rollups and “Era Book” summaries
- Hall of Fame induction pipeline (deterministic)
- macro sponsor pool expansion (if configured)

---

## A4. Combat is the physics constitution (how other systems must treat it)
### A4.1 Combat inputs (read-only snapshot)
Combat consumes only:
- pre-bout rikishi state snapshots (physique, fatigue, injuries, identity/tactical biases)
- basho context and era state
- seeds (`BoutSeed`)

### A4.2 Combat outputs (facts)
Combat must output, at minimum:
- kimarite id
- impulse arc (bands)
- stance stability path
- edge resolution path
- counter flag
- injury events (public), kyujo flags if triggered
- fatigue deltas
These outputs are:
- written to history as immutable events,
- consumed by PBP as the “fact packet,”
- used by AI as learning signals (never as secret probabilities).

---

## A5. Banzuke ↔ History/Almanac: lock windows and immutability
### A5.1 Basho end lock ordering (binding)
1) Resolve any playoffs; lock champion.
2) Lock final division records and participation summaries.
3) Compute and lock awards.
4) Reassign ranks and lock next banzuke.
5) Emit end-of-basho historical events (rank snapshots, promotions/demotions, awards).
6) Build snapshots and recompute records/HoF eligibility using locked events only.

### A5.2 Almanac is snapshot-driven
The Almanac must be built from:
- immutable historical events, plus
- approved deterministic aggregates at boundaries.
No ad-hoc “recompute everything from scratch at render time.”

### A5.3 Injury visibility hard rule
Kyūjō/withdrawal and injury durations are always public in history; diagnosis specificity may be vague, but the event exists and is shown.

---

## A6. Economy / Sponsors / Governance: money is ledger-true, pressure is narrative, rules are institutional
### A6.1 Accounts never merge
Beya funds, rikishi cash, retirement funds, oyakata personal funds, and league treasury are separate. Transfers only occur via explicitly defined routes.

### A6.2 Kenshō (per-bout) canonical cadence
For a basho bout:
1) bout resolved (combat)
2) banner count computed (economy rules)
3) sponsors assigned to each banner (sponsor system)
4) ceremony hooks queued (PBP/UI)
5) kenshō split executed (50/50 rikishi/beya; retirement fund diversions as specified)
6) prestige updates and sponsor cooldowns applied
7) ledger entry finalized

### A6.3 Governance decision engine is deterministic and public
Council actions follow a pipeline:
- trigger detected → snapshot → rule evaluation → mandatory ruling → media narrative → permanent record.
No hidden punishments. No surprise closures.

### A6.4 Sponsor entities are persistent actors, not magic
Sponsors:
- can appear as banner names, kōenkai members/pillars, or benefactors/creditors,
- never affect combat physics,
- influence visibility, narrative pressure, and institutional stability through deterministic rules.

---

## A7. Beya operations, welfare, and NPC Manager AI: continuity without cheating
### A7.1 PerceptionSnapshot is the non-cheating interface
NPC managers and the player see:
- qualitative stable health bands,
- welfare risk bands,
- governance pressure bands,
- media heat bands,
- rivalry perception bands.
They do **not** see raw internal weights, injury probabilities, or secret thresholds.

### A7.2 Welfare risk is first-class institutional survival pressure
Welfare and medical negligence can deterministically escalate:
- investigations → sanctions → restrictions → forced changes → merger/closure (if applicable).
AI is required to prioritize institutional survival over short-run performance when compliance risk is high.

### A7.3 Audit logs are mandatory
Two required streams:
- institutional operations log (welfare/compliance/staff/facilities/governance)
- manager decision log (tickId, inputs in bands, actions, outcomes)
Invariant: identical inputs → identical logs.

---

## A8. Identity/Tactical/Reputation/Lineage ↔ Development ↔ Talent Pools: how people become wrestlers, and how they change
### A8.1 Lifecycle (canonical)
Candidate (pool) → signed person → rikishi roster entity → career arc → retirement → pipelines (staff/oyakata/kabu).

Only the Pools/Pipelines layer may create “new people”; other systems may only transform existing entities.

### A8.2 Separation of “body” and “behavior”
- Development produces measurable evidence (physique trajectory, skills, fatigue, injury states).
- Combat consumes that evidence as state.
- Identity/Tactical layers bias *intent* and label *interpretations* (myth, reputation, deviance, lineage pressure).
- Reputation/deviance never changes physics; it changes incentives, pressure, sponsor/media dynamics, and long-run choices.

### A8.3 Drift rules (slow, boundary-gated)
Identity and tactical drift occur on explicit gates (monthly/basho-end) with hysteresis/locks so labels do not oscillate.

---

## A9. PBP, Media, Institutional Power: narrative surfaces, never causal engines
### A9.1 PBP consumes fact packets
PBP is generated from:
- combat fact packet
- sponsor ceremony hooks (names/tier tags)
- crowd memory context
- media desk tone/faction tags
It must never:
- alter the bout,
- introduce “new facts” not in the event log.

### A9.2 Institutional power frames the narrative but cannot rewrite truth
Governance, media, sponsor pressure, and beya lineage can:
- amplify, suppress, reinterpret, or stigmatize public events,
but cannot delete or alter the underlying historical events.

---

## A10. Discrepancies and reconciliations (Constitution-level)
This Constitution resolves cross-file tensions using these rules:

1) **No-leak overrides convenience.** If a view would reveal hidden state, it must be banded or omitted.
2) **Lock windows prevent off-by-one errors.** Basho-end locking order is binding to keep banzuke/history/almanac consistent.
3) **“Probability” language means deterministic propensity.** Any mention of “roll” or “chance” is interpreted as a deterministic check against thresholds derived from seeds and state.
4) **Sponsors never alter combat.** Any narrative describing “sponsor pressure” is a long-horizon incentive, not a physics modifier.
5) **AI uses the same information layers as the player.** PerceptionSnapshot is the interface; “AI does not cheat” is binding.

Where Part A is silent: defer to the most directly relevant source file in Part B.

---

## A11. Implementation checklist (what must exist for the Constitution to be true)
1) Global `EventBus` (append-only, ordered, typed).
2) Snapshot builders:
- Almanac snapshots (basho/rikishi/beya)
- Economy ledger snapshots
- Governance ruling ledger snapshots
- Beya operational snapshots and PerceptionSnapshots
3) Strict tick pipeline with boundary gates and tests:
- day-by-day vs holiday equivalence
- save/load determinism
- no-leak audits
4) Deterministic tie-break rules everywhere (sorted keys + stable ids).
5) Verifiable “no implicit time advance” rule on UI screens.

---

# PART B — SOURCE PRESERVATION ANNEX (Verbatim, Non‑Lossy)
> Everything below is embedded verbatim. No deletions. No rewriting.  
> If Part A is silent on a point, these sources decide according to the precedence rules stated in each source.


## SYSTEM 1 — Foundations, World Entry, UI & Observability ↔ Time/Calendar/SaveLoad
**Source file:** `Foundations_UI_Observability_x_Time_SaveLoad_Megacanon_v1.0_HARMONIZED_NONLOSSY.md`

```md
# Basho × Basho — Foundations/UI/Observability ↔ Time/Calendar/SaveLoad Megacanon v1.0 (Harmonized, Non‑Lossy)
**Build date:** 2026-01-12  
**Status:** HARMONIZED / NON‑LOSSY / IMPLEMENTATION‑GRADE  
**Scope:** World boot & entry, UI/observability/fog-of-war, and the deterministic calendar + daily/weekly/monthly/basho/year boundaries + save/load/autosave/holiday/auto‑sim loop.

## What this file is
This megacanon merges two authoritative contracts into one integrated, deterministic system:

1) **Basho — Foundations, World Entry, UI & Observability Canon v2.0**  
2) **Basho — Time Advancement, Calendar, Game Loop & Save/Load Canon v1.0**  

### Non‑lossy guarantee
- **Part A**: curated, hierarchical integration spec documenting all interactions and shared interfaces.
- **Part B**: **verbatim Source Preservation Annex** embedding both sources in full (no deletions).

### Precedence & resolution rules (binding within this file)
1. **Part A** is authoritative for cross‑system ordering, interfaces, and “what UI is allowed to show” at each time boundary.
2. If Part A is silent:
   - world boot/entry, IDs, UI architecture, observability/fog rules → **Foundations v2.0**
   - calendar/time advancement, tick order, save/load/autosave/holiday/auto‑sim → **Time/SaveLoad v1.0**
3. If a time rule would cause an information leak, **Foundations v2.0 leak prohibitions override** (UI must not expose engine truth).
4. Determinism is absolute: same worldSeed + same player inputs → identical sim state *and* identical UI output ordering.

---

# PART A — Harmonized Specification (Curated, Cross‑System)

## A0. Unified thesis: “The world exists before the player — and time is the world’s heartbeat”
- Foundations defines **what exists**, **who owns what**, and **what can be seen**.
- Time/SaveLoad defines **when changes happen**, **how they are ordered**, and **how history and state persist**.
Together they enforce the signature constraint:
> **UI never reveals engine truth, but time always advances the truth deterministically.**

---

## A1. Shared primitives (normalized)
### A1.1 WorldSeed, IDs, and deterministic derivations
- `worldSeed` is created at world boot and is the root of determinism.
- IDs are immutable and globally unique; names/shikona are presentation-only.
- All “random” draws must be seed-derived, and UI variation must never mutate sim state.

**Unified RNG policy:**
- `WorldSeed` (root)
- `DaySeed = hash(WorldSeed, dayIndexGlobal)` (Time canon)
- Screen-level presentation seeds derive from `DaySeed + UIContextId` (Foundations-compatible), used for phrasing/ordering only.

### A1.2 SimTime and calendar config must be set at World Boot
Foundations world boot sequence must set:
- `worldSeed`
- registries (IDs, shikona)
- beya topology, NPC managers, population, initial banzuke
Then Time canon requires:
- `WorldCalendarConfig` stored in world meta (timezone, basho months, week start, basho window lengths)
- `SimTime` initialized before first simulation tick

**Binding rule:** World Entry/FTUE begins only after:
- world validation passes
- `SimTime` is initialized
- initial banzuke exists
This guarantees the opening “World Overview Snapshot” is coherent.

---

## A2. Observability layers across time (no-leak contract)
Foundations defines information layers: Engine Truth → Observed → Estimated → Presented.
Time canon defines tick boundaries. Harmonization defines **what gets re-estimated when**.

### A2.1 Boundary-driven refresh schedule (binding)
- **Daily end-of-tick:** UI digest is generated from emitted events, but must present in bands/tags only.
- **Weekly boundary:** scouting estimates refresh + confidence decay updates.
- **Monthly boundary:** economy posting updates (still banded).
- **Basho start:** lock banzuke and produce “basho preview” surfaces (no hidden odds).
- **Basho end:** lock awards/banzuke recompute + write snapshots for history surfaces.

**Never allowed:** mid-pipeline UI refresh that could expose intermediate engine states.

### A2.2 “If the player can see it, the world can see it” + holiday/auto-sim
Holiday and Auto‑Sim delegate decisions but do not grant extra knowledge.
- Delegated AI uses the same Observed/Estimated layers as the player.
- Digest content is derived from public event types and banded summaries.

---

## A3. Unified boot → entry → first tick timeline (explicit ordering)
1. **World Boot (Foundations §2)**
2. **World Validation (Foundations §21)**
3. **World Entry / Stable Selection (Foundations Part V)**
4. **FTUE flags apply (Foundations Part VI)**
5. **Begin simulation tick (Time canon §2–§3)**

**Binding rule:** The “World Overview Snapshot” shown at entry is a *read-only snapshot* built from the initial world state; it must not advance time.

---

## A4. The Daily Tick as a UI-safe pipeline
Time canon’s daily tick order is authoritative; we add UI/observability gates.

### A4.1 Daily tick ordering (UI-gated)
A) Calendar phase transition check  
B) Pending scheduled events  
C) Tournament schedule (if basho day)  
D) Post-bout updates (rivalries, crowd memory, media queues, AI learning signals)  
E) Daily economy  
F) Save checkpoints (autosave policy)  
G) **UI notification batch** (digest)

**Binding rule:** UI can only read:
- stable “moods/bands”
- event summaries
- confidence-tagged estimates
Never raw internal weights, probabilities, or thresholds.

---

## A5. Save/Load and Observability (how to persist without leaking)
### A5.1 What saves contain vs what UI shows
Time canon requires saving:
- sim state
- immutable event log (or checkpoints)
- seeds needed for deterministic continuation
Foundations requires:
- UI is a lens; it must never display engine truth.

**Binding rule:** Saves store engine truth; UI on load only reconstructs Observed/Estimated/Presented layers via deterministic derivation and caches.

### A5.2 Cache policy
- “Snapshot caches” and “UI bookmarks” are optional and rebuildable.
- On load, if caches missing:
  - rebuild presented views from history snapshots and current state deterministically
  - never recompute hidden stats at render time; use snapshot queries and banded estimates.

---

## A6. Autosave timing and UI coherence
Autosaves must happen **after** boundary pipelines complete (Time canon).
Foundations adds:
- no autosave triggers an “implicit time advance”
- autosave labels and slots are UI surfaces that must not reveal hidden state changes mid-tick

Recommended pinned autosaves map cleanly to UI:
- weekly digest boundary
- month posting boundary
- basho-end lock boundary (best for “rewind to coherent state”)

---

## A7. Holiday & Auto‑Sim: delegation without surprise
Time canon defines holiday targets and safety gates; Foundations defines what the player can see.

### A7.1 Gate triggers are presented as explicit warnings
Interrupt gates (injury to top rank, insolvency, scandal severity, etc.) must be presented in *qualitative* language:
- “Critical injury reported”
- “Solvency risk rising”
- “Governance pressure escalating”
No exact thresholds.

### A7.2 Digest contract after holiday/auto‑sim
Digest categories align to Foundations global nav:
- Stable (staff/welfare risks as bands)
- Banzuke/Basho (results summaries)
- Economy (runway band delta)
- Governance (pressure band)
- History (new snapshots unlocked)

Digests must deep-link into Almanac/History surfaces without triggering new computation.

---

## A8. FTUE × Time: “delay consequences, never delete them”
Foundations FTUE lasts exactly 1 basho and suppresses closures/forced mergers/severe sanctions, but logs warnings and accumulates stress.
Time canon’s tick still runs fully.

**Binding rule:** During FTUE:
- events still emit (financial stress, governance warnings) into history log
- consequences that are “suppressed” become **queued/latent** state that can fire once FTUE ends, at a deterministic boundary (recommend: post‑basho window)

---

## A9. Observability integrity tests (combined QA)
To be canon compliant, implementation must pass both sets plus integration tests:

1) **Determinism across UI**  
Save → load → sim forward: both sim state and *presented UI digest ordering* must match.

2) **Holiday equivalence with fog-of-war**  
Holiday-to-basho-end must equal day-by-day outcomes, with identical public digests.

3) **No-leak audit**  
Automated scan ensures UI never prints:
- exact probabilities
- internal AI weights
- hidden thresholds
- engine-truth stats not allowed by observability layer

---

## A10. Discrepancies & reconciliation notes
No direct contradictions; the key “integration work” is enforcing:
- Foundations “no leak” rules on top of time tick outputs,
- strict “no implicit time advance” for UI browsing screens,
- cache rebuild paths that don’t compute forbidden truth at render time,
- FTUE suppression implemented as queued boundary outcomes, not erased events.

---

# PART B — Source Preservation Annex (Verbatim)
> Everything below is embedded verbatim. No deletions. No rewriting.


## SOURCE 01 — Basho_Time_Calendar_SaveLoad_Canon_v1.0_Ultra_Granular.md

```md
# Basho — Time Advancement, Calendar, Game Loop & Save/Load Canon v1.0
## Ultra-Granular “Single Source of Truth” for Passage of Time + Persistence + Holiday/Auto-Sim

Status: DEFINITIVE  
Scope: How time advances, what triggers state changes, when recomputes happen, and how saving/loading/autosave/holiday/auto-sim behave.

This canon is intentionally explicit so engineering can implement without design ambiguity.

---

## 0. Core Goals

1) **Determinism:** Same inputs → same future.  
2) **Legibility:** Players always understand *why* time advanced and *what* changed.  
3) **Safety:** Saves are reliable; autosaves never surprise; sim never corrupts.  
4) **Performance:** “Fast forward” does not require rendering UI or replaying every micro-action.  
5) **Compatibility:** Integrates with:
- Banzuke/Scheduling/Awards
- Combat engine
- Training & development
- Economy & sponsors
- Governance & scandals
- Almanac/history snapshots
- NPC AI and meta drift
- Talent pools/pipelines

---

## 1. Calendar Model (Authoritative)

### 1.1 Time Units
Basho uses a hybrid “sports calendar”:

- **Day**: atomic unit for tournaments and training sessions.
- **Week**: 7-day grouping used for payroll, routine expenses, scouting reports, and autosaves.
- **Month**: civil month used for salaries/allowances, rent/maintenance, sponsor payments, and some governance cadence.
- **Basho**: tournament window (standard: 15 days for sekitori divisions; lower divisions scheduled within the same basho period).
- **Year**: 6 basho cycle, used for decade/era computations and hall-of-fame eligibility checks.
- **Decade/Era**: used by the Almanac Era Book.

### 1.2 Canonical Basho Schedule
The simulation assumes **6 basho per year**. Exact months can be “realistic” or “fictionalized” but must be fixed at world-gen and remain stable.

Two supported modes:
- **Realistic mode:** Jan / Mar / May / Jul / Sep / Nov
- **Fiction mode:** evenly spaced every 2 months starting from world start month

The chosen schedule is stored in `WorldCalendarConfig`.

```ts
WorldCalendarConfig {
  calendarMode: "realistic"|"fiction"
  bashoMonths: number[6]          // 1–12
  bashoLengthDaysSekitori: 15
  bashoLengthDaysLower: 15        // same window; different bout counts
  weekStartsOn: "mon"|"sun"
  timezone: "Asia/Tokyo" (default)
}
```

### 1.3 Season Phases (Within Each Basho)
A basho is not just “15 days”. It has canonical phase boundaries:

- **Pre-Basho Window** (e.g., 7–21 days depending on config)
  - training planning
  - scouting and intel
  - sponsor allocations (kenshō)
  - governance announcements and media anticipation

- **Basho Days 1–15**
  - scheduled bouts
  - daily economy events (kenshō per bout)
  - injuries and kyūjō events
  - daily PBP generation and crowd memory updates

- **Post-Basho Window** (e.g., 3–10 days)
  - awards finalized
  - banzuke recompute
  - promotions/demotions
  - sponsor churn checks
  - loans/solvency interventions if needed
  - snapshots written (Almanac)

Window durations are stored in config for tuning; defaults must be deterministic.

---

## 2. Simulation Clock and “What Advances Time”

### 2.1 The Clock
The game runs on a discrete clock:

```ts
SimTime {
  year: number
  month: 1..12
  dayOfMonth: 1..31
  dayIndexGlobal: number         // monotonic
  weekIndexGlobal: number
  bashoId?: string               // e.g., "2037.05"
  bashoDay?: 0..15               // 0=pre, 1..15 days, 16=post
  phase: "prebasho"|"basho"|"postbasho"|"interbasho"
}
```

### 2.2 Time Advancement Triggers
Time advances only via explicit commands:

1) **Advance One Day** (primary sim step)
2) **Advance to Next Scheduled Event** (smart skip)
3) **Holiday** (skip to a chosen boundary: next basho day 1, next basho end, next week, etc.)
4) **Auto-Sim X time** (hands-off simulation)

The UI must never advance time implicitly on viewing screens.

### 2.3 Player “Turn” Definition
A “turn” is not a basho; it is **one day**.  
However, many systems compute on weekly/monthly/basho boundaries.

---

## 3. The Game Loop (Daily Tick Contract)

### 3.1 Daily Tick Order (Authoritative)
When `AdvanceOneDay()` is called, the engine executes the same deterministic pipeline:

**A) Calendar phase transition check**
- Are we entering a basho, leaving a basho, or in inter-basho?

**B) Pending scheduled events**
- Governance hearings scheduled today
- Loan payment due today
- Sponsor activation expiring
- Training plan step for today (if enabled)
- Talent pipeline events due today

**C) Tournament schedule (if basho day)**
- Generate today’s torikumi (if not pre-generated)
- Execute bouts (or queue for player interaction)
- Apply combat outcomes, injuries, kimarite logging
- Apply kenshō payouts and banner ceremony outcomes

**D) Post-bout updates**
- Rivalry intensity updates
- Crowd memory updates
- Media headline queue updates
- AI learning signals (meta drift recognition counters)

**E) Daily economy**
- Daily expenses (food, routine costs)
- Daily micro-income (merch band, visitors band) if modeled

**F) Save checkpoints (if configured)**
- Autosave at end-of-day if policy says so

**G) UI notification batch**
- Produce a digest for the player (never interrupt mid-pipeline unless critical)

### 3.2 Deterministic Randomness Policy
All random draws use seeded RNG:
- `WorldSeed`
- `DaySeed = hash(WorldSeed, dayIndexGlobal)`
- System seeds (combat, sponsors, AI) derive from DaySeed + entity ids.

This ensures:
- reload and re-sim produce identical outcomes
- “holiday” and “manual day-by-day” yield identical results

---

## 4. Boundary Events (Weekly, Monthly, Basho-End, Year-End)

### 4.1 Weekly Boundary (Every 7 Days)
Triggered when weekIndex increments:

- Routine scouting report refresh (fog-of-war surfaces)
- Staff weekly effectiveness summary
- Minor AI adaptation updates (non-meta-shift)
- **Autosave: Weekly** (if enabled)

### 4.2 Monthly Boundary (First day of month, or configured payday)
Triggered on monthly boundary:

**Economy**
- Sekitori salaries (paid to rikishi account; not stable budget by default)
- Allowances / stipends (lower divisions)
- Stable rent/maintenance
- Sponsor Kōenkai payments
- Oyakata personal subsidy injection (if modeled)
- Loan interest accrual + scheduled repayments
- Insurance / welfare funds (if modeled)

**Governance**
- council docket refresh (if monthly cadence)

**Autosave: Monthly** (if enabled)

### 4.3 Basho Start Boundary
Triggered on transition into basho day 1:

- Lock today’s banzuke
- Lock sponsor banner allocations for day 1 (or for basho)
- Pre-basho narrative: “The world turns its eyes…”

Optional: player confirmation gate:
- “Begin Basho” prompt (can be disabled)

### 4.4 Basho End Boundary (After Day 15 + playoffs)
Triggered at basho completion:

**Competitive**
- Determine Yūshō / Jun-Yūshō
- Sanshō awards
- Trophy allocations
- Update records/streaks

**Institutional**
- Sponsor churn checks (post-basho)
- Council reactions (if scandal triggers)
- Loans/benefactors escalation if insolvency triggered

**Structural**
- Recompute banzuke for next basho
- Promote/demote heuristics
- Update sekitori status changes (salary eligibility)

**Narrative + Almanac**
- Write BashoSnapshot
- Update RikishiSnapshot/BeyaSnapshot/OyakataSnapshot
- Generate basho story summary + signature moments
- Update era aggregates if year boundary crossed

**Autosave: Basho-End** (highly recommended default ON)

### 4.5 Year End (After 6th basho post-window)
Triggered at year boundary:

- Hall of Fame eligibility scan + induction class creation
- Decade/era label updates (if boundary)
- Sponsor market “reset drift” (optional)
- AI strategy memory consolidation
- Annual financial statements (banded)
- Annual autosave (recommended)

---

## 5. Pausing, Background Sim, and “Fast Forward”

### 5.1 Pause Semantics
Pause freezes:
- time advancement
- scheduled event execution
- AI decision updates

Pause does **not** freeze UI browsing or almanac reading.

### 5.2 Fast Forward Modes
Fast forward is a UI wrapper around repeated `AdvanceOneDay()` calls with throttling.

Supported speeds:
- x2, x5, x20, x100 “Sim Speed”

Rules:
- Simulation must remain deterministic regardless of speed.
- UI does not render per-day animations at high speeds.
- Notifications are aggregated into digests (see §8).

### 5.3 Background Sim (Hands-off)
Background sim is the same as fast forward, except:
- no player decisions are prompted
- AI chooses for the player’s stable if needed, according to “delegation policy”

Delegation Policy options:
- “Conservative” (min risk)
- “Balanced”
- “Aggressive”
- “Roleplay” (based on stable identity)

---

## 6. Holiday System (Football Manager-Style)

### 6.1 Definition
Holiday is a controlled skip that advances time to a boundary while delegating decisions.

Holiday targets:
- Next Day
- Next Week
- Next Month
- Next Basho Day 1
- End of Current Basho
- Post-Basho (after awards and banzuke)
- Custom Date
- “Until Event” (e.g., council hearing, loan due)

### 6.2 Holiday Safety Gates (Deterministic Prompts)
Holiday can be configured to interrupt on:
- injury to a top-ranked rikishi
- insolvency warning threshold
- scandal severity above X
- sponsor churn above X
- promotion run / ozeki/yokozuna threshold reached
- loan default risk
- roster over foreign limit (governance)

These gates are **player settings**, default “on for critical”.

### 6.3 Holiday Result Digest
On holiday exit, present:
- “What happened while you were away”
- basho summaries if crossed
- major injuries list (public)
- financial net change band
- sponsors gained/lost
- governance actions

Digests link to Almanac pages.

---

## 7. Auto-Sim “Watch the World” Mode

### 7.1 Purpose
Let players run a world for X time without involvement to see emergent history.

Modes:
- **Observer**: player owns no stable; pure world sim
- **Hands-off Owner**: player owns stable but delegates all

### 7.2 Auto-Sim Configuration
Player chooses:
- Duration: X days / weeks / months / basho / years
- Stop conditions (same as holiday gates)
- Output verbosity:
  - Minimal (annual highlights only)
  - Standard (basho summaries)
  - Detailed (weekly digests)

### 7.3 Output Artifacts
At end of auto-sim:
- Almanac ready (snapshots present)
- A “Chronicle” report:
  - top champions
  - biggest scandals
  - greatest rivalries
  - era labels formed
  - record breaks

---

## 8. Notifications, Digests, and UI Timing

### 8.1 Digest Rules
At high sim speeds or holiday:
- Do not spam pop-ups.
- Collect events into a digest stack.

Digest categories:
- Competitive (wins, yūshō, streaks)
- Health (injuries, kyūjō, retirements)
- Economy (sponsors, loans, solvency)
- Governance (sanctions, hearings)
- Staff & stable ops (hires, resignations)

### 8.2 Critical Interrupts
Only these may interrupt time advancement:
- catastrophic insolvency trigger
- forced closure event
- player-critical choice with no delegation allowed (configurable, but must be explicit)

---

## 9. Save/Load System (Persistence Canon)

### 9.1 Save Philosophy
Saves must preserve:
- the entire immutable event log (or a checkpointed equivalent)
- current world state
- seeds required for deterministic continuation
- player settings and UI state (optional)
- snapshot caches (optional; can be rebuilt)

Two-tier persistence:
1) **State Save** (full sim state)
2) **Snapshot Cache** (performance; rebuildable)

### 9.2 Save File Structure (Schema)
```ts
SaveGame {
  saveId
  createdAt
  worldMeta {
    worldSeed
    version
    calendarConfig
  }
  simTime
  entityState {
    rikishi[]
    beya[]
    oyakata[]
    sponsors[]
    councils[]
  }
  immutableHistoryLogRef
  rngStateRef                 // if using stream-based RNG; otherwise derived
  snapshotsCacheRef?
  playerState {
    ownedStableId?
    delegationPolicy
    settings
    bookmarks
  }
  integrity {
    checksum
    buildId
    migrationVersion
  }
}
```

### 9.3 History Log Storage
Two supported implementations:

**A) Embedded log**
- history events stored in save file
- simplest, larger files

**B) Chunked log**
- event log stored as append-only chunks
- save references the chunk set + index

Canon requirement:
- history must be recoverable even if caches are missing
- no partial history loads allowed

### 9.4 Save Compression & Integrity
- compress large logs
- checksum required
- detect corruption and offer rollback to last autosave

### 9.5 Versioning & Migration
Save files have `migrationVersion`.
On load:
- apply deterministic migrations
- never alter immutable history meaning
- add missing fields with defaults

---

## 10. Autosave Policy (Authoritative)

### 10.1 Autosave Slots
Recommended default:
- 3 rolling autosaves + 1 “basho end” pinned slot.

Slots:
- `autosave_weekly_1..3` (rolling)
- `autosave_basho_end` (most recent)
- `autosave_year_end` (optional pinned)
- `manual_save_*` (unlimited)

### 10.2 Autosave Cadence Options
Player configurable:
- End-of-day (heavy; off by default)
- Weekly (default ON)
- Monthly (default ON)
- Basho end (default ON)
- Year end (default ON)

### 10.3 Autosave Timing Within Tick
Autosaves occur **after** boundary pipelines complete:
- after basho-end recompute + snapshots
- after monthly economy posting
so reloading restores a coherent state.

No mid-pipeline autosaves are allowed.

---

## 11. Save During Fast Forward / Holiday

### 11.1 Autosave During Sim
During holiday/auto-sim:
- autosaves still occur at configured cadence
- but are tagged “sim-run” and grouped

### 11.2 “Sim Bookmark” Saves
Optional feature:
- player can mark a time target (“Sim 5 years”)
- system automatically creates:
  - a save at start
  - a save at end
  - basho-end saves in between (optional)

---

## 12. Deterministic Delegation (AI Playing For You)

### 12.1 Delegation Scope
When player is away (holiday/auto-sim), AI can:
- set training plans (if enabled)
- manage staff hires within budget bands
- decide scouting focus
- choose bout strategy defaults (if player doesn’t intervene)
- respond to governance notices
- accept loans/benefactors ONLY if player permits via settings

### 12.2 Delegation Guardrails
Player sets “hard lines”:
- never accept loans
- never sell kabu (if modeled)
- never merge stable
- always prioritize welfare (reduce injury risk)
- always prioritize rank (push through injuries) (dangerous but allowed)

Delegation decisions are logged as History events:
- `DelegatedDecisionEvent`

---

## 13. Performance: Event Replay vs Checkpointing

### 13.1 Two ways to load
- **Full state restore** (preferred): load directly to sim state
- **Replay from checkpoint** (optional): rebuild state from a checkpoint + event replay

Canon recommendation:
- Keep monthly checkpoints to allow compact saves and robust recovery.

---

## 14. Testing Requirements (Non-Optional)

To be “canon compliant”, implementation must pass:

1) **Determinism test**
- simulate 100 days
- save
- load
- simulate 100 more
- compare with a continuous 200-day run outputs (snapshots + key stats)

2) **Holiday equivalence test**
- simulate day-by-day to basho end
- compare with holiday-to-basho-end results

3) **Autosave coherence test**
- load autosave after basho end
- verify banzuke, awards, snapshots are consistent

4) **Migration test**
- load old save version
- verify immutable history unchanged

---

## 15. Player-Facing Copy (Narrative-first)

Time controls should feel like sumo calendar rituals:

- “Let the days pass…”
- “Begin the Basho.”
- “Rest until the next tournament.”
- “Holiday until Day 1.”
- “Watch the world unfold (Auto-Sim).”

But the UI must always show:
- current date / basho ID
- next major boundary
- what will trigger an interrupt

---

## 16. Integration Hooks Index (Where Time Touches Systems)

On **Daily Tick**:
- Combat (if basho)
- Injury logging
- PBP generation
- Crowd memory
- Daily expenses

On **Weekly**:
- Scouting refresh
- Staff weekly summaries
- Autosave

On **Monthly**:
- Salaries/allowances
- Sponsor payments
- Loans/interest
- Oyakata subsidy
- Governance docket refresh

On **Basho End**:
- Awards and trophies
- Banzuke recompute
- Sponsor churn
- Insolvency interventions
- Almanac snapshots
- Records/streaks updates
- HoF eligibility (year end only)

---

END OF DOCUMENT

```



## SOURCE 02 — Basho_Foundations_World_Entry_UI_Observability_Canon_v2.0.md

```md
# Basho — Foundations, World Entry, UI & Observability Canon v2.0
## Definitive, Non–High-Level System Contract

Date: 2026-01-10  
Status: **ULTIMATE DEFINITIVE CANON — IMPLEMENTATION GRADE**

This document **fully consolidates and supersedes** the following documents into a single authoritative contract, with no loss of features or design intent:

- Foundations Contract v1.0 (World Boot, IDs, Shikona, FTUE)
- World Generation, Identity & FTUE Contract v1.0
- World Entry, Stable Selection & FTUE Contract v1.1
- UI Screen Map & Player Information Architecture v1.0
- Information Surfaces & Observability Contract v1.0
- Institutional Interaction Contract v1.0 (player-facing implications only)

If a rule or interaction concerns **world creation, player entry, what the player can see, how it is presented, or when it is revealed**, this document decides.

This is not a summary. This is the binding specification.

---

# PART I — FOUNDATIONAL PRINCIPLES

## 1. Core Design Axioms

1. The world exists before the player.
2. The player inherits institutions, not blank slates.
3. Information is layered, imperfect, and earned.
4. UI never reveals engine truth.
5. FTUE delays consequences, never deletes them.
6. Determinism is absolute.

> The player does not load a save.  
> The player steps into history.

---

# PART II — WORLD BOOT & GENERATION (AUTHORITATIVE)

## 2. World Boot Sequence (Non-Negotiable)

World creation proceeds in this exact order:

1. Initialize `worldSeed`
2. Initialize global registries (IDs, shikona, stables)
3. Generate beya topology
4. Allocate kabu pool
5. Seed NPC managers
6. Generate rikishi population
7. Assign shikona
8. Seed rivalries (low-to-moderate only)
9. Generate initial banzuke
10. Initialize economy state
11. Validate world
12. Enter World Entry / FTUE
13. Begin simulation tick

Failure before step 11 → regenerate world.

---

## 3. Initial World Shape

At generation:

- Active beya: 40–48
- Elite beya: 3–5
- Fragile beya: 6–10
- Rebuilding / new beya: 5–8
- Yokozuna: 0–3
- Ōzeki: 2–4

No beya begins:
- insolvent
- without a kabu holder
- without rivalry exposure

---

# PART III — GLOBAL IDENTITY SYSTEM

## 4. Immutable IDs (Canonical)

IDs are the only authoritative identity.

- RikishiID
- OyakataID
- BeyaID
- BoutID
- GovernanceRulingID
- MediaEventID

Names, titles, shikona, and nicknames are presentation-only.

IDs are:
- immutable
- never reused
- globally unique per world

---

## 5. ID Schemas

### Rikishi
```
R-<WorldSeed>-<BirthYear>-<Sequence>
```

### Oyakata
```
O-<WorldSeed>-<KabuID>
```

### Beya
```
B-<WorldSeed>-<FoundingIndex>
```

### Bout
```
BT-<WorldSeed>-<BashoID>-<Day>-<Index>
```

---

# PART IV — SHIKONA (RING NAME) SYSTEM

## 6. Shikona Registry

- All shikona registered at worldgen
- Enforces kanji + phonetic uniqueness
- Stores lineage, origin beya, aliases
- Never deletes names

---

## 7. Shikona Generation Model

Each shikona is composed of:

- Prefix (nature, virtue, geography)
- Core kanji (strength, motion, aspiration)
- Suffix (山, 川, 海, 龍, etc.)

Stable lineage defines:
- preferred kanji pool
- forbidden kanji pool
- honorary kanji eligibility

No numeric suffixes are ever used.

---

## 8. Shikona Evolution Rules

- Changes allowed only at promotion thresholds
- ≥1 lineage kanji preserved (unless honorary exception)
- Old names persist as searchable aliases
- Logged permanently in history

---

# PART V — WORLD ENTRY & STABLE SELECTION

## 9. Entry Flow

After world validation:

1. World Overview Snapshot
2. Stable Selection Phase
3. Player assignment
4. FTUE flags applied
5. Simulation begins

The world is complete before the player chooses.

---

## 10. Stable Selection Modes

The player must choose one:

### 10.1 Found a New Stable
- Player names stable (manual or random)
- Lowest prestige band
- Minimal facilities
- Weak or no kōenkai
- No sekitori
- Extreme difficulty

### 10.2 Take Over Existing Stable
- All history retained
- Finances, rivalries, debts preserved
- Existing oyakata replaced via succession rules
- Difficulty scales with stature

### 10.3 Recommended Start
- System highlights balanced stables
- Optional guidance only

---

## 11. Stable Stature (Implicit Difficulty)

Each stable displays a **Stature Card**:

| Band | Meaning | Difficulty |
|---|---|---|
| Legendary | Title contender | Very Easy |
| Powerful | Strong contender | Easy |
| Established | Stable competitor | Normal |
| Rebuilding | Declining | Hard |
| Fragile | At risk | Very Hard |
| New | No buffer | Extreme |

Derived from:
- prestige band
- financial runway band
- kōenkai strength
- roster quality
- governance pressure

Exact formulas hidden.

---

## 12. Stable Naming System

### Manual Naming
- Validated for uniqueness
- No reserved legacy names
- Immutable after confirmation

### Random Naming
- Uses shikona-style kanji generator
- Deterministic per worldSeed + click index
- Registered globally

Renaming later requires governance approval.

---

# PART VI — FTUE (FIRST-TIME USER EXPERIENCE)

## 13. FTUE Scope

FTUE lasts exactly **1 basho**.

During FTUE:
- closures suppressed
- forced mergers suppressed
- severe sanctions suppressed
- warnings logged normally
- financial stress accumulates

No consequences are erased.

---

## 14. FTUE Adaptation by Stable Choice

- Elite: expectation & scrutiny messaging
- Rebuilding/Fragile: survival & runway emphasis
- New: institution-building focus

---

# PART VII — OBSERVABILITY & FOG-OF-WAR

## 15. Information Layers

Every variable exists as:

1. Engine Truth
2. Observed Data
3. Estimated State
4. Presented View

Only the engine accesses layer 1.

---

## 16. Observability Rules (Binding)

- Players and NPCs share the same knowledge layer
- Scouting generates estimates with confidence decay
- Rivalry biases interpretation, not truth
- UI uses qualitative bands, never raw numbers

---

## 17. Prohibited Leaks

UI must never expose:
- hidden thresholds
- exact probabilities
- internal AI weights
- engine truth

---

# PART VIII — UI ARCHITECTURE

## 18. Global Navigation Tabs

Stable | Banzuke | Basho | Rikishi | Rivalries | Scouting | Economy | Governance | History | World

---

## 19. Screen Design Rules

- Headline → Context → Detail
- Opt-in depth
- Explicit warnings
- Trend-first presentation

---

## 20. Key Screen Contracts (Summary)

- **Stable**: prestige, runway, kōenkai, risks
- **Banzuke**: ranks, awards, rival markers
- **Basho**: torikumi, results, kenshō
- **Rikishi**: career, style (inferred), journals
- **Scouting**: estimates, confidence, decay
- **Economy**: bands, runway, obligations
- **Governance**: sanctions, rulings, history
- **History**: immutable journals
- **World**: macro context

---

# PART IX — DETERMINISM & VALIDATION

## 21. World Validation Checklist

Before play:
- valid banzuke
- unique IDs
- no beya < 2 weeks runway
- kabu coverage valid
- rivalry minimums met

Failure regenerates world.

---

## 22. Determinism Contract

Given:
- same worldSeed
- same player choices

World evolution and UI output are identical.

---

# PART X — CANON PHRASES

- “You inherit problems, not options.”
- “If the player can see it, the world can see it.”
- “Names change. IDs do not.”
- “The interface is a lens, not a dashboard.”

---

**End of Foundations, World Entry, UI & Observability Canon v2.0**

```

```



## SYSTEM 2 — Banzuke/Scheduling/Awards ↔ Historical Memory/Almanac
**Source file:** `Banzuke_x_Historical_Memory_Almanac_Megacanon_v1.0_HARMONIZED_NONLOSSY.md`

```md
# Basho × Basho — Banzuke/Awards ↔ Historical Memory/Almanac Megacanon v1.0 (Harmonized, Non‑Lossy)
**Build date:** 2026-01-12  
**Status:** HARMONIZED / NON‑LOSSY / IMPLEMENTATION‑GRADE  
**Scope:** Deterministic banzuke + torikumi scheduling + playoffs + basho awards, integrated with the historical memory event log, almanac snapshots, records/streaks, Hall of Fame, folk memory, and UI browsing surfaces.

## What this file is
This document merges **two authoritative canons** into one integrated contract:

1) **Basho — Historical Memory, Almanac, Hall of Fame & Cultural Memory Canon v1.5**  
2) **Basho — Banzuke, Scheduling & Awards System v1.3**  

### Non‑lossy guarantee
- **Part A** provides a curated, hierarchical integration spec that documents *all interactions* between the two systems, including ordering, event emission, snapshot interfaces, visibility/fog rules, and determinism constraints.
- **Part B** embeds **both sources verbatim** (no deletions) as a Source Preservation Annex.

### Precedence & resolution rules (binding within this file)
1. **Part A** is authoritative for cross‑system interfaces, ordering, and mapping between objects (events ↔ snapshots ↔ UI).
2. If Part A is silent on a point, defer to the most directly relevant source:
   - banzuke/torikumi/playoffs/awards → **Banzuke v1.3**
   - history/almanac/records/HoF/folk memory → **Almanac v1.5**
3. Where there is an apparent tension:
   - **determinism and replay safety** override convenience
   - **immutability** overrides “cleanup”
   - **injury visibility rules** in v1.5 are binding for history surfaces
4. Narrative is always a projection over truth: **history and banzuke outcomes are inputs, not outputs** of narrative generation.

---

# PART A — Harmonized Specification (Curated, Cross‑System)

## A0. Shared design laws (reconciled)
### A0.1 Determinism
Same inputs → same:
- torikumi schedule, bout results, banzuke, promotions/demotions, playoffs, awards
- emitted historical events and snapshots
- records/streaks recompute outcomes (timing fixed)

### A0.2 Immutability
The historical log is **append‑only**.
- banzuke decisions and award outcomes become immutable events once locked
- subsequent systems (records/HoF/folk memory) consume these events but never edit them

### A0.3 “Public memory of sumo”
Banzuke is the legitimacy engine; Historical Memory is the long‑term truth engine.
Almanac is the browseable projection that makes both intelligible.

---

## A1. Canonical object model (unified)
### A1.1 Authoritative tournament outputs (from Banzuke v1.3)
- `TorikumiSchedule` (per day, per division)
- `BoutResult` (winner/loser, kimarite, duration, fatigue delta, hooks)
- `BashoResult` (wins/losses, startRank, endRank, awards[])
- `RankSnapshot` (per basho, per rikishi)
- `PlayoffBracket` + `PlayoffResult`
- `AwardResults` (Yūshō + Sanshō + extra trophies)

### A1.2 Authoritative history primitives (from Almanac v1.5)
- `HistoricalEvent` (append‑only immutable payload)
- `BashoSnapshot`, `RikishiSnapshot`, `BeyaSnapshot`
- `Streak`, `RecordEntry`, `RecordBrokenEvent`
- HoF objects (eligibility, induction events, plaque text ids)
- Folk Memory layer (myth tags, signature moments, era labels, fan sentiment descriptors)

### A1.3 Integration principle
**Banzuke outputs emit HistoricalEvents.**  
**HistoricalEvents build Snapshots.**  
**Snapshots drive Almanac UI and Records/HoF computation.**

---

## A2. Deterministic ordering: “Basho Lifecycle → History Lock”
This ordering is binding to prevent mismatch between banzuke truth and history views.

### A2.1 Per‑day (Day 1–15) loop
1. Generate torikumi for the day (per banzuke phase rules).
2. Resolve bouts (deterministic combat system elsewhere).
3. Emit **BoutResult events** for each bout:
   - kimarite, duration, fatigue delta, day, bashoId, ranks at time of bout
4. Update running basho state (records, leaders, withdrawals).
5. (Optional) Emit narrative‑only “broadcast text ids” (not history‑truth).

### A2.2 Basho end lock (after Day 15 and any playoffs)
1. If yūshō tie: run playoffs (single‑elimination), lock champion.
2. Lock final records for all divisions (wins/losses, kyūjō notes).
3. Compute and lock awards (Yūshō, Sanshō, additional trophies).
4. Run banzuke rank reassignment algorithm and lock the next banzuke.
5. **Emit end‑of‑basho history events** (see A3).
6. Build/refresh snapshots (BashoSnapshot, entity snapshots).
7. Recompute records/streaks and HoF eligibility using locked events only.
8. Update folk memory layer (myths, signature moments, era tags) from the locked facts.

---

## A3. Event emission mapping (Banzuke → HistoricalEvent)
This section defines the minimal required event types and payload fields.

### A3.1 Required event types
- `BOUT_RESULT`
- `BASHO_PARTICIPATION_SUMMARY`
- `RANK_SNAPSHOT_LOCKED`
- `PROMOTION_DEMOTION`
- `PLAYOFF_TRIGGERED`
- `PLAYOFF_RESULT`
- `AWARD_GRANTED` (Yūshō + Sanshō + additional trophies)
- `RECORD_BROKEN` (derived post‑lock)
- `HOF_INDUCTION` (year‑end pipeline)
- `ERA_LABEL_ASSIGNED` (derived, deterministic)
- `SIGNATURE_MOMENT` (derived, immutable once emitted)
- `INJURY_EVENT` / `KYUJO_START` / `WITHDRAWAL` / `RETIREMENT_DUE_TO_INJURY` (public history rules binding)

### A3.2 Minimal payload fields (implementation contract)
All emitted history events must include:
- `bashoId`, `day?`, `timestamp` (logical)
- subject identity (rikishi/beya/league)
- severity/prestige deltas where applicable
- immutable payload containing:
  - ranks involved (startRank or rankAtEvent)
  - win/loss deltas or final record
  - award id + justification tags (score bands if stored)
  - playoff bracket references where applicable

---

## A4. Snapshots: building the Almanac safely
### A4.1 Snapshot sources
Snapshots are generated **only** from:
- immutable `HistoricalEvent` logs
- approved aggregates computed at deterministic boundaries

### A4.2 Snapshot triggers
- end of each basho (mandatory)
- end of year (era/decade rollups)
- on major governance actions that reshape history (mergers/sanctions) — if present elsewhere

### A4.3 “No ad hoc stats” enforcement
Almanac UI must not compute raw stats from scratch at render time; it uses snapshot queries:
- `getBashoSnapshot(bashoId)`
- `getRikishiSnapshot(rikishiId)`
- `getBeyaSnapshot(beyaId)`
- `getRivalry(rivalryId)`
- `searchHistory(filters)`
- `getEraSummary(decadeId)`

---

## A5. Awards → Legacy surfaces (complete interaction)
### A5.1 Yūshō and promotion pressure
- `AWARD_GRANTED(Yūshō)` is a high‑prestige anchor event and a strong promotion signal.
- `PROMOTION_DEMOTION` events reference the same basho lock window to prevent off‑by‑one history.

### A5.2 Sanshō scoring transparency
Awards are deterministic; to support “explainable after the fact”:
- store award score components (or score band tags) in the immutable payload
- Almanac can show narrative justification tooltips without leaking hidden combat stats

### A5.3 Multiple Sanshō handling
If multiple Sanshō are granted:
- emit one event per award type (or one compound event with typed array)
- the Almanac must display “multiple prizes” prominently in basho detail pages and career timelines

---

## A6. Promotions/demotions and rank history (no contradictions)
### A6.1 Rank snapshot truth
The `RankSnapshot` produced by banzuke reassignment is emitted as a history event:
- it is the authoritative “rank per basho” for career timelines

### A6.2 “Season ladder” view
The Almanac’s season ladder:
- reads `RankSnapshot` events per basho
- overlays `BashoResult` summary and highlight tags
- links to awards and playoff events for that basho

---

## A7. Playoffs ↔ Almanac “Key Bouts”
Playoffs are both:
- mechanical resolution tools (banzuke v1.3)
- narrative highlight generators (almanac v1.5)

Rules:
- `PLAYOFF_TRIGGERED` event emitted immediately when tie is confirmed post‑Day 15
- each playoff bout emits `BOUT_RESULT` with a `isPlayoff=true` tag
- `PLAYOFF_RESULT` event emitted at end (champion locked)
- Almanac “Key Bouts” section must include playoff bouts when present

---

## A8. Injury visibility alignment (hard binding)
From Almanac v1.5 updates:
- Kyūjō/withdrawal and injury durations are always public in history.
- Diagnosis specificity may be vague (confirmed/reported/undisclosed), but the *event exists and duration is shown*.

Integration requirements for banzuke:
- withdrawals/kyūjō impact torikumi scheduling immediately (no bout scheduled for absent rikishi)
- emitted injury/withdrawal events must include bashoId/day and link to participation summaries
- injury-driven retirement during basho requires a specific retirement event that links back to the injury event id

---

## A9. Records, streaks, and HoF recompute contract
### A9.1 Timing
Records recompute:
- end of each basho (after lock)
- end of year
- on retirement finalization
No silent mid‑basho recomputes that could change displayed records.

### A9.2 “Record Broken” ceremony integration
When a record is broken, emit:
- `RECORD_BROKEN` event with old/new holder and values
Almanac uses this to:
- add highlight tags to the basho archive
- create trophy cabinet cards and narrative callouts

### A9.3 Hall of Fame pipeline integration
At year end:
1. gather eligible candidates (from locked history)
2. score deterministically
3. emit `HOF_INDUCTION` events
4. produce plaque text ids (deterministic phrase seeds)

---

## A10. Rivalries and era labels (cross-system usage)
Banzuke torikumi includes “rivalries” as a priority signal; this must be grounded in history:
- rivalry objects are derived from repeated encounters and high‑stakes meetings (playoffs/title implications).
- torikumi uses rivalry *heat* as a tie‑breaker only after rank/record/yūshō impact constraints.

Era labels are derived from:
- dominant style tags (if present elsewhere)
- injury climate (public injury events)
- sponsor/scandal climate (if present elsewhere)
and are written as immutable summary events for almanac navigation.

---

## A11. Discrepancies & reconciliation notes
No direct contradictions were found; the systems are complementary.
Two “tension points” are resolved as follows:

1. **Fog-of-war vs injury transparency:** injuries and kyūjō are always visible in history; only *diagnosis specificity* can be vague. This overrides any generic fog-of-war hiding for injuries.
2. **“Banzuke as public memory” vs “history as truth”:** banzuke rank snapshots and awards are the public institutional judgment; they are stored as immutable historical events and then browsed through the almanac. Folk memory may reinterpret, but never edits.

---

# PART B — Source Preservation Annex (Verbatim)
> Everything below is embedded verbatim. No deletions. No rewriting.


## SOURCE 01 — Basho_Historical_Memory_Almanac_Canon_v1.5_Full_Granular_Cleaned_v2.md

```md
# Basho — Historical Memory, Almanac, Hall of Fame & Cultural Memory Canon v1.5
## Ultra‑Granular Cleaned & Consolidated Edition (FULL CONTENT)

Status: DEFINITIVE  
Supersedes: v1.0–v1.4  
Guarantee: **No mechanics, rules, data models, thresholds, or narrative systems removed.**

---

## EDITORIAL CLEANUP NOTICE (IMPORTANT)

This document is a **structural cleanup only**.

What was done:
- All previously added UPDATE sections are **retained verbatim**
- No paragraphs, tables, formulas, or examples were deleted
- Section numbering inconsistencies are preserved intentionally to avoid loss
- Repetition is allowed where it reflects system layering
- Terminology normalized only in headings, not body text

What was NOT done:
- No compression
- No summarization
- No abstraction
- No removal of “fun” or narrative systems

This file is intentionally large and redundant where redundancy reinforces canon.

---

## MASTER TABLE OF CONTENTS (LOGICAL, NOT COLLAPSING CONTENT)

PART I — Historical Event Core & Immutability  
PART II — Almanac & Visualization Systems  
PART III — Injury Systems (Public, Cultural, Hidden Risk)  
PART IV — Records, Streaks & Statistical Legacy  
PART V — Hall of Fame (Induction, Wings, Ceremony)  
PART VI — Folk Memory, Myth & Narrative Drift  
PART VII — Rivalries, Eras & Fan Sentiment  
PART VIII — Comparison & Discovery Tools  
PART IX — Profile Cards & UI Surfaces  
PART X — Engineering, Snapshots & Determinism  

---



# Basho — Historical Memory & Legacy Tracking Canon v1.0
## Ultra-Granular System for Rikishi & Beya History

Status: DEFINITIVE  
Scope: Persistent, queryable, narrative-ready historical tracking for rikishi and beya.

---

## 1. Design Principles

History is state, not flavor.  
Records are append-only, immutable, replay-safe.  
Narrative is a projection over history.

---

## 2. Historical Event Model

```ts
HistoricalEvent {
  eventId
  eventType
  subjectType
  subjectId
  relatedEntities[]
  bashoId?
  day?
  timestamp
  severityBand
  prestigeDelta?
  tags[]
  immutablePayload
}
```

---

## 3. Rikishi Career History

Tracked:
- debut
- rank per basho
- W/L
- kimarite usage
- injuries
- rivals
- awards
- earnings milestones
- retirement cause

Derived:
- Peak Rank
- Longevity
- Consistency
- Signature Kimarite

---

## 4. Beya Institutional History

Tracked:
- founding
- roster changes
- yusho totals
- scandals
- sanctions
- mergers
- sponsor eras
- staff regimes

---

## 5. Rivalries

Persistent rivalry objects with intensity scores driven by:
- repeated encounters
- playoff clashes
- title stakes
- scandal overlap

---

## 6. Gameplay Effects

Consumed by:
- AI behavior
- Governance bias
- Sponsor confidence
- Narrative callbacks

---

## 7. Query API

```ts
getRikishiCareerSummary()
getBeyaGoldenAges()
getTopRivalries()
getScandalHistory()
```

---

END OF DOCUMENT



---

# Basho Almanac & Historical Visualization System v1.0
## (UI/UX + Data Views for Rikishi, Beya, Basho, and Era History)

**Purpose:** Provide an “almanac” experience—like football manager’s season history—so players can browse decades of Basho history with clarity, narrative texture, and trustworthy statistics **without drowning the core game in numbers**.

**Design mandate:**
- Narrative-first presentation (descriptive language, story arcs), but backed by authoritative history data.
- Fast browsing across decades (indexing + snapshots).
- Strict truth: every fact shown must be derived from `HistoricalEvent` logs or approved aggregates.
- Compatible with **Fog-of-War**: some views are public/rumored/unknown based on scouting/observability rules.

**Owned by:** Foundations / Observability layer  
**Consumes:** Historical Memory Canon (this file), Banzuke/Awards, PBP, Economy (for earnings milestones), Governance (for sanctions), AI (for rivalry and reputational effects)

---

## 8. Almanac Information Architecture (IA)

### 8.1 Top-level entry points
The Almanac is accessible from:
- Main menu (global, read-only)
- In-game “Records & History” hub (contextual; respects fog-of-war)

Top navigation tabs:
1) **Basho Archive**
2) **Rikishi Almanac**
3) **Beya Almanac**
4) **Honors & Records**
5) **Rivalries**
6) **Era Book** (decade summaries)

### 8.2 Core principle: “One click = one story”
Every page must answer:
- What happened?
- Who mattered?
- Why does it matter now?

Numbers are present, but never naked: each table row has a narrative label or tooltip.

---

## 9. Basho Archive (Season Browser)

### 9.1 Basho List View (the “season index”)
A scrollable list grouped by year.

Each Basho card shows:
- BashoId (e.g., 2037.05)
- Location/venue (if modeled)
- Yūshō winner + record
- Jun-Yūshō runner-up
- Highlight tag(s): “Playoff”, “Upset”, “Scandal overshadowed”, “New Yokozuna”
- Kenshō summary (tiered; not exact sponsor finances unless player has visibility)

#### Filters
- Division (Makuuchi/Jūryō/etc.)
- “Notable only” toggle
- Era / decade
- “Includes playoff”
- “Includes scandal event”

### 9.2 Basho Detail View
Sections:

**A) Tournament Summary (narrative)**
- 2–6 paragraphs generated from history:
  - decisive days
  - turning points
  - injuries
  - scandals if relevant
  - sponsor mood / crowd memory tone if surfaced

**B) Leaderboard (table)**
- Top 10 rikishi for that basho (wins/losses, finishing rank)
- Sanshō awards recipients

**C) Key Bouts (curated)**
- 3–8 “spotlight bouts” (Day 1, Day 8, Day 15, playoff)
- Links to PBP replay text (if enabled) and kimarite used

**D) Rank Movement Digest**
- Promotions/demotions (not the whole banzuke unless expanded)
- “Notable promotions” callouts (Ōzeki run, Yokozuna deliberation)

**E) Institutional Notes**
- Sponsor churn events
- Council actions during the basho window
- Stable financial events if public (bankruptcy prevented, benefactor rescue)

### 9.3 Basho Comparison View (side-by-side)
Compare two basho:
- Winner strength
- Era meta tags (e.g., “Oshi-heavy”)
- Kenshō density band (low/medium/high)
- Injury pressure band

---

## 10. Rikishi Almanac (Player/Person History Browser)

### 10.1 Rikishi Profile — “Biography Header”
Shows:
- Shikona (current + prior, with change dates)
- Birth year, origin
- Career status (active/retired/oyakata)
- “Known for” (signature kimarite / style descriptors)
- Fame epithet (procedural: “The Unmoving Wall”, “Salt-and-Thunder”, etc.)

### 10.2 Career Timeline (interactive)
A vertical timeline with filters:
- Basho milestones (debut, sekitori promotion, sanyaku debut)
- Titles and awards
- Injuries (severity coded)
- Scandals (if any; visibility gated)
- Rivalry chapters (major opponent arcs)

Each node expands to:
- event facts (from immutable payload)
- narrative explanation paragraph
- links to related entities (opponent, beya, sponsor moment)

### 10.3 “Season Ladder” View (football-manager style)
A compact yearly grid:
- Each row = basho
- Columns: rank, record, highlight, earnings band, notable bout
- Hover reveals kimarite breakdown band (not raw percentages unless “analytics” view enabled)

### 10.4 Technique Book (Kimarite History)
Shows:
- Top 10 kimarite used across career (tier labels)
- “Evolution” narrative: “early oshi → later yotsu”
- “Tokui-waza moment” entries (first time used in notable bout)

### 10.5 Rivalry Panel
- Top rivalries with intensity meter and “story titles”
- Links to the Rivalry page (see §12)

### 10.6 Legacy & Hall-of-Fame Readiness (optional)
A narrative summary:
- “A career of stubborn consistency…”
- “Remembered for a scandal that changed the council’s mood…”

(If Hall of Fame is not yet formal, present as “Legacy Reading” only.)

---

## 11. Beya Almanac (Institutional History Browser)

### 11.1 Beya Overview
- Crest/name history (renames, mergers)
- Founding story snippet (generated)
- Current oyakata lineage (if public)
- Reputation bands: “Traditional”, “Reformist”, “Scandal-shadowed”

### 11.2 Dynasty Timeline (“Era Strip”)
A horizontal strip segmented into eras:
- Founding Era
- Golden Age(s)
- Dark Period(s)
- Rebuilding phases
Each era tile expands into:
- key rikishi
- key staff regimes
- major sponsors (tier + era names)
- scandals and sanctions

### 11.3 Trophy Cabinet
- Yūshō count by division
- Sanshō totals
- Notable trophies (if modeled)
All items link to the basho where earned.

### 11.4 Roster Lineage (“Family Tree”)
A tree of notable alumni:
- rikishi → (coach) → oyakata candidate → oyakata
This view is visibility-gated and can show “unknown branches.”

### 11.5 Financial History (bands only)
- “Stable finances: stable / tight / rescued / sanctioned”
- Sponsor era summaries (no raw ledger unless player has full access)

---

## 12. Rivalries Almanac

### 12.1 Rivalry Index
Filter by:
- Rivalry type (rikishi vs rikishi, beya vs beya, oyakata vs oyakata)
- Era
- “Still active” toggle
Each rivalry entry shows:
- title: procedural (“The Northern Grudge”, “Salt War of ’33”)
- first encounter
- total meetings
- current edge (who leads)
- “defining moments” count

### 12.2 Rivalry Detail Page
Sections:
- Story synopsis (generated from decisive moments)
- Meeting timeline (basho/day)
- Heat map: high-stakes encounters (titles/playoffs)
- Scandal overlays (if relevant)
- “Rivalry effects” (AI behavior and sponsor/media amplification notes)

---

## 13. Honors & Records Hub

### 13.1 Records Index
Categories:
- Career wins
- Longest Yokozuna tenure (if modeled)
- Most sanshō awards
- Most kenshō received (banded unless full visibility)
- Most playoff appearances
- Fastest promotion run (sekitori/sanyaku)

### 13.2 Trophies Gallery (narrative)
A museum-like view:
- Trophy descriptions (thematic)
- Notable holders across eras
- Links to basho detail pages

---

## 14. Era Book (Decade Summaries)

### 14.1 Decade Page
- “The 2030s: The Push Tide Era” (generated title)
- Meta descriptors: oshi/yotsu balance, injury climate, sponsor climate, scandal climate
- Key dynasties, key rivals, key rule changes (if any)

### 14.2 Era Memory & Retelling Rules
Era narratives use:
- most frequent event tags
- highest-impact scandals
- top 3 dominant rikishi
- top 3 beya performance

But always cite back to underlying events (internally; not shown as citations in UI).

---

## 15. Visualization Components (Reusable Widgets)

### 15.1 Timeline Node
- Title line (narrative)
- Fact capsule (rank, record, kimarite)
- Expandable “What it meant” paragraph

### 15.2 Sparkline Ladder
A small line/step graph:
- x-axis: basho index
- y-axis: rank tier band (Y/O/S/K/M/J/MS/SD/JD/JK)
Shown as bands, not exact rank numbers by default.

### 15.3 Heat Map (Rivalry Meetings)
Grid of basho vs day:
- hot cells = decisive bouts (playoffs/title implications)
- click cell to open bout PBP

### 15.4 Era Strip
Segmented bar with labels:
- Golden age / dark period derived windows

### 15.5 Trophy Cabinet Cards
Each trophy card:
- name + narrative meaning
- holders list (top 5)
- “most recent holder” and link

---

## 16. Data Contracts for Almanac Views

### 16.1 Snapshot Model (Performance)
Because events are append-only, Almanac browsing uses **snapshots**:

```ts
BashoSnapshot {
  bashoId
  divisionResults[]
  awards[]
  notableEvents[]
  sponsorBand
  scandalBand
  generatedSummaryTextId
}
```

```ts
RikishiSnapshot {
  rikishiId
  careerTotals
  peakRankBand
  signatureKimarite[]
  rivalryTop3[]
  timelineIndex[]
}
```

```ts
BeyaSnapshot {
  beyaId
  eras[]
  trophyTotals
  scandalTotals
  sponsorEras[]
  alumniIndex[]
}
```

Snapshots are regenerated:
- at basho end
- at year end
- on major governance actions (sanctions, mergers)

### 16.2 Query Requirements (Authoritative)
The Almanac uses *only* approved queries:

- `getBashoSnapshot(bashoId)`
- `getRikishiSnapshot(rikishiId)`
- `getBeyaSnapshot(beyaId)`
- `getRivalry(rivalryId)`
- `searchHistory(filters)`
- `getEraSummary(decadeId)`

No UI is allowed to compute raw stats ad hoc.

---

## 17. Fog-of-War Rules for Almanac

### 17.1 Public vs Private History
Some history is always public (tournament results).  
Other history is visibility-gated:
- medical details
- financial rescues
- internal staff disputes
- some scandals (until public)

### 17.2 “Unknown” presentation
When data is hidden, the UI shows:
- “Rumored injury concern”
- “Quiet financial strain”
- “Unconfirmed council whispers”

But must not leak forbidden numbers.

---

## 18. Narrative Generation for Almanac Pages

### 18.1 Summary tone selectors
Almanac summary tone depends on:
- region broadcast tone (if chosen)
- beya reputation
- crowd memory band
- scandal climate

### 18.2 Repetition prevention
Use descriptor pools:
- “dominant”, “commanding”, “unanswered”, “unyielding”
and rotate based on a deterministic “phrase seed” derived from:
- entityId + bashoId + summaryType

---

## 19. Implementation Checklist

- [ ] Add Almanac hub entry to UI map
- [ ] Implement snapshot builder at basho-end
- [ ] Implement rivalry index cache
- [ ] Enforce query-only rendering rule
- [ ] Add fog-of-war gating on sensitive events
- [ ] Add narrative generator templates for each page type
- [ ] Add “bookmark” and “pin moment” features (player curation)

---

## 20. Minimum Viable Almanac (MV-Almanac)

If shipping in phases, MV-Almanac includes:
1) Basho Archive list + detail pages
2) Rikishi profile + season ladder
3) Beya overview + trophy cabinet
4) Rivalry index (top 20)
5) Records hub (top 10 per category)

Everything else can follow.

---

**END — Almanac & Visualization System**



---

# UPDATE v1.1 — Injury Transparency & Retirement-in-Basho Tracking (Authoritative)

This revision clarifies and hardens **injury visibility rules** to match real-world sumo culture:
**all injuries are public, recorded, and permanently visible in history.**

These rules override any prior fog-of-war assumptions regarding injuries.

---

## 21. Injury Events — Public Record (Revised Canon)

### 21.1 Injury Visibility Rule (Hard Override)
All rikishi injuries are:
- **Public**
- **Immediately recorded**
- **Always visible in historical views**
- **Never hidden by fog-of-war**

This reflects real sumo practice (kyūjō announcements, absences, medical withdrawals).

No injury-related HistoricalEvent may be suppressed or obscured.

---

## 22. Injury Event Model (Expanded)

```ts
InjuryEvent extends HistoricalEvent {
  injuryType              // e.g., knee ligament, shoulder dislocation
  severityBand            // minor / moderate / severe / career-threatening
  onsetBashoId
  onsetDay
  expectedRecoveryDays
  actualRecoveryDays?
  kyujōStatus             // absent / partial / withdrew
}
```

- `expectedRecoveryDays` is recorded at onset.
- `actualRecoveryDays` is filled on return or retirement.
- Discrepancies between expected and actual are preserved (narrative fuel).

---

## 23. Injury Duration Tracking

### 23.1 Duration Calculation
Duration is measured in:
- **Days**
- **Basho missed (count)**
- **Bouts forfeited**

Displayed to the player as:
- “Missed 3 basho (45 days)”
- “Withdrew on Day 9; did not return for remainder of tournament”

---

## 24. Retirement Due to Injury (New Required Flag)

### 24.1 Retirement-in-Basho Event
If a rikishi retires **during** a basho due to injury:

A mandatory event is emitted:
```ts
RetirementEvent {
  cause: "injury"
  bashoId
  day
  injuryLinkedEventId
}
```

### 24.2 Almanac Display Requirement
In:
- Rikishi Career Timeline
- Basho Detail Page
- Beya Almanac (roster history)

The UI must explicitly show:
- “Retired mid-tournament (Day X, Basho YYYY.MM) due to injury”
- Link to the injury event details

This must not be summarized away.

---

## 25. Almanac UI Changes (Mandatory)

### 25.1 Rikishi Timeline
Injury nodes:
- Always visible
- Color-coded by severity
- Expand to show:
  - injury type
  - duration
  - basho missed
  - whether performance changed after return

### 25.2 Basho Archive
Basho summary must include:
- “Notable Injuries” subsection if any rikishi withdrew or retired due to injury
- Links to affected rikishi profiles

### 25.3 Beya Almanac
Beya timelines must:
- Show cumulative injury burden per era
- Highlight eras with repeated injury withdrawals

---

## 26. Narrative Rendering Rules (Injuries)

Narrative generators must:
- Reference injuries plainly (“forced to sit out”, “withdrew with knee damage”)
- Avoid euphemism
- Use duration-aware phrasing:
  - “returned after a brief absence”
  - “never fully recovered”

---

## 27. AI & Governance Consumption (Clarified)

### 27.1 AI Behavior
AI managers treat injury history as:
- public fact
- strong negative signal for training intensity
- modifier for future bout expectations

### 27.2 Governance
Repeated injury withdrawals contribute to:
- welfare scrutiny
- compliance pressure on the beya
- staff accountability investigations

---

## 28. Historical Integrity Guarantee

Injury history is:
- never deleted
- never merged
- never rewritten

A rikishi may escape scandal in memory.
They **never escape injury history**.

---

END UPDATE v1.1



---

# Basho — Hall of Fame, Records & Streaks System v1.0 (Integrated)
## Fun, Fully-Featured Legacy Layer Built on Historical Memory

**Purpose:** Turn history into *collectible legacy*.  
The Almanac already stores truth; this system:
- computes **records**, **streaks**, and **superlatives**
- curates **Hall of Fame (HoF)** entries with ceremony and narrative
- surfaces “legend stats” on **profiles and cards** (rikishi, beya, oyakata)
- supports player-driven “favorite moments” and institutional remembrance
- remains deterministic and replay-safe

**Canon rule:** Every record shown must be derivable from immutable `HistoricalEvent` logs or approved snapshots.

---

## 29. Recordkeeping Philosophy (Design Laws)

### 29.1 Records must feel alive
Records are not a static spreadsheet. They are:
- tied to moments (bouts, basho, eras)
- framed in narrative (“no one since…”, “the longest drought…”)
- discoverable through browsing (almanac exploration)

### 29.2 Records are scoped
Every record has a scope:
- **Rikishi** (career, active, single basho, division-specific)
- **Beya** (institutional, era-bound, roster-bound)
- **Oyakata** (management era, welfare record, succession events)
- **League** (global history)

### 29.3 Records respect visibility rules
Unlike injuries (always public), some record categories can be visibility-gated:
- internal finances (banded)
- staff disputes
- “private council warnings”

But competitive records (wins/losses, streaks, titles) are public.

### 29.4 No silent recompute surprises
Records recompute at deterministic times:
- end of each basho
- end of each year
- on retirements (finalize career stats)
- on governance actions that reshape history (mergers)

---

## 30. What Must Be Tracked (Authoritative Categories)

### 30.1 Rikishi — Career & Performance Records
Must track at minimum:

**Streaks**
- Longest **Win Streak (bouts)** (overall + division)
- Longest **Loss Streak (bouts)**
- Longest **Kachi-koshi Streak (basho)**
- Longest **Make-koshi Streak (basho)**
- Longest **Yūshō Streak (basho)**
- Longest **Absence Streak (days and basho)** (injury-driven, public)

**Peaks**
- Highest rank achieved (peak rank)
- Longest time at peak rank band
- Fastest promotion to sekitori (basho count)
- Fastest promotion to sanyaku (basho count)
- “Ozeki run” best 3-basho total (if modeled)

**Totals**
- Career wins (by division)
- Career losses (by division)
- Total basho participated
- Total basho missed (injury/public)
- Total sanshō
- Total yūshō / jun-yūshō
- Total playoff appearances

**Technique & Identity**
- Most-used kimarite (career)
- Highest-tier kimarite successfully executed (rare tier)
- “Signature kimarite streak” (same finisher multiple times)
- Style shifts (oshi→yotsu etc.)

**Rivalry**
- Most meetings vs a single opponent
- Longest rivalry (years)
- Largest comeback in rivalry record (e.g., down 0–6 then recovered)

---

### 30.2 Beya — Institutional Records
Must track:

**Titles & Awards**
- Total yūshō by division
- Most yūshō in a decade
- Most sanshō in a year
- “Most sekitori produced” (active at once / all-time)

**Streaks**
- Consecutive basho with a sekitori (no gaps)
- Consecutive basho with at least one kachi-koshi sekitori
- Consecutive basho without yūshō (drought streak)
- “Hot streak” (multiple yūshō within X basho)

**Development**
- Fastest produced sekitori from debut (within stable)
- Best rookie year (first-year totals)

**Welfare**
- Injury burden band per era (always visible)
- Number of mid-basho injury retirements (public)
- Welfare compliance streak (basho without sanction/warning)

**Economy (banded)**
- Longest sponsor era without churn (banded)
- Longest solvency streak (no rescue) (banded)

---

### 30.3 Oyakata — Leadership & Ethics Records
Must track:

**Tenure**
- Years active as oyakata
- Basho as stable head

**Success**
- Total yūshō produced during tenure
- Total sekitori produced during tenure
- Average stable rank (banded)

**Ethics**
- Sanctions during tenure
- “Clean years” streak (no scandals)
- Welfare reputation band changes

**Succession**
- Kabu acquisition path recorded
- “Successful succession” flags (stable continuity preserved)
- Forced closure / merger involvement

---

### 30.4 League-wide Records
Global record indices include:
- Most yūshō all-time (rikishi)
- Longest yokozuna tenure (if modeled)
- Most playoff appearances
- Most kenshō received (banded unless full visibility)
- Most sanshō all-time
- Longest drought between yūshō wins
- Era meta dominance “The Push Tide Era” metrics

---

## 31. Record & Streak Computation (Implementation Contract)

### 31.1 Deterministic recompute schedule
At the end of each basho:
1) finalize basho snapshot
2) update streak counters (per entity)
3) emit RecordBroken events (if any)
4) update HoF eligibility checks
5) update profile card summaries

At end of year:
- recompute decade/era aggregates
- roll “yearbook” summaries

On retirement:
- finalize career record book (no further changes except historical merges)

### 31.2 Streak Model (Generic)
```ts
Streak {
  streakType
  subjectType
  subjectId
  scopeDivision?
  startBashoId
  startDay?
  endBashoId
  endDay?
  lengthCount                 // bouts or basho depending on streakType
  bestValueAtEnd              // for quick card display
  linkedMoments[]             // key events (playoffs, injuries, scandal)
}
```

### 31.3 Record Model (Generic)
```ts
RecordEntry {
  recordId
  category
  scope: "league"|"division"|"beya"|"rikishi"|"oyakata"
  metricKey
  holderEntityId
  value
  achievedBashoId?
  achievedRange?
  narrativeTitle
  narrativeBlurbId
  tiedHolders?                // for shared records
}
```

### 31.4 Derived metrics formulas (examples)

**Longest win streak (bouts):**
- scan BoutResult events in chronological order
- increment on win, reset on loss/absence
- “absence breaks streak” by default (configurable, but must be consistent)

**Longest kachi-koshi streak (basho):**
- for each basho: if final record meets kachi-koshi threshold → increment else reset

**Most basho won in a row:**
- count consecutive basho where YūshōWon event exists for subject

**Most make-koshi in a row:**
- count consecutive basho with Make-koshi result

In all cases:
- a mid-basho retirement due to injury counts as “absence/withdrawal” and breaks performance streaks, but begins an “absence streak.”

---

## 32. “Record Broken” Moments (Ceremony + Narrative)

When a record is broken:
- emit `RecordBroken` event
- create Almanac highlight
- optionally trigger broadcaster callout in PBP (“a new mark in the books!”)

```ts
RecordBrokenEvent {
  recordId
  oldHolderId
  newHolderId
  oldValue
  newValue
  bashoId
  day?
  ceremonyTone: "understated"|"dramatic"|"historic"
}
```

---

## 33. Hall of Fame System (Full Feature)

### 33.1 Hall of Fame Concept
The Hall of Fame is a curated gallery of:
- legendary rikishi
- legendary beya eras
- legendary oyakata
- legendary rivalries
- iconic basho

It is both:
- a player “museum”
- a living institution (new inductees appear over time)

### 33.2 HoF Eligibility (Deterministic)
Eligibility is computed using weighted criteria.  
No random nominations.

#### 33.2.1 Rikishi HoF baseline gates
A rikishi becomes *eligible* if any of:
- 1+ top-division yūshō (or configurable)
- peak rank ≥ Ōzeki (or configurable)
- 3+ sanshō
- record-holder (any league record)
- “cultural legend” flag via narrative (rare; requires high fame + rivalries)

#### 33.2.2 Beya HoF baseline gates
- 5+ yūshō across history (configurable)
- recognized golden age interval
- produced a yokozuna (if modeled)

#### 33.2.3 Oyakata HoF baseline gates
- tenure ≥ 10 years
- produced a champion
- high compliance record (or “controversial legend” path)

### 33.3 Induction Pipeline
At year-end:
1) gather eligible candidates
2) score candidates (see §33.4)
3) generate an induction class of size N (era-scaled)
4) write induction events into history
5) produce ceremony narrative + plaque text

### 33.4 HoF Scoring (Rikishi)
Example scoring bands:

\[
Score = (Yusho \times 30) + (Sansho \times 8) + (PeakRankBonus) + (RivalryLegendBonus) - (ScandalPenalty)
\]

- PeakRankBonus:
  - Yokozuna: +40
  - Ozeki: +25
  - Sekiwake: +12
- RivalryLegendBonus:
  - +0 to +20 based on rivalry intensity and decisive moments
- ScandalPenalty:
  - severityBand * 15 (but can produce “infamous” inductee category if enabled)

### 33.5 HoF Categories (Fun + Flavor)
HoF is not only “greatest.” It supports multiple wings:

1) **Champions Wing** (pure achievement)
2) **Iron Men Wing** (durability, longevity, absence-free careers)
3) **Technicians Wing** (rare kimarite, signature style)
4) **Rivalry Wing** (duos and feuds)
5) **Controversial Wing** (scandal legends; optional, but fun)
6) **Beya Dynasty Wing**
7) **Oyakata Masters Wing**

Each wing has its own threshold logic.

### 33.6 HoF Page UI
For each inductee:
- plaque title (“The Unmoving Wall of the 2030s”)
- career/beya highlights (3–7 bullet facts)
- record badges (icons)
- rivalry links
- notable basho links
- “defining bout” link (opens PBP)

### 33.7 Player Interaction
Players can:
- bookmark moments into a personal scrapbook
- pin inductees on the main dashboard
- filter HoF by era, division, wing
- view “Induction Classes” year by year

Players cannot:
- forcibly induct someone (unless a “sandbox mode” is enabled)

---

## 34. Profile Cards & Surface Requirements (Mandatory)

### 34.1 Rikishi Card Additions
A rikishi profile card must show:
- Peak Rank band
- Career yūshō / sanshō counts
- **Top streak badge** (best streak achieved: win streak, kachi-koshi streak, or yūshō streak)
- Signature kimarite (top 1–2)
- Injury history summary (public): “Missed 2 basho (30 days)”

### 34.2 Beya Card Additions
Beya cards show:
- Total yūshō banded by division
- Current dynasty status (“Rebuilding”, “Golden Age”, “Stagnant”)
- Best streak badge (e.g., consecutive basho with sekitori)
- Welfare record band (injury burden)

### 34.3 Oyakata Card Additions
Oyakata cards show:
- Tenure
- Champions produced
- Clean-years streak (ethics)
- Compliance reputation band

---

## 35. History Pages: “All Relevant Things” Requirement

Each entity history page must include a **Records & Streaks** section with:

### 35.1 Rikishi history page
- Streak table (top 10 streaks)
- Records held
- Near-misses (“second-longest streak”, “almost broke record”)
- Injury durations list (always)

### 35.2 Beya history page
- Stable streaks (sekitori presence, yūshō droughts)
- Era table (golden ages, dark periods)
- Staff regime highlights
- Sponsors eras (banded)

### 35.3 Oyakata history page
- Tenure timeline
- production metrics
- scandal/ethics history
- succession decisions

---

## 36. Almanac Discoverability Features (Fun)

### 36.1 “On This Day” / “On This Basho”
A rotating historical tile:
- “On this basho in 2031…”
- link to that basho detail page

### 36.2 “Legend Hunt” quests (optional)
Soft achievements:
- discover 10 HoF plaques
- watch/read 5 defining bouts
- explore a decade’s era book

These are non-intrusive, purely flavor.

---

## 37. Engineering Notes

- Records computed via scan + cached snapshots.
- Maintain incremental update per basho to avoid full historical rescans.
- Use deterministic phrase seeds for plaque text to avoid repetition.
- HoF inductees persist as immutable events (cannot be “un-inducted” unless governance scandal retcons are explicitly modeled—default is no).

---

**END — Hall of Fame, Records & Streaks System**



---

# UPDATE v1.3 — Injury Card System, Hidden Injury Proneness, and Head‑to‑Head Compare (Authoritative)

This update extends the Almanac + HoF document with:
1) a **full-featured injury tracking surface on Rikishi cards**  
2) a **hidden Injury Proneness attribute** (simulation-facing, narrative-discoverable)  
3) a **Head‑to‑Head Compare feature** (side-by-side, fog‑of‑war compliant)

It also refines injury transparency to match real sumo culture:
- **Kyūjō / withdrawal is always public**
- **Injuries are always recorded in history**
- **Diagnosis specificity may be vague** unless confirmed—players may see “knee issue” rather than “ACL tear” if the disclosure level is low

This preserves the earlier v1.1 hard rule that injuries are never omitted from history, while allowing *precision-of-disclosure* to vary.

---

## 38. Injury Transparency (Refined) — “Public, But Not Always Precise”

### 38.1 What is ALWAYS public (non-negotiable)
The following is always visible in Almanac/history and on relevant pages:
- Kyūjō (absence) start (basho/day) and end
- Tournament withdrawal (mid-basho) day
- Whether a bout was forfeited due to injury/kyūjō
- Injury duration (days, basho missed, bouts forfeited)
- Whether retirement occurred mid-basho due to injury

### 38.2 What can be VAGUE (diagnosis specificity)
The *diagnosis label* shown to the player can be one of:
- **Confirmed**: precise (e.g., “ACL tear”)
- **Reported**: general category (e.g., “knee ligament damage”)
- **Undisclosed**: vague (e.g., “knee issue”, “upper body strain”)

**Rule:** even if diagnosis is vague, the event exists and the time missed is shown.

### 38.3 Disclosure Level is deterministic
Disclosure level is computed from:
- Injury severity band (higher → more likely confirmed)
- Rikishi fame/star power (higher → more public scrutiny)
- Oyakata ethics/welfare reputation (higher → more transparent)
- Media climate (scandal climate / curiosity band)
- Player’s observability (scouting, relationships)

No RNG in disclosure level; it must be replay-safe.

---

## 39. Injury Data Model (Extended)

### 39.1 Injury Event Payload (final shape)
```ts
InjuryEvent extends HistoricalEvent {
  injuryRegion              // knee/ankle/hip/back/shoulder/neck/etc.
  injuryTypeCanonical?      // ACL tear, pectoral tear, fracture, etc. (may be hidden)
  severityBand              // minor/moderate/severe/career-threatening
  disclosureLevel           // confirmed/reported/undisclosed
  onsetBashoId
  onsetDay
  expectedRecoveryDays      // always present (even if vague)
  actualRecoveryDays?       // filled on return/retirement
  kyujōStatus               // absent / partial / withdrew
  withdrewDay?              // if mid-basho withdrawal
  retirementLinked?         // true if retirement due to this injury
  reInjuryRiskBand          // low/med/high (internal; can be surfaced narratively)
}
```

### 39.2 Injury Episode (grouping multiple events)
Injuries often have follow-ups and re-injuries.  
The Almanac groups InjuryEvents into **InjuryEpisodes**:

```ts
InjuryEpisode {
  episodeId
  rikishiId
  primaryRegion
  startBashoId
  endBashoId?
  totalDaysLost
  bashoMissedCount
  disclosureMaxLevel        // max(disclosureLevel) across events
  linkedEvents[]
}
```

An episode allows:
- “ongoing knee saga” presentation
- consolidated duration tracking
- career-arc narrative (“never fully recovered”)

---

## 40. Hidden Attribute: Injury Proneness

### 40.1 Definition
Each rikishi has a hidden attribute:

- `injuryProneness ∈ [0.0, 1.0]` (or 0–100 internally)

It represents:
- connective tissue vulnerability
- recovery fragility
- tendency to accumulate chronic issues
- propensity for re-injury under fatigue

### 40.2 Deterministic generation
`injuryProneness` is derived deterministically at world gen from:
- RikishiSeed
- Body archetype tendencies (mass, mobility profile)
- Age/phase curve seed
- Optional background traits (amateur wear-and-tear)

No runtime randomness.

### 40.3 How proneness affects simulation (authoritative knobs)
Proneness modifies:
1) **Injury probability** (per tick / per bout)
2) **Injury escalation** (minor → moderate → chronic)
3) **Recovery duration** (actualRecoveryDays drift upward)
4) **Re-injury risk** (higher chance of episodes reopening)

Implementation bands (example):
- Proneness < 0.25: Durable
- 0.25–0.55: Normal
- 0.55–0.80: Fragile
- > 0.80: Glass

### 40.4 Player visibility (fog-friendly, narrative-forward)
Players never see “injuryProneness = 0.74”.

Instead, they discover it through:
- recurring injury episodes
- unusually long recovery relative to severity
- staff commentary (“his knees don’t forgive”)
- medical staff confidence notes (if hired/scouted)

The UI surfaces a **public-facing descriptor badge** once evidence threshold is reached:

- “Durable frame”
- “Often banged up”
- “Chronic concern”
- “Glass knees” (rare, dramatic)

Evidence threshold is deterministic:
- number of injury days in last N basho
- re-injury count
- mismatch between expected vs actual recovery

---

## 41. Rikishi Card — Injury Tracking (Full Feature)

### 41.1 Card surface goals
The Rikishi card must communicate:
- current availability
- ongoing injury episode
- recent injury history (public)
- risk caution (without exposing hidden math)

### 41.2 Mandatory Injury Panel (on every rikishi card)
**Panel sections:**

**A) Current Status Line**
- “Active”
- “Kyūjō (Day 6, 2037.05)”
- “Withdrew (Day 9, 2037.01)”
- “Retired mid-basho (Day X, YYYY.MM)”

**B) Current Injury Episode (if any)**
- Region + (if disclosed) type
- Severity band
- “Expected return” (days/basho band)
- “Days missed so far”

**C) Recent History Strip (last 6 basho)**
Icons/badges per basho:
- Healthy
- Withdrew
- Kyūjō days
- Returned

**D) Lifetime Injury Summary**
- Total days missed (career)
- Total basho missed (career)
- Chronic regions list (top 2)

**E) Risk Descriptor (derived)**
- “Durable frame” / “Chronic concern” etc.
(visible only if evidence threshold met; otherwise “No public pattern”)

### 41.3 Injury timeline integration
From the card, a player can open:
- Injury Episode detail page (with event list and durations)
- the exact Basho where withdrawal occurred
- “Impact on career” narrative (auto-generated)

### 41.4 Card behavior under fog-of-war
Because injuries are public, **injury presence and duration are always visible** even for lightly scouted opponents.

However, **diagnosis specificity** follows disclosure level:
- confirmed: show “ACL tear”
- reported: show “knee ligament damage”
- undisclosed: show “knee issue”

---

## 42. Comparing Rikishi — Head‑to‑Head System (Fog‑of‑War Compliant)

### 42.1 Feature intent
Players should be able to compare:
- two rikishi
- a rikishi vs a shortlist
- stable roster candidates vs scouted prospects

The compare system must:
- feel like a sports almanac tool
- obey observability/fog rules
- be fast and readable
- remain narrative-first by default

### 42.2 Access points
- From any rikishi profile: “Compare”
- From banzuke list: select two names → compare
- From scouting shortlist: compare candidates
- From rivalry page: “Compare Rivals”

### 42.3 Compare Layout (Side-by-side)
**Left: Rikishi A** | **Right: Rikishi B**

Sections:

1) **Header**
- Shikona, rank, beya, status (active/kyūjō/retired)
- profile badges: style/archetype, signature kimarite, HoF badges, injury risk descriptor

2) **Head‑to‑Head Record** (public)
- Total meetings, A wins / B wins
- Last 5 meetings (basho/day + kimarite + outcome)
- High-stakes meetings (playoffs, title implications) highlight

3) **Physical Comparison**
- Height / weight shown per fog rules:
  - **Known**: exact numbers (if public or well-scouted)
  - **Estimated**: “~178 cm”, “~160–170 kg”
  - **Unknown**: “Unverified”
- Trend arrows (weight rising/falling) can be shown as bands.

4) **Form & Streaks**
- Current basho record (if in progress and public)
- Best streak badges (win streak, kachi-koshi streak, etc.)
- Recent form (last 3 basho) with narrative labels:
  - “Hot”, “Unsteady”, “Rebuilding”, “Injured”

5) **Style & Technique**
- Primary style + confidence band
- Top kimarite list (tier labels)
- “Matchup note” narrative:
  - “B’s belt game punishes A’s forward charge…”

6) **Injury & Availability** (always public)
- Current injury episode and duration
- Days missed last year
- “Likelihood of kyūjō” descriptor (derived evidence; not raw proneness)

7) **Career Honors**
- Yūshō, sanshō, playoff appearances
- HoF wing badges (if inducted)

8) **Narrative Capsule**
A 2–4 sentence comparison:
- rivalry framing
- contrast of careers
- injury saga references if relevant

### 42.4 Fog-of-war rules in Compare (explicit)
The compare view uses a **field-by-field visibility policy**:

| Field | Visibility baseline | Notes |
|---|---|---|
| Bout outcomes, kimarite, awards | Public | Always visible. |
| Kyūjō/withdrawal, duration | Public | Always visible. |
| Height/weight | Semi-public | Exact if known; otherwise estimated/unknown. |
| Internal stats (power/technique etc.) | Private | Never shown as numbers; only descriptors, unless player has “analytics view” unlocked for that entity. |
| Injury proneness | Hidden | Never shown directly. Only derived descriptor if evidence threshold met. |
| Training regimen | Private | Not visible unless scouted/relationship. |
| Staff evaluations | Private | Visible to stable owner for own rikishi; fogged for others. |

**Important:** Compare must gracefully degrade—never show blanks without explanation. Use “Unverified”, “Estimated”, “Rumored”.

### 42.5 How estimates are produced (deterministic)
If a field is not fully known, the system produces an estimate band based on:
- last known measurements
- visual scouting confidence
- division norms
- narrative reports (rumors)

Estimates must be deterministic and version-stable.

### 42.6 “Compare vs League Average” option
A toggle for each side:
- show “above average / average / below average” descriptors for:
  - size
  - durability (injury days)
  - consistency (kachi-koshi rate)
This uses public history only and respects fog rules.

---

## 43. Additional Profile Surfaces (Beya / Oyakata) — Injury & Comparison Hooks

### 43.1 Beya profile: Injury Burden Panel (public)
Because injuries are public, beya pages show:
- injury days last year (total roster)
- number of withdrawals (year)
- number of mid-basho injury retirements (history)
- era-by-era “injury climate” strip (derived)

### 43.2 Oyakata profile: Welfare Pressure Meter
Oyakata pages show a public-facing welfare summary:
- “injury burden trend” (rising/stable/falling)
- governance scrutiny risk (derived from injury + sanctions)
- notes when repeated severe injuries occur under their tenure

### 43.3 Compare feature expansion
- Compare **beya vs beya**: head-to-head yūshō, rivalry heat, injury burden, scandals.
- Compare **oyakata vs oyakata**: tenure outcomes, compliance history, champions produced.

All comparisons obey fog-of-war (private governance notes may remain hidden unless public).

---

## 44. Fun UX Details (Make it feel like an Almanac)

### 44.1 “Classic Matchup” callout
If two rikishi have:
- ≥10 meetings OR
- playoff meeting OR
- high rivalry intensity  
then the compare page shows:
- “Classic Matchup” banner
- link to defining bout PBP

### 44.2 “Injury Saga” storyline tag
If an injury episode lasts:
- ≥30 days OR
- ≥2 basho missed OR
- repeats in same region 3+ times  
tag the rikishi as having an “Injury Saga” (public), with an Almanac story card.

### 44.3 “What if healthy?” aside (optional, tasteful)
A narrative-only aside:
- “If not for the knee troubles…”
No counterfactual stat simulation is presented in the almanac (keeps truth intact).

---

## 45. Integration Checklist (Engineering)

- [ ] Add `injuryProneness` to rikishi internal model (hidden)
- [ ] Implement disclosureLevel computation (deterministic)
- [ ] Add InjuryEpisode grouping and caching
- [ ] Add Rikishi Card Injury Panel (mandatory)
- [ ] Add Compare UI with visibility policy layer
- [ ] Add “estimated fields” generator (deterministic)
- [ ] Add streak + injury summary badges to compare header
- [ ] Update Beya/Oyakata profile surfaces for injury burden

---

END UPDATE v1.3



---


# UPDATE v1.4 — Folk Memory, Signature Moments, Era Myth, and Fan Culture (Integrated)

This section restores the **full ultra-granular canonical content** for Folk Memory, Signature Moments,
Beya Traditions, Rivalry Chapters, Era Labels, Fan Sentiment, and “What Might Have Been” systems.
Nothing in this section is abbreviated or summarized.

---

## 46. Folk Memory & Myth System (Soft History Layer)

### 46.1 Purpose
Folk Memory represents how the sumo world *remembers* entities — imperfectly, emotionally, and selectively.
It exists alongside immutable official history and may diverge from raw statistical truth.

This system exists to:
- reinforce long-term narrative texture
- explain why reputations persist beyond form
- influence sponsors, fans, and AI behavior in believable ways

### 46.2 Dual-Layer History Model
Every historical subject has:
- **Official Record** (immutable, factual)
- **Folk Memory Layer** (interpretive, persistent, slow-moving)

Folk Memory never alters official stats.

### 46.3 Myth Tags (Emergent Labels)

Rikishi Myth Tags:
- Iron Man
- Glass Giant
- Giant Killer
- Eternal Sekiwake
- Playoff Specialist
- Crowd Favorite
- Injury-Plagued Talent
- Late Bloomer

Beya Myth Tags:
- Champions Factory
- Injury Mill
- Quiet Rebuilders
- Dynasty Stable
- Scandal-Touched
- Welfare Watchlist

Oyakata Myth Tags:
- Builder
- Traditionalist
- Risk-Taker
- Welfare Hawk
- Controversial Figure

### 46.4 Myth Derivation Rules
Myths are derived deterministically from:
- injury frequency and severity
- streak profiles
- rivalry outcomes
- fan sentiment drift
- media narrative persistence

Myths:
- are slow to appear
- slow to fade
- persist post-retirement
- influence HoF plaques, commentary, and sponsor interest

---

## 47. Signature Moments System (Career Highlight Reel)

### 47.1 Definition
Signature Moments are **iconic, career-defining events** that transcend raw statistics.

Examples:
- Upset Yokozuna on Day 15
- Won playoff after extended bout
- Returned from kyūjō to claim yūshō
- Final bout before forced retirement
- Debut basho shock performance

### 47.2 Detection Logic
A Signature Moment is created when:
- rarity thresholds are crossed
- event occurs under high narrative pressure
- long-term consequences result

### 47.3 Persistence
Once assigned:
- Signature Moments are immutable
- Always shown on profile cards
- Anchors Folk Memory and HoF narratives

---

## 48. Beya Traditions & Cultural Drift

### 48.1 Definition
Beya Traditions represent institutional behavior patterns that emerge over time.

Examples:
- Harsh Keiko Culture
- Rehabilitation First
- Foreign Friendly
- Youth Development Focus
- Oshi Specialists
- Belt Technicians

### 48.2 Emergence Rules
Traditions emerge from:
- training intensity history
- injury burden
- recruitment pipelines
- oyakata philosophy

Traditions:
- affect recruitment perception
- affect sponsor alignment
- can decay or shift after leadership changes or scandals

---

## 49. Rivalry Chapters (Narrative Escalation)

### 49.1 Rivalry Lifecycle
Rivalries are divided into narrative chapters:
- The Rise
- The Bitter Years
- The Injury Turn
- The Reversal
- Passing of the Torch
- Lingering Grudge

### 49.2 Chapter Triggers
Triggered by:
- playoff meetings
- decisive streak reversals
- injuries affecting outcomes
- rank crossovers

Chapters are permanent once entered.

---

## 50. Era Labels & Macro History

### 50.1 Era Detection
Era labels are generated based on:
- dominant fighting styles
- injury climate
- sponsor climate
- scandal density

Examples:
- The Push Tide Era
- The Broken Knees Years
- The Yokozuna Drought
- The Sponsor Gold Rush

### 50.2 Era Effects
Era labels influence:
- commentary phrasing
- AI recruitment preferences
- sponsor risk appetite
- historical summaries

---

## 51. Fan Sentiment & Crowd Memory

### 51.1 Fan Sentiment Score
A hidden value per rikishi and beya representing public affection.

Influenced by:
- fighting through injury
- underdog victories
- scandal involvement
- rivalry drama

### 51.2 Effects
Fan Sentiment affects:
- crowd reactions
- commentary warmth
- sponsor enthusiasm
- banner intensity

---

## 52. “What Might Have Been” Ghost Records

### 52.1 Definition
Narrative-only legacy markers for careers derailed or truncated.

Examples:
- Injury-forced early retirement
- Repeated near-promotion failures
- Chronic kadoban collapses

### 52.2 Presentation
Displayed as:
- Near-Miss panels
- HoF honorable mentions
- Almanac narrative sidebars

No counterfactual stats are generated.

---

## 53. Mandatory Profile Integration

Rikishi profiles must show:
- Myth Tags
- Signature Moments
- Fan Sentiment descriptor
- What Might Have Been note (if applicable)

Beya profiles must show:
- Tradition badges
- Era identity markers
- Reputation drift notes

Oyakata profiles must show:
- Leadership myth
- Era influence
- Ethics memory

---

END UPDATE v1.4 (FULL RESTORED CONTENT)

```



## SOURCE 02 — Basho_Banzuke_Scheduling_and_Awards_System_v1.3_Full.md

```md
# Basho — Banzuke, Scheduling & Awards System v1.3  
## Full-Detail Canonical Specification

Date: 2026-01-06  
Status: Canonical, deterministic, implementation-grade  
Supersedes:
- Banzuke & Scheduling System v1.0
- Banzuke, Scheduling & Basho Awards System v1.1
- Banzuke, Scheduling & Awards System v1.2 (summary)

This document restores **full mechanical and heuristic detail** while retaining all award logic and integrations introduced in later versions. It is the **authoritative contract** for ranking, matchmaking, promotion, playoffs, and basho honors.

---

## 1. System Role & Design Philosophy

The Banzuke system is the **legitimacy engine** of Basho.

It:
- converts bout outcomes into social hierarchy
- defines economic thresholds (sekitori status)
- shapes AI planning horizons
- anchors narrative memory and prestige
- constrains governance decisions

> The banzuke is not a leaderboard — it is an institutional judgment rendered in public.

Design requirements:
- fully deterministic
- explainable after the fact
- resistant to edge-case abuse
- recognizable to sumo-literate players

---

## 2. Divisional Structure

### 2.1 Divisions, Sizes & Bout Counts

| Division | Abbrev | Target Size | Bouts |
|--------|--------|-------------|-------|
| Makuuchi | M | 42 | 15 |
| Jūryō | J | 28 | 15 |
| Makushita | Ms | ~120 | 7 |
| Sandanme | Sd | ~200 | 7 |
| Jonidan | Jd | ~350 | 7 |
| Jonokuchi | Jk | ~100 | 7 |

Rules:
- Makuuchi and Jūryō are **hard-capped**
- Lower divisions may flex temporarily to absorb overflow
- All overflow is resolved by next basho

---

## 3. Rank Encoding & Ordering

### 3.1 Canonical Rank ID

```
{Division}{Number}{Side}
Examples: M3E, J14W, Ms2, S1E
```

Rules:
- East always outranks West at same number
- Lower numbers outrank higher
- Yokozuna and Ōzeki retain internal ordering even if side-hidden

### 3.2 Rank Object (Engine Contract)

```ts
Rank {
  division: DivisionID
  number: number
  side?: "E" | "W"
  orderIndex: number
}
```

---

## 4. Basho Structure

- 6 basho per year
- 15 days per basho
- One bout per day for sekitori
- Lower divisions fight on scheduled subset days
- All bouts emit:
  - result
  - kimarite
  - duration
  - fatigue delta
  - narrative hooks

---

## 5. Torikumi (Matchmaking)

### 5.1 Core Principles

Torikumi prioritizes **legitimacy over fairness**.

Constraints:
- no repeat opponents within a basho
- stablemates never fight (except playoff edge cases)
- injuries and withdrawals respected

Priority signals:
1. Rank proximity
2. Record similarity
3. Yūshō impact
4. Rivalries
5. East/West balance

---

### 5.2 Upper Division Scheduling Phases

**Days 1–5 (Opening):**
- Rank bands ±2
- Conservative pairing
- Yokozuna protected from early clashes

**Days 6–10 (Sorting):**
- Record-based matching
- Leaders face resistance
- Rank distance allowed to widen

**Days 11–14 (Contention):**
- Direct yūshō impact prioritized
- Leaders face leaders
- Narrative stakes peak

**Day 15 (Resolution):**
- Highest-impact bouts only
- Playoff preparation

---

### 5.3 Lower Division Scheduling

- Fixed bout counts (usually 7)
- Drawn from same division bands
- Fewer rematch constraints
- Emphasis on promotion sorting

---

## 6. Promotion & Demotion Logic

### 6.1 Core Inputs

For each rikishi:
- starting rank
- wins / losses
- opponent average rank
- division slot pressure

No randomness.

---

### 6.2 Upper Division Heuristics

**Jūryō ↔ Makuuchi**
- 8–7 at M17 → borderline
- 7–8 at M16–17 → demotion candidate
- 9–6 at J1–J2 → promotion candidate
- Excess resolved by:
  1. wins
  2. opponent strength
  3. prior rank

**Sanyaku**
- Komusubi / Sekiwake: 8+ wins to retain
- Ōzeki:
  - make-koshi → kadoban
  - two consecutive make-koshi → demotion
  - promotion via ~33 wins over 3 basho
- Yokozuna:
  - promotion requires yūshō-level dominance
  - never demoted, only retired (governance hook)

---

### 6.3 Lower Division Promotion

- Promotion bands by wins
- High Makushita promotion strictly limited by Jūryō slots
- Overflow absorbed downward temporarily

---

## 7. Rank Reassignment Algorithm

1. Partition by division
2. Sort by:
   - wins
   - opponent strength
   - prior rank
3. Assign slots top-down
4. Alternate East/West
5. Resolve conflicts deterministically

Produces identical banzuke given identical inputs.

---

## 8. Playoffs

### 8.1 Yūshō Ties

- Triggered by shared best record
- Single-elimination
- Order determined by:
  1. head-to-head
  2. rank
  3. seeded shuffle

Fatigue carries over.

---

## 9. Basho Awards & Sanshō

### 9.1 Emperor’s Cup (Yūshō)

- Awarded to basho champion
- Major prestige anchor
- Strong promotion signal
- Historical milestone

---

### 9.2 Sanshō Eligibility

- Maegashira and below
- Minimum 8 wins
- Not withdrawn

---

### 9.3 Fighting Spirit (Kantō-shō)

Signals:
- upset wins
- high-intensity bouts
- exceeding rank expectation

Deterministic score model applied.

---

### 9.4 Technique (Ginō-shō)

Signals:
- kimarite variety
- uncommon / rare techniques
- clean execution

Uses Kimarite Tier System.

---

### 9.5 Outstanding Performance (Shukun-shō)

Signals:
- Yokozuna defeat
- decisive yūshō impact
- landmark achievements

---

### 9.6 Multiple Sanshō

Allowed but rare.
Narratively emphasized.

---

## 10. Additional Trophies

- Prime Minister’s Cup
- JSA Cup
- MacArthur Cup (foreign-born yūshō)
- Technique Excellence Trophy
- Fighting Spirit Trophy (analytics-visible)

---

## 11. Award Resolution Order

1. Resolve playoffs
2. Lock records
3. Compute scores
4. Validate eligibility
5. Emit awards

Awards never retroactively affect rank.

---

## 12. Data Output Contracts

### 12.1 RankSnapshot

```ts
RankSnapshot {
  rikishiId
  division
  rank
  number
  side
  bashoId
}
```

### 12.2 BashoResult

```ts
BashoResult {
  rikishiId
  wins
  losses
  startRank
  endRank
  awards[]
}
```

---

## 13. Integration Hooks

- **Economy:** sekitori salary thresholds, prestige
- **AI:** promotion planning, risk appetite
- **Narrative:** collapse arcs, miracle runs
- **Governance:** yokozuna approval, sanctions

---

## 14. Determinism Guarantee

Same inputs → same:
- torikumi
- banzuke
- promotions
- awards

No hidden randomness.

---

## 15. Canon One-Liner

> The banzuke is the public memory of sumo — everything else exists to justify it.

---

End of Banzuke, Scheduling & Awards System v1.3

```

```



## SYSTEM 3 — Beya Staff/Welfare ↔ NPC Manager AI
**Source file:** `Beya_Welfare_x_NPC_Manager_AI_Megacanon_v1.0_HARMONIZED_NONLOSSY.md`

```md
# Basho — Beya Staff/Welfare × NPC Manager AI Megacanon v1.0 (Harmonized, Non‑Lossy)
**Build date:** 2026-01-12  
**Status:** DEFINITIVE HARMONIZATION / NON‑LOSSY / IMPLEMENTATION‑GRADE  
**Scope:** Institutional beya operations, staff careers, welfare/medical liability & compliance, and the deterministic NPC Manager AI that runs stables under the same rules as the player.

## What this file is
This document merges **two canonical systems** into one integrated contract:

1) **Beya Staff & Welfare Canon v1.1** (institutional operations, staff careers, welfare & medical responsibility, facility constraints, investigation triggers, UI warnings, failure modes)  
2) **NPC Manager AI System v1.3** (deterministic beya managers, traits/archetypes, perception snapshot, meta drift interpretation, adaptation levers, rivalry and governance pressure integration, succession/legacy, logging/auditability)

### Non‑lossy guarantee
- **Part A**: a curated, hierarchical harmonized spec that explicitly documents interactions and shared data contracts.
- **Part B**: a **verbatim Source Preservation Annex** embedding both source files in full (no deletions), ensuring nothing is lost.

### Precedence & resolution rules (binding within this file)
1. **Part A** is authoritative for integration behavior and shared interfaces.
2. If Part A is silent on a detail: defer to the most directly relevant source file (v1.1 for staff/welfare; v1.3 for AI).
3. Where sources overlap (e.g., “AI evaluates welfare risk”), Part A defines the *ordering* and *data exchange format*; the source text defines the *local semantics*.
4. Determinism always wins: no runtime RNG, no hidden dice, and no “narrative causes engine” feedback.

---

# PART A — Harmonized Specification (Curated, Cross‑System)

## A0. Unified design thesis
A beya is a **living institution** whose outcomes are produced by:
- **people** (staff careers, loyalty, fatigue, scandals, competence),
- **systems** (facilities, budgets, compliance bands, welfare risk),
- **decisions** (recruitment/investment/austerity/succession),
- **constraints** (roster caps, foreign slot rules, sanctions),
- **perception** (non‑cheating snapshots, narrative tags, media heat),
all executed by either a **player** or a **deterministic NPC Manager AI**.

> **The AI does not get buffs. It gets continuity — and the consequences of mismanaging institutions.**

---

## A1. Canonical objects and shared contracts (normalized)

### A1.1 BeyaOperationalState (institutional truth)
```ts
BeyaOperationalState {
  beyaId
  facilitiesBand
  facilityLevels { dojo, kitchen, recovery, medical, dormitory }
  staffRoster: StaffId[]
  staffCoverageSnapshot
  medicalCoverageBand
  welfareRiskBand
  complianceStatus
  governanceExposure
  operatingStress
  financeState { mood, runwayWeeks? }
  rosterState { size, softCap, hardCap }
  foreignSlotState { occupied: bool, occupantId?, dualCitizenException? }
}
```

### A1.2 Staff (persistent people)
```ts
Staff {
  staffId
  role
  age
  careerPhase
  reputationBand
  loyaltyBand
  competenceBands { primary, secondary? }
  fatigue
  scandalExposure
  yearsAtBeya
  priorAffiliations[]
  successorEligible: boolean
}
```

### A1.3 Manager (NPC beya decision-maker)
```ts
Manager {
  managerId
  beyaId
  name
  origin
  archetype
  traits: ManagerTraits
  quirks: ManagerQuirk[]
  tenure: TenureRecord
  legacy: LegacyModifier
  rivalrySensitivity: number
}
```

### A1.4 PerceptionSnapshot (non‑cheating interface)
```ts
PerceptionSnapshot {
  metaNarratives: MetaNarrativeTag[]
  stableHealth: "thriving"|"stable"|"fragile"|"critical"
  injuryMood: "contained"|"worrying"|"spiraling"
  financeMood: "flush"|"tight"|"danger"
  rivalryStates: RivalryPerception[]
  governancePressure: "none"|"watch"|"active"|"crisis"
  mediaHeat: "low"|"medium"|"high"|"inferno"
}
```

**Harmonization rule:** `PerceptionSnapshot` is derived deterministically from `BeyaOperationalState` + visible world events. It never reads hidden stats.

---

## A2. Deterministic update ordering (shared clock)

### A2.1 Weekly tick (interim weeks)
1. Update `BeyaOperationalState` bookkeeping (facilities upkeep, staff fatigue drift, coverage dilution, operating stress).
2. Update welfare & medical pipeline signals:
   - recent injury events → responsibility assignment
   - welfare risk accumulation/decay
   - compliance state machine transitions (watch/investigation/etc.)
3. Derive `PerceptionSnapshot` (tags only).
4. NPC Manager AI **Weekly Decision Loop** runs (or player inputs are applied):
   - solvency posture
   - injury/welfare posture
   - roster vs target
   - investment vs austerity
   - foreign slot actions
   - (interface) focus slot allocation requests to training systems (external)
5. Emit deterministic logs (institutional + manager decision logs).
6. Narrative/UI consume logs (no feedback into steps 1–5).

### A2.2 Basho-end tick
1. Compute world meta drift metrics → narrative tags (for AI perception).
2. Apply recruitment windows and end-of-basho reviews (player + NPC).
3. Run any governance escalations/sanctions based on compliance state.
4. Update tenure records, staff career phase transitions, manager legacy modifiers where relevant.

---

## A3. Welfare risk × AI behavior (explicit integration)
### A3.1 WelfareRiskBand as a first-class decision input
AI treats welfare risk as “institutional survival pressure,” not a minor debuff.

**Inputs:** welfareRiskBand, medicalCoverageBand, staff fatigue (esp. medical), operatingStress, governancePressure, mediaHeat.  
**Outputs:** medical facility priority, medical hiring/replacement, roster resizing to improve coverage, caution posture, short-term performance sacrifice to avoid sanctions.

### A3.2 Welfare failure modes (shared)
- Star career shortened by neglect
- Beya sanctioned after patterns
- Staff scapegoating vs systemic reform
- Financial collapse from compliance costs

---

## A4. Staff burnout, medical error, and AI non-cheating
High staff fatigue increases medical error and scandal exposure *via explicit channels*.  
AI sees derived warnings (“staff overextended”, “medical oversight concerns”), not raw probabilities.

---

## A5. Governance & scandal integration (joint contract)
### A5.1 ComplianceStatus ↔ GovernancePressure mapping
- Compliant → none
- Watch → watch
- Investigation → active
- Sanctioned/Restricted → crisis

### A5.2 Scandal attachment
Scandals attach to staff (primary), beya (secondary), manager/oyakata (derivative).  
AI response depends on GovernanceDeference, WelfareSensitivity, FinanceDiscipline, Rivalry pressure.

---

## A6. Rivalry pressure interacts with welfare (edge-case rules)
Rivalry distorts weighting and timing, but:
- If complianceStatus ≥ Investigation, rivalry cannot justify further welfare risk escalation.
- Under Sanctioned/Restricted, forced actions override rivalry desperation.

---

## A7. Succession & continuity (staff + manager)
Two linked tracks:
1) Staff succession (Assistant Oyakata, successor eligibility, kabu hooks)
2) Manager replacement (triggers, candidate sources, legacy modifiers)

Legacy modifiers carry cultural momentum and staff loyalty inertia across manager changes.

---

## A8. Logging & auditability
Two required streams:
- **Institutional log:** welfare, compliance, staff, facilities, governance actions  
- **Manager decision log:** tickId/managerId/beyaId/actionType/qualitative inputs/outcome

Invariant: identical inputs → identical logs.

---

## A9. Reconciliation note
The systems were designed to interlock; harmonization focuses on **ordering**, **shared vocabulary**, and **interfaces** (PerceptionSnapshot derivation; welfare-to-AI levers). Sanctions/constraints override rivalry desperation.

---

# PART B — Source Preservation Annex (Verbatim)
> Everything below is embedded verbatim. No deletions. No rewriting.


## SOURCE 01 — Basho_Beya_Staff_and_Welfare_Canon_v1.1_Ultra_Granular.md

```md

# Basho — Beya Management, Staff Careers & Welfare Canon v1.1
## Ultra-Granular Institutional Operations Specification

Status: DEFINITIVE  
Scope: Stable operations, staff careers, welfare & medical liability  
Guarantee: Non-lossy, larger than source material, implementation-grade

This document **merges and supersedes**:
- Beya Management System v1.0
- Staff Careers & Institutional Roles Canon v1.0
- Injury / Welfare–related portions of Rikishi Development Canon v1.3

It resolves overlaps, wires systems together explicitly, and preserves all original text in annexes.

---

# PART I — DESIGN AXIOMS (INSTITUTIONAL SCOPE)

1. **A beya is an employer**, not a menu of bonuses.  
2. **Staff are people with careers**, not sliders.  
3. **Welfare failures have institutional consequences**, not isolated penalties.  
4. **Medical outcomes are deterministic and attributable.**  
5. **Negligence is remembered.**

---

# PART II — BEYA AS AN OPERATING INSTITUTION

## 2. Beya Operational State Model

```ts
BeyaOperationalState {
  beyaId
  facilitiesBand
  staffRoster: StaffId[]
  medicalCoverageBand
  welfareRiskBand
  complianceStatus
  governanceExposure
  operatingStress
}
```

Each field updates on weekly or monthly ticks.

---

## 3. Core Responsibilities of a Beya

A beya is responsible for:
- training safety
- medical care
- injury response
- compliance with governance norms
- staff workload management

Failure in any category produces **institutional risk**, not hidden debuffs.

---

# PART III — STAFF CAREERS (INTEGRATED)

# Basho — Staff Careers & Institutional Roles Canon v1.0
## Ultra-Granular, Integrated Specification (Implementation Grade)

This document **adds a full Staff Career system** and integrates it explicitly with:
- Beya Management
- NPC Manager AI
- Economy & Governance
- Training & Rikishi Development
- Succession, Scandals, and Narrative Memory

It is designed to be **non–high-level**, deterministic, and larger than its source inputs.

---

## PART I — DESIGN INTENT

Staff in Basho are **not modifiers**.
They are **people with careers**, incentives, reputations, fatigue, and failure states.

Staff careers exist to:
- create long-term continuity beyond rikishi careers
- introduce institutional memory
- constrain player optimization
- create succession and governance pressure
- generate narrative arcs (loyal aides, disgraced doctors, legendary coaches)

---

## PART II — STAFF ROLES (CANONICAL)

### 1. Staff Categories

| Role | Count | Notes |
|---|---|---|
| Oyakata | 1 | Required, governed by kabu |
| Assistant Oyakata | 0–2 | Succession + delegation |
| Technique Coach | 0–2 | Skill bias |
| Conditioning Coach | 0–2 | Fatigue & injury bias |
| Nutritionist | 0–1 | Weight stability |
| Medical Staff | 0–2 | Injury severity & recovery |
| Scout | 0–1 | Recruitment & info quality |
| Administrator | 0–1 | Economy & governance mitigation |

No role is optional in effect — absence is a penalty.

---

## PART III — STAFF ENTITY MODEL

### 2. Staff Object (Persistent)

```ts
Staff {
  staffId
  role
  age
  careerPhase
  reputationBand
  loyaltyBand
  competenceBands {
    primary
    secondary?
  }
  fatigue
  scandalExposure
  yearsAtBeya
  priorAffiliations[]
  successorEligible: boolean
}
```

Numeric values exist internally; UI shows **bands and descriptors only**.

---

## PART IV — CAREER PHASES

### 3. Staff Career Phases

| Phase | Effects |
|---|---|
| Apprentice | Low impact, high growth |
| Established | Full effectiveness |
| Senior | Stable but rigid |
| Declining | Error-prone |
| Retired | Succession only |

Career phase advances deterministically by age, workload, and scandal.

---

## PART V — STAFF EFFECTS (WIRED)

### 4. Integration Points

#### 4.1 Training
- Technique coaches bias growth vectors
- Conditioning coaches modify fatigue decay
- Medical staff reduce injury escalation

#### 4.2 Economy
- Staff salaries are fixed weekly drains
- Administrator reduces insolvency escalation
- Senior staff cost more, fail harder

#### 4.3 Governance
- Staff scandals increase scrutiny
- Medical negligence accelerates sanctions
- Assistant oyakata succession affects council decisions

#### 4.4 AI
NPC managers evaluate:
- staff burnout
- loyalty risk
- replacement cost
- succession readiness

---

## PART VI — STAFF SCANDALS

### 5. Staff-Originated Scandals

Examples:
- medical malpractice
- illegal training practices
- recruitment violations
- financial misreporting

Scandals attach to:
- staff member
- beya
- oyakata (derivative)

---

## PART VII — SUCCESSION & LEGACY

### 6. Assistant Oyakata Path

- Must hold or acquire kabu
- Reputation gated
- Loyalty-tested
- May defect to rival beya

Failure to plan succession increases closure probability.

---

## PART VIII — UI & NARRATIVE

### 7. Player Presentation

Staff are shown as:
- named individuals
- described by reputation and habits
- referenced in media and journals

No raw numbers.
No instant replacements.

---

## PART IX — FAILURE MODES (INTENTIONAL)

- Legendary coach retires mid-rebuild
- Doctor scandal collapses trust
- Loyal aide blocks necessary reform
- Costly staff inertia sinks finances

---

## PART X — CANON STATEMENT

> **Stables rise and fall on the people who run them — not just the wrestlers who fight.**


---

# PART IV — MEDICAL & WELFARE SYSTEM (NEW, EXPLICIT)

## 20. Medical Responsibility Chain

For every injury event, responsibility is assigned to:
- rikishi (behavioral overreach)
- staff (training load, treatment)
- facilities (quality limits)
- beya leadership (systemic neglect)

Responsibility determines escalation paths.

---

## 21. Welfare Risk Accumulation

WelfareRisk increases when:
- injuries occur under fatigue overload
- medical staff are understaffed
- recovery is rushed
- chronic injuries are ignored

WelfareRisk decays slowly only with sustained compliance.

---

## 22. Medical Liability States

| State | Meaning |
|---|---|
| Compliant | No active concern |
| Watch | Minor patterns detected |
| Investigation | Formal inquiry |
| Sanctioned | Penalties applied |
| Restricted | Forced changes |

These states are **public-facing**.

---

## 23. Deterministic Investigation Triggers

Triggered by:
- repeated similar injuries
- recovery below minimum curves
- whistleblower events (staff)
- media scrutiny

No random investigations.

---

# PART V — INJURY HANDLING (WIRED)

## 30. Injury Response Pipeline

1. Injury detected
2. Severity classified
3. Medical staff response selected
4. Recovery plan assigned
5. WelfareRisk updated
6. Governance exposure recalculated
7. Narrative record created

Every step is logged.

---

## 31. Negligence vs Misfortune

Negligence requires:
- deviation from required recovery protocol
- understaffed medical coverage
- pattern recurrence

Misfortune injuries do not escalate.

---

# PART VI — FACILITIES, STAFF & WELFARE INTERACTION

## 40. Facility Constraints

Low facility bands:
- increase injury severity
- slow recovery
- raise welfare scrutiny

High facility bands:
- cap injury escalation
- improve compliance reputation

---

## 41. Staff Burnout & Medical Error

Medical staff fatigue increases:
- misdiagnosis risk
- recovery delay
- scandal probability

Burnout is tracked and visible.

---

# PART VII — AI & PLAYER DECISIONS

## 50. AI Beya Management Logic

NPC managers evaluate:
- welfare risk trends
- staff burnout
- compliance danger
- replacement vs cost tradeoffs

AI will sacrifice short-term results to avoid sanctions.

---

## 51. Player Warnings & UI

Players see:
- “Medical oversight concerns”
- “Staff overextended”
- “Recovery protocols under review”

Never raw percentages.

---

# PART VIII — FAILURE MODES (INTENTIONAL)

- Star rikishi career shortened by neglect
- Beya sanctioned for pattern abuse
- Staff scapegoating vs systemic reform
- Financial collapse from compliance costs

---

# PART IX — SOURCE PRESERVATION ANNEX

## Beya Management v1.0
```md
# Basho — Beya Management System v1.0 (Canonical, Training-Agnostic)

Date: 2026-01-06  
Status: Canonical, verbose, implementation-ready  
Scope: Defines **beya (stable) management** excluding training mechanics, which are specified in a separate document.

This document covers:
- roster structure and limits
- recruitment and intake
- staff and facilities (non-training effects)
- economics and solvency
- foreign wrestler rules (including dual citizenship)
- AI-controlled stable behavior
- failure modes and guardrails
- governance hooks (non-active)

---

## 1. Design Goals

Beya management must:
- Create **long-horizon strategic pressure**
- Force **trade-offs**, not micromanagement
- Remain **readable and narratively grounded**
- Apply equally to player-run and AI-run stables
- Integrate cleanly with:
  - rikishi evolution
  - combat outcomes
  - economy and prestige
  - future governance systems

> Managing a beya is about capacity, commitment, and risk — not per-bout control.

---

## 2. Beya as an Entity

Each beya is a persistent world object with:

- Identity (name, lineage, reputation)
- Physical capacity (roster, staff, facilities)
- Financial state (cash flow, upkeep)
- Recruitment pipeline
- Succession risk (forward-declared)

Beya decisions affect **all rikishi indirectly**.

---

## 3. Roster Management

### 3.1 Roster Size Constraints

| Constraint | Value |
|---|---:|
| Minimum viable roster | 6 |
| Typical roster | 10–15 |
| Soft cap | 20 |
| Hard cap | 30 |

Below minimum:
- beya is flagged as *fragile*
- emergency recruitment or merger hooks appear

Above soft cap:
- diminishing returns and injury pressure (see §10)

Above hard cap:
- forbidden

---

### 3.2 Implicit Internal Structure

Rosters are not manually tiered. Structure emerges from:
- rank
- career phase
- focus allocation (defined elsewhere)

Implicit groups:
- Prospects
- Core competitors
- Stars
- Veterans

This structure feeds narrative, not control logic.

---

## 4. Recruitment & Intake

### 4.1 Recruitment Windows

Recruitment occurs only at:
1) **Post-basho review**
2) **Mid-interim (week 3)**

This limits spam and creates rhythm.

---

### 4.2 Recruitment Slots per Basho

Base: **1**

Modifiers:
- roster ≤ 12 → +1
- kitchen ≥ 3 AND dormitory ≥ 2 → +1
- roster ≥ 20 → −1

Result:
- min 0
- max 3 recruits per basho

---

### 4.3 Recruitment Sources (v1)

- Local prospects (baseline)
- Regional standouts (higher ceiling)
- Dual citizens (rare, special)
- Foreign recruits (slot-limited)

Transfers and academies are future extensions.

---

### 4.4 Recruitment Costs

| Recruit Type | Signing Cost |
|---|---:|
| Local prospect | ¥50,000 |
| Regional standout | ¥120,000 |

Recruitment immediately increases weekly upkeep.

---

## 5. Foreign Rikishi & Dual Citizenship

### 5.1 Canonical Rule

> **Each beya may roster at most ONE foreign-slot rikishi at any time.**

A rikishi consumes the foreign slot **only if they do not hold Japanese citizenship**.

---

### 5.2 Nationality Model

Each rikishi has:
- `birthCountry` (immutable)
- `citizenships[]`
- derived `foreignSlotStatus`

Foreign-slot if:
```
"Japan" NOT in citizenships[]
```

---

### 5.3 Dual Citizenship

- Dual citizens **do not** consume the foreign slot
- Dual citizenship is rare (≈5–10% of foreign-born recruits)
- Dual citizens still carry narrative and adaptation flavor

---

### 5.4 Recruitment Enforcement

- If foreign slot is occupied:
  - foreign-slot recruits do not appear
- Dual citizens may always appear
- UI must clearly show slot impact before signing

---

### 5.5 Future Naturalization (Dormant)

Naturalization is:
- rare
- prestige-gated
- narrative-significant

If activated, gaining Japanese citizenship frees the foreign slot.

---

## 6. Staff System (Non-Training Effects)

### 6.1 Staff Types

- Oyakata (always 1)
- Technique Coach
- Conditioning Coach
- Nutritionist
- Medical Staff

Training effects are defined elsewhere.  
Here, staff define **capacity, recovery, and mitigation**.

---

### 6.2 Staff Capacity

Each staff member has a coverage capacity:

| Staff | Capacity |
|---|---:|
| Technique Coach | 12 |
| Conditioning Coach | 12 |
| Nutritionist | 16 |
| Medical Staff | 18 |

If roster exceeds capacity:
```
effectiveStaffImpact = capacity / rosterSize
```

---

### 6.3 Staff Limits

- Max staff (excluding oyakata): **6**
- Max duplicates:
  - Technique: 2
  - Conditioning: 2
  - Nutrition: 1
  - Medical: 2 (optional elite scaling)

---

## 7. Facilities (Structural, Not Training)

Facilities define **ceilings and forgiveness**, not skill choices.

| Facility | Effect |
|---|---|
| Dojo | Technique ceiling |
| Kitchen | Weight control stability |
| Recovery | Fatigue decay |
| Medical | Injury severity & recurrence |
| Dormitory | Morale & baseline recovery |

Facility levels: 0–5 each.

---

### 7.1 Facility Costs

**Build / Upgrade (one-time):**

| Level | Cost |
|---|---:|
| 1 | ¥150,000 |
| 2 | ¥250,000 |
| 3 | ¥400,000 |
| 4 | ¥600,000 |
| 5 | ¥900,000 |

**Weekly upkeep:**
```
¥1,000 × total facility levels
```

---

## 8. Beya Economics

### 8.1 Weekly Expenses

| Expense | Formula |
|---|---|
| Wrestlers | ¥2,000 × roster size |
| Staff | ¥6,000 × staff count |
| Facilities | ¥1,000 × facility levels |

Expenses are continuous and unavoidable.

---

### 8.2 Income (High-Level)

- Kenshō banners
- Prestige-modified appearance value
- Success-driven visibility

Income volatility is intentional.

---

### 8.3 Insolvency Handling

- Grace period (weeks)
- Forced austerity (freeze recruitment, sell facilities)
- Later: loans / benefactors (dormant)

---

## 9. AI-Run Stables

AI stables obey **exactly the same rules**.

### 9.1 AI Management Profiles

| Profile | Identity |
|---|---|
| Talent Factory | Large pipeline, conservative |
| Star Chaser | Small elite, aggressive |
| Survivor | Risk-averse |
| Gambler | High variance |
| Traditionalist | Identity-driven |

---

### 9.2 AI Weekly Decision Loop

Each interim week:
1) Check solvency runway
2) Check injury burden
3) Check roster vs target
4) Allocate focus (defined elsewhere)
5) Consider facility upgrades
6) Evaluate recruitment windows

Decisions are deterministic but imperfect.

---

### 9.3 AI Foreign Rikishi Logic

AI evaluates:
- foreign slot availability
- injury risk tolerance
- facilities readiness
- profile risk bias

AI is reluctant to release foreign-slot rikishi unless forced.

---

## 10. Failure Modes & Guardrails

### 10.1 Overcrowding
- Training efficiency loss
- Injury pressure
- Staff dilution

### 10.2 Star Hoarding
- Succession risk
- Injury fragility
- Financial volatility

### 10.3 Insolvency
- Gradual collapse, not instant death

### 10.4 Succession Collapse (Future)
- No eligible successor → closure or merger

Failure is allowed and narratively valuable.

---

## 11. Governance Hooks (Dormant)

Even before activation:
- beya legitimacy tracked
- conduct and solvency logged
- succession candidates evaluated

Later governance systems plug into these signals without retcons.

---

## 12. UI & Player Communication Rules

- Always show:
  - roster size vs caps
  - foreign slot usage
  - weekly burn rate
- Never show:
  - raw hidden efficiency math
- Explain consequences in plain language

---

## 13. Canon One-Liner

> **A beya is not a menu of buffs — it is a living institution whose size, staff, finances, and commitments determine which careers flourish and which fail.**

---

End of document.

```

## Staff Careers Canon v1.0
```md
# Basho — Staff Careers & Institutional Roles Canon v1.0
## Ultra-Granular, Integrated Specification (Implementation Grade)

This document **adds a full Staff Career system** and integrates it explicitly with:
- Beya Management
- NPC Manager AI
- Economy & Governance
- Training & Rikishi Development
- Succession, Scandals, and Narrative Memory

It is designed to be **non–high-level**, deterministic, and larger than its source inputs.

---

## PART I — DESIGN INTENT

Staff in Basho are **not modifiers**.
They are **people with careers**, incentives, reputations, fatigue, and failure states.

Staff careers exist to:
- create long-term continuity beyond rikishi careers
- introduce institutional memory
- constrain player optimization
- create succession and governance pressure
- generate narrative arcs (loyal aides, disgraced doctors, legendary coaches)

---

## PART II — STAFF ROLES (CANONICAL)

### 1. Staff Categories

| Role | Count | Notes |
|---|---|---|
| Oyakata | 1 | Required, governed by kabu |
| Assistant Oyakata | 0–2 | Succession + delegation |
| Technique Coach | 0–2 | Skill bias |
| Conditioning Coach | 0–2 | Fatigue & injury bias |
| Nutritionist | 0–1 | Weight stability |
| Medical Staff | 0–2 | Injury severity & recovery |
| Scout | 0–1 | Recruitment & info quality |
| Administrator | 0–1 | Economy & governance mitigation |

No role is optional in effect — absence is a penalty.

---

## PART III — STAFF ENTITY MODEL

### 2. Staff Object (Persistent)

```ts
Staff {
  staffId
  role
  age
  careerPhase
  reputationBand
  loyaltyBand
  competenceBands {
    primary
    secondary?
  }
  fatigue
  scandalExposure
  yearsAtBeya
  priorAffiliations[]
  successorEligible: boolean
}
```

Numeric values exist internally; UI shows **bands and descriptors only**.

---

## PART IV — CAREER PHASES

### 3. Staff Career Phases

| Phase | Effects |
|---|---|
| Apprentice | Low impact, high growth |
| Established | Full effectiveness |
| Senior | Stable but rigid |
| Declining | Error-prone |
| Retired | Succession only |

Career phase advances deterministically by age, workload, and scandal.

---

## PART V — STAFF EFFECTS (WIRED)

### 4. Integration Points

#### 4.1 Training
- Technique coaches bias growth vectors
- Conditioning coaches modify fatigue decay
- Medical staff reduce injury escalation

#### 4.2 Economy
- Staff salaries are fixed weekly drains
- Administrator reduces insolvency escalation
- Senior staff cost more, fail harder

#### 4.3 Governance
- Staff scandals increase scrutiny
- Medical negligence accelerates sanctions
- Assistant oyakata succession affects council decisions

#### 4.4 AI
NPC managers evaluate:
- staff burnout
- loyalty risk
- replacement cost
- succession readiness

---

## PART VI — STAFF SCANDALS

### 5. Staff-Originated Scandals

Examples:
- medical malpractice
- illegal training practices
- recruitment violations
- financial misreporting

Scandals attach to:
- staff member
- beya
- oyakata (derivative)

---

## PART VII — SUCCESSION & LEGACY

### 6. Assistant Oyakata Path

- Must hold or acquire kabu
- Reputation gated
- Loyalty-tested
- May defect to rival beya

Failure to plan succession increases closure probability.

---

## PART VIII — UI & NARRATIVE

### 7. Player Presentation

Staff are shown as:
- named individuals
- described by reputation and habits
- referenced in media and journals

No raw numbers.
No instant replacements.

---

## PART IX — FAILURE MODES (INTENTIONAL)

- Legendary coach retires mid-rebuild
- Doctor scandal collapses trust
- Loyal aide blocks necessary reform
- Costly staff inertia sinks finances

---

## PART X — CANON STATEMENT

> **Stables rise and fall on the people who run them — not just the wrestlers who fight.**

```

## Rikishi Development Canon v1.3 (Welfare Sections)
```md

# Basho — Rikishi Development Canon v1.3
## Ultra-Granular Training, Evolution, Injury, Style, Psychology & Facilities

Status: **DEFINITIVE / EXPANDED**
Scope: Rikishi development systems only.
Guarantee: Larger than v1.2, non-lossy, implementation-grade.

This document extends v1.2 by fully specifying:
1. Mental & Psychological Load System
2. Training Facility & Staff Micro-Effects
3. Retirement, Post-Career & Legacy Transitions

---


# Basho — Rikishi Development Canon v1.2
## Ultra-Granular Training, Evolution, Injury, Style Drift & Worked Example

Status: **DEFINITIVE / EXPANDED**
Scope: Rikishi development systems only.
Guarantee: Larger than v1.1, non-lossy, implementation-grade.

This document **extends v1.1** by fully specifying:
- Injury State Machine (explicit)
- Style Drift & Reclassification Math
- Favored Kimarite Evolution
- Full Worked Example (10-year career timeline)

---


# Basho — Rikishi Development Canon v1.1
## Ultra-Granular Training + Evolution Constitution (Implementation Grade)

Status: **DEFINITIVE**
Scope: **Only rikishi development over time**
Explicitly excludes: combat resolution, economy amounts, roster admin

This document is:
- larger than its source material
- non-lossy
- explicit down to weekly ticks and state transitions
- suitable for direct engineering implementation

It consolidates and EXPANDS:
- Training System v1.0
- Rikishi Evolution System v1.0

---

# PART I — ABSOLUTE DESIGN LAWS (DEVELOPMENT SCOPE)

## 1. Determinism
All development outcomes are a pure function of:
- WorldSeed
- RikishiSeed
- TimeIndex (week)
- Training profile selections
- Injury history
- Career phase

No runtime RNG.
No “soft” decay.

## 2. Separation of Timescales
- **Training** operates weekly
- **Evolution** accumulates monthly and basho-end
- **Career phase** shifts are rare and thresholded

This separation prevents oscillation.

---

# PART II — RIKISHI STATE MODEL (NORMALIZED)

## 3. Permanent Identity (Immutable)
- rikishiId
- shikona registry entry
- origin
- base talent seed
- growth profile seed
- dominant archetype seed

## 4. Evolving State (Mutable)
Grouped by layer:

### 4.1 Body Layer
- heightCurrentCm
- weightCurrentKg
- heightPotentialCm
- weightPotentialKg
- growthFulfillment

### 4.2 Execution Layer
- powerOutput
- speedOutput
- balanceOutput
- techniqueOutput
- experienceOutput

### 4.3 Condition Layer
- fatigue
- injuryState
- injuryHistory[]
- recoveryModifier

### 4.4 Identity Layer
- styleLabel
- styleConfidence
- archetypeSecondary (optional)
- favoredKimarite[]

### 4.5 Arc Layer
- careerPhase
- phaseEntryTick
- retirementEligibility

---

# PART III — TRAINING SYSTEM (EXPANDED + WIRED)

# Basho — Training System v1.0 (Canonical)

Date: 2026-01-06  
Status: Canonical, verbose, implementation-ready  
Scope: Defines **training mechanics** at both beya and individual levels, and how training shapes rikishi evolution.  
This document intentionally excludes roster management, economics, and AI manager logic, which are defined elsewhere.

---

## 1. Design Goals

The training system must:
- Provide **meaningful player agency** without micromanagement
- Shape long-term **rikishi evolution**, not short-term bout outcomes
- Create **risk–reward trade-offs**
- Be **deterministic and legible**
- Integrate cleanly with:
  - Rikishi Evolution System
  - Beya Management System
  - NPC Manager AI System

> Training biases probability; it never guarantees greatness.

---

## 2. Core Training Philosophy

Training operates on **bias and pressure**, not direct stat control.

Players and AI:
- do not assign drills or skills directly
- choose **intensity, focus, and protection**
- accept downstream consequences via fatigue, injuries, and style drift

Training is evaluated **weekly** during interim periods.

---

## 3. Training Layers

Training exists on three stacked layers:

1. **Beya-Wide Training Profile** (default environment)
2. **Individual Focus Slots** (limited overrides)
3. **Facilities & Staff Modifiers** (multipliers, not decisions)

This ensures:
- consistency
- scarcity of attention
- emergent specialization

---

## 4. Beya-Wide Training Profile

Each beya selects one active training profile per interim.

### 4.1 Training Axes

Training profile is defined by four axes:

#### A) Intensity
- Conservative
- Balanced
- Intensive
- Punishing

#### B) Focus Bias
- Power
- Speed
- Technique
- Balance
- Neutral

#### C) Style Bias
- Oshi
- Yotsu
- Neutral

#### D) Recovery Emphasis
- Low
- Normal
- High

These axes modify growth, fatigue, and injury risk.

---

### 4.2 Default Numeric Effects (Illustrative)

#### Intensity Effects

| Intensity | Growth Mult | Fatigue Gain | Injury Risk |
|---|---:|---:|---:|
| Conservative | 0.85 | 0.75 | 0.80 |
| Balanced | 1.00 | 1.00 | 1.00 |
| Intensive | 1.20 | 1.25 | 1.15 |
| Punishing | 1.35 | 1.50 | 1.35 |

#### Recovery Emphasis Effects

| Recovery | Fatigue Decay | Injury Recovery |
|---|---:|---:|
| Low | 0.80 | 0.85 |
| Normal | 1.00 | 1.00 |
| High | 1.25 | 1.20 |

---

### 4.3 Focus Bias → Skill Growth Bias

| Focus | Power | Speed | Technique | Balance |
|---|---:|---:|---:|---:|
| Power | 1.30 | 0.85 | 0.95 | 0.95 |
| Speed | 0.85 | 1.30 | 0.95 | 0.95 |
| Technique | 0.90 | 0.90 | 1.35 | 1.10 |
| Balance | 0.90 | 0.95 | 1.10 | 1.35 |
| Neutral | 1.00 | 1.00 | 1.00 | 1.00 |

---

## 5. Individual Focus Slots

### 5.1 Focus Slot Availability
- Base slots: **3**
- +1 at prestige tier 2
- +1 at prestige tier 4
- Max: **5**

Only focused rikishi may receive individual overrides.

---

### 5.2 Focus Modes

Each focus slot selects one mode:

| Mode | Growth | Fatigue | Injury Risk | Notes |
|---|---:|---:|---:|---|
| Develop | +25% | +10% | +5% | Default growth |
| Push | +35% | +20% | +20% | Win-now pressure |
| Protect | −15% | −25% | −30% | Longevity |
| Rebuild | +10% | −10% | −15% | Post-injury |

Focus modes stack multiplicatively with beya-wide profile.

---

## 6. Training → Rikishi Evolution Wiring

### 6.1 Physique
- High intensity → faster weight gain
- High recovery → controlled weight, better fulfillment
- Overtraining → stalled growth + injury spikes

Height is unaffected after youth.

---

### 6.2 Skills
Training biases **effectiveness growth**, not raw skill caps.

Growth is:
- fast early
- diminishing in prime
- fragile in veteran phase

---

### 6.3 Style Drift
Training does not set style directly.

Instead:
- Style bias nudges recomputation thresholds
- Sustained mismatch between body and training causes inefficiency

This prevents “click to choose style” exploits.

---

### 6.4 Archetype Interaction
Training does **not** change dominant archetype.

It may:
- accelerate secondary archetype emergence
- suppress risky behaviors under conservative regimes

---

## 7. Fatigue & Injury Integration

### 7.1 Fatigue
- Accumulates weekly from training
- Scales with intensity and focus
- Decays via recovery emphasis and facilities

High fatigue:
- reduces bout performance
- increases injury risk
- pushes kimarite selection toward short finishes

---

### 7.2 Injuries
Training contributes to injury probability.

Risk factors:
- high fatigue
- punishing intensity
- low recovery
- prior injury history

Injuries apply:
- attribute penalties
- recovery timelines
- narrative hooks

---

## 8. Career Phase Sensitivity

Training effectiveness varies by phase:

| Phase | Growth | Injury Sensitivity |
|---|---:|---:|
| Youth | High | Low |
| Development | High | Medium |
| Prime | Medium | Medium |
| Veteran | Low | High |
| Late | Very Low | Very High |

This encourages different strategies across careers.

---

## 9. AI Use of Training

AI managers select training profiles based on:
- their profile traits
- roster composition
- injury load
- meta drift signals
- financial runway

Examples:
- Survivor favors Conservative + High Recovery
- Gambler spikes Punishing during contention
- Talent Factory uses Balanced + Neutral

AI obeys same focus slot limits as player.

---

## 10. Player UX Rules

Players see:
- training philosophy descriptions
- warnings (“Injury risk rising”)
- trend indicators (“Style drifting toward Yotsu”)

Players never see:
- raw multipliers
- hidden fatigue math

---

## 11. Failure Modes (By Design)

- Overtraining cascades
- Burned-out prospects
- Injury-plagued stars
- Short primes with spectacular peaks

These are outcomes, not bugs.

---

## 12. Canon One-Liner

> **Training shapes the conditions under which bodies, habits, and styles evolve — it never dictates the result of a single bout.**

---

End of document.


---

# PART IV — EVOLUTION SYSTEM (EXPANDED + WIRED)

# Basho — Rikishi Evolution System v1.0 (Canonical)

Date: 2026-01-06  
Scope: Full, end-to-end specification of **rikishi evolution** in Basho, covering physique, skills, style, archetype, kimarite identity, and career arcs.  
Status: Canonical, deterministic, implementation-ready.

This document explains **how a rikishi changes over time**, why those changes occur, and how they connect to combat, narrative, and UI.

---

## 1. Design Goals

Rikishi evolution must:
- Be **deterministic** and reproducible.
- Produce **believable career arcs** without scripted outcomes.
- Be **readable to players** (no hidden “RPG decay”).
- Integrate cleanly with:
  - Combat Engine V3
  - Kimarite tier/style/archetype system
  - Rivalries and narrative
  - Career journals and governance

---

## 2. Core Principle

> **Rikishi do not gain or lose abstract “power.”  
They change bodies, habits, and constraints — and the simulation responds.**

Evolution is the interaction of:
1. Physique (body)
2. Skills (execution)
3. Style (technical preference)
4. Archetype (temperament)
5. Kimarite identity (proof of behavior)
6. Career phase (time + pressure)

Each layer evolves on a different timescale.

---

## 3. Data Model Overview

### 3.1 Permanent Identity (Never Changes)
- `id`
- `shikona`
- origin metadata
- base talent seed
- growth profile seed
- dominant archetype (initial)

These define *who the rikishi is*.

### 3.2 Evolving State (Changes Over Time)
- heightCurrent / weightCurrent
- growth fulfillment
- skill outputs (power, speed, balance, technique, experience)
- fatigue, injuries, momentum
- style (oshi / yotsu / hybrid)
- secondary archetype tendency (optional)
- favored kimarite (tokui-waza)
- career phase

---

## 4. Physique Evolution (The Body Layer)

### 4.1 Height
- Grows early career only.
- Stops deterministically based on growth profile.
- Influences reach, leverage, grip geometry.

Height explains *structural possibility*, not tactical choice.

### 4.2 Weight (Primary Evolution Lever)
- Changes throughout career.
- Influences:
  - power effectiveness
  - speed effectiveness
  - fatigue accumulation
  - injury risk
  - recovery rate
- Strongest driver of style drift.

### 4.3 Current vs Potential
Each rikishi has:
- `heightPotentialCm`
- `weightPotentialKg`
- `growthFulfillment` ∈ [0,1]

Potential is a **ceiling**, not a guarantee.
Training, injuries, and facilities determine how close it is reached.

---

## 5. Skill Evolution (Execution Layer)

Canonical skill outputs:
- **Power** — force generation and drive
- **Speed** — burst and lateral movement
- **Balance** — resistance to displacement and counters
- **Technique** — grip craft, throw timing, transitions
- **Experience** — decision quality and counters

### 5.1 Growth Pattern
- Youth: spiky, uneven gains
- Development: steady improvement
- Prime: diminishing returns
- Veteran: flat or declining effectiveness
- Late: managed decline

Skills are modified by physique:
- Same technique score behaves differently at different weights.

---

## 6. Style Evolution (Primary Public Identity)

Styles:
- **Oshi** — distance, push/thrust
- **Yotsu** — belt, control, throws
- **Hybrid** — adaptable

### 6.1 Style Is Derived
Style is recomputed periodically from:
- weight trends
- balance vs speed ratio
- grip success rates
- kimarite usage distribution
- career phase bias

### 6.2 Hysteresis
- Style changes require sustained signals.
- Prevents oscillation basho-to-basho.

Style is **what the rikishi usually tries to do**.

---

## 7. Archetype Evolution (Temperament Layer)

Archetypes describe **behavior under pressure**.

### 7.1 Dominant Archetype
- Seeded at creation.
- Rarely changes.
- Represents temperament.

### 7.2 Secondary Archetype Drift
- Optional, slow-moving.
- Emerges from repeated behavior patterns.
- Strength ∈ [0.1–0.5].

Dominant archetype applies fully.  
Secondary archetype bends behavior slightly.

---

## 8. Kimarite Identity (Proof of Evolution)

### 8.1 Favored Kimarite (Tokui-waza)
- Tracked from actual wins.
- Top 2–3 maintained.
- Applies 2× selection bonus in combat.

### 8.2 Feedback Loop
Body → Style → Kimarite usage → Favorites → Reinforcement

As the body changes, favored moves may fade or be replaced.

---

## 9. Career Phases (Arc Layer)

Phases are computed, not age-locked:
1. Youth / Prospect
2. Development / Rise
3. Prime
4. Veteran / Decline
5. Late Career / Exit

Inputs:
- age
- growth fulfillment plateau
- injury accumulation
- fatigue recovery slowdown
- performance trends

Phases bias:
- growth rates
- injury risk
- style drift likelihood
- retirement triggers

---

## 10. Determinism Contract

Every evolution step is derived from:
- World seed
- Rikishi seed
- Time index
- Player inputs (training, facilities)
- Deterministic outcomes (bouts, injuries)

No hidden randomness.  
Same inputs → same careers.

---

## 11. UI & Readability Rules

### 11.1 Rikishi Card
- **Style**: primary label
- **Archetype**: secondary
- **Secondary archetype**: only if meaningful
- **Favored kimarite**: visible proof
- Physique shown indirectly via notes, not raw stats by default

### 11.2 Advanced Views
- Physique history
- Style drift timeline
- Kimarite usage charts
- Career journal entries

---

## 12. Narrative Integration

Narrative systems consume evolution:
- “Former speedster adapts to belt fighting”
- “Signature throw fades after knee injury”
- “Late-career reinvention”

Narrative never changes outcomes.

---

## 13. Why This Works

- Careers feel authored, but are not scripted.
- Decline feels earned, not punitive.
- Specialization emerges organically.
- Players learn to *read* wrestlers, not stats.

---

## 14. Canon One-Liner

> **Rikishi evolution is the story of a body adapting to time, pressure, and consequence — expressed through style, behavior, and the techniques that survive.**

---

End of document.


---

# PART V — TRAINING → EVOLUTION WIRING (NEW, GRANULAR)

## 15. Weekly Tick Algorithm (Explicit)

For each rikishi, each week:

1. Read beya training profile
2. Read individual focus (if any)
3. Compute growthBiasVector
4. Compute fatigueDelta
5. Compute injuryRiskDelta
6. Apply fatigue accumulation
7. Roll deterministic injury check
8. Apply injury state transitions
9. Accumulate growth progress (buffered)
10. Log DevelopmentEvent

No evolution is applied immediately to combat outputs until monthly consolidation.

---

## 16. Monthly Consolidation

Every 4 weeks:
- buffered growth applies to physique and skills
- style recomputation check runs
- favored kimarite may update
- career phase transition check runs

---

## 17. Career Phase Transition Rules (Explicit)

Transitions require **multiple signals**:
- growthFulfillment plateau
- fatigue recovery slowdown
- injury frequency
- performance trend

Single signals never force a phase change.

---

# PART VI — FAILURE MODES (INTENTIONAL)

- Burned prospects
- Late bloomers
- Short primes
- Reinvention arcs
- Chronic injury decline

These outcomes are authored by systems, not random chance.

---

# PART VII — UI CONTRACT (DEVELOPMENT)

Players see:
- philosophy language
- warnings
- trend descriptors

Players never see:
- growth buffers
- raw multipliers
- phase thresholds

---

# PART VIII — SOURCE PRESERVATION ANNEX (VERBATIM)

## Training System v1.0
```md
# Basho — Training System v1.0 (Canonical)

Date: 2026-01-06  
Status: Canonical, verbose, implementation-ready  
Scope: Defines **training mechanics** at both beya and individual levels, and how training shapes rikishi evolution.  
This document intentionally excludes roster management, economics, and AI manager logic, which are defined elsewhere.

---

## 1. Design Goals

The training system must:
- Provide **meaningful player agency** without micromanagement
- Shape long-term **rikishi evolution**, not short-term bout outcomes
- Create **risk–reward trade-offs**
- Be **deterministic and legible**
- Integrate cleanly with:
  - Rikishi Evolution System
  - Beya Management System
  - NPC Manager AI System

> Training biases probability; it never guarantees greatness.

---

## 2. Core Training Philosophy

Training operates on **bias and pressure**, not direct stat control.

Players and AI:
- do not assign drills or skills directly
- choose **intensity, focus, and protection**
- accept downstream consequences via fatigue, injuries, and style drift

Training is evaluated **weekly** during interim periods.

---

## 3. Training Layers

Training exists on three stacked layers:

1. **Beya-Wide Training Profile** (default environment)
2. **Individual Focus Slots** (limited overrides)
3. **Facilities & Staff Modifiers** (multipliers, not decisions)

This ensures:
- consistency
- scarcity of attention
- emergent specialization

---

## 4. Beya-Wide Training Profile

Each beya selects one active training profile per interim.

### 4.1 Training Axes

Training profile is defined by four axes:

#### A) Intensity
- Conservative
- Balanced
- Intensive
- Punishing

#### B) Focus Bias
- Power
- Speed
- Technique
- Balance
- Neutral

#### C) Style Bias
- Oshi
- Yotsu
- Neutral

#### D) Recovery Emphasis
- Low
- Normal
- High

These axes modify growth, fatigue, and injury risk.

---

### 4.2 Default Numeric Effects (Illustrative)

#### Intensity Effects

| Intensity | Growth Mult | Fatigue Gain | Injury Risk |
|---|---:|---:|---:|
| Conservative | 0.85 | 0.75 | 0.80 |
| Balanced | 1.00 | 1.00 | 1.00 |
| Intensive | 1.20 | 1.25 | 1.15 |
| Punishing | 1.35 | 1.50 | 1.35 |

#### Recovery Emphasis Effects

| Recovery | Fatigue Decay | Injury Recovery |
|---|---:|---:|
| Low | 0.80 | 0.85 |
| Normal | 1.00 | 1.00 |
| High | 1.25 | 1.20 |

---

### 4.3 Focus Bias → Skill Growth Bias

| Focus | Power | Speed | Technique | Balance |
|---|---:|---:|---:|---:|
| Power | 1.30 | 0.85 | 0.95 | 0.95 |
| Speed | 0.85 | 1.30 | 0.95 | 0.95 |
| Technique | 0.90 | 0.90 | 1.35 | 1.10 |
| Balance | 0.90 | 0.95 | 1.10 | 1.35 |
| Neutral | 1.00 | 1.00 | 1.00 | 1.00 |

---

## 5. Individual Focus Slots

### 5.1 Focus Slot Availability
- Base slots: **3**
- +1 at prestige tier 2
- +1 at prestige tier 4
- Max: **5**

Only focused rikishi may receive individual overrides.

---

### 5.2 Focus Modes

Each focus slot selects one mode:

| Mode | Growth | Fatigue | Injury Risk | Notes |
|---|---:|---:|---:|---|
| Develop | +25% | +10% | +5% | Default growth |
| Push | +35% | +20% | +20% | Win-now pressure |
| Protect | −15% | −25% | −30% | Longevity |
| Rebuild | +10% | −10% | −15% | Post-injury |

Focus modes stack multiplicatively with beya-wide profile.

---

## 6. Training → Rikishi Evolution Wiring

### 6.1 Physique
- High intensity → faster weight gain
- High recovery → controlled weight, better fulfillment
- Overtraining → stalled growth + injury spikes

Height is unaffected after youth.

---

### 6.2 Skills
Training biases **effectiveness growth**, not raw skill caps.

Growth is:
- fast early
- diminishing in prime
- fragile in veteran phase

---

### 6.3 Style Drift
Training does not set style directly.

Instead:
- Style bias nudges recomputation thresholds
- Sustained mismatch between body and training causes inefficiency

This prevents “click to choose style” exploits.

---

### 6.4 Archetype Interaction
Training does **not** change dominant archetype.

It may:
- accelerate secondary archetype emergence
- suppress risky behaviors under conservative regimes

---

## 7. Fatigue & Injury Integration

### 7.1 Fatigue
- Accumulates weekly from training
- Scales with intensity and focus
- Decays via recovery emphasis and facilities

High fatigue:
- reduces bout performance
- increases injury risk
- pushes kimarite selection toward short finishes

---

### 7.2 Injuries
Training contributes to injury probability.

Risk factors:
- high fatigue
- punishing intensity
- low recovery
- prior injury history

Injuries apply:
- attribute penalties
- recovery timelines
- narrative hooks

---

## 8. Career Phase Sensitivity

Training effectiveness varies by phase:

| Phase | Growth | Injury Sensitivity |
|---|---:|---:|
| Youth | High | Low |
| Development | High | Medium |
| Prime | Medium | Medium |
| Veteran | Low | High |
| Late | Very Low | Very High |

This encourages different strategies across careers.

---

## 9. AI Use of Training

AI managers select training profiles based on:
- their profile traits
- roster composition
- injury load
- meta drift signals
- financial runway

Examples:
- Survivor favors Conservative + High Recovery
- Gambler spikes Punishing during contention
- Talent Factory uses Balanced + Neutral

AI obeys same focus slot limits as player.

---

## 10. Player UX Rules

Players see:
- training philosophy descriptions
- warnings (“Injury risk rising”)
- trend indicators (“Style drifting toward Yotsu”)

Players never see:
- raw multipliers
- hidden fatigue math

---

## 11. Failure Modes (By Design)

- Overtraining cascades
- Burned-out prospects
- Injury-plagued stars
- Short primes with spectacular peaks

These are outcomes, not bugs.

---

## 12. Canon One-Liner

> **Training shapes the conditions under which bodies, habits, and styles evolve — it never dictates the result of a single bout.**

---

End of document.

```

## Rikishi Evolution System v1.0
```md
# Basho — Rikishi Evolution System v1.0 (Canonical)

Date: 2026-01-06  
Scope: Full, end-to-end specification of **rikishi evolution** in Basho, covering physique, skills, style, archetype, kimarite identity, and career arcs.  
Status: Canonical, deterministic, implementation-ready.

This document explains **how a rikishi changes over time**, why those changes occur, and how they connect to combat, narrative, and UI.

---

## 1. Design Goals

Rikishi evolution must:
- Be **deterministic** and reproducible.
- Produce **believable career arcs** without scripted outcomes.
- Be **readable to players** (no hidden “RPG decay”).
- Integrate cleanly with:
  - Combat Engine V3
  - Kimarite tier/style/archetype system
  - Rivalries and narrative
  - Career journals and governance

---

## 2. Core Principle

> **Rikishi do not gain or lose abstract “power.”  
They change bodies, habits, and constraints — and the simulation responds.**

Evolution is the interaction of:
1. Physique (body)
2. Skills (execution)
3. Style (technical preference)
4. Archetype (temperament)
5. Kimarite identity (proof of behavior)
6. Career phase (time + pressure)

Each layer evolves on a different timescale.

---

## 3. Data Model Overview

### 3.1 Permanent Identity (Never Changes)
- `id`
- `shikona`
- origin metadata
- base talent seed
- growth profile seed
- dominant archetype (initial)

These define *who the rikishi is*.

### 3.2 Evolving State (Changes Over Time)
- heightCurrent / weightCurrent
- growth fulfillment
- skill outputs (power, speed, balance, technique, experience)
- fatigue, injuries, momentum
- style (oshi / yotsu / hybrid)
- secondary archetype tendency (optional)
- favored kimarite (tokui-waza)
- career phase

---

## 4. Physique Evolution (The Body Layer)

### 4.1 Height
- Grows early career only.
- Stops deterministically based on growth profile.
- Influences reach, leverage, grip geometry.

Height explains *structural possibility*, not tactical choice.

### 4.2 Weight (Primary Evolution Lever)
- Changes throughout career.
- Influences:
  - power effectiveness
  - speed effectiveness
  - fatigue accumulation
  - injury risk
  - recovery rate
- Strongest driver of style drift.

### 4.3 Current vs Potential
Each rikishi has:
- `heightPotentialCm`
- `weightPotentialKg`
- `growthFulfillment` ∈ [0,1]

Potential is a **ceiling**, not a guarantee.
Training, injuries, and facilities determine how close it is reached.

---

## 5. Skill Evolution (Execution Layer)

Canonical skill outputs:
- **Power** — force generation and drive
- **Speed** — burst and lateral movement
- **Balance** — resistance to displacement and counters
- **Technique** — grip craft, throw timing, transitions
- **Experience** — decision quality and counters

### 5.1 Growth Pattern
- Youth: spiky, uneven gains
- Development: steady improvement
- Prime: diminishing returns
- Veteran: flat or declining effectiveness
- Late: managed decline

Skills are modified by physique:
- Same technique score behaves differently at different weights.

---

## 6. Style Evolution (Primary Public Identity)

Styles:
- **Oshi** — distance, push/thrust
- **Yotsu** — belt, control, throws
- **Hybrid** — adaptable

### 6.1 Style Is Derived
Style is recomputed periodically from:
- weight trends
- balance vs speed ratio
- grip success rates
- kimarite usage distribution
- career phase bias

### 6.2 Hysteresis
- Style changes require sustained signals.
- Prevents oscillation basho-to-basho.

Style is **what the rikishi usually tries to do**.

---

## 7. Archetype Evolution (Temperament Layer)

Archetypes describe **behavior under pressure**.

### 7.1 Dominant Archetype
- Seeded at creation.
- Rarely changes.
- Represents temperament.

### 7.2 Secondary Archetype Drift
- Optional, slow-moving.
- Emerges from repeated behavior patterns.
- Strength ∈ [0.1–0.5].

Dominant archetype applies fully.  
Secondary archetype bends behavior slightly.

---

## 8. Kimarite Identity (Proof of Evolution)

### 8.1 Favored Kimarite (Tokui-waza)
- Tracked from actual wins.
- Top 2–3 maintained.
- Applies 2× selection bonus in combat.

### 8.2 Feedback Loop
Body → Style → Kimarite usage → Favorites → Reinforcement

As the body changes, favored moves may fade or be replaced.

---

## 9. Career Phases (Arc Layer)

Phases are computed, not age-locked:
1. Youth / Prospect
2. Development / Rise
3. Prime
4. Veteran / Decline
5. Late Career / Exit

Inputs:
- age
- growth fulfillment plateau
- injury accumulation
- fatigue recovery slowdown
- performance trends

Phases bias:
- growth rates
- injury risk
- style drift likelihood
- retirement triggers

---

## 10. Determinism Contract

Every evolution step is derived from:
- World seed
- Rikishi seed
- Time index
- Player inputs (training, facilities)
- Deterministic outcomes (bouts, injuries)

No hidden randomness.  
Same inputs → same careers.

---

## 11. UI & Readability Rules

### 11.1 Rikishi Card
- **Style**: primary label
- **Archetype**: secondary
- **Secondary archetype**: only if meaningful
- **Favored kimarite**: visible proof
- Physique shown indirectly via notes, not raw stats by default

### 11.2 Advanced Views
- Physique history
- Style drift timeline
- Kimarite usage charts
- Career journal entries

---

## 12. Narrative Integration

Narrative systems consume evolution:
- “Former speedster adapts to belt fighting”
- “Signature throw fades after knee injury”
- “Late-career reinvention”

Narrative never changes outcomes.

---

## 13. Why This Works

- Careers feel authored, but are not scripted.
- Decline feels earned, not punitive.
- Specialization emerges organically.
- Players learn to *read* wrestlers, not stats.

---

## 14. Canon One-Liner

> **Rikishi evolution is the story of a body adapting to time, pressure, and consequence — expressed through style, behavior, and the techniques that survive.**

---

End of document.

```



---

# PART IX — INJURY STATE MACHINE (EXPLICIT)

## 30. Injury States

Each rikishi maintains exactly one InjuryState:

| State | Description |
|---|---|
| Healthy | No active injury |
| Minor | Short-term strain |
| Moderate | Noticeable impairment |
| Severe | Long-term impairment |
| Chronic | Persistent recurring condition |
| CareerEnding | Forced retirement trigger |

## 31. Injury Severity Thresholds

Severity is determined by:
- fatigue band
- physique stress ratio
- bout intensity band
- accumulated micro-injury count

No random rolls; thresholds are deterministic.

## 32. Recovery Curves

Each state defines:
- minimum recovery weeks
- performance penalty band
- re-injury amplification factor

Chronic injuries permanently reduce recovery efficiency.

---

# PART X — STYLE DRIFT & RECLASSIFICATION

## 33. Style Confidence Model

Each style label maintains a confidence score:
- oshi
- yotsu
- hybrid

Scores update monthly using:
- kimarite usage distribution
- grip success ratios
- physique suitability

## 34. Drift Thresholds

Style changes only when:
- new style confidence > old style by X margin
- sustained for ≥2 basho
- not blocked by injury limitations

Abrupt style flips are impossible.

---

## 35. Favored Kimarite Evolution

Favored kimarite list updates when:
- same kimarite used ≥N times
- above-average success rate
- fits current style

Favorites decay if unused for extended periods.

---

# PART XI — WORKED EXAMPLE (10-YEAR CAREER)

## 36. Rikishi Example: “Kazanoumi”

### Year 1–2 (Prospect)
- rapid weight gain
- minor injuries
- style confidence unclear

### Year 3–5 (Rise)
- oshi style locks in
- favored kimarite: oshidashi, tsukidashi
- first makuuchi promotion

### Year 6–7 (Prime)
- peak power output
- rare injury-free stretch
- sansho awards

### Year 8–9 (Decline)
- chronic knee injury
- style drifts toward defensive yotsu
- fewer favored techniques

### Year 10 (Exit)
- chronic state escalates
- retirement eligibility triggered
- legacy logged

Every step corresponds to weekly and monthly ticks.

---

# PART XII — ADDITIONAL FAILURE & EDGE CASES

- Sudden injury-caused plateau
- Style-lock preventing adaptation
- Late-blooming technique specialists
- Premature burnout via overtraining

All are deterministic outcomes.

---

# PART XIII — EXTENDED SOURCE PRESERVATION

This document preserves **all v1.1 content verbatim**, plus expanded systems.
No earlier rules are removed or weakened.

---

END OF Rikishi Development Canon v1.2


---

# PART XIV — MENTAL & PSYCHOLOGICAL LOAD SYSTEM

## 40. Mental State Model

Each rikishi maintains a **MentalState** vector, separate from physical fatigue:

| Dimension | Description |
|---|---|
| Confidence | Belief in own execution |
| Pressure | External expectation weight |
| Fear | Hesitation under risk |
| Focus | Consistency of decision-making |
| Resilience | Recovery from setbacks |

MentalState values are internal scalars; players see **narrative descriptors only**.

---

## 41. Mental State Inputs (Deterministic)

Mental updates occur weekly and post-bout:

- Win/Loss streaks
- Upsets (positive or negative)
- Rivalry bouts
- Media tone
- Stable stature pressure
- Career phase

No random swings are permitted.

---

## 42. Mental → Performance Mapping

Mental states affect:
- initiative bands
- error likelihood bands
- comeback probability bands
- injury escalation risk

These effects are capped to prevent total collapse.

---

## 43. Psychological Failure Modes

- Confidence spiral (loss streaks)
- Fear lock (post-injury hesitation)
- Pressure collapse (elite expectations)
- Veteran composure advantage

These are system-authored outcomes.

---

# PART XV — TRAINING FACILITIES & STAFF MICRO-EFFECTS

## 50. Facility Bands

Facilities are modeled in qualitative bands:

| Band | Description |
|---|---|
| Primitive | Minimal, outdated |
| Basic | Functional |
| Adequate | Competitive |
| Advanced | Modern, specialized |
| Elite | Cutting-edge |

Facilities modify:
- training efficiency
- injury risk
- recovery speed
- mental fatigue

---

## 51. Staff Roles

Each stable may have:
- Head Coach
- Conditioning Coach
- Medical Staff
- Mental Coach (rare)

Each role provides:
- bias modifiers
- risk dampening
- specialization bonuses

---

## 52. Facility × Training Interaction

Training outputs are multiplied by:
- facility band modifier
- staff competency modifier

Modifiers are deterministic and logged.

---

# PART XVI — RETIREMENT, POST-CAREER & LEGACY

## 60. Retirement Eligibility

Triggered by:
- age thresholds
- chronic injury state
- sustained decline
- governance events

Retirement is optional unless forced.

---

## 61. Retirement Outcomes

Possible paths:
- Stable staff role
- Independent coach
- Oyakata candidate
- Exit from sumo world

Each path affects:
- legacy score
- institutional memory
- future NPC behavior

---

## 62. Legacy Scoring (Narrative)

Legacy is computed from:
- peak rank
- career longevity
- rivalries
- championships
- scandals

Legacy affects:
- how the rikishi is referenced in history
- eligibility for honors
- successor narratives

---

## 63. Post-Career Persistence

Retired rikishi remain:
- in historical records
- as NPCs (if relevant)
- as reference points in commentary

No character is deleted from history.

---

# PART XVII — FULL DEVELOPMENT FLOW SUMMARY

Weekly:
- Training
- Mental update
- Fatigue/injury check

Monthly:
- Evolution consolidation
- Style drift check
- Favored kimarite update

Basho-End:
- Career phase review
- Mental pressure recalibration
- Retirement eligibility check

---

END OF Rikishi Development Canon v1.3

```

---

END OF Beya Management, Staff & Welfare Canon v1.1

```



## SOURCE 02 — Basho_NPC_Manager_AI_System_v1.3_Ultimate_Definitive.md

```md
# Basho — NPC Manager AI System v1.3  
## Ultimate Definitive Canon: Meta Drift, Succession, Rivalries, Governance Pressure & Deterministic Institutional Behavior

Date: 2026-01-10  
Status: **ULTIMATE DEFINITIVE CANON — FULL DETAIL, IMPLEMENTATION-GRADE**  
Supersedes:
- NPC Beya Manager AI System v1.0  
- NPC Beya Manager AI System v1.1 (Meta Drift, Adaptation, Succession)  
- NPC Manager AI System v1.2 (Rivalries Integrated)

This document consolidates **all features and design ideals** from v1.0–v1.2 into a single authoritative contract.  
Nothing is high level. Everything that must be deterministic is explicit.

---

## 1) System Mandate

NPC managers (oyakata AIs) are **institutional guardians**.

They:
- make roster and finance decisions
- react to perceived meta drift (imperfectly)
- manage foreign/dual-citizen policy under constraints
- navigate scandals, media scrutiny, and governance pressure
- plan succession and preserve stable identity across generations
- internalize rivalries (rikishi, oyakata, stable) without cheating

NPC managers are:
- rational but biased
- strategic but emotional
- deterministic, not optimal

> The AI does not try to win every bout.  
> It tries not to be erased.

---

## 2) Hard Constraints (Binding)

### 2.1 No Cheating / Information Fairness
NPC AI:
- does **not** see hidden stats
- does **not** see “true” opponent traits beyond scouting visibility rules
- does **not** receive outcome buffs

Advantage comes from:
- continuity (long-term memory)
- institutional planning
- deterministic bias, not omniscience

### 2.2 Determinism
Given identical:
- world seed
- match outcomes
- player actions
- information visibility state

NPC decisions are identical.

No hidden dice. No randomness.

### 2.3 Same Rules as Player
NPC managers obey:
- roster limits
- foreign wrestler limits (1-slot rule, dual citizenship exception)
- facility and budget constraints
- governance sanctions, restrictions, and forced actions

---

## 3) Core Objects & Data Contracts

### 3.1 Manager Entity
Each AI-run beya has exactly one active Manager at a time.

```ts
Manager {
  managerId: string
  beyaId: string
  name: string
  origin: "ex_rikishi" | "external" | "caretaker"
  archetype: ManagerArchetype
  traits: ManagerTraits           // immutable 0..1
  quirks: ManagerQuirk[]          // 1–2, immutable
  tenure: TenureRecord
  legacy: LegacyModifier          // produced on exit
  rivalrySensitivity: number      // immutable 0..1
}
```

### 3.2 Traits (Immutable)
```ts
ManagerTraits {
  // Strategic
  RiskTolerance: number
  Patience: number
  PipelineBias: number           // many prospects vs few
  StarBias: number               // concentrate resources
  RecoveryBias: number
  IdentityRigidity: number
  FinanceDiscipline: number
  FacilityAmbition: number

  // Talent evaluation
  ScoutingConfidence: number
  UpsideChasing: number
  VarianceAversion: number
  Loyalty: number

  // Foreign policy
  ForeignSlotAggression: number
  DualCitizenPreference: number

  // Governance & ethics posture
  GovernanceDeference: number
  WelfareSensitivity: number
}
```

### 3.3 Tenure Record
```ts
TenureRecord {
  startedAtTick: TickID
  bashoServed: number
  championships: number
  sekitoriProduced: number
  insolvencyEvents: number
  majorScandals: number
  forcedMergers: number
}
```

### 3.4 Perception Snapshot (Non-Cheating Interface)
Managers act on perceived reality:

```ts
PerceptionSnapshot {
  metaNarratives: MetaNarrativeTag[]     // "pushers everywhere", etc.
  stableHealth: "thriving"|"stable"|"fragile"|"critical"
  injuryMood: "contained"|"worrying"|"spiraling"
  financeMood: "flush"|"tight"|"danger"
  rivalryStates: RivalryPerception[]
  governancePressure: "none"|"watch"|"active"|"crisis"
  mediaHeat: "low"|"medium"|"high"|"inferno"
}
```

NPCs never read raw numeric global meta metrics; they receive narrative tags derived from them.

---

## 4) Canonical Archetypes (Profiles)

Archetypes define target ranges and baseline behavior. Trait values are seeded around archetype anchors.

### 4.1 Talent Factory
- Roster target: 18–25
- PipelineBias high, StarBias low
- Medium patience, medium discipline
- Builds eras through volume and continuity

### 4.2 Star Chaser
- Roster target: 10–14
- StarBias high, patience low
- Higher foreign-slot aggression
- Peaks hard, collapses hard

### 4.3 Survivor
- Roster target: 10–16
- FinanceDiscipline high, RiskTolerance low
- Patience high
- Rarely collapses; rarely dominates

### 4.4 Gambler
- Roster target: 14–20
- RiskTolerance extreme, FinanceDiscipline low
- Fast meta reaction, high volatility
- Boom-or-bust narrative engine

### 4.5 Traditionalist
- Roster target: 12–18
- IdentityRigidity high
- Slow adaptation, prefers continuity
- Defines eras or stagnates

---

## 5) Quirks (Individual Flavor)

Each manager has 1–2 deterministic quirks that slightly bias traits.

Examples:
- Injury Paranoid (+RecoveryBias)
- Prospect Hoarder (+PipelineBias)
- Foreign Talent Believer (+ForeignSlotAggression)
- Facility Maximalist (+FacilityAmbition, −FinanceDiscipline)
- Contrarian (counter-meta bias)
- “Old School Discipline” (+IdentityRigidity, +GovernanceDeference)

Quirks never override constraints; they shift weighting.

---

## 6) Meta Drift System (World-Level Inputs)

### 6.1 What the World Tracks
Computed each basho from top divisions:

- styleShare (oshi / yotsu / hybrid distribution)
- kimariteClassShare (push, throw, slap-pull, trip, rear)
- pressureIndex (short bouts + shove prevalence)
- gripIndex (belt dominance)
- injuryIndex (injuries per 100 bouts)

### 6.2 Drift Detection
Two windows:
- Short: last 2 basho
- Long: last 6 basho

Drift vector:
```
drift = shortAvg − longAvg
```

Only drift above threshold becomes actionable signals.

---

## 7) Manager Interpretation of Meta (Non-Omniscient)

Managers do not see raw metrics; they get narrative tags:

Examples:
- “Pushers are everywhere”
- “Belt battles decide everything”
- “Injuries are climbing league-wide”
- “Slap-downs are punishing overextensions”

Perception is filtered by:
- ScoutingConfidence (confidence in conclusions)
- Patience (tolerance for noise)
- IdentityRigidity (resistance to change)
- Quirks (Contrarian, etc.)
- Rivalry pressure (see §12)

---

## 8) Reaction Lag & Confirmation Rules

### 8.1 Minimum Delay by Archetype (Canonical)
| Profile | Minimum Delay |
|---|---|
| Gambler | 1–2 basho |
| Star Chaser | 1–3 basho |
| Talent Factory | 3–6 basho |
| Survivor | 4–6 basho |
| Traditionalist | 4–8 basho |

### 8.2 Confirmation Gate
Before committing to adaptation:
- drift magnitude must exceed threshold
- AND local results must confirm trend

Exceptions:
- Gambler may act on short-window noise
- Traditionalist requires long-window confirmation

---

## 9) Adaptation Levers (Non-Training)

Managers adapt via structural decisions (training is handled elsewhere).

Available levers:
1. Recruitment bias (physique, style, temperament)
2. Roster size contraction/expansion
3. Facility investment priority (medical, training halls, scouting)
4. Foreign-slot usage strategy
5. Focus slot allocation requests (interface to Training system)
6. Release/retention policy (loyalty vs churn)

---

## 10) Adaptation Tables (Canonical)

### 10.1 Pressure / Oshi Meta ↑
| Profile | Typical Response |
|---|---|
| Star Chaser | Recruit power/speed; chase immediate push stars |
| Talent Factory | Shift intake heavier; raise physical baseline |
| Survivor | Minimal change; stability-first |
| Traditionalist | Counter-meta throws / belt tricks |
| Gambler | Extreme commitment to meta or extreme counter |

### 10.2 Grip / Yotsu Meta ↑
| Profile | Typical Response |
|---|---|
| Traditionalist | Advantage; reinforce identity |
| Talent Factory | Technique-heavy intake; slow compounding |
| Star Chaser | Pay for elite belt technicians |
| Gambler | Hunt rare specialists |

### 10.3 Injury Meta ↑
| Profile | Typical Response |
|---|---|
| Survivor | Medical investment; reduce risk |
| Talent Factory | Recovery systems and pipeline redundancy |
| Star Chaser | Risks collapse by overusing stars |
| Gambler | Doubles down or implodes |

---

## 11) Counter-Meta Behavior

If:
- one style exceeds 55% prevalence
- AND manager has high IdentityRigidity or Contrarian quirk

Then manager may pursue counter-meta identity:
- recruits built to punish dominant style
- slower payoff, but era-defining if correct

Counter-meta behavior is delayed and risky by design.

---

## 12) Rivalry System Integration (Three Layers)

Rivalries exist concurrently:

1) Rikishi ↔ Rikishi (micro)
2) Oyakata ↔ Oyakata (strategic/political)
3) Stable ↔ Stable (institutional, inheritable)

### 12.1 Rivalry Perception (No Numbers)
NPCs perceive:
- state: recognized / heated / bitter / defining
- dominant side (if any)
- recent trend: cooling / escalating

### 12.2 Rivalry Effects on Decisions
Rivalry does not unlock options. It distorts timing and weighting.

#### Recruitment Bias Under Rivalry
When rivalry ≥ Heated:
- overweight recruits that counter rival styles
- accept higher variance prospects
- foreign-slot choices skew toward rivalry counters

#### Training & Development Bias Under Rivalry (Interface Only)
- request narrower focus allocations
- tolerate higher welfare risk (profile-dependent)

#### Economic Risk Under Rivalry
- accept lower runway thresholds
- delay austerity measures
- more likely to pursue supporter loans / benefactors

### 12.3 Rivalry × Meta Drift
- rival success is overweighted
- losses to rivals trigger faster adaptation
- non-rival trends discounted

This is canonical and explains misreads.

---

## 13) Foreign Wrestler Limits & Dual Citizenship (AI Rules)

### 13.1 Constraint
- One foreign wrestler slot per stable (realistic mimic)
- Dual citizens do not consume slot
- AI must obey slot at all times

### 13.2 Policy Drivers
Decision weighting:
- ForeignSlotAggression
- DualCitizenPreference
- Facilities readiness
- Cash runway
- Rivalry pressure

### 13.3 Sunk-Cost Bias (Canonical)
AI is reluctant to release foreign-slot wrestlers due to:
- prestige investment
- narrative identity
- opportunity cost of re-opening slot

This can create “foreign-slot deadlock” failure modes.

---

## 14) Weekly Decision Loop (Deterministic)

Each interim week:

1. Update PerceptionSnapshot (from visible information)
2. Compute solvency mood (flush/tight/danger) from budget signals
3. Check injury mood (contained/worrying/spiraling)
4. Evaluate roster vs target range (archetype)
5. Apply recruitment and retention rules
6. Decide investment posture (facility vs austerity)
7. Decide foreign-slot actions (if applicable)
8. If crisis: choose among deterministic rescue options (supporters/loans/merge pressure)
9. Emit decision logs

---

## 15) Failure Modes (By Design)

- Overreaction to noise (Gambler, Star Chaser)
- Stagnation under changing meta (Traditionalist)
- Pipeline collapse (Star Chaser neglecting depth)
- Foreign-slot deadlock
- Financial ruin via delayed austerity
- Welfare backlash under rivalry pressure
- Governance sanctions escalation after repeated warnings

Failure is narrative texture, not a bug.

---

## 16) Succession & Manager Replacement

### 16.1 Replacement Triggers
- prolonged underperformance vs expectation band
- insolvency events exceeding tolerance
- leadership age / retirement
- governance intervention
- catastrophic scandal

### 16.2 Candidate Sources
1. Internal Ex-Rikishi
2. External Appointment
3. Caretaker Manager (temporary)

### 16.3 Ex-Rikishi Eligibility
- sufficient career prestige
- no major conduct flags
- meets credential constraints (governance hook)

Trait inheritance from career:
- long career → higher Patience
- injury-prone → higher RecoveryBias
- star success → higher StarBias
- journeyman → higher PipelineBias
- foreign career → higher DualCitizenPreference

### 16.4 Legacy Modifiers
Departing managers leave a legacy that influences successors:
- lingering identity rigidity
- staff loyalty inertia
- cultural momentum

Legacy decays over 2–4 basho.

---

## 17) Governance, Scandal & Media Pressure Integration

### 17.1 Governance Pressure
Managers perceive governance pressure states:
- none / watch / active / crisis

High pressure increases:
- caution (high GovernanceDeference)
- desperation (low GovernanceDeference + high RivalrySensitivity)

### 17.2 Scandal Interaction (Behavioral)
Under scandal:
- recruitment slows
- kōenkai stability threatened
- risk posture changes (discipline vs panic)
- merger acceptance shifts (rivalry-dependent)

### 17.3 Sanctions & Restrictions
Managers must obey restrictions (recruitment bans, facility locks, forced austerity).
They respond by:
- rebalancing roster
- hoarding safe prospects
- shifting to low-visibility strategies

---

## 18) Player-Facing Readability (Numbers Hidden)

Players should infer:
- “They always overreact.”
- “They never change.”
- “They’re obsessed with that rival.”
- “New manager, new philosophy.”

UI should show:
- archetype label (optional via scouting)
- qualitative moods (tight/danger)
- visible decisions (new recruit focus, austerity stance)
- rivalry state labels

UI must not show:
- trait numbers
- hidden drift metrics
- internal weights

---

## 19) Logging & Auditability (QA Requirement)

Every decision emits:
- tickId
- managerId
- beyaId
- actionType
- inputs (qualitative tags only)
- outcome

This supports determinism debugging.

---

## 20) Canon One-Liners

- “Rivalries do not change what is possible. They change what is attempted.”
- “NPC managers inherit the meta, misread it, and pass it on.”
- “Continuity is their advantage — and their curse.”

---

**End of NPC Manager AI System v1.3**

```

```



## SYSTEM 4 — Identity/Tactical/Reputation/Lineage ↔ Talent Pools ↔ Rikishi Development
**Source file:** `Identity_Talent_Development_Megacanon_v1.0_HARMONIZED_NONLOSSY.md`

```md
# Basho — Identity × Talent Pools × Rikishi Development Megacanon
**Status:** HARMONIZED / NON‑LOSSY / IMPLEMENTATION‑GRADE  
**Compiled:** 2026-01-12  
**Primary mandate:** Preserve *all* information across the three source files, while presenting a single coherent hierarchy, clarifying conflicts, and explicitly documenting cross‑system interactions.
## Table of Contents
  - [Scope, Non‑Lossy Guarantee, and Source Set](#scope-nonlossy-guarantee-and-source-set)
  - [Unified Design Laws](#unified-design-laws)
  - [Unified Time & Tick Model](#unified-time--tick-model)
  - [Unified Entity Lifecycle & IDs](#unified-entity-lifecycle--ids)
  - [System A — Talent Pools & Institutional Pipelines](#system-a--talent-pools--institutional-pipelines)
  - [System B — Rikishi Development](#system-b--rikishi-development)
  - [System C — Identity, Tactical Archetypes, Reputation, Deviance & Lineage](#system-c--identity-tactical-archetypes-reputation-deviance--lineage)
  - [Cross‑System Interaction Contracts](#crosssystem-interaction-contracts)
  - [Discrepancies, Ambiguities, and Resolutions](#discrepancies-ambiguities-and-resolutions)
  - [Implementation & QA Checklist](#implementation--qa-checklist)
  - [Verbatim Source Preservation Annex](#verbatim-source-preservation-annex)
    - [Annex 1 — Basho_Identity_Tactical_Reputation_Lineage_Megacanon_v3.0](#annex-1--basho_identity_tactical_reputation_lineage_megacanon_v30)
    - [Annex 2 — Basho_Talent_Pools_and_Pipelines_Canon_v1.1](#annex-2--basho_talent_pools_and_pipelines_canon_v11)
    - [Annex 3 — Basho_Rikishi_Development_Canon_v1.3](#annex-3--basho_rikishi_development_canon_v13)
## Scope, Non‑Lossy Guarantee, and Source Set
This document harmonizes **three canonical specifications** into one integrated, cross‑referenced megacanon:
1) **Basho — Identity, Tactical Archetypes, Reputation & Lineage Megacanon v3.0 (Harmonized / Non‑Lossy)**
2) **Basho — Talent Pools & Institutional Pipelines Canon v1.1 (Ultra‑Granular)**
3) **Basho — Rikishi Development Canon v1.3 (Ultra‑Granular)**

**Non‑lossy guarantee:** The full verbatim text of each source file is included in the **Verbatim Source Preservation Annex**. The harmonized sections above it add cross‑links, reconciliations, and integration notes, but do not delete or weaken any canonical rule.
## Unified Design Laws
### D1. Determinism (replay‑safe)
- All generation, progression, and outcomes are deterministic functions of world seeds + time indices + explicit player/NPC decisions.
- No runtime RNG is permitted for: talent pool supply, hiring outcomes, weekly training outcomes, evolution consolidation, injury state transitions, archetype drift, reputation drift, or lineage memory.

### D2. Scarcity is gameplay (supply‑side physics)
- *Pools* are finite persistent candidate sets with competition and depletion; they are not "spawns".
- Scarcity bands and quality bands exist to create eras, droughts, poaching wars, and kabu succession pressure.

### D3. Separation of timescales
- **Weekly**: training evaluation, fatigue changes, mental state updates, injury checks.
- **Monthly**: development consolidation, style confidence updates, favored kimarite updates, many pool refreshes.
- **Basho‑end**: career phase review, narrative beats, ranking‑adjacent downstream systems.
- **Yearly**: new intake cohorts (domestic/foreign) and macro era shifts.

### D4. Identity is *derived* and proven by behavior
- Tactical style labels and identity descriptors are recomputed from repeated signals (kimarite distribution, physique suitability, bout behaviors), with hysteresis to prevent oscillation.
- Archetypes describe *behavior under pressure*; dominant archetype is seeded and rarely changes, while secondary drift can emerge slowly.

### D5. Auditability
- Every meaningful change emits canonical events for journals/history and for downstream systems (AI planning, economy wage pressure, governance eligibility, rivalry escalation).
## Unified Time & Tick Model
### Calendar primitives
- **WeekTick**: the smallest progression unit for training, fatigue, mental state, and injury checks.
- **MonthIndex**: every 4 weeks (configurable) triggers consolidation of buffered growth and identity recomputation gates.
- **BashoIndex**: basho‑end checkpoints (typically every 2 months in sumo cadence) trigger arc milestones, awards, and narrative packaging.
- **YearIndex**: yearly intake generation and decade/era recalculation.

### Seed alignment (canonical naming)
- `WorldSeed`: global deterministic root.
- `EraSeed` / `EraIndex`: derived from WorldSeed and decade window; drives macro supply bands and cultural tone.
- `CalendarIndex` / `TimeIndex`: monotonically increasing time coordinate; can be expressed as week number, month number, basho number.

### Recommended canonical tick ordering (single simulation pass)
1) **Pools refresh pass** (if cadence hits) → reveals, churn, suitor recompute
2) **Contract resolution pass** (offer windows hitting deadlines) → signings/poaching
3) **Weekly training pass** for each rikishi → growth buffer + fatigue + injury checks + mental update
4) **Monthly consolidation pass** (if month boundary) → apply buffered growth, style drift checks, favored kimarite updates
5) **Basho‑end pass** (if basho boundary) → career phase review, narrative packaging, awards/legacy hooks

This ordering prevents causality loops (e.g., signings happen before new weekly training is applied).
## Unified Entity Lifecycle & IDs
### Lifecycle overview
1) **Candidate (Pool layer)** → 2) **Signed person (World entity)** → 3) **Rikishi (roster entity)** → 4) **Career arc (retirement/legacy)** → 5) **Post‑career roles (staff/oyakata pipelines)**

### Canonical identifiers
- `CandidateId`: ephemeral until signed.
- `PersonId`: persistent identity; created/promoted at signing.
- `RikishiId`: persistent competitive identity (linked to PersonId) with shikona registry entry.
- `BeyaId`, `KabuId`, `PoolId`: persistent institutional identifiers.

### Required cross‑links between layers
- Candidate metadata must include at least: origin, age cohort, visibility band, temperament/tags, latent reputation seed.
- At signing: Candidate → Person promotion must initialize **identity seeds** required by the Identity/Tactical systems (dominant archetype seed, baseline style suitability markers, reputation potential seed).
- Once on roster: Development system owns weekly/monthly evolution; Identity system reads outcomes (kimarite usage, physique evolution) to update labels and narrative.
## System A — Talent Pools & Institutional Pipelines
### What this system owns
- Generation and persistence of *available people* (intake prospects, staff labor markets, medical labor markets, oyakata/kabu successor candidates).
- Visibility/scouting fog‑of‑war bands and reveals.
- Competition (multiple suitors) and deterministic resolution of offer windows.
- Pipelines moving retired rikishi into staff → assistant oyakata → oyakata candidate pools.

### What this system explicitly does **not** own
- Bout resolution, banzuke math, economy amounts (it emits indices/events that those systems consume).
- Rikishi weekly training and evolution (handed to Development once signed).

### Primary outputs consumed by other systems
- **Signings** → roster and development initialization.
- **Scarcity & quality bands** → AI behavior, wage pressure, sponsor confidence tone.
- **Kabu vacancy & assignment events** → governance logs, faction narratives.

### Harmonized integration notes (Pools ↔ Identity/Development)
- Candidate generation should emit **archetype‑relevant tags** (e.g., disciplined/volatile) as *inputs* to dominant archetype seeding.
- Candidate `reputationSeed` must map to Reputation system’s latent potential; early scandals/discipline signals become deviance risk priors.
- Staff candidate specialties (technique/conditioning/mental) are consumed by Development as facility/staff micro‑effects.
## System B — Rikishi Development
### What this system owns
- Weekly training evaluation (beya profile + individual focus slots + facilities/staff multipliers).
- Physique and skill evolution (buffered weekly, consolidated monthly).
- Fatigue + explicit injury state machine; recovery curves; chronic/career‑ending triggers.
- Mental & psychological load vector (confidence/pressure/fear/focus/resilience) updated deterministically.
- Retirement, post‑career persistence, and legacy scoring hooks.

### Key harmonizations with Identity/Tactical systems
- **Style drift**: Development computes style confidence signals from physique + kimarite usage; Identity/Tactical canon consumes these to label wrestlers and drive narrative.
- **Archetype drift**: Dominant archetype is seeded at creation; Development does not directly change it, but may produce repeated behavioral evidence that allows secondary drift (Identity system gate).
- **Favored kimarite**: Development maintains tokui‑waza list based on actual wins; Tactical archetype and myth layers should treat this as primary evidence.

### Key harmonizations with Pools & Pipelines
- Retirement outcomes must feed the Pools pipelines:
  - Retired rikishi → staff candidate (technique coach bias derived from former style/archetype)
  - Retired rikishi/assistant oyakata → oyakata candidate pool (kabu eligibility gates)
## System C — Identity, Tactical Archetypes, Reputation, Deviance & Lineage
### What this system owns (high level)
- Taxonomies of **identity archetypes** and **tactical archetypes**; how they’re seeded, evolve, drift, and are presented in UI.
- Reputation layers: public perception, internal reputation, deviance, scandal vectors, and how these interact with sponsors, fans, media, and governance.
- Beya lineage: intergenerational archetype expectations (“this stable produces bullies/technicians”), inherited myths, and institutional narrative momentum.

### Canonical data dependencies
- **From Development**: physique trajectory, style confidence, kimarite usage, injury history, mental state descriptors, career phase, legacy outputs.
- **From Pools**: origin metadata, early temperament tags, latent reputation potential, staff/coach hiring and poaching events, kabu eligibility events.

### Primary outputs consumed by other systems
- **NPC decision modifiers**: recruitment preferences, training risk posture, rivalry behavior, sponsor targeting.
- **Narrative packaging**: myths, fanbases, media tones, “era” storytelling, stable reputations.
- **Governance pressure**: scandal severity, sanctions, kabu tolerance shifts.
## Cross‑System Interaction Contracts
### Event bus (minimum canonical set)
Pools already defines a comprehensive pool event taxonomy. Harmonize by requiring these additional or mapped events so Identity/Development can consume them:
- `CandidateSigned` → must include PersonId, BeyaId, Candidate summary (origin, archetype tags, reputation seed)
- `StaffPoached` / `StaffSigned` → must include staff specialty + competency band so Development can update multipliers
- `TrainingProfileChanged` (Development) → produces narrative hooks + identity pressure shifts
- `InjuryStateChanged` (Development) → drives media tone, deviance stress, and career arc beats
- `StyleLabelShifted` (Development/Identity) → public identity refresh and sponsor targeting
- `ReputationBandShifted` (Identity) → modifies suitor interest in Pools, sponsor offers, and governance tolerance
- `RetirementAnnounced` (Development) → triggers pipeline entry (staff/kabu) and lineage myth updates

### Data flow map (who owns what)
- **Pools** owns candidate existence, availability, visibility, suitors, hiring outcomes, and institutional pipelines.
- **Development** owns weekly/monthly progression for signed rikishi and produces measurable evidence (kimarite, physique, injury).
- **Identity/Tactical/Reputation/Lineage** owns labels, myths, perception, deviance pressure, and institutional memory; it must not override mechanical outcomes, only interpret them.

### Closed loops (allowed feedback, no paradox)
1) **Identity → Pools**: reputation/lineage alters interest bands and candidate preferences.
2) **Pools → Development**: staff hires and facilities (via beya state) alter training multipliers.
3) **Development → Identity**: performance evidence updates style/archetype narratives.
4) **Identity → Development**: pressure/media tone influences MentalState inputs (deterministic) and training choices by AI/player.
These loops are legal because each step is time‑gated (weekly/monthly/basho) and audit‑logged.
## Discrepancies, Ambiguities, and Resolutions
### R1. Pools canon header versioning
- The Pools file body contains a header referencing v1.0 in places while the filename is v1.1.
**Resolution:** treat the *file content* as authoritative; keep filename version in citation; retain verbatim text in annex.

### R2. “Probability” language under determinism
- Development canon sometimes says training "biases probability" while also forbidding runtime RNG.
**Resolution:** interpret "probability" as *deterministic propensity bands* (i.e., computed likelihood descriptors and thresholded outcomes), not stochastic rolls. Any mention of "roll" means deterministic check against thresholds derived from seeds and state.

### R3. Ownership boundaries for style/archetype
- Both Development and Identity systems discuss style drift.
**Resolution:** Development computes **raw signals and confidence scores** (e.g., style confidence vectors, kimarite distributions). Identity/Tactical system owns **public labels, myth framing, and archetype naming**, reading Development outputs.

### R4. Retirement → pipeline handoff detail
- Pools defines pipelines but Development defines retirement outcomes.
**Resolution:** Retirement event must be emitted by Development with enough payload for Pools to instantiate staff/kabu candidates deterministically (style/archetype, reputation, injury flags, willingness).
## Implementation & QA Checklist
1) **Non‑lossy ingestion**: parsers must preserve all three sources; annex text should round‑trip cleanly.
2) **Unified IDs**: enforce Candidate→Person→Rikishi promotion rules; no other system may create people.
3) **Tick ordering**: implement weekly/monthly/basho/year pass ordering exactly; assert determinism.
4) **Event audit log**: every signing, reveal, injury transition, label shift, retirement, and kabu change must be logged.
5) **Cross‑loop gating**: verify feedback loops are time‑gated and cannot create same‑tick paradox.
6) **Foreign quota checks**: enforce governance rules at signing time with clear UI explanation.
7) **Mental system integration**: map media tone/reputation pressure into deterministic MentalState inputs.
8) **Post‑career persistence**: retired entities remain in history and can re‑enter pools as staff/oyakata candidates.
## Verbatim Source Preservation Annex
The following annexes include the full source texts **verbatim** (no edits) to satisfy the non‑lossy guarantee.

### Annex 1 — Basho_Identity_Tactical_Reputation_Lineage_Megacanon_v3.0 (verbatim)
<a id="annex-1--basho_identity_tactical_reputation_lineage_megacanon_v30"></a>

---

# Basho — Identity, Tactical Archetypes, Reputation & Lineage Megacanon v3.0 (Harmonized, Non‑Lossy)
**Build date:** 2026-01-12  
**Status:** IMPLEMENTATION‑GRADE / HARMONIZED / NON‑LOSSY  
**Scope:** Identity Archetypes, Tactical Archetypes, risk & injury feedback, drift/evolution, coaching, sponsors/media/fans, reputation/deviance, beya lineage & archetype expectations, and their deterministic interactions.

## What this file is
This document merges **10 canonical source files** into one:
- **Part A** is a curated, hierarchical *harmonized specification* (engine + narrative binding), including explicit cross‑system interfaces and interaction rules.
- **Part B** is a **Source Preservation Annex** embedding each source **verbatim** to guarantee *non‑lossy completeness*.

If any ambiguity remains after harmonization, the annex is the fallback truth; where a direct conflict exists, the **Resolution & Precedence Rules** below decide.

---

## Included sources (verbatim in Annex)
1. Basho_Identity_Archetypes_and_Evolution_Megacanon_v2.1_Ultra_Granular.md  
2. Basho_Identity_Archetypes_Pipelines_and_Dynamics_Canon_v2.0_Ultra_Granular_NonLossy.md  
3. Basho_Reputation_Deviance_Archetype_and_Beya_Lineage_Canon_v1.9_Ultra_Granular.md  
4. Basho_Tactical_Archetypes_Myth_Sponsor_Coaching_Fans_and_Media_Canon_v1.6_Ultra_Granular.md  
5. Basho_Tactical_Archetypes_Myth_Sponsor_and_Coaching_Canon_v1.5_Ultra_Granular.md  
6. Basho_Tactical_Archetypes_Risk_Injury_Coaching_Legacy_Rivalries_Canon_v1.4_Ultra_Granular.md  
7. Basho_Tactical_Archetypes_Risk_Injury_Coaching_and_Legacy_Canon_v1.3_Ultra_Granular.md  
8. Basho_Tactical_Archetypes_Risk_Injury_and_Coaching_Canon_v1.2_Ultra_Granular.md  
9. Basho_Tactical_Archetypes_Risk_Drift_and_Narrative_Canon_v1.1_Ultra_Granular.md  
10. Basho_Tactical_Archetypes_Identity_and_Narrative_Canon_v1.0_Ultra_Granular.md  

---

## Resolution & precedence rules (binding within this file)
1. **Harmonized Part A** is authoritative unless it explicitly says “defer to annex”.
2. If Part A is silent on a point: prefer the **newest** relevant source version.
3. If two sources disagree and both claim authority:
   - Tactical archetypes: v1.6 > v1.5 > v1.4 > v1.3 > v1.2 > v1.1 > v1.0  
   - Identity archetypes: v2.1 > v2.0  
   - Reputation/deviance/lineage: v1.9
4. If a rule touches determinism or ordering: **“determinism and replay safety” wins** (no hidden dice, no mid‑bout coach overrides, no narrative feedback into engine).
5. Terminology unification:
   - *Tactical Archetype* = in‑bout behavioral policy / intent biases.
   - *Identity Archetype* = broader persona + career arc + social patterning (may include off‑dohyo traits) and can *contain* or *influence* tactical archetype tendencies.
   - *Reputation/Deviance* = social perception + institutional pressure layer; it modifies narrative, governance/media reactions, and long‑horizon coaching/management decisions — **never physics**.

---

# PART A — Harmonized Specification (Curated, Cross‑System)

## A0. Design thesis (reconciled)
A rikishi’s “who they are” is produced by stacked layers:
1) **Physical reality** (body, leverage, injuries)  
2) **Behavioral intent** (Tactical Archetype + Risk appetite)  
3) **Institutional shaping** (Coaching philosophy, beya lineage, staff incentives)  
4) **Social interpretation** (Reputation, deviance stigma, media/fans/sponsors)  
5) **Memory & myth** (career history, rivalries, signature moments)

Core invariant:
> **Behavior biases intent. Body biases outcomes. Institutions reshape habit. Perception shapes pressure. History creates myth.**

---

## A1. Canonical object model (normalized)
### A1.1 Rikishi identity stack (engine‑truth, narrative projection)
**Engine‑truth fields (simulation state):**
- `tacticalArchetypePrimary`
- `tacticalArchetypeSecondary?` (future‑enabled where specified)
- `riskProfile` (curve + modifiers)
- `injuryFearIndex` (IFI) + body‑part fear channels
- `styleInertia` (resistance to change)
- `coachInfluenceVector` (long‑run bias, tick‑applied)
- `identityArchetype` (persona/arc tag set)
- `reputationBands` (public + insider views)
- `devianceFlags` (pattern tags + institutional “watch” state)
- `beyaLineageArchetypeExpectations` (stable stereotype pressures)
- `mythTags` (earned, persistent)
- `rivalryLinks[]` (and rivalry heat bands)
- `sponsorAffinitySurface` (visibility + sponsor tolerance bands)

**Narrative projection fields (player‑facing):**
- style descriptors (“pressing”, “gun‑shy”, “belt‑patient”, “counter‑hungry”)
- reputation adjectives (“trusted”, “volatile”, “fragile”, “folk hero”)
- lineage framing (“this stable breeds technicians / bullies / grinders”)
- myth epithets (“Iron Man”, “Glass Giant”, etc.)
- crowd memory callbacks (venue‑specific)

---

## A2. Archetype taxonomy and separation of concerns
### A2.1 Tactical Archetypes (bout policy layer)
Canonical set:
- Oshi Specialist
- Yotsu Specialist
- Speedster
- Trickster
- All‑Rounder
- HybridOshiYotsu *(future‑enabled)*
- CounterSpecialist *(future‑enabled)*

**Rule:** Tactical archetypes bias *attempted solutions* and *risk posture*; they do not override viability gates or physics constraints.

### A2.2 Identity Archetypes (career/persona layer)
Identity archetypes are **larger than combat**:
- they shape training receptivity, narrative framing, sponsor/media response, rivalry formation, and drift direction.
- they can *contain* a typical tactical archetype pairing (e.g., “discipline technician” tends toward Yotsu Specialist + low volatility), but are not identical.

### A2.3 Reputation & Deviance (institutional/social layer)
Reputation is not a cosmetic label:
- it changes *who pressures whom*, sponsor willingness to attach, media amplification speed, and coaching/management tolerance windows.
- deviance is a **pattern detection** layer: repeated edge‑collapse, repeated injury concealment, repeated slap‑pull overuse, repeated henka reliance, etc., can trigger institutional reaction.
- this layer never changes bout physics directly; it changes *inputs to long‑term systems* (coaching choices, training emphasis, selection pressure, sanctions where applicable).

---

## A3. Deterministic interaction graph (high‑level)
### A3.1 The “Identity → Combat → Narrative → Memory → Pressure → Identity” loop (bounded)
1. **Identity state** biases tactics, risk, and technique selection.
2. **Combat** resolves deterministically; outputs structured tokens.
3. **Narrative** renders outputs (no feedback into combat).
4. **Memory** stores results as immutable history, updates myth/reputation/crowd memory.
5. **Pressure systems** (coach choices, sponsor/media, beya lineage expectations, deviance flags) adjust long‑run modifiers.
6. **Identity evolution** (drift) occurs slowly across ticks; no sudden flips.

**Hard wall:** narrative text never modifies engine outcomes; it only consumes and records.

---

## A4. Risk × Injury × Fear (unified model)
### A4.1 Risk tolerance curves
Risk is archetype‑shaped across bout phases (early/mid/late/edge).
Risk modifies:
- overcommit chance
- counter vulnerability
- injury multipliers
- willingness to attempt low‑probability finishes

### A4.2 Injury Fear Index (IFI) and suppression
IFI ∈ [0.0–1.0] accumulates from:
- moderate/major injuries
- re‑injury of same region
- competing while injured
- “fragility stigma” tags

IFI decays via:
- clean basho without injury
- recovery beats expectations
- coaching intervention succeeds

**Effect:** IFI suppresses effective risk (archetype‑specific suppression factors) and gates move families tied to feared body regions.

### A4.3 Body‑part fear channels (kimarite family gating)
- Knee/ankle fear suppresses trips & explosive drive
- Shoulder fear suppresses throws & lifts
- Neck/spine fear suppresses high‑impulse collisions
- Elbow/wrist fear suppresses grip‑heavy finishes

Gating is gradual (weight dampening), not binary forbiddance (unless viability gates already forbid).

---

## A5. Coaching as long‑run behavioral reshaper (not mid‑bout)
### A5.1 Coach entity and philosophy
Coaches apply pressure via training seasons and bias tables:
- philosophy: Aggressive / Conservative / Technical / Adaptive / Defensive
- authority: soft vs hard enforcement
- patience: time‑to‑effect
- specialty hooks: risk moderation, grip fundamentals, throw education, counter discipline

### A5.2 Style inertia & resistance
Each rikishi has `styleInertia`:
- high inertia resists reshaping
- injuries and aging reduce inertia
- sustained success increases inertia

**Effective coach impact** scales by authority × (1 − inertia).

### A5.3 Reshaping paths (canonical examples)
- Conservative: Oshi → All‑Rounder (risk down)
- Technical: Oshi → Yotsu (skill conversion)
- Adaptive: All‑Rounder → Hybrid
- Defensive: Speedster → CounterSpecialist

Time horizon: 6–12 basho; blends bias tables; reversible if coach leaves.

---

## A6. Drift and evolution (consolidated)
### A6.1 Drift triggers (slow, deterministic)
- repeated failure under primary archetype
- cumulative injuries / fear accumulation
- aging + loss of speed/power
- coaching intervention pressure
- successful adoption of secondary techniques (mastery growth)
- reputational pressure (e.g., being labeled a “cowardly puller” creates institutional pushback)

### A6.2 Drift mechanism
Drift is implemented as:
- gradually blended archetype bias tables
- evolving risk curve parameters
- changes in favored win‑condition weights
- narrative “transition period” descriptors

No mid‑basho hard reclassification unless explicitly tied to an end‑of‑basho recompute boundary.

---

## A7. Myth, sponsors, fans, and media (unified)
### A7.1 Myth tags as persistent reputation anchors
Myth tags emerge from career patterns and are sticky:
- Iron Man, Glass Giant, Giant Killer, Eternal Sekiwake, Late Bloomer, etc.

Myth tags influence:
- AI opponent targeting tendencies (strategy preference)
- sponsor affinity (who wants to be seen near whom)
- media tone and escalation speed
- crowd memory expectations

### A7.2 Sponsors: pressure without physics
Sponsors affect:
- visibility and ceremony surfaces
- reputational pressure (withdrawal vs doubling down)
- coach/management incentives (protect stars, avoid scandals)

Sponsors never alter bout outcomes directly.

### A7.3 Fans & crowd memory
Crowd is venue‑keyed and remembers:
- upsets
- betrayals
- repeated tactics (henka reliance, slap‑pull spam)
- heroism under injury
This memory feeds back into narrative tone and pressure situations.

---

## A8. Reputation, deviance, and beya lineage (institutional stereotyping)
### A8.1 Beya lineage archetype expectations (newly emphasized)
Each beya carries *intergenerational archetype expectations*:
- “this stable produces bullies”
- “this stable produces technicians”
- “this stable produces grinders”
- “this stable produces tricksters”
These expectations:
- bias coach selection and training culture
- bias media framing (“as expected of ___ stable”)
- bias sponsor attachment (“traditional backers avoid deviant stables”)
- create internal pressure on rikishi who diverge (increasing drift forces or conflict arcs)

### A8.2 Deviance detection and escalation
Deviance flags trigger when patterns cross thresholds:
- tactical deviance (e.g., chronic pull reliance, illegal edge behavior if modeled)
- welfare deviance (training overload patterns leading to repeated injuries)
- institutional deviance (recruitment shadiness, misconduct patterns — if wired elsewhere)

Outputs:
- narrative hooks
- coaching intervention pressure
- sponsor volatility
- (optionally) governance scrutiny if governance systems are active elsewhere in the wider project

---

## A9. Rivalries and legacy (tactical identity ↔ institutional memory)
Rivalries intensify when:
- repeated high‑stakes meetings
- contrasting archetypes (pusher vs technician)
- narrative betrayal moments (henka in decisive bout)
- sponsor/media overexposure

Rivalry heat feeds:
- risk appetite distortions (players “force it”)
- coaching pressure to “solve the matchup”
- myth tag formation (“Nemesis”, “Bane of ___”)

Legacy is the almanac‑ready projection of:
- identity evolution arc
- signature kimarite emergence
- injuries survived or succumbed to
- deviance redemption or collapse
- stable lineage contribution (“the coach who changed the stable’s output”)

---

## A10. Implementation checklists (engine integration)
### A10.1 Hard invariants
- Deterministic seeds drive selection and narrative variety (presentation‑only randomness never mutates sim state).
- Coaching applies only on training‑season ticks, not mid‑bout.
- Reputation/dev flags never bypass viability gates; they bias weights and long‑run decisions only.
- Drift is slow (6–12 basho) unless explicitly configured otherwise.

### A10.2 Required logs for legibility
Every visible identity change must map to:
- a cause chain (injury, coaching, repeated failures, reputation pressure)
- a time window (“over recent tournaments”)
- a persistent record entry (career history / myth tag update)

---

## A11. Discrepancies & reconciliation notes (explicit)
This harmonization resolves the main version‑to‑version shifts as follows:

1) **Risk/D drift:** v1.1 establishes risk curves + drift triggers; later versions extend with injury fear and coaching reshaping. We keep the later extensions and preserve early curve tables verbatim in annex.
2) **Injury fear (IFI):** introduced as explicit feedback in v1.2; retained as the canonical psychological residue mechanism.
3) **Legacy/rivalries/media/sponsors:** added progressively through v1.3–v1.6. We treat v1.6 as the broadest “surface integration” and preserve earlier narrower definitions.
4) **Identity archetype pipeline:** v2.0 provides the non‑lossy pipeline/dynamics; v2.1 adds/adjusts evolution framing. We treat v2.1 as authoritative for identity evolution, and v2.0 as authoritative for pipeline detail when v2.1 is silent.
5) **Reputation/deviance/lineage:** v1.9 is treated as authoritative; its beya‑lineage stereotyping is elevated here as a first‑class cross‑system pressure vector.

---

# PART B — Source Preservation Annex (Verbatim)
> Everything below is embedded verbatim. No deletions. No rewriting.  
> These blocks are the legal “non‑lossy” guarantee.



## SOURCE 01 — Basho_Identity_Archetypes_and_Evolution_Megacanon_v2.1_Ultra_Granular.md

```md

BASHO — IDENTITY, ARCHETYPES, PIPELINES, PERCEPTION & EVOLUTION MEGACANON
v2.1 ULTRA-GRANULAR NON-LOSSY DEFINITIVE

This document supersedes v2.0 and incorporates all audit corrections.
It is intended to be implementable without inference.

======================================================================
SECTION 0 — CANONICAL PRECEDENCE & TERMINOLOGY CONTRACT
======================================================================

0.1 Canonical Authority
The following sections are authoritative:
• Section 4–9: Identity & Archetype Math
• Section 10–14: Drift, Risk, Injury, Pressure
• Section 15–18: Fan, Media, Sponsor, AI Interaction
• Annex A: Numeric Tables (binding)
• Annex B: Deprecated Tables (non-authoritative)

If a value appears in multiple locations:
• Main body > Annex A > Annex B

0.2 Family Taxonomy Resolution
The canonical Kimarite Families are:

OSHI (push/thrust)
YOTSU (belt control)
THROW (nage)
TRIP (kakete/leg)
PULLDOWN (hataki/hiki)
REVERSAL (uchari/edge counters)
SPECIAL (rare/ceremonial)

Legacy mappings:
• Push → OSHI
• Belt → YOTSU
• Throw → THROW
• Trip → TRIP
• Pull → PULLDOWN
• Counter → REVERSAL

======================================================================
SECTION 1 — CORE IDENTITY AXES
======================================================================

Each Rikishi identity is composed of:

• TacticalArchetype (behavioral intent)
• LeverageClass (physical geometry)
• PreferredWinCondition (finisher bias)
• BaseRiskTolerance
• StyleInertia
• InjuryProneness (hidden)

These are immutable at creation except TacticalArchetype and PreferredWinCondition,
which may drift.

======================================================================
SECTION 2 — TACTICAL ARCHETYPES (AUTHORITATIVE)
======================================================================

OshiSpecialist
YotsuSpecialist
Speedster
Trickster
AllRounder
HybridOshiYotsu
CounterSpecialist

Each archetype defines:
• FamilyBias[OSHI..SPECIAL]
• BaseRiskTolerance
• DriftResistance

(See Annex A.1)

======================================================================
SECTION 3 — LEVERAGE CLASSES (PHYSICAL)
======================================================================

CompactAnchor
LongLever
TopHeavy
MobileLight
Standard

Computed from:
height, mass, leg length, torso ratio, core strength

LeverageClass affects:
• Impulse absorption
• Stance stability
• Family viability gates

======================================================================
SECTION 4 — KIMARITE SELECTION PIPELINE (DETERMINISTIC)
======================================================================

1. Viability Gates
• stance compatibility
• edge state
• leverage feasibility

2. Tier Weighting
• Common / Uncommon / Rare / Legendary

3. Physics Multipliers
• impulseBand
• stanceState
• leverageInteractionGrid
• edgePressure

4. Tactical Bias
• Archetype family weights

5. Preferred Win Condition bias

6. Mastery multiplier

7. Final weighted draw

======================================================================
SECTION 5 — NUMERIC RISK MODEL (RESOLVED)
======================================================================

RiskEffective =
clamp01(
BaseRiskTolerance
× PhaseRiskMultiplier
× EdgeMultiplier
+ PressureAmp
− InjuryFear
+ CoachOverride
)

PhaseRiskMultiplier:
Early: 0.9
Mid: 1.0
Late: 1.15
Edge: 1.3

======================================================================
SECTION 6 — DRIFT & EVOLUTION (FULLY SPECIFIED)
======================================================================

Evidence[family] updates per bout:
• +2 on win
• +1 on loss if attempted
• −1 on failed attempt
• +3 if success vs higher rank

Drift Check:
Every basho if EvidenceDiff ≥ 10 sustained over 3 basho.

Hysteresis Lock:
2 basho lock after drift unless InjuryEmergency.

======================================================================
SECTION 7 — PREFERRED WIN CONDITION
======================================================================

Assigned at generation via:
physique + archetype + coach doctrine.

May drift only after:
• 4 basho
• ≥60% finishes via alternate condition

UI-visible as "Favored Finish".

======================================================================
SECTION 8 — INJURY FEAR & FEEDBACK
======================================================================

InjuryFear increases by:
• +0.15 major injury
• +0.05 minor injury
• +0.1 reinjury

Suppresses:
• lateral movement
• high-risk families

======================================================================
SECTION 9 — COACH & SPONSOR PRESSURE
======================================================================

PressureAmp =
(SSPI / 100)
× SponsorVisibility
× CoachComplianceFactor

Logged per basho.

======================================================================
SECTION 10 — REPUTATION DEVIANCE (FINAL)
======================================================================

Axes:
• Tactical Deviance
• Emotional Deviance
• Ethical Deviance

No villains.
Only deviation from expected hinkaku.

======================================================================
SECTION 11 — FAN FACTIONS & MEMORY
======================================================================

Fan Factions:
Regional, National, Traditionalist, Spectacle, Underdog

Generational Memory Ledger:
40–70% inheritance to pupils/beya.

======================================================================
SECTION 12 — MEDIA PERSONALITIES & FACTIONS
======================================================================

Media Factions:
Traditional Desk, Modernist Desk, Sensational Desk, Regional Desk

BiasModifier applied to:
• headlines
• myth stability
• sponsor confidence

======================================================================
SECTION 13 — CROWD INTIMIDATION (NUMERIC)
======================================================================

CrowdHostility =
Σ(FactionApproval × Salience)

If age < 23 and Hostility > 65:
• Focus −10
• ErrorBand +1
• InjuryRisk ×1.1

======================================================================
SECTION 14 — AI RESPONSE & MYTH TAGS
======================================================================

AI applies myth-based counters after recognitionTurn delay.

Example:
GlassGiant → Trip weight +20%, EdgePressure +10%

======================================================================
SECTION 15 — TALENT POOLS & IDENTITY GENERATION
======================================================================

Candidate Identity Generation:

TacticalArchetype =
argmax(archetypeWeights
+ beyaLineageBias
+ coachDoctrineBias
+ regionBias)

RiskBase =
ArchetypeBase
+ temperamentSeed
± eraPressure

StyleInertia =
60 + pedigree − fearSusceptibility

======================================================================
SECTION 16 — BEYA LINEAGE SYSTEM
======================================================================

BeyaStyleSignatureVector maintained yearly.

Deviation > threshold → ExpectationPressure applied.

======================================================================
SECTION 17 — NARRATIVE & EVENT PAYLOAD CONTRACT
======================================================================

Each bout emits:
identityKey, stance, impulseBand, edgeState,
riskBand, mythTriggers, crowdDelta, mediaDelta.

Phrase pools keyed by identity hash + basho index.

======================================================================
SECTION 18 — CANONICAL GUARANTEES
======================================================================

• Deterministic
• Inspectable
• Non-kayfabe
• Culturally accurate
• No hidden overrides

======================================================================
ANNEX A — NUMERIC TABLES (AUTHORITATIVE)
======================================================================
(Full archetype × family bias tables, leverage grids, risk curves inline)

======================================================================
ANNEX B — DEPRECATED SNAPSHOTS (NON-AUTH)
======================================================================
(For reference only)

END OF MEGACANON

```



## SOURCE 02 — Basho_Identity_Archetypes_Pipelines_and_Dynamics_Canon_v2.0_Ultra_Granular_NonLossy.md

```md
# Basho — Identity, Archetypes, Risk, Coaching, Sponsors, Fans/Media & Talent Pipelines Canon v2.0 (Ultra‑Granular, Non‑Lossy)

Date: 2026-01-12  
Status: **DEFINITIVE (HARMONISED / NON‑LOSSY)**  
Scope: Tactical Archetypes (behavior), Leverage Classes (physics), risk tolerance + injury feedback, coaching reshaping, sponsors + supporters pressures, fans/media dynamics, and the talent pools/pipelines that feed these identities into the world, wired into rikishi development.

> This document is intentionally **long**. It contains a curated, hierarchical spec **and** a verbatim annex of every source file so nothing is lost.

## 0. Naming & Deprecation
- Game title: **Basho**.
- Any “Basho” strings that appear below are historical source names retained in the **Verbatim Source Annex** only.

## 1. Canonical Layering (Do Not Confuse These)

### 1.1 Tactical Archetype (Behavioral Policy)
- **What it is:** a deterministic decision-bias that shapes *intent* (which action families are attempted) under the same physical situation.
- **Where it acts:** after viability gates are computed, as a **weight multiplier** over eligible kimarite families.
- **What it must never do:** bypass physical impossibility, stance, grip, edge state, leverage class gates.

### 1.2 Leverage Class (Physical Interaction)
- **What it is:** a computed physique geometry outcome (height/weight/core distribution) used inside physics and viability.
- **Where it acts:** inside (a) impulse/stability resolution, (b) leverage multipliers, (c) viability gates for kimarite families.

### 1.3 Style vs Archetype vs Narrative Alias
- **Style (Oshi/Yotsu/Hybrid)** is *public-facing* and derived from long-run outcomes/usage.
- **Tactical Archetype** is a hidden/low-visibility behavioral policy that shapes choice weights.
- **Narrative Aliases** (e.g., “Iron Wall”) are *text-only mappings* from (Archetype × LeverageClass × MythTags) and must not be treated as mechanical keys.

## 2. Unified Schema (Engine-Ready)

### 2.1 Enums
**TacticalArchetype (Required Canon):**
- `OshiSpecialist`
- `YotsuSpecialist`
- `Speedster`
- `Trickster`
- `AllRounder`
- `HybridOshiYotsu` (adaptive switch-hitter)
- `CounterSpecialist` (reactive, not deceptive)

**LeverageClass (computed):**
- `CompactAnchor`
- `LongLever`
- `TopHeavy`
- `MobileLight`
- `Standard`

**PreferredWinCondition (small differentiator flag, recommended):**
- `ForceOutFinish`
- `ThrowFinish`
- `TripFinish`
- `PullFinish`
- `CounterFinish`

### 2.2 Core Identity Record
```json
{
  "rikishiId": "...",
  "tacticalArchetype": "OshiSpecialist",
  "leverageClass": "TopHeavy",
  "preferredWinCondition": "ForceOutFinish",
  "riskTolerance": {
    "base": 0.55,
    "injuryFear": 0.20,
    "pressureAmplifier": 0.10,
    "coachOverride": 0.00
  },
  "styleLabel": "oshi",
  "styleConfidence": {"oshi": 0.72, "yotsu": 0.18, "hybrid": 0.10},
  "mythTags": ["GlassGiant"],
  "reputationFlags": ["henka_prone"],
  "beyaLineage": {"beyaId": "...", "schoolTag": "OshiForge"}
}
```

### 2.3 Determinism Contract
All of the following are deterministic functions of seeds + history:
- archetype assignment at generation
- leverage class computation
- per-bout kimarite selection weights
- drift over time (archetype drift is thresholded, never random)
- sponsor/fan/media reactions (rule-based, no dice)

## 3. Pipeline Wiring: Viability → Weights → Kimarite

Kimarite selection is a 5-stage pipeline (must be implemented in this order):
1) **Viability Gates** (hard filters): stance, grip, edge state, leverage feasibility.
2) **Base Tier Weights** (common/uncommon/rare/legendary).
3) **Physics Multipliers**: impulse band × stance stability × leverage × edge pressure × grip state.
4) **Behavior Multipliers**: Tactical Archetype × PreferredWinCondition × situational intent.
5) **Mastery Multiplier**: move-level mastery curve (career) + recent form.

Rules:
- Tactical archetype **never** bypasses steps 1–3.
- Leverage class heavily influences steps 1–3.
- Mastery can *only* boost within the viable candidate set.

## 4. Kimarite Families (Canonical Grouping for Bias Tables)

The engine uses families for biasing and phrase binding (kimarite are chosen *within* family):
- `OSHI` (push/thrust/force-out)
- `YOTSU` (belt/control force-out)
- `THROW` (nage)
- `TRIP` (kakete/sweep)
- `PULLDOWN` (hatakikomi/hikiotoshi)
- `REVERSAL/EDGE` (utchari, etc.)
- `SPECIAL/RARE` (unorthodox, high difficulty)

## 5. Numeric Bias Tables

### 5.1 TacticalArchetype × KimariteFamily Base Bias (Multipliers)
These multipliers apply at pipeline step #4.

| Tactical Archetype | OSHI | YOTSU | THROW | TRIP | PULLDOWN | REVERSAL/EDGE | SPECIAL/RARE |
|---|---:|---:|---:|---:|---:|---:|---:|
| OshiSpecialist | 1.45 | 0.85 | 0.90 | 0.95 | 0.80 | 0.90 | 0.75 |
| YotsuSpecialist | 0.85 | 1.40 | 1.35 | 0.95 | 0.80 | 1.05 | 0.80 |
| Speedster | 0.95 | 0.90 | 0.95 | 1.45 | 1.00 | 1.10 | 0.90 |
| Trickster | 0.90 | 0.85 | 0.90 | 1.05 | 1.45 | 1.25 | 1.10 |
| AllRounder | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| HybridOshiYotsu | 1.20 | 1.20 | 1.10 | 0.95 | 0.85 | 1.05 | 0.90 |
| CounterSpecialist | 0.90 | 1.00 | 1.10 | 1.10 | 0.90 | 1.50 | 1.05 |

### 5.2 LeverageClass × KimariteFamily Physical Bias (Multipliers)
Applied at pipeline steps #1–#3 (viability + physics).

| Leverage Class | OSHI | YOTSU | THROW | TRIP | PULLDOWN | REVERSAL/EDGE | Notes |
|---|---:|---:|---:|---:|---:|---:|---|
| CompactAnchor | 1.20 | 1.10 | 0.95 | 0.85 | 0.95 | 0.90 | hard to move; strong base |
| LongLever | 0.95 | 1.20 | 1.20 | 0.95 | 0.90 | 1.10 | grip reach advantage |
| TopHeavy | 1.10 | 0.95 | 0.90 | 0.80 | 1.25 | 0.85 | vulnerable to pulls/trips |
| MobileLight | 0.90 | 0.90 | 0.95 | 1.25 | 1.05 | 1.10 | angles/escapes |
| Standard | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | baseline |

### 5.3 PreferredWinCondition Finisher Bias
Applied late in pipeline step #4 (after archetype).

| Preferred Win Condition | OSHI | YOTSU | THROW | TRIP | PULLDOWN | REVERSAL/EDGE |
|---|---:|---:|---:|---:|---:|---:|
| ForceOutFinish | 1.25 | 1.15 | 0.90 | 0.95 | 0.85 | 0.90 |
| ThrowFinish | 0.85 | 1.05 | 1.30 | 1.00 | 0.90 | 1.10 |
| TripFinish | 0.95 | 0.95 | 1.00 | 1.30 | 1.00 | 1.05 |
| PullFinish | 0.85 | 0.85 | 0.95 | 1.05 | 1.35 | 1.10 |
| CounterFinish | 0.90 | 1.00 | 1.10 | 1.10 | 0.95 | 1.35 |

## 6. Risk Tolerance Curves (Per Archetype)

RiskTolerance is a scalar **0.00–1.00** used to bias:
- willingness to commit to high-impulse tachiai
- willingness to attempt high-variance rare moves
- willingness to fight on the edge vs reset
- willingness to accept injury risk when fatigued

### 6.1 Base Curves
| Archetype | Base Risk | Notes |
|---|---:|---|
| OshiSpecialist | 0.60 | drives forward; accepts collision |
| YotsuSpecialist | 0.45 | prefers control; avoids chaos |
| Speedster | 0.55 | accepts timing risk, avoids mass collision |
| Trickster | 0.65 | volatility is a weapon |
| AllRounder | 0.50 | baseline |
| HybridOshiYotsu | 0.52 | adaptive; moderated |
| CounterSpecialist | 0.48 | patient; spikes risk only on openings |

### 6.2 Context Modifiers
RiskEffective = clamp01(BaseRisk + CoachOverride + PressureAmp − InjuryFear)
- **PressureAmp** increases with: rank expectations, sponsor pressure, rivalry stakes.
- **InjuryFear** increases after injuries and when public kyūjō history is negative.

### 6.3 Risk → Technique Bands
RiskEffective gates technique bands:
- 0.00–0.29: **Conservative** (safe families; fewer throws)
- 0.30–0.49: **Measured**
- 0.50–0.69: **Assertive**
- 0.70–1.00: **Volatile** (rare + high-impulse spikes)

This is how you get FM-like "a favorite just can’t find it" streaks: risk band changes the candidate set composition.

## 7. Risk × Injury Feedback Loops (Fear Changes Style)

### 7.1 InjuryFear Accumulation
- InjuryFear is increased by:
  - severe/chronic injuries (especially knee/ankle)
  - repeated kyūjō episodes
  - late-basho fatigue spikes
- InjuryFear decays slowly with injury-free basho and high medical staff quality.

### 7.2 Behavioral Consequences (Deterministic)
When InjuryFear crosses thresholds for ≥2 basho:
- OshiSpecialist shifts weight from OSHI → YOTSU/CONTROL (more safety)
- Speedster shifts from TRIP → EDGE/REVERSAL (less contact)
- Trickster shifts from PULLDOWN spam → COUNTER timing (to avoid stigma)

### 7.3 Public Injury Knowledge vs Hidden Proneness
- Injuries are public in Basho history (kyūjō + duration logged).
- **InjuryProneness** remains hidden, but its effects emerge as narrative "fragility" and AI targeting.

## 8. Archetype Drift Over a Career (Style Evolution)

Archetype is sticky: drift is **slow**, thresholded, and coach/experience mediated.

### 8.1 Drift Triggers
- sustained kimarite-family usage outside archetype norm
- repeated success under new policy
- body evolution making prior plan inefficient
- rivalry-specific adaptations
- sponsor/media pressure (rare, but possible)

### 8.2 Drift Model
Maintain an `ArchetypeEvidence` vector that updates at basho-end:
- +evidence for families used successfully
- −evidence for repeated failed attempts
- +evidence for coach doctrine alignment

A drift occurs only if:
- target archetype evidence exceeds current by ≥Δ for ≥N basho
- and the drift does not violate leverage feasibility (e.g., TopHeavy rarely becomes pure Speedster)

### 8.3 Allowed Drift Graph (Hard Rules)
- AllRounder ↔ any (easiest)
- Oshi ↔ HybridOshiYotsu ↔ Yotsu (common)
- Trickster → CounterSpecialist (common)
- Speedster → Trickster (common) when speed declines
- Speedster → Yotsu (rare) requires leverage/class change or technique growth

## 9. Coaching: Archetype Reshaping & Player Philosophies

### 9.1 Coach Doctrine
Each coach carries a `CoachDoctrine` that applies a slow bias each week:
- doctrine targets an archetype family
- doctrine strength depends on coach stat + authority + stable culture
- doctrine cannot instantly flip an archetype; it nudges drift evidence

### 9.2 Player-Created Coaching Philosophies
Players may author a philosophy as a named object:
- target archetypes
- acceptable risk band
- taboo families (e.g., avoid pulldowns)
- preferred win conditions
- stability vs experimentation

The game then:
- auto-applies individualized focus suggestions
- generates narrative headlines about "school" identity

### 9.3 Staff Diminishing Returns (Integration)
When multiple coaches of same type exist, apply diminishing returns (see technical addendum pack in other canon):
- Primary: 100%
- Secondary same type: 50%
- Max duplicates: 2

## 10. Sponsors & Supporters Pressure on Style

Sponsors/Supporters are separate economic actors but create **style pressure** hooks:
- Sponsor tier expects certain spectacle/values.
- Coach archetype × sponsor preference interactions produce long-run drift pressure.

### 10.1 Sponsor Preference Vectors
Each sponsor has a preference vector over:
- dominance (force-outs)
- artistry (throws)
- drama (reversals)
- tradition (belt work)
- scandal sensitivity

### 10.2 Interaction Rule
SponsorPressure = SponsorTierWeight × PreferenceMatch(archetype/style/myth)
- High sponsor pressure + poor match yields:
  - narrative tension
  - coaching philosophy changes
  - possible scandals ("style corruption")

### 10.3 Sponsor-driven Style Pressure Scandals
If a stable repeatedly shifts policy to satisfy sponsors *and* results worsen:
- governance/media systems can mark an ethics/scandal flag
- crowd sentiment can flip against the stable

## 11. Fans, Media Personalities, and Bias

### 11.1 Fan Factions
- Regional vs national support factions
- Factions have memory and inherit preferences across generations (see §11.4)

### 11.2 Media Personalities
Media commentators have:
- style biases (love throws, hate henka)
- faction alignments
- rivalry participation (media factions rivalries)

### 11.3 Crowd Intimidation Effects (Young Rikishi)
High-profile hostile crowds apply a deterministic mental pressure modifier:
- reduces Focus
- increases ErrorBand
- can increase InjuryRisk (hesitation, awkward landings)

### 11.4 Fan Memory Inheritance
FanFactionMemory persists across years:
- stable lineage expectations ("this stable produces technicians")
- myth reinforcement loops
- grudges over scandals

This is used by:
- PBP tone
- headline generator
- sponsor retention (brand adjacency)

## 12. Rivalries Driving Archetype Hardening

Rivalries are an identity amplifier:
- repeated matchup patterns create counter-preferences
- archetype hardening occurs when a wrestler overfits a rival (for better or worse)

Hardening rules:
- if RivalryIntensity ≥ threshold and winrate swings correlate with one family, amplify that family bias
- if hardening causes losses vs field, drift pressure rises (coach + AI meta)

## 13. Myth & Legacy: Reinforcement vs Decay

Myth tags (from historical memory systems) interact with archetype policy:
- Myth reinforcement: repeated iconic executions keep a tag alive
- Legacy decay: long absence of defining feats reduces tag prominence

### 13.1 AI Adaptation Rules Based on Myth Tags
Example deterministic rule:
- If opponent has tag `GlassGiant`, and it's late basho (fatigue high), shift to TRIP/PULLDOWN families within viability.
- If opponent has tag `IronMan`, reduce expectation of injury-based collapse; prioritize clean force-out.

## 14. Talent Pools & Pipelines Integration (World Supply)

This section wires the identity system to **Talent Pools & Pipelines** (recruits, staff, succession), ensuring the world produces coherent archetype distributions.

Key rule: *Pipelines create tendencies, not guarantees.*

### 14.1 Where Archetypes Come From
- Generated at recruitment intake from:
  - athlete background
  - body seed (drives leverage class)
  - beya lineage expectations
  - regional culture bias
  - coach doctrine at time of intake

### 14.2 Pools
- Youth recruit pool (per year)
- University/club pool
- Transfers/late bloomers
- Staff pool (ex-rikishi, specialists)

Each pool entry includes:
- latent archetype weights
- leverage potential
- injury proneness distribution
- personality seeds impacting risk

### 14.3 Pipeline Feedback
Successful stables shift future pools:
- “school effects” increase probability of matching archetypes in recruits
- scandals reduce high-tier recruit willingness
- sponsor tiers affect pipeline attractiveness

This creates generational eras without a global knob.

## 15. Narrative Binding (Hooks, Not Duplicated)
This identity system is intended to bind directly into:
- PBP phrase pools (identity keyed)
- headline phrase engine (myth tags + archetype + leverage)
- crowd/fan reactions and boos vs admiration

(See PBP system doc for the full binding spec; this doc defines the identity keys and required event payload fields.)

## 16. Canonical Discrepancies & Resolutions

- **"Bulldozer"** is a *narrative alias*, not an archetype enum. Use: `OshiSpecialist` + `TopHeavy` + attribute pattern.
- Optional archetypes are labeled **Future‑Enabled**; they must not be referenced by core content unless enabled.
- If older sources disagree on multipliers, the tables in §5 are authoritative, and older numbers remain in annex for traceability.

## 17. Engineering Checklist
- [ ] Implement enums and identity record (§2)
- [ ] Implement 5-stage kimarite selection pipeline (§3)
- [ ] Implement bias multipliers (§5)
- [ ] Implement risk band gating (§6)
- [ ] Implement injury fear feedback loops (§7)
- [ ] Implement drift evidence graph (§8)
- [ ] Implement coaching doctrine + player philosophy objects (§9)
- [ ] Implement sponsor preference vectors + pressure scandals (§10)
- [ ] Implement fan factions + media personality bias + intimidation (§11)
- [ ] Implement rivalry hardening (§12)
- [ ] Implement myth-tag-driven AI adaptation hooks (§13)
- [ ] Integrate pools/pipelines supply system (§14)


---
# VERBATIM SOURCE ANNEX (NON‑LOSSY)
> Everything below is copied verbatim from the source files that were harmonised into this v2.0 document.



## SOURCE — Basho_Tactical_Archetypes_Identity_and_Narrative_Canon_v1.0_Ultra_Granular.md

```md
# Basho — Tactical Archetypes, Leverage Classes, and Identity Interaction Canon v1.0
## Ultra-Granular Design & Implementation Specification

Status: IMPLEMENTATION-GRADE / DEFINITIVE  
Scope: Combat Engine, Kimarite Selection, Narrative Binding, AI Adaptation

---

## 1. Purpose and Design Philosophy

This document defines the **identity layer** of Basho combat: how a rikishi’s
*behavioral intent*, *physical reality*, and *career myth* interact deterministically
to produce believable behavior, earned upsets, and legendary narrative moments.

Core rule:

> **Behavior biases intent. Body biases outcomes. History creates myth.**

---

## 2. Tactical Archetypes (Behavioral Policy Layer)

Tactical Archetypes define *what a rikishi tries to do* under pressure.
They bias decision-making but never override physics, stance, leverage, or edge rules.

### Canonical Tactical Archetypes

1. **Oshi Specialist** – push/thrust pressure focus  
2. **Yotsu Specialist** – belt/grapple focus  
3. **Speedster** – agility, trips, evasion  
4. **Trickster** – reversals, slap-downs  
5. **All-Rounder** – balanced  
6. **HybridOshiYotsu**  – adaptive switch-hitter  
7. **CounterSpecialist**  – reactive, counter-focused  

---

## 3. Leverage Classes (Physical Interaction Layer)

Leverage Classes are computed from physique and determine physical interaction outcomes.

- Compact Anchor
- Long Lever
- Top-Heavy
- Mobile Light
- Standard

---

## 4. Kimarite Selection Pipeline (Authoritative)

1. Viability Gates  
2. Base Tier Weights  
3. Physics Multipliers  
4. Tactical Archetype Bias  
5. Technique Mastery  
6. Preferred Win Condition Bias  

---

## 5. Numeric Bias Tables  
### Tactical Archetype × Kimarite Family

| Archetype | Push | Belt/Throw | Trip | Pull | Counter |
|----------|------|------------|------|------|---------|
| Oshi Specialist | 1.45 | 0.85 | 0.70 | 0.60 | 0.80 |
| Yotsu Specialist | 0.70 | 1.50 | 0.75 | 0.65 | 0.85 |
| Speedster | 0.80 | 0.75 | 1.45 | 1.20 | 1.00 |
| Trickster | 0.75 | 0.70 | 1.10 | 1.50 | 1.35 |
| All-Rounder | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| HybridOshiYotsu | 1.20 | 1.20 | 0.85 | 0.75 | 0.90 |
| CounterSpecialist | 0.65 | 0.80 | 0.90 | 1.10 | 1.60 |

---

## 6. Preferred Win Condition

- ForceOutFinish
- ThrowFinish
- TripFinish
- PullFinish
- CounterFinish

Adds +10–25% weight to eligible finishers.

---

## 7. Narrative Phrase Pools (Identity-Keyed)

Phrase pools are keyed by:
- Tactical Archetype
- Leverage Class
- Preferred Win Condition
- Myth Tags

Pools are deterministic, intensity-gated, and non-repeating within a basho.

---

## 8. Myth Tags (Career Reputation Layer)

Examples:
- Iron Man
- Glass Giant
- Giant Killer
- Eternal Sekiwake
- Late Bloomer

Affect crowd, AI adaptation, and narrative tone.

---

## 9. AI Adaptation Rules (Myth-Driven)

Examples:
- **Glass Giant:** late basho AI targets legs (+20% trip bias)
- **Iron Man:** AI pressures fatigue
- **Giant Killer:** AI defensive posture increases

---

## 10. Final Rule

> **The engine knows truth.  
> The narrative speaks it.  
> The player remembers the legend.**

---
```



## SOURCE — Basho_Tactical_Archetypes_Risk_Drift_and_Narrative_Canon_v1.1_Ultra_Granular.md

```md
# Basho — Tactical Archetypes, Risk, Drift, and Narrative Interaction Canon v1.1
## Ultra-Granular Design & Implementation Specification

Status: IMPLEMENTATION-GRADE / DEFINITIVE  
Scope: Combat Engine, Kimarite Selection, Career Evolution, Narrative & Media Systems, AI Adaptation

---

## 1. Design Philosophy (Reaffirmed)

Basho combat identity is not static. A rikishi is defined by:
- **Intent** (Tactical Archetype)
- **Body** (Leverage Class)
- **Risk Appetite** (Risk Tolerance Curve)
- **Experience** (Technique Mastery)
- **History** (Myth Tags)
- **Perception** (Crowd & Media Bias)

> **Behavior biases intent. Body biases outcomes. Risk shapes decisions. History creates legend.**

---

## 2. Tactical Archetypes (Behavioral Policy)

Canonical archetypes (engine-truth):

1. Oshi Specialist  
2. Yotsu Specialist  
3. Speedster  
4. Trickster  
5. All-Rounder  
6. HybridOshiYotsu  
7. CounterSpecialist

Archetypes bias *attempted solutions*, never physical possibility.

---

## 3. Risk Tolerance Curves (Per-Archetype)

Each Tactical Archetype has a **risk tolerance curve** defining how aggressively it:
- commits weight forward
- attempts low-probability finishes
- accepts edge pressure
- resists disengagement

RiskTolerance ∈ [0.0 – 1.0], recalculated per bout phase.

### 3.1 Base Risk Curves

| Archetype | Early Bout | Mid Bout | Late Bout | Edge Proximity |
|----------|------------|----------|-----------|----------------|
| Oshi Specialist | 0.75 | 0.85 | 0.90 | 0.95 |
| Yotsu Specialist | 0.55 | 0.65 | 0.75 | 0.80 |
| Speedster | 0.45 | 0.55 | 0.70 | 0.60 |
| Trickster | 0.65 | 0.75 | 0.85 | 0.90 |
| All-Rounder | 0.50 | 0.60 | 0.65 | 0.70 |
| HybridOshiYotsu | adaptive | adaptive | adaptive | adaptive |
| CounterSpecialist | 0.30 | 0.40 | 0.55 | 0.65 |

Risk modifies:
- impulse overcommit chance
- counter vulnerability
- injury probability multipliers

---

## 4. Archetype Drift (Career Evolution)

Tactical Archetypes are **not locked for life**.

### 4.1 Drift Triggers
Drift is deterministic and slow. It may occur if:

- repeated failure using primary archetype
- long-term injury accumulation
- aging + loss of speed/power
- coaching intervention
- successful adoption of secondary techniques

### 4.2 Drift Paths (Examples)

| From | To | Condition |
|----|----|----------|
| Speedster | Trickster | Speed < 40, Age > 30 |
| Oshi Specialist | All-Rounder | Repeated edge collapses |
| Yotsu Specialist | CounterSpecialist | Injury history + high experience |
| All-Rounder | Yotsu Specialist | Sustained belt success |

Drift:
- takes 6–12 basho
- gradually blends bias tables
- is visible narratively (“changing style” headlines)

---

## 5. Per-Kimarite Numeric Bias Tables

Each kimarite has **explicit per-archetype modifiers** applied *after* family bias.

### 5.1 Example (Subset)

| Kimarite | Oshi | Yotsu | Speedster | Trickster | Counter |
|---------|------|-------|-----------|-----------|---------|
| Oshidashi | 1.40 | 0.70 | 0.60 | 0.65 | 0.75 |
| Yorikiri | 0.80 | 1.50 | 0.70 | 0.75 | 0.85 |
| Katasukashi | 0.60 | 0.65 | 1.40 | 1.20 | 1.10 |
| Hatakikomi | 0.75 | 0.60 | 1.10 | 1.50 | 1.30 |
| Uwatenage | 0.70 | 1.45 | 0.65 | 0.80 | 0.90 |

(All 82 kimarite follow this schema in the full table.)

---

## 6. Crowd & Media Bias System

Crowd and media perception feeds back into:
- narrative tone
- pressure situations
- AI expectation modeling

### 6.1 Crowd Bias Modifiers

CrowdBias ∈ [–1.0 to +1.0]

Influenced by:
- Myth Tags
- Archetype stigma (e.g. Trickster)
- Recent injuries
- Venue memory

Examples:
- Trickster overuse → negative bias (“skepticism”)
- Iron Man → positive bias (“admiration”)

Bias affects:
- narrative intensity escalation
- crowd shock magnitude on upsets

---

## 7. Media Framing & Headlines

Media tone is archetype-aware.

Examples:
- Oshi collapse → “Overcommitment punished”
- Speedster loss → “Ran out of angles”
- CounterSpecialist win → “Waited, then struck”

Media framing never alters combat outcomes but shapes:
- long-term reputation
- sponsor interest
- myth tag likelihood

---

## 8. AI Adaptation (Extended)

AI managers track:
- opponent archetype
- risk tolerance curve
- drift trajectory
- myth tags
- crowd bias

### 8.1 Example Rules

- Against high-risk Oshi late basho → increase pull/trip attempts
- Against drifting Speedster → force clinch
- Against CounterSpecialist → reduce overextension

AI reactions respect meta-drift delays.

---

## 9. Guarantees

- No randomness beyond seeded resolution
- Drift is slow, visible, and explainable
- Narrative never contradicts engine truth
- Identity evolves but remains legible

---

## 10. Final Canon Rule

> **The engine enforces reality.  
> Risk creates tension.  
> Time shapes style.  
> The crowd remembers everything.**

---
```



## SOURCE — Basho_Tactical_Archetypes_Risk_Injury_and_Coaching_Canon_v1.2_Ultra_Granular.md

```md
# Basho — Tactical Archetypes, Risk, Injury Feedback, Drift, and Coaching Canon v1.2
## Ultra-Granular Identity, Behavior, and Evolution Specification

Status: IMPLEMENTATION-GRADE / DEFINITIVE  
Scope: Combat Engine, Kimarite Selection, Injury Modeling, Career Evolution, Coaching, Narrative, AI

---

## 1. Reaffirmed Design Thesis

A rikishi’s fighting identity is *not static* and not purely physical.
It is shaped by:

- Behavioral intent (Tactical Archetype)
- Physical reality (Leverage Class)
- Risk appetite (Risk Tolerance Curves)
- Bodily consequence (Injury History)
- Institutional pressure (Coaching & Beya philosophy)
- Public perception (Crowd & Media Bias)

> **Behavior biases intent.  
> Body biases outcomes.  
> Injury induces fear.  
> Coaching reshapes habit.  
> History creates legend.**

---

## 2. Risk × Injury Feedback Loops (Fear as a System)

### 2.1 Concept

In Basho, injuries are **not isolated events**.
They leave *psychological and tactical residue* that feeds back into decision-making.

This is modeled explicitly as a **Risk Suppression Feedback Loop**.

---

### 2.2 Injury Fear Index (IFI)

Each rikishi tracks an `InjuryFearIndex` ∈ [0.0 – 1.0]

IFI increases deterministically when:
- sustaining a moderate or major injury
- re-injuring the same body region
- competing while injured
- public “fragile” stigma is applied (e.g. Glass Giant)

IFI decays slowly when:
- completing basho without injury
- medical recovery exceeds expectations
- coaching intervention succeeds

---

### 2.3 IFI Effects on Risk Curves

EffectiveRisk = BaseRisk × (1 – IFI × SuppressionFactor)

SuppressionFactor depends on archetype:

| Archetype | SuppressionFactor |
|----------|-------------------|
| Oshi Specialist | 0.60 |
| Yotsu Specialist | 0.45 |
| Speedster | 0.75 |
| Trickster | 0.30 |
| All-Rounder | 0.40 |
| HybridOshiYotsu | adaptive |
| CounterSpecialist | 0.20 |

Result:
- previously aggressive rikishi become hesitant
- collapse probability drops
- counter susceptibility may rise

This produces:
- visible style softening
- “gun-shy” narratives
- late-career transformations

---

### 2.4 Injury-Specific Fear Channels

Fear is body-part specific and feeds into kimarite gating:

| Injury Region | Suppressed Families |
|--------------|---------------------|
| Knee/Ankle | Trips, explosive drives |
| Shoulder | Throws, lifts |
| Neck/Spine | High-impulse collisions |
| Elbow/Wrist | Grip-heavy techniques |

Suppression is gradual, not binary.

---

## 3. Coach-Driven Archetype Reshaping

### 3.1 Coaches as Behavioral Modifiers

Coaches are not stat sticks.
They exert **long-term pressure** on:

- Tactical Archetype drift
- Risk appetite moderation
- Preferred Win Condition emphasis

Each coach has:
- Philosophy (Aggressive / Conservative / Technical / Adaptive)
- Authority (soft vs hard enforcement)
- Patience (time-to-effect)

---

### 3.2 Coaching Influence Channels

Coaching effects apply via **training seasons**, not mid-bout.

Channels:
1. Bias table nudging
2. Risk curve reshaping
3. Mastery focus reallocation
4. Injury avoidance emphasis

---

### 3.3 Archetype Reshaping Paths

Examples:

| Coach Philosophy | Effect |
|----------------|--------|
| Conservative | Oshi → All-Rounder |
| Technical | Oshi → Yotsu |
| Adaptive | All-Rounder → Hybrid |
| Defensive | Speedster → CounterSpecialist |

Reshaping:
- takes 6–12 basho
- visible in narrative
- reversible if coach leaves

---

### 3.4 Coach vs Rikishi Resistance

Each rikishi has `StyleInertia` ∈ [0–100]

- High inertia resists reshaping
- Injuries lower inertia
- Aging lowers inertia
- Success raises inertia

EffectiveCoachImpact = CoachAuthority × (1 – StyleInertia)

---

## 4. Combined Drift Model (Injury + Coaching + Time)

Archetype drift is now driven by three forces:

1. Performance outcomes
2. Injury fear accumulation
3. Coaching pressure

Drift resolves as:
- blended bias tables
- narrative “transition periods”
- mixed style descriptors

No sudden flips.

---

## 5. Narrative & Media Integration

### 5.1 Fear Narratives

IFI thresholds trigger narrative beats:
- “hesitant to commit weight”
- “protecting the knee”
- “no longer throwing with abandon”

### 5.2 Coaching Narratives

- “under new guidance…”
- “a more measured approach”
- “stable philosophy taking hold”

These are deterministic, not scripted.

---

## 6. AI Adaptation (Extended)

AI managers read:
- IFI level
- injury region
- coach philosophy

Example:
- High knee IFI → AI increases lateral pressure
- Conservative coach → AI expects fewer risky finishes

---

## 7. Canonical Guarantees

- Injury never directly changes archetype; it *pressures* it
- Coaching never overrides physics
- Fear is gradual, reversible, and legible
- Narrative always reflects engine truth

---

## 8. Final Canon Rule

> **Pain teaches caution.  
> Time teaches patience.  
> Coaching teaches discipline.  
> Legends are those who adapt.**

---
```



## SOURCE — Basho_Tactical_Archetypes_Risk_Injury_Coaching_and_Legacy_Canon_v1.3_Ultra_Granular.md

```md
# Basho — Tactical Archetypes, Risk, Injury, Coaching, and Legacy Canon v1.3
## Ultra-Granular Identity, Evolution, and Institutional Continuity Specification

Status: IMPLEMENTATION-GRADE / DEFINITIVE  
Scope: Combat Engine, Kimarite Selection, Injury & Fear Modeling, Coaching Systems, Retirement Logic, Legacy Inheritance, Narrative & AI

---

## 1. Grand Design Thesis (Finalized)

A rikishi’s identity in Basho is a **living system** shaped by:

- Tactical intent (Tactical Archetype)
- Physical truth (Leverage Class)
- Risk appetite (Risk Curves)
- Bodily consequence (Injury & Fear)
- Institutional pressure (Coaches & Beya philosophy)
- Time (Aging, decay, experience)
- Memory (Reputation, myth, legacy)

> **Behavior biases intent.  
> Body biases outcomes.  
> Pain reshapes courage.  
> Coaching reshapes habit.  
> Time reshapes all.  
> Legacy outlives the body.**

---

## 2. Coach Archetypes & Philosophies

Coaches themselves have archetypes that influence how they reshape rikishi.

### 2.1 Coach Archetype Enum

1. **Traditional Enforcer**
   - Emphasizes grit, pain tolerance, rank obedience
   - Suppresses fear effects
   - High injury risk, high short-term results

2. **Technical Purist**
   - Focuses on clean kimarite execution
   - Accelerates mastery curves
   - Encourages Yotsu / CounterSpecialist drift

3. **Pragmatic Survivor**
   - Minimizes injury and demotion risk
   - Encourages conservative styles
   - Extends careers, lowers peak

4. **Adaptive Modernist**
   - Reads meta and era parity
   - Encourages Hybrid styles
   - Fastest archetype reshaping

5. **Legacy Master**
   - Imprints personal style on pupils
   - Drives legacy inheritance (see §6)
   - Strong narrative identity

Each coach also has:
- Authority (0–100)
- Patience (slow vs fast reshaping)
- Compassion (fear tolerance)
- Reputation (media bias)

---

## 3. Risk × Injury × Coaching Interaction Loop

### 3.1 Fear Modulation by Coaching

Effective IFI = Base IFI × (1 – CoachFearBuffer)

CoachFearBuffer examples:
- Traditional Enforcer: –0.20 (amplifies fear suppression)
- Pragmatic Survivor: +0.15 (fear acknowledged)
- Legacy Master: contextual (depends on shared style)

---

## 4. Fear → Retirement Decision Modeling

### 4.1 Retirement Pressure Index (RPI)

Each rikishi tracks RPI ∈ [0–100], recalculated per basho.

RPI increases with:
- High IFI sustained over time
- Recurrent injuries to same region
- Demotion threats
- Loss of preferred win condition viability
- Coaching mismatch

RPI decreases with:
- Successful basho outcomes
- Supportive coaching
- Medical recovery success
- Achievement of career milestones

---

### 4.2 Retirement Thresholds

| RPI | Outcome |
|----|---------|
| <40 | Compete normally |
| 40–60 | Public hesitation narratives |
| 60–80 | Withdrawal likelihood rises |
| 80+ | Retirement check triggered |

Retirement checks are deterministic:
- no randomness
- logged with reasons
- historically visible

---

## 5. Career Arc Outcomes

Possible deterministic endpoints:
- Sudden collapse (injury-triggered)
- Gradual decline (fear + age)
- Graceful exit (achievement satisfied)
- Forced exit (demotion spiral)

Each path generates different myth tags.

---

## 6. Style Legacy Inheritance

### 6.1 Legacy Transmission Concept

When a rikishi retires and becomes:
- Oyakata
- Senior Coach
their **style imprint** may pass to recruits.

### 6.2 Inheritance Channels

New rikishi entering a beya may inherit:
- partial tactical bias
- preferred win condition tendencies
- narrative style descriptors

Inheritance strength depends on:
- Coach Archetype
- Authority
- Shared Leverage compatibility
- Time spent training under the coach

This creates:
- recognizable “schools”
- dynastic styles
- generational identity

---

## 7. AI & Meta Effects

AI managers track:
- coach archetypes
- legacy schools
- retirement risk

They adapt recruitment, match strategy, and sponsorship focus accordingly.

---

## 8. Narrative & Historical Integration

All systems feed:
- PBP language
- Almanac entries
- Hall of Fame plaques
- Era labels (“The Age of the Iron Wall”)

Legacy Masters may be remembered more for pupils than titles.

---

## 9. Canonical Guarantees

- No sudden personality flips
- No hidden dice in retirement
- Coaching influence is visible and logged
- Legacy is explainable and inspectable

---

## 10. Final Canon Rule

> **Basho is not about matches.  
> It is about how bodies, fear, and teaching shape time.  
> Champions fall.  
> Styles remain.**

---
```



## SOURCE — Basho_Tactical_Archetypes_Risk_Injury_Coaching_Legacy_Rivalries_Canon_v1.4_Ultra_Granular.md

```md
BASHO — TACTICAL ARCHETYPES, RISK, COACHING, LEGACY & META INTERACTION CANON
v1.4 ULTRA-GRANULAR DEFINITIVE

This document extends v1.3 and formally integrates:
• Coach archetype × sponsor preference interactions
• Legacy decay vs myth reinforcement
• Player-visible Style School Trees (UI & progression)
• Rivalry-driven archetype hardening

This canon is authoritative for behavioral identity evolution across combat, economy, governance, AI, and narrative systems.

======================================================================
SECTION I — COACH ARCHETYPES × SPONSOR PREFERENCE INTERACTIONS
======================================================================

1. Coach Archetypes (Behavioral Governance Layer)

Each coach (oyakata or senior trainer) has a CoachArchetype that shapes:
• Training emphasis
• Tactical drift pressure
• Sponsor alignment
• Media posture

Canonical Coach Archetypes:
• Traditionalist — conservative, legacy-focused, sponsor-stable
• Innovator — embraces rare kimarite, volatile sponsors
• Taskmaster — results-first, tolerates injury risk
• Caretaker — longevity-first, health-aligned sponsors
• Showman — spectacle-driven, sponsor-attractive

2. Sponsor Preference Mapping

Sponsors have implicit preferences:
• Conservative Corporate → Traditionalist, Caretaker
• Aggressive Corporate → Taskmaster, Innovator
• Bandwagon / Media → Showman
• Local / Kōenkai → Traditionalist

Interaction Rule:
SponsorAffinityScore =
(CoachAlignment × 0.4) +
(StablePrestige × 0.3) +
(StarPower × 0.2) −
(ScandalRisk × 0.1)

Misalignment causes:
• Reduced Kenshō allocations
• Increased churn probability
• Narrative pressure on coach

======================================================================
SECTION II — LEGACY DECAY VS MYTH REINFORCEMENT
======================================================================

1. Legacy Strength Index (LSI)

Every rikishi, coach, and beya maintains an LSI:
• Starts at 0
• Increases via titles, streaks, myth tags
• Decays slowly over inactive or poor-performance periods

2. Decay Formula (Per Basho):
LSI = LSI − (BaseDecay × EraParityModifier)

3. Myth Reinforcement Triggers:
• Repeat achievements reinforce myths
• Coaching lineage propagates myth persistence
• Media narrative boosts slow decay

Example:
“Giant Killer” myth reinforced if Kinboshi recur within 6 basho

======================================================================
SECTION III — STYLE SCHOOL TREES (PLAYER-VISIBLE UI SYSTEM)
======================================================================

1. Style Schools

Each beya exposes a Style School Tree derived from:
• Head coach archetype
• Historical success
• Alumni archetypes

Branches include:
• Oshi Lineage
• Yotsu Lineage
• Counter Lineage
• Hybrid Lineage

2. Tree Mechanics

Nodes unlock:
• Reduced mastery cost for certain kimarite
• Faster archetype drift
• Narrative identity tags

Locked branches require:
• Sponsor support
• Coach authority
• Historical precedent

UI Features:
• Hoverable nodes with alumni examples
• Forecasted drift outcomes
• Risk warnings

======================================================================
SECTION IV — RIVALRY-DRIVEN ARCHETYPE HARDENING
======================================================================

1. Rivalry Intensity Index (RII)

Tracked between:
• Rikishi vs Rikishi
• Beya vs Beya
• Coach vs Coach

RII increases via:
• Frequent matchups
• Close outcomes
• Media framing

2. Hardening Effect

High RII causes:
• Archetype bias amplification
• Reduced adaptability
• Higher injury risk (overcommitment)

Formula:
EffectiveBias = BaseBias × (1 + RII × 0.15)

3. Narrative & AI Effects

• Commentators note “refusal to change”
• AI exploits predictability
• Historic rivalries resist drift longer

======================================================================
SECTION V — SYSTEMIC INTEGRATION SUMMARY
======================================================================

This canon feeds into:
• Combat & Kimarite Engine (biases, risk curves)
• Economy & Sponsors (alignment, churn)
• NPC AI (targeting, adaptation delays)
• Narrative & PBP (identity language)
• Historical Memory & Almanac (legacy arcs)

Nothing here overrides physics.
Everything here shapes intent, evolution, and meaning.

======================================================================
END OF CANON
```



## SOURCE — Basho_Tactical_Archetypes_Myth_Sponsor_and_Coaching_Canon_v1.5_Ultra_Granular.md

```md
BASHO — TACTICAL ARCHETYPES, RISK, COACHING, LEGACY, RIVALRIES & MYTH DYNAMICS CANON
v1.5 ULTRA-GRANULAR DEFINITIVE

This document extends v1.4 and integrates:
• Sponsor-driven style pressure scandals
• Player-created coaching philosophies
• Myth collapse events (crowd turns on a legend)

This canon governs identity pressure, institutional conflict, and narrative volatility.

======================================================================
SECTION VI — SPONSOR-DRIVEN STYLE PRESSURE & SCANDALS
======================================================================

1. Sponsor Style Pressure Index (SSPI)

Each major sponsor applies implicit style pressure based on brand identity.

Sponsor Style Preferences:
• Conservative Corporate: Low-risk, orthodox sumo
• Aggressive Corporate: High-dominance, forceful styles
• Media / Entertainment: Volatility, rare kimarite
• Local Kōenkai: Loyalty, perseverance narratives

SSPI is calculated per basho:
SSPI = SponsorTier × PreferenceStrength × MediaVisibility

2. Pressure Outcomes

If SSPI exceeds Rikishi Resistance Threshold:
• Forced archetype drift acceleration
• Increased injury risk (misaligned style)
• Narrative flags: “fighting for the sponsors”

3. Scandal Trigger Conditions

A Sponsor Style Scandal triggers if:
• SSPI > 70
• Performance declines for 2+ basho
• Injury occurs during pressured adaptation

Effects:
• Sponsor withdrawal risk
• Governance review
• Permanent narrative stain

======================================================================
SECTION VII — PLAYER-CREATED COACHING PHILOSOPHIES
======================================================================

1. Philosophy Creation System

Players may define a Coaching Philosophy:
• Core Values (Longevity, Aggression, Innovation, Tradition)
• Risk Posture (Low → Extreme)
• Style Emphasis (Push, Belt, Counter, Hybrid)

Each philosophy generates:
• Drift bias vectors
• Injury tolerance modifiers
• Sponsor alignment changes

2. Adoption & Resistance

Rikishi adopt philosophies based on:
• Style Inertia
• Trust in coach
• Career phase

Resistance creates:
• Slower growth
• Morale penalties
• Media tension

======================================================================
SECTION VIII — MYTH COLLAPSE EVENTS
======================================================================

1. Myth Stability Score (MSS)

Every Myth Tag maintains an MSS:
• Reinforced by success
• Degraded by failure, injury, scandal

2. Collapse Thresholds

If MSS < CollapsePoint:
• Myth flips into Negative Narrative
• Crowd reaction turns hostile
• AI opponents gain psychological edge

Examples:
• “Iron Man” → “Broken Idol”
• “Giant Killer” → “Past His Time”

3. Recovery Paths

Recovery possible via:
• Redemption basho
• Coach-led reinvention
• New myth formation

======================================================================
SECTION IX — FULL SYSTEM INTEGRATION
======================================================================

All systems interact with:
• Combat & Kimarite Engine
• Economy & Sponsor Canon
• Governance & Sanctions
• NPC AI Adaptation
• PBP & Media Narrative
• Historical Almanac

Identity pressure is now:
• Multi-directional
• Deterministic
• Player-readable
• Narratively explosive

======================================================================
END OF CANON
```



## SOURCE — Basho_Tactical_Archetypes_Myth_Sponsor_Coaching_Fans_and_Media_Canon_v1.6_Ultra_Granular.md

```md
BASHO — TACTICAL ARCHETYPES, RISK, COACHING, LEGACY, RIVALRIES, MYTH,
FAN FACTIONS & MEDIA PERSONALITIES CANON
v1.6 ULTRA-GRANULAR DEFINITIVE

This document extends v1.5 and fully integrates:
• Fan faction systems (regional, national, traditionalist, spectacle-driven)
• Media personalities with persistent bias profiles

This canon governs perception pressure, crowd dynamics, narrative amplification,
and long-horizon reputation volatility.

======================================================================
SECTION X — FAN FACTION SYSTEMS
======================================================================

1. Fan Faction Definition

Fan Factions represent semi-coherent audience blocs that react differently
to styles, outcomes, scandals, and personalities.

Canonical Fan Factions:
• Regional Loyalists — support rikishi/beya tied to birthplace or home prefecture
• National Icons — favor dominant yokozuna and title holders
• Traditionalists — prefer orthodox yotsu-zumo, discipline, humility
• Spectacle Seekers — favor oshi, trickery, rare kimarite, drama
• Underdog Sympathizers — rally behind low-ranked or injured rikishi

Each faction tracks:
• Approval Score (−100 to +100) per rikishi, coach, and beya
• Memory half-life (how long grudges/praise last)
• Sensitivity vectors (injury, scandal, dominance, humility)

2. Faction Influence Mechanics

Faction Approval influences:
• Crowd reaction intensity
• Media narrative framing
• Sponsor confidence
• Myth Stability Score modifiers

CrowdResponse =
Σ(FactionApproval × FactionPresence × EventSalience)

3. Faction Drift & Polarization

Events can polarize factions:
• Pull-down heavy wins anger Traditionalists
• Injury perseverance boosts Underdog faction
• Sponsor scandals alienate Regional Loyalists

Polarization increases:
• Narrative volatility
• Rivalry hardening
• Myth collapse probability

======================================================================
SECTION XI — MEDIA PERSONALITIES WITH BIAS
======================================================================

1. Media Personality Profiles

Media is not neutral. Each personality has:
• Bias Archetype
• Preferred narratives
• Target sensitivities

Canonical Media Bias Archetypes:
• Old Guard Commentator — pro-tradition, anti-trickery
• Sensationalist Analyst — drama-first, volatility amplifying
• Technical Purist — favors clean technique, mastery
• Regional Booster — biased toward local rikishi
• Cynical Veteran — quick to declare decline or fraud

2. Bias Scoring

Each media personality applies a BiasModifier:
BiasModifier =
AlignmentWithStyle × 0.4 +
AlignmentWithMyth × 0.3 −
ScandalAversion × 0.3

This modifier affects:
• Headline tone
• Myth Stability adjustments
• Player-facing narrative color

3. Media Momentum Effects

Repeated biased coverage can:
• Accelerate myth reinforcement
• Trigger early myth collapse
• Influence sponsor churn
• Affect AI perception models

======================================================================
SECTION XII — SYSTEMIC FEEDBACK LOOPS
======================================================================

Fan factions + media personalities feed back into:
• Sponsor pressure indices
• Coach philosophy stress
• Rikishi risk tolerance
• Archetype drift acceleration

Example Loop:
Spectacle Faction Cheers → Media Hype → Sponsor Pressure → Risky Style Shift → Injury → Myth Collapse

======================================================================
SECTION XIII — PLAYER AGENCY & UI SURFACES
======================================================================

Players can:
• View faction approval heatmaps
• Track media personality stances
• Choose to appease or defy blocs
• Leverage polarization for fame at cost of stability

======================================================================
SECTION XIV — CANONICAL GUARANTEES
======================================================================

• No system introduces randomness without cause
• All narrative volatility is traceable
• Crowd turns are earned, not scripted
• Legends rise and fall visibly

======================================================================
END OF CANON
```



## SOURCE — Basho_Talent_Pools_and_Pipelines_Canon_v1.1_Ultra_Granular.md

```md
# Basho — Talent Pools & Institutional Pipelines Canon v1.0
## Ultra-Granular, Implementation-Grade Specification (Foundations Layer)

**Status:** DEFINITIVE (Foundations-owned)  
**Scope:** Procedural generation and lifecycle of *available people* and *institutional candidates* in the world:
- New **rikishi intake pools** (domestic + foreign)
- **Staff / coach labor markets**
- **Oyakata / kabu successor pools**
- **Officials & support roles** (medical, admin, scouts)
- **Pipelines** between these pools (e.g., retired rikishi → coach → oyakata candidate)
- **Visibility / scouting / fog-of-war** constraints on pools
- Deterministic refresh cadence, competition, and depletion rules

**Out of scope:** bout resolution, banzuke math, economy amounts (those consume pool outputs).  
**Design mandate:** deterministic, replay-safe, non-random-feeling, and larger/denser than any implied references.

---

## 0. Why Pools Exist (Design Laws)

### 0.1 Scarcity is gameplay
Pools are the **supply-side physics** of Basho. They create:
- genuine competition (AI and player fighting over the same candidates)
- narrative plausibility (eras of talent drought/booms)
- difficulty that emerges from world state (not sliders)
- governance pressure (kabu scarcity, succession crises)
- economic pressure (wage inflation, sponsor confidence tied to “star supply”)

### 0.2 Pools are not “spawns”
A pool is **a finite, persistent set of candidates** with:
- identity
- history
- competing suitors
- eligibility gates
- visibility constraints

### 0.3 Determinism
All pool outcomes are deterministic functions of:
- `WorldSeed`
- `EraSeed` (derived from WorldSeed + decade index)
- `CalendarIndex` (year/week/month)
- `InstitutionState` snapshots (prestige, scandals, sanctions, finances)
- `PoolState` (who is already in/out, who was hired, who is locked)

No runtime RNG.

---

## 1. Canonical Pool Types (World Truth)

### 1.1 Primary Pools (People)
1) **Rikishi Intake Pool (Domestic)**  
2) **Rikishi Intake Pool (Foreign)**  
3) **Staff Labor Pool** (coaches, conditioning, admin, scouts, etc.)  
4) **Medical Labor Pool** (doctors, physios, therapists)  
5) **Oyakata Candidate Pool** (kabu-eligible succession candidates)

### 1.2 Secondary Pools (Institutional roles)
6) **Officials Pool** (gyoji candidates, yobidashi candidates, tokoyama candidates) — optional if modeled  
7) **Media / PR Pool** (journalists, commentators) — optional, narrative only

> Note: Sponsors are “actors” but are specified in the sponsor canon. This document only provides *people pools* and pipelines.

---

## 2. Shared Data Model (All Pools)

### 2.1 Pool Identity
Each pool is uniquely identified:
- `poolId = hash(WorldSeed, PoolType, Region?, EraIndex?)`

### 2.2 Pool State Object
```ts
TalentPoolState {
  poolId
  poolType
  refreshCadence: "weekly" | "monthly" | "basho" | "yearly"
  populationCap: number               // maximum listed candidates at once
  hiddenReserveCap: number            // unseen candidates (fog-of-war buffer)
  candidatesVisible: CandidateId[]
  candidatesHidden: CandidateId[]
  lastRefreshTick: number
  scarcityBand: "plentiful" | "normal" | "tight" | "scarce" | "crisis"
  qualityBand: "low" | "normal" | "high" | "golden_age"
  churnRules: ChurnRuleSet
  eligibilityRules: EligibilityRuleSet
}
```

### 2.3 Candidate Object (Normalized)
All candidates share a base schema; role-specific extensions apply.

```ts
CandidateBase {
  candidateId
  personId                     // permanent identity id if promoted into world
  name
  birthYear
  originRegion
  nationality
  citizenshipFlags             // supports dual citizenship
  visibilityBand               // what the player can know without scouting
  reputationSeed               // latent reputation potential
  scandalFlags?                // if any (rare at entry)
  tags[]                       // narrative tags (e.g., "disciplined", "volatile")
  availabilityState: "available" | "in_talks" | "signed" | "locked" | "withdrawn"
  competingSuitors: SuitorRef[]
}
```

### 2.4 SuitorRef
```ts
SuitorRef {
  beyaId
  interestBand: "low"|"medium"|"high"|"all_in"
  offerType: "standard"|"aggressive"|"prestige_pitch"|"covert"
  deadlineTick
}
```

---

## 3. Visibility, Scouting, and Fog-of-War (Pool Layer)

### 3.1 Visibility bands
Candidates have a **VisibilityBand** that controls what is revealed:

| Band | Player can see by default |
|---|---|
| Public | Name, age, origin, headline traits |
| Rumored | Name + vague descriptor (“strong amateur record”) |
| Obscure | Only existence (“unknown prospect in region”) |
| Hidden | Not listed until discovered |

### 3.2 Scouting reveals, not creates
Scouting:
- moves candidates from `Hidden` → `Obscure` → `Rumored` → `Public`
- increases precision of competence bands
- reveals hidden tags (injury risk, temperament, corruption risk)

### 3.3 AI symmetry rule
NPC stables operate under **the same pool**.
They may have different scouting reach, but **cannot access non-existent candidates**.

---

## 4. Rikishi Intake Pools (Domestic + Foreign)

### 4.1 Intake cadence
Rikishi intake refreshes **yearly** with **monthly trickle**:

- **Yearly intake generation**: creates the new cohort (ages 15–19 typical, tunable)
- **Monthly trickle**: reveals subsets of the cohort based on scouting visibility

This prevents “January hiring rush only” behavior.

### 4.2 Domestic intake generation (deterministic)
Generated from:
- `EraQualityBand`
- `RegionTalentBand`
- `InstitutionPrestigeBand` (sumo popularity)
- recent scandal pressure (reduces intake)

Outputs:
- cohort size
- distribution of body potentials (height/weight potentials)
- distribution of talent seeds
- distribution of temperament tags

### 4.3 Foreign intake generation
Foreign intake is generated as a **separate pool** with gates:

- pool size is limited per year (world plausibility + foreigner rule pressure)
- candidates have nationality and citizenship metadata
- **Dual citizenship** is allowed:
  - `citizenshipFlags = {primary, secondary?}`
  - eligibility for “foreigner slot” depends on governance rule:
    - default: **foreign slot applies unless Japanese citizenship exists**
    - optional: apply stricter interpretation if desired

### 4.4 Foreigner limits integration (hard rule)
When evaluating a candidate signing:
- if candidate counts as “foreign” under the rule,
- and beya already has max foreign quota,
- candidate cannot be signed (UI must explain).

The pool system does **not** override governance.

### 4.5 Recruitment competition model
When a candidate is visible:
- eligible stables compute interest bands deterministically:
  - need (roster gaps)
  - prestige pitch
  - finances
  - scandal risk tolerance
  - rivalry pressures

Candidate has a preference model (deterministic):
- stability preference (prestige)
- development preference (coach reputation)
- location preference (region ties)
- risk preference (aggressive offers vs safety)

Signing resolves as:
- **offer window** (weeks)
- **resolution tick** where candidate chooses highest utility offer
- candidates can remain unsigned and drift into obscurity (withdrawn state)

### 4.6 “Amateur star” injection
To create headline prospects, the pool can create rare “amateur star” candidates:
- very high talent seed
- high public visibility
- many suitors
- strong preference rules (prestige + coach quality)

This is deterministic, rare, and era-weighted.

---

## 5. Staff / Coach Labor Pools

### 5.1 Staff categories
Staff pool includes:
- technique coaches
- conditioning coaches
- nutritionists
- scouts
- administrators
- mental coaches (rare)

Medical pool is separate (see §6).

### 5.2 Supply generation
Supply is generated from:
- retired staff exits
- retired rikishi pipeline (see §7)
- “external professional” pipeline (rare, expensive, high variance)
- scandal expulsions (reduce supply)

Cadence: **monthly refresh**, with some yearly graduation events.

### 5.3 Staff candidate attributes
Staff candidates have:
- competence bands (primary/secondary)
- career phase (apprentice/established/senior)
- reputation band
- loyalty bias (e.g., prefers certain stable styles)
- scandal exposure risk

### 5.4 Hiring competition
Hiring uses the same suitor mechanism:
- stables bid with salary bands + role + narrative pitch
- candidate preference includes:
  - salary
  - prestige
  - stability (welfare, compliance)
  - autonomy (will they be blamed)
  - rivalry considerations (avoid hated stable)

### 5.5 Replacement pressure
When a stable loses staff (retirement/scandal/poaching):
- it must fill role or accept operational penalties
- AI will preemptively hire if risk signals rise

---

## 6. Medical Labor Pool (Welfare Critical)

### 6.1 Why separate
Medical staff affects:
- injury escalation curves
- welfare risk accumulation
- scandal triggers (negligence)
- governance sanctions

Thus medical supply must be explicitly scarce.

### 6.2 Cadence and scarcity
Cadence: **monthly**
Scarcity bands are influenced by:
- era (medical modernity)
- scandal climate (doctors avoid risky stables)
- economy (can you pay)

### 6.3 Medical credential gating
Medical candidates have credential tiers:
- basic
- certified
- elite

A stable under investigation may be restricted to certified+.

### 6.4 Liability memory
Medical candidates track:
- “prior scandal association”
- “complaint history”
They may refuse offers from stables with a bad welfare record.

---

## 7. Oyakata & Kabu Successor Pools

### 7.1 Kabu scarcity is structural
The kabu successor pool is not “generated freely.”
It is constrained by:
- kabu availability
- candidate eligibility (years served, reputation)
- council tolerance

### 7.2 Candidate sources (pipelines)
Candidates enter the pool from:
- retiring rikishi with sufficient reputation
- assistant oyakata promotions
- institutional administrators (rare)
- council appointments (very rare)

### 7.3 Eligibility gates (deterministic)
A candidate is eligible if:
- meets age + service requirements (configurable)
- reputation above threshold
- scandal exposure below threshold
- council relations not hostile

### 7.4 Succession competition
When a kabu becomes available:
- eligible candidates appear in the pool (visible to relevant actors)
- stables/council factions may back candidates
- outcomes are deterministic and recorded in governance history

---

## 8. Pipelines (The Heart of the System)

Pipelines are **state machines** that move people between pools.

### 8.1 Pipeline: Rikishi → Retired
Trigger conditions:
- retirement decision
- forced retirement (injury/governance)
Outputs:
- retired personId persists
- enters “post-career roles consideration”

### 8.2 Pipeline: Retired Rikishi → Coach Candidate
Eligibility:
- technical style fit
- reputation
- temperament tags
- willingness preference

This produces a new candidate in Staff Pool with:
- “ex-rikishi” tag
- technique competence bias tied to former style/archetype

### 8.3 Pipeline: Coach → Assistant Oyakata
Eligibility:
- tenure at beya
- loyalty band
- council reputation
- kabu plan exists

### 8.4 Pipeline: Assistant Oyakata → Oyakata Candidate Pool
A candidate enters the kabu pool when:
- kabu opportunity exists OR candidate seeks one
- candidate meets eligibility gates

### 8.5 Pipeline: Scandal → Expulsion / Cooling-off
Staff or coaches can be:
- suspended (cooling off pool, time-locked)
- expelled (permanent removal from eligible pools)
- rehabilitated (rare, requires clean years + narrative repair)

All outcomes are deterministic and logged.

---

## 9. Era Drift & Macro Supply (Boons and Droughts)

### 9.1 EraQualityBand
Every decade (or configurable window), the world computes:
- `EraQualityBand` for rikishi
- `EraStaffBand` for coaches/medical
- `EraPopularityBand` for sumo as institution

Derived deterministically from:
- historical prestige
- scandal climate
- sponsor health
- “legendary generation” memory

### 9.2 Effects
- Golden age: more high-end prospects, more sponsors, more staff supply
- Drought: fewer prospects, higher wage pressure, more risky hires
- Scandal era: reduced intake, reduced medical supply, harder governance

---

## 10. Pool Depletion, Locking, and Churn

### 10.1 Depletion
Once signed:
- candidate moves to `signed`
- removed from other stables’ visible lists
- identity promoted to a world person

### 10.2 Locking
Some candidates are “locked” due to:
- age (not ready)
- eligibility not met
- ongoing investigations
- visa/citizenship restrictions

### 10.3 Churn
Unsold candidates may:
- withdraw (join other life path)
- become obscure
- reappear later via “late starter” rule (rare)

Churn is deterministic and explained by narrative tags.

---

## 11. Interaction Hooks (Cross-System Contracts)

This section specifies **exactly who consumes what** from pools.

### 11.1 Beya Management consumes:
- candidate lists (staff and rikishi)
- scarcity bands (for decision weighting)
- replacement time-locks

### 11.2 NPC Manager AI consumes:
- visibility-filtered candidate lists
- scarcity + quality bands
- rival hiring events (narrative + strategy)

### 11.3 Economy consumes:
- wage pressure index derived from staff scarcity
- sponsor confidence (indirectly affected by star supply)

### 11.4 Governance consumes:
- kabu candidate pool membership
- eligibility flags
- scandal rehabilitation timers

### 11.5 Narrative / Journals consumes:
- “signing events”
- “poaching events”
- “succession appointment events”
- “drought/boom” era announcements

---

## 12. Event Taxonomy (Pool Events)

Pools emit canonical events:

| Event | Payload |
|---|---|
| CandidateRevealed | candidateId, poolId, visibilityBand |
| OfferSubmitted | candidateId, beyaId, offerBand |
| CandidateSigned | personId, beyaId, contractType |
| CandidateWithdrawn | candidateId, reasonTag |
| StaffPoached | staffId, fromBeyaId, toBeyaId |
| KabuVacancyOpened | kabuId |
| KabuAssigned | kabuId, candidateId |
| EraBandShifted | eraIndex, bandType, newBand |

All events are deterministic, loggable, and replay-safe.

---

## 13. UI Surfaces (Narrative-first)

### 13.1 Player-facing language
Players see:
- “The amateur scene is brimming this year.”
- “Medical staff are scarce; reputations travel fast.”
- “A promising teenager is rumored in Kyushu.”

Players do not see:
- raw pool sizes
- hidden reserve counts
- exact preference utilities

### 13.2 Stable selection (difficulty)
When picking a stable, the UI shows:
- stable stature
- coach quality
- recruiting reach
- sponsor base

This indirectly changes pool access via visibility/scouting capacity.

---

## 14. Implementation Notes (Non-negotiable)

### 14.1 No duplicated generation
Pools are the only generator of new people.  
No other system may “create a coach” or “spawn a prospect.”

### 14.2 Identity promotion
Only when signed does a Candidate become a full Person (world entity).

### 14.3 Auditability
Every pool change must create:
- ledger line (if economic)
- governance log (if political)
- narrative memory entry (if notable)

---

## 15. Annex — Integration Checklist (Where to Reference This Doc)

Add delegation notes to:
- Foundations / World Entry: “Population intake uses Pools Canon v1.0”
- Beya Staff & Welfare: “Staff hiring uses Pools Canon v1.0”
- NPC Manager AI: “AI hiring uses Pools Canon v1.0”
- Governance: “Kabu candidates come from Pools Canon v1.0”
- Scouting/Fog-of-War: “Visibility bands defined in Pools Canon v1.0”
- Narrative/Journals: “Signing and poaching events defined in Pools Canon v1.0”

---

**END OF DOCUMENT**



---

# APPENDIX A — Worked Example Year (Implementation Test Case)

This appendix provides a deterministic “one year in the world” timeline showing:
- pool refresh cadence
- visibility reveal
- recruitment competition
- staff poaching
- medical scarcity event
- kabu vacancy + assignment
- event emissions and which systems consume them

It is intended as a **QA harness spec**: engineers can simulate this exact year and assert identical event logs.

## A0. Setup (Fixed Seeds & Starting Conditions)

### A0.1 Seeds
- WorldSeed: `0xSL-2037-ALPHA`
- EraIndex: `2030s-2` (derived)
- Calendar Year: `2037`

### A0.2 Institution Snapshot at Year Start (Bands only)
- National prestige: **High**
- Scandal climate: **Normal**
- Sponsor health: **High**
- Council tolerance: **Normal**
- Medical labor scarcity: **Tight**
- Recruitment popularity (sumo intake): **High**

### A0.3 Player Stable (for example)
- Beya: **Kitasakura-beya**
- Stature: **Mid-table**
- Recruiting reach: **Adequate**
- Staff quality: **Adequate**
- Foreign slot used: **0 / 1**
- Welfare record: **Compliant**
- Finances: **Stable**

### A0.4 Example NPC Stables (for competition)
- **Tenkō-beya** (elite, high prestige, aggressive recruitment)
- **Minatogawa-beya** (low prestige, bargain hunting)
- **Shiranui-beya** (mid prestige, staff-heavy development)

---

## A1. Yearly Intake Generation (January 1)

### A1.1 Domestic Rikishi Intake Pool — Cohort Generation
Pool refresh: **yearly**
- Cohort size generated: **N = 42** (hidden reserve + visible list cap applied)
- Visible cap: **12**
- Hidden reserve: **30**

Outcome bands:
- 4 “headline” prospects (Public/Rumored)
- 14 “strong” prospects (Rumored/Obscure)
- 24 “longshot” prospects (Obscure/Hidden)

Emitted events:
- `EraBandShifted` (if decade-level recalculated)
- *No CandidateRevealed events yet* (reveals happen monthly via trickle)

### A1.2 Foreign Rikishi Intake Pool — Cohort Generation
- Cohort size: **N = 6**
- Visible cap: **3**
- Hidden reserve: **3**
- Dual citizenship candidates: **1** (flagged)

Eligibility:
- Counts toward foreign quota unless Japanese citizenship exists (default rule)

---

## A2. Monthly Trickle & Scouting Reveals (Jan–Dec)

Each month, pools execute:
1) Reveal pass (moves some Hidden → Obscure, Obscure → Rumored, Rumored → Public)
2) Suitor interest recompute pass
3) Offer window resolution pass for candidates whose deadline arrives

### A2.1 January Reveal
Domestic reveals:
- 2 candidates become **Public** (headline prospects)
- 3 become **Rumored**
Foreign reveals:
- 1 becomes **Public**, 1 becomes **Rumored**

Emitted:
- `CandidateRevealed` × 7

Consumption:
- Scouting/UI: updates “rumor board”
- NPC AI: computes interest bands
- Narrative/Journals: may create “New Year Prospects” article if Public reveals ≥2

### A2.2 February: First Offer Window Opens
Player stable scouts a Rumored domestic prospect (Candidate D-07) → becomes Public.

Player submits offer:
- Offer type: `prestige_pitch` (narrative promise of fast development)
NPC stables submit:
- Tenkō: `aggressive`
- Shiranui: `standard`

Emitted:
- `OfferSubmitted` × 3

Candidate preference resolution tick (end of Feb):
- Candidate chooses **Tenkō** (highest utility; prestige dominates)

Emitted:
- `CandidateSigned` (personId promoted)
- Narrative hook: “Elite stable secures top amateur”

### A2.3 March: Staff Market Refresh + Poaching
Staff pool monthly refresh reveals a Senior Technique Coach candidate (S-22) Public.

Shiranui offers high salary band; player offers standard.
Coach prefers Shiranui (autonomy + prestige).

Emitted:
- `CandidateSigned` (staff)
- If coach came from another stable: `StaffPoached` (not in this case)

### A2.4 April: Medical Scarcity Shock
Medical pool scarcity band shifts: **Tight → Scarce** (deterministic due to high national injury rate + scandal climate drift).

Effects:
- fewer candidates revealed
- certified/elite candidates raise refusal probability for scandal-marked stables

Emitted:
- `EraBandShifted` (bandType = medical_supply)

Consumption:
- Beya Welfare: raises hiring urgency
- NPC AI: reduces risky training choices
- Narrative: “Medical staff scarce across the stables”

### A2.5 May: Player Signs First Recruit
Candidate D-19 (Rumored) chooses player stable due to:
- development promise
- low scandal risk
- local region tie

Emitted:
- `CandidateSigned` (rikishi)

World effects:
- Beya roster grows
- Training pipeline activates
- Narrative: “Quiet signing with local roots”

### A2.6 June: Foreign Candidate & Quota Check
Foreign candidate F-02 becomes Public. Player attempts offer.

Quota check:
- Player foreign slot used: 0/1 → eligible
Candidate has dual citizenship but no Japanese flag → counts foreign.

NPC Tenkō also offers.
Candidate chooses player due to “opportunity to become stable centerpiece” utility.

Emitted:
- `CandidateSigned` (foreign rikishi)
- Narrative: “Foreign prospect commits to Kitasakura-beya”

### A2.7 July: Candidate Withdrawals & Churn
Two longshot domestic candidates time out, withdraw (education path).

Emitted:
- `CandidateWithdrawn` × 2 (reasonTag: “returns_to_school”)

Consumption:
- Pools: reduce hidden reserve
- Narrative: generally none (unless notable)

### A2.8 August: Mid-year Amateur Star Injection (Rare)
A deterministic “amateur star” event triggers (era band + year index).

Candidate STAR-01 appears immediately **Public** with many suitors.
Offer war:
- Elite stables bid aggressively
- Player can bid but utility is usually dominated

Outcome:
- STAR-01 signs to Tenkō.

Emitted:
- `CandidateRevealed`
- `OfferSubmitted` × many
- `CandidateSigned`

Narrative:
- Major headline guaranteed

### A2.9 September: Staff Burnout Replacement
A mid-table stable loses Medical Staff to retirement; triggers replacement hiring.
A certified doctor candidate accepts Shiranui due to strong welfare record.

Emitted:
- `CandidateSigned` (medical staff)

### A2.10 October: Kabu Vacancy Opens
An oyakata retires → kabu vacancy event.

Emitted:
- `KabuVacancyOpened`

Candidate pool construction:
- eligible candidates enumerated deterministically
- two assistant oyakata + one retired rikishi appear as candidates

Emitted:
- `CandidateRevealed` (oyakata candidates) × 3

Council factions preference:
- favor clean record + continuity

Resolution:
- Assistant Oyakata A-02 assigned kabu

Emitted:
- `KabuAssigned`

Narrative:
- “Council approves succession, stability maintained”

### A2.11 November: Poaching Event
A well-regarded Conditioning Coach is poached from Minatogawa by Tenkō.

Emitted:
- `StaffPoached`

Consumption:
- Rivalry system increases tension between stables
- Media: “poaching controversy” if Minatogawa complains

### A2.12 December: Year Close Consolidation
Pools perform end-of-year:
- churn reconciliation
- hidden reserve carryover
- era band recalculation check for next year

Emitted:
- `EraBandShifted` (if any)
- No forced reveals

---

## A3. Required Assertions (QA Harness)

A simulator implementation should be able to assert:

1) Candidate lists and reveal counts per month match
2) Offer submission ordering and resolution outcomes match
3) Foreign quota blocks illegal signings deterministically
4) Medical scarcity shift occurs in April (given seeds)
5) Kabu vacancy opens in October and assigns A-02
6) Event log ordering is stable and replayable

### A3.1 Minimal Event Log (ordered)
- CandidateRevealed (Jan × 7)
- OfferSubmitted (Feb × 3)
- CandidateSigned (Feb)
- CandidateSigned (Mar)
- EraBandShifted (Apr medical_supply)
- CandidateSigned (May)
- CandidateSigned (Jun foreign)
- CandidateWithdrawn (Jul × 2)
- CandidateRevealed (Aug STAR-01)
- OfferSubmitted (Aug × many)
- CandidateSigned (Aug)
- CandidateSigned (Sep)
- KabuVacancyOpened (Oct)
- CandidateRevealed (Oct × 3)
- KabuAssigned (Oct)
- StaffPoached (Nov)

---

## A4. Cross-System Interaction Summary (What consumes these events)

| Event | Pools | Beya | AI | Economy | Governance | Narrative |
|---|---|---|---|---|---|---|
| CandidateRevealed | update lists | optional | interest calc | none | none | rumor/headline |
| OfferSubmitted | lock talks | none | strategy | none | none | optional |
| CandidateSigned | promote person | roster | update plans | salary sink | eligibility | headline/journal |
| StaffPoached | move staff | staff gap | rivalry shift | wage pressure | none | scandal potential |
| EraBandShifted | adjust supply | warnings | risk posture | inflation | tolerance | season tone |
| KabuVacancyOpened | build candidates | none | lobbying | none | pipeline | headline |
| KabuAssigned | remove candidates | stable continuity | long-term plan | none | log | history entry |

---

END APPENDIX A
```



## SOURCE — Basho_Rikishi_Development_Canon_v1.3_Ultra_Granular.md

```md
# Basho — Rikishi Development Canon v1.3
## Ultra-Granular Training, Evolution, Injury, Style, Psychology & Facilities

Status: **DEFINITIVE / EXPANDED**
Scope: Rikishi development systems only.
Guarantee: Larger than v1.2, non-lossy, implementation-grade.

This document extends v1.2 by fully specifying:
1. Mental & Psychological Load System
2. Training Facility & Staff Micro-Effects
3. Retirement, Post-Career & Legacy Transitions

---


# Basho — Rikishi Development Canon v1.2
## Ultra-Granular Training, Evolution, Injury, Style Drift & Worked Example

Status: **DEFINITIVE / EXPANDED**
Scope: Rikishi development systems only.
Guarantee: Larger than v1.1, non-lossy, implementation-grade.

This document **extends v1.1** by fully specifying:
- Injury State Machine (explicit)
- Style Drift & Reclassification Math
- Favored Kimarite Evolution
- Full Worked Example (10-year career timeline)

---


# Basho — Rikishi Development Canon v1.1
## Ultra-Granular Training + Evolution Constitution (Implementation Grade)

Status: **DEFINITIVE**
Scope: **Only rikishi development over time**
Explicitly excludes: combat resolution, economy amounts, roster admin

This document is:
- larger than its source material
- non-lossy
- explicit down to weekly ticks and state transitions
- suitable for direct engineering implementation

It consolidates and EXPANDS:
- Training System v1.0
- Rikishi Evolution System v1.0

---

# PART I — ABSOLUTE DESIGN LAWS (DEVELOPMENT SCOPE)

## 1. Determinism
All development outcomes are a pure function of:
- WorldSeed
- RikishiSeed
- TimeIndex (week)
- Training profile selections
- Injury history
- Career phase

No runtime RNG.
No “soft” decay.

## 2. Separation of Timescales
- **Training** operates weekly
- **Evolution** accumulates monthly and basho-end
- **Career phase** shifts are rare and thresholded

This separation prevents oscillation.

---

# PART II — RIKISHI STATE MODEL (NORMALIZED)

## 3. Permanent Identity (Immutable)
- rikishiId
- shikona registry entry
- origin
- base talent seed
- growth profile seed
- dominant archetype seed

## 4. Evolving State (Mutable)
Grouped by layer:

### 4.1 Body Layer
- heightCurrentCm
- weightCurrentKg
- heightPotentialCm
- weightPotentialKg
- growthFulfillment

### 4.2 Execution Layer
- powerOutput
- speedOutput
- balanceOutput
- techniqueOutput
- experienceOutput

### 4.3 Condition Layer
- fatigue
- injuryState
- injuryHistory[]
- recoveryModifier

### 4.4 Identity Layer
- styleLabel
- styleConfidence
- archetypeSecondary (optional)
- favoredKimarite[]

### 4.5 Arc Layer
- careerPhase
- phaseEntryTick
- retirementEligibility

---

# PART III — TRAINING SYSTEM (EXPANDED + WIRED)

# Basho — Training System v1.0 (Canonical)

Date: 2026-01-06  
Status: Canonical, verbose, implementation-ready  
Scope: Defines **training mechanics** at both beya and individual levels, and how training shapes rikishi evolution.  
This document intentionally excludes roster management, economics, and AI manager logic, which are defined elsewhere.

---

## 1. Design Goals

The training system must:
- Provide **meaningful player agency** without micromanagement
- Shape long-term **rikishi evolution**, not short-term bout outcomes
- Create **risk–reward trade-offs**
- Be **deterministic and legible**
- Integrate cleanly with:
  - Rikishi Evolution System
  - Beya Management System
  - NPC Manager AI System

> Training biases probability; it never guarantees greatness.

---

## 2. Core Training Philosophy

Training operates on **bias and pressure**, not direct stat control.

Players and AI:
- do not assign drills or skills directly
- choose **intensity, focus, and protection**
- accept downstream consequences via fatigue, injuries, and style drift

Training is evaluated **weekly** during interim periods.

---

## 3. Training Layers

Training exists on three stacked layers:

1. **Beya-Wide Training Profile** (default environment)
2. **Individual Focus Slots** (limited overrides)
3. **Facilities & Staff Modifiers** (multipliers, not decisions)

This ensures:
- consistency
- scarcity of attention
- emergent specialization

---

## 4. Beya-Wide Training Profile

Each beya selects one active training profile per interim.

### 4.1 Training Axes

Training profile is defined by four axes:

#### A) Intensity
- Conservative
- Balanced
- Intensive
- Punishing

#### B) Focus Bias
- Power
- Speed
- Technique
- Balance
- Neutral

#### C) Style Bias
- Oshi
- Yotsu
- Neutral

#### D) Recovery Emphasis
- Low
- Normal
- High

These axes modify growth, fatigue, and injury risk.

---

### 4.2 Default Numeric Effects (Illustrative)

#### Intensity Effects

| Intensity | Growth Mult | Fatigue Gain | Injury Risk |
|---|---:|---:|---:|
| Conservative | 0.85 | 0.75 | 0.80 |
| Balanced | 1.00 | 1.00 | 1.00 |
| Intensive | 1.20 | 1.25 | 1.15 |
| Punishing | 1.35 | 1.50 | 1.35 |

#### Recovery Emphasis Effects

| Recovery | Fatigue Decay | Injury Recovery |
|---|---:|---:|
| Low | 0.80 | 0.85 |
| Normal | 1.00 | 1.00 |
| High | 1.25 | 1.20 |

---

### 4.3 Focus Bias → Skill Growth Bias

| Focus | Power | Speed | Technique | Balance |
|---|---:|---:|---:|---:|
| Power | 1.30 | 0.85 | 0.95 | 0.95 |
| Speed | 0.85 | 1.30 | 0.95 | 0.95 |
| Technique | 0.90 | 0.90 | 1.35 | 1.10 |
| Balance | 0.90 | 0.95 | 1.10 | 1.35 |
| Neutral | 1.00 | 1.00 | 1.00 | 1.00 |

---

## 5. Individual Focus Slots

### 5.1 Focus Slot Availability
- Base slots: **3**
- +1 at prestige tier 2
- +1 at prestige tier 4
- Max: **5**

Only focused rikishi may receive individual overrides.

---

### 5.2 Focus Modes

Each focus slot selects one mode:

| Mode | Growth | Fatigue | Injury Risk | Notes |
|---|---:|---:|---:|---|
| Develop | +25% | +10% | +5% | Default growth |
| Push | +35% | +20% | +20% | Win-now pressure |
| Protect | −15% | −25% | −30% | Longevity |
| Rebuild | +10% | −10% | −15% | Post-injury |

Focus modes stack multiplicatively with beya-wide profile.

---

## 6. Training → Rikishi Evolution Wiring

### 6.1 Physique
- High intensity → faster weight gain
- High recovery → controlled weight, better fulfillment
- Overtraining → stalled growth + injury spikes

Height is unaffected after youth.

---

### 6.2 Skills
Training biases **effectiveness growth**, not raw skill caps.

Growth is:
- fast early
- diminishing in prime
- fragile in veteran phase

---

### 6.3 Style Drift
Training does not set style directly.

Instead:
- Style bias nudges recomputation thresholds
- Sustained mismatch between body and training causes inefficiency

This prevents “click to choose style” exploits.

---

### 6.4 Archetype Interaction
Training does **not** change dominant archetype.

It may:
- accelerate secondary archetype emergence
- suppress risky behaviors under conservative regimes

---

## 7. Fatigue & Injury Integration

### 7.1 Fatigue
- Accumulates weekly from training
- Scales with intensity and focus
- Decays via recovery emphasis and facilities

High fatigue:
- reduces bout performance
- increases injury risk
- pushes kimarite selection toward short finishes

---

### 7.2 Injuries
Training contributes to injury probability.

Risk factors:
- high fatigue
- punishing intensity
- low recovery
- prior injury history

Injuries apply:
- attribute penalties
- recovery timelines
- narrative hooks

---

## 8. Career Phase Sensitivity

Training effectiveness varies by phase:

| Phase | Growth | Injury Sensitivity |
|---|---:|---:|
| Youth | High | Low |
| Development | High | Medium |
| Prime | Medium | Medium |
| Veteran | Low | High |
| Late | Very Low | Very High |

This encourages different strategies across careers.

---

## 9. AI Use of Training

AI managers select training profiles based on:
- their profile traits
- roster composition
- injury load
- meta drift signals
- financial runway

Examples:
- Survivor favors Conservative + High Recovery
- Gambler spikes Punishing during contention
- Talent Factory uses Balanced + Neutral

AI obeys same focus slot limits as player.

---

## 10. Player UX Rules

Players see:
- training philosophy descriptions
- warnings (“Injury risk rising”)
- trend indicators (“Style drifting toward Yotsu”)

Players never see:
- raw multipliers
- hidden fatigue math

---

## 11. Failure Modes (By Design)

- Overtraining cascades
- Burned-out prospects
- Injury-plagued stars
- Short primes with spectacular peaks

These are outcomes, not bugs.

---

## 12. Canon One-Liner

> **Training shapes the conditions under which bodies, habits, and styles evolve — it never dictates the result of a single bout.**

---

End of document.


---

# PART IV — EVOLUTION SYSTEM (EXPANDED + WIRED)

# Basho — Rikishi Evolution System v1.0 (Canonical)

Date: 2026-01-06  
Scope: Full, end-to-end specification of **rikishi evolution** in Basho, covering physique, skills, style, archetype, kimarite identity, and career arcs.  
Status: Canonical, deterministic, implementation-ready.

This document explains **how a rikishi changes over time**, why those changes occur, and how they connect to combat, narrative, and UI.

---

## 1. Design Goals

Rikishi evolution must:
- Be **deterministic** and reproducible.
- Produce **believable career arcs** without scripted outcomes.
- Be **readable to players** (no hidden “RPG decay”).
- Integrate cleanly with:
  - Combat Engine V3
  - Kimarite tier/style/archetype system
  - Rivalries and narrative
  - Career journals and governance

---

## 2. Core Principle

> **Rikishi do not gain or lose abstract “power.”  
They change bodies, habits, and constraints — and the simulation responds.**

Evolution is the interaction of:
1. Physique (body)
2. Skills (execution)
3. Style (technical preference)
4. Archetype (temperament)
5. Kimarite identity (proof of behavior)
6. Career phase (time + pressure)

Each layer evolves on a different timescale.

---

## 3. Data Model Overview

### 3.1 Permanent Identity (Never Changes)
- `id`
- `shikona`
- origin metadata
- base talent seed
- growth profile seed
- dominant archetype (initial)

These define *who the rikishi is*.

### 3.2 Evolving State (Changes Over Time)
- heightCurrent / weightCurrent
- growth fulfillment
- skill outputs (power, speed, balance, technique, experience)
- fatigue, injuries, momentum
- style (oshi / yotsu / hybrid)
- secondary archetype tendency (optional)
- favored kimarite (tokui-waza)
- career phase

---

## 4. Physique Evolution (The Body Layer)

### 4.1 Height
- Grows early career only.
- Stops deterministically based on growth profile.
- Influences reach, leverage, grip geometry.

Height explains *structural possibility*, not tactical choice.

### 4.2 Weight (Primary Evolution Lever)
- Changes throughout career.
- Influences:
  - power effectiveness
  - speed effectiveness
  - fatigue accumulation
  - injury risk
  - recovery rate
- Strongest driver of style drift.

### 4.3 Current vs Potential
Each rikishi has:
- `heightPotentialCm`
- `weightPotentialKg`
- `growthFulfillment` ∈ [0,1]

Potential is a **ceiling**, not a guarantee.
Training, injuries, and facilities determine how close it is reached.

---

## 5. Skill Evolution (Execution Layer)

Canonical skill outputs:
- **Power** — force generation and drive
- **Speed** — burst and lateral movement
- **Balance** — resistance to displacement and counters
- **Technique** — grip craft, throw timing, transitions
- **Experience** — decision quality and counters

### 5.1 Growth Pattern
- Youth: spiky, uneven gains
- Development: steady improvement
- Prime: diminishing returns
- Veteran: flat or declining effectiveness
- Late: managed decline

Skills are modified by physique:
- Same technique score behaves differently at different weights.

---

## 6. Style Evolution (Primary Public Identity)

Styles:
- **Oshi** — distance, push/thrust
- **Yotsu** — belt, control, throws
- **Hybrid** — adaptable

### 6.1 Style Is Derived
Style is recomputed periodically from:
- weight trends
- balance vs speed ratio
- grip success rates
- kimarite usage distribution
- career phase bias

### 6.2 Hysteresis
- Style changes require sustained signals.
- Prevents oscillation basho-to-basho.

Style is **what the rikishi usually tries to do**.

---

## 7. Archetype Evolution (Temperament Layer)

Archetypes describe **behavior under pressure**.

### 7.1 Dominant Archetype
- Seeded at creation.
- Rarely changes.
- Represents temperament.

### 7.2 Secondary Archetype Drift
- Optional, slow-moving.
- Emerges from repeated behavior patterns.
- Strength ∈ [0.1–0.5].

Dominant archetype applies fully.  
Secondary archetype bends behavior slightly.

---

## 8. Kimarite Identity (Proof of Evolution)

### 8.1 Favored Kimarite (Tokui-waza)
- Tracked from actual wins.
- Top 2–3 maintained.
- Applies 2× selection bonus in combat.

### 8.2 Feedback Loop
Body → Style → Kimarite usage → Favorites → Reinforcement

As the body changes, favored moves may fade or be replaced.

---

## 9. Career Phases (Arc Layer)

Phases are computed, not age-locked:
1. Youth / Prospect
2. Development / Rise
3. Prime
4. Veteran / Decline
5. Late Career / Exit

Inputs:
- age
- growth fulfillment plateau
- injury accumulation
- fatigue recovery slowdown
- performance trends

Phases bias:
- growth rates
- injury risk
- style drift likelihood
- retirement triggers

---

## 10. Determinism Contract

Every evolution step is derived from:
- World seed
- Rikishi seed
- Time index
- Player inputs (training, facilities)
- Deterministic outcomes (bouts, injuries)

No hidden randomness.  
Same inputs → same careers.

---

## 11. UI & Readability Rules

### 11.1 Rikishi Card
- **Style**: primary label
- **Archetype**: secondary
- **Secondary archetype**: only if meaningful
- **Favored kimarite**: visible proof
- Physique shown indirectly via notes, not raw stats by default

### 11.2 Advanced Views
- Physique history
- Style drift timeline
- Kimarite usage charts
- Career journal entries

---

## 12. Narrative Integration

Narrative systems consume evolution:
- “Former speedster adapts to belt fighting”
- “Signature throw fades after knee injury”
- “Late-career reinvention”

Narrative never changes outcomes.

---

## 13. Why This Works

- Careers feel authored, but are not scripted.
- Decline feels earned, not punitive.
- Specialization emerges organically.
- Players learn to *read* wrestlers, not stats.

---

## 14. Canon One-Liner

> **Rikishi evolution is the story of a body adapting to time, pressure, and consequence — expressed through style, behavior, and the techniques that survive.**

---

End of document.


---

# PART V — TRAINING → EVOLUTION WIRING (NEW, GRANULAR)

## 15. Weekly Tick Algorithm (Explicit)

For each rikishi, each week:

1. Read beya training profile
2. Read individual focus (if any)
3. Compute growthBiasVector
4. Compute fatigueDelta
5. Compute injuryRiskDelta
6. Apply fatigue accumulation
7. Roll deterministic injury check
8. Apply injury state transitions
9. Accumulate growth progress (buffered)
10. Log DevelopmentEvent

No evolution is applied immediately to combat outputs until monthly consolidation.

---

## 16. Monthly Consolidation

Every 4 weeks:
- buffered growth applies to physique and skills
- style recomputation check runs
- favored kimarite may update
- career phase transition check runs

---

## 17. Career Phase Transition Rules (Explicit)

Transitions require **multiple signals**:
- growthFulfillment plateau
- fatigue recovery slowdown
- injury frequency
- performance trend

Single signals never force a phase change.

---

# PART VI — FAILURE MODES (INTENTIONAL)

- Burned prospects
- Late bloomers
- Short primes
- Reinvention arcs
- Chronic injury decline

These outcomes are authored by systems, not random chance.

---

# PART VII — UI CONTRACT (DEVELOPMENT)

Players see:
- philosophy language
- warnings
- trend descriptors

Players never see:
- growth buffers
- raw multipliers
- phase thresholds

---

# PART VIII — SOURCE PRESERVATION ANNEX (VERBATIM)

## Training System v1.0
```md
# Basho — Training System v1.0 (Canonical)

Date: 2026-01-06  
Status: Canonical, verbose, implementation-ready  
Scope: Defines **training mechanics** at both beya and individual levels, and how training shapes rikishi evolution.  
This document intentionally excludes roster management, economics, and AI manager logic, which are defined elsewhere.

---

## 1. Design Goals

The training system must:
- Provide **meaningful player agency** without micromanagement
- Shape long-term **rikishi evolution**, not short-term bout outcomes
- Create **risk–reward trade-offs**
- Be **deterministic and legible**
- Integrate cleanly with:
  - Rikishi Evolution System
  - Beya Management System
  - NPC Manager AI System

> Training biases probability; it never guarantees greatness.

---

## 2. Core Training Philosophy

Training operates on **bias and pressure**, not direct stat control.

Players and AI:
- do not assign drills or skills directly
- choose **intensity, focus, and protection**
- accept downstream consequences via fatigue, injuries, and style drift

Training is evaluated **weekly** during interim periods.

---

## 3. Training Layers

Training exists on three stacked layers:

1. **Beya-Wide Training Profile** (default environment)
2. **Individual Focus Slots** (limited overrides)
3. **Facilities & Staff Modifiers** (multipliers, not decisions)

This ensures:
- consistency
- scarcity of attention
- emergent specialization

---

## 4. Beya-Wide Training Profile

Each beya selects one active training profile per interim.

### 4.1 Training Axes

Training profile is defined by four axes:

#### A) Intensity
- Conservative
- Balanced
- Intensive
- Punishing

#### B) Focus Bias
- Power
- Speed
- Technique
- Balance
- Neutral

#### C) Style Bias
- Oshi
- Yotsu
- Neutral

#### D) Recovery Emphasis
- Low
- Normal
- High

These axes modify growth, fatigue, and injury risk.

---

### 4.2 Default Numeric Effects (Illustrative)

#### Intensity Effects

| Intensity | Growth Mult | Fatigue Gain | Injury Risk |
|---|---:|---:|---:|
| Conservative | 0.85 | 0.75 | 0.80 |
| Balanced | 1.00 | 1.00 | 1.00 |
| Intensive | 1.20 | 1.25 | 1.15 |
| Punishing | 1.35 | 1.50 | 1.35 |

#### Recovery Emphasis Effects

| Recovery | Fatigue Decay | Injury Recovery |
|---|---:|---:|
| Low | 0.80 | 0.85 |
| Normal | 1.00 | 1.00 |
| High | 1.25 | 1.20 |

---

### 4.3 Focus Bias → Skill Growth Bias

| Focus | Power | Speed | Technique | Balance |
|---|---:|---:|---:|---:|
| Power | 1.30 | 0.85 | 0.95 | 0.95 |
| Speed | 0.85 | 1.30 | 0.95 | 0.95 |
| Technique | 0.90 | 0.90 | 1.35 | 1.10 |
| Balance | 0.90 | 0.95 | 1.10 | 1.35 |
| Neutral | 1.00 | 1.00 | 1.00 | 1.00 |

---

## 5. Individual Focus Slots

### 5.1 Focus Slot Availability
- Base slots: **3**
- +1 at prestige tier 2
- +1 at prestige tier 4
- Max: **5**

Only focused rikishi may receive individual overrides.

---

### 5.2 Focus Modes

Each focus slot selects one mode:

| Mode | Growth | Fatigue | Injury Risk | Notes |
|---|---:|---:|---:|---|
| Develop | +25% | +10% | +5% | Default growth |
| Push | +35% | +20% | +20% | Win-now pressure |
| Protect | −15% | −25% | −30% | Longevity |
| Rebuild | +10% | −10% | −15% | Post-injury |

Focus modes stack multiplicatively with beya-wide profile.

---

## 6. Training → Rikishi Evolution Wiring

### 6.1 Physique
- High intensity → faster weight gain
- High recovery → controlled weight, better fulfillment
- Overtraining → stalled growth + injury spikes

Height is unaffected after youth.

---

### 6.2 Skills
Training biases **effectiveness growth**, not raw skill caps.

Growth is:
- fast early
- diminishing in prime
- fragile in veteran phase

---

### 6.3 Style Drift
Training does not set style directly.

Instead:
- Style bias nudges recomputation thresholds
- Sustained mismatch between body and training causes inefficiency

This prevents “click to choose style” exploits.

---

### 6.4 Archetype Interaction
Training does **not** change dominant archetype.

It may:
- accelerate secondary archetype emergence
- suppress risky behaviors under conservative regimes

---

## 7. Fatigue & Injury Integration

### 7.1 Fatigue
- Accumulates weekly from training
- Scales with intensity and focus
- Decays via recovery emphasis and facilities

High fatigue:
- reduces bout performance
- increases injury risk
- pushes kimarite selection toward short finishes

---

### 7.2 Injuries
Training contributes to injury probability.

Risk factors:
- high fatigue
- punishing intensity
- low recovery
- prior injury history

Injuries apply:
- attribute penalties
- recovery timelines
- narrative hooks

---

## 8. Career Phase Sensitivity

Training effectiveness varies by phase:

| Phase | Growth | Injury Sensitivity |
|---|---:|---:|
| Youth | High | Low |
| Development | High | Medium |
| Prime | Medium | Medium |
| Veteran | Low | High |
| Late | Very Low | Very High |

This encourages different strategies across careers.

---

## 9. AI Use of Training

AI managers select training profiles based on:
- their profile traits
- roster composition
- injury load
- meta drift signals
- financial runway

Examples:
- Survivor favors Conservative + High Recovery
- Gambler spikes Punishing during contention
- Talent Factory uses Balanced + Neutral

AI obeys same focus slot limits as player.

---

## 10. Player UX Rules

Players see:
- training philosophy descriptions
- warnings (“Injury risk rising”)
- trend indicators (“Style drifting toward Yotsu”)

Players never see:
- raw multipliers
- hidden fatigue math

---

## 11. Failure Modes (By Design)

- Overtraining cascades
- Burned-out prospects
- Injury-plagued stars
- Short primes with spectacular peaks

These are outcomes, not bugs.

---

## 12. Canon One-Liner

> **Training shapes the conditions under which bodies, habits, and styles evolve — it never dictates the result of a single bout.**

---

End of document.

```

## Rikishi Evolution System v1.0
```md
# Basho — Rikishi Evolution System v1.0 (Canonical)

Date: 2026-01-06  
Scope: Full, end-to-end specification of **rikishi evolution** in Basho, covering physique, skills, style, archetype, kimarite identity, and career arcs.  
Status: Canonical, deterministic, implementation-ready.

This document explains **how a rikishi changes over time**, why those changes occur, and how they connect to combat, narrative, and UI.

---

## 1. Design Goals

Rikishi evolution must:
- Be **deterministic** and reproducible.
- Produce **believable career arcs** without scripted outcomes.
- Be **readable to players** (no hidden “RPG decay”).
- Integrate cleanly with:
  - Combat Engine V3
  - Kimarite tier/style/archetype system
  - Rivalries and narrative
  - Career journals and governance

---

## 2. Core Principle

> **Rikishi do not gain or lose abstract “power.”  
They change bodies, habits, and constraints — and the simulation responds.**

Evolution is the interaction of:
1. Physique (body)
2. Skills (execution)
3. Style (technical preference)
4. Archetype (temperament)
5. Kimarite identity (proof of behavior)
6. Career phase (time + pressure)

Each layer evolves on a different timescale.

---

## 3. Data Model Overview

### 3.1 Permanent Identity (Never Changes)
- `id`
- `shikona`
- origin metadata
- base talent seed
- growth profile seed
- dominant archetype (initial)

These define *who the rikishi is*.

### 3.2 Evolving State (Changes Over Time)
- heightCurrent / weightCurrent
- growth fulfillment
- skill outputs (power, speed, balance, technique, experience)
- fatigue, injuries, momentum
- style (oshi / yotsu / hybrid)
- secondary archetype tendency (optional)
- favored kimarite (tokui-waza)
- career phase

---

## 4. Physique Evolution (The Body Layer)

### 4.1 Height
- Grows early career only.
- Stops deterministically based on growth profile.
- Influences reach, leverage, grip geometry.

Height explains *structural possibility*, not tactical choice.

### 4.2 Weight (Primary Evolution Lever)
- Changes throughout career.
- Influences:
  - power effectiveness
  - speed effectiveness
  - fatigue accumulation
  - injury risk
  - recovery rate
- Strongest driver of style drift.

### 4.3 Current vs Potential
Each rikishi has:
- `heightPotentialCm`
- `weightPotentialKg`
- `growthFulfillment` ∈ [0,1]

Potential is a **ceiling**, not a guarantee.
Training, injuries, and facilities determine how close it is reached.

---

## 5. Skill Evolution (Execution Layer)

Canonical skill outputs:
- **Power** — force generation and drive
- **Speed** — burst and lateral movement
- **Balance** — resistance to displacement and counters
- **Technique** — grip craft, throw timing, transitions
- **Experience** — decision quality and counters

### 5.1 Growth Pattern
- Youth: spiky, uneven gains
- Development: steady improvement
- Prime: diminishing returns
- Veteran: flat or declining effectiveness
- Late: managed decline

Skills are modified by physique:
- Same technique score behaves differently at different weights.

---

## 6. Style Evolution (Primary Public Identity)

Styles:
- **Oshi** — distance, push/thrust
- **Yotsu** — belt, control, throws
- **Hybrid** — adaptable

### 6.1 Style Is Derived
Style is recomputed periodically from:
- weight trends
- balance vs speed ratio
- grip success rates
- kimarite usage distribution
- career phase bias

### 6.2 Hysteresis
- Style changes require sustained signals.
- Prevents oscillation basho-to-basho.

Style is **what the rikishi usually tries to do**.

---

## 7. Archetype Evolution (Temperament Layer)

Archetypes describe **behavior under pressure**.

### 7.1 Dominant Archetype
- Seeded at creation.
- Rarely changes.
- Represents temperament.

### 7.2 Secondary Archetype Drift
- Optional, slow-moving.
- Emerges from repeated behavior patterns.
- Strength ∈ [0.1–0.5].

Dominant archetype applies fully.  
Secondary archetype bends behavior slightly.

---

## 8. Kimarite Identity (Proof of Evolution)

### 8.1 Favored Kimarite (Tokui-waza)
- Tracked from actual wins.
- Top 2–3 maintained.
- Applies 2× selection bonus in combat.

### 8.2 Feedback Loop
Body → Style → Kimarite usage → Favorites → Reinforcement

As the body changes, favored moves may fade or be replaced.

---

## 9. Career Phases (Arc Layer)

Phases are computed, not age-locked:
1. Youth / Prospect
2. Development / Rise
3. Prime
4. Veteran / Decline
5. Late Career / Exit

Inputs:
- age
- growth fulfillment plateau
- injury accumulation
- fatigue recovery slowdown
- performance trends

Phases bias:
- growth rates
- injury risk
- style drift likelihood
- retirement triggers

---

## 10. Determinism Contract

Every evolution step is derived from:
- World seed
- Rikishi seed
- Time index
- Player inputs (training, facilities)
- Deterministic outcomes (bouts, injuries)

No hidden randomness.  
Same inputs → same careers.

---

## 11. UI & Readability Rules

### 11.1 Rikishi Card
- **Style**: primary label
- **Archetype**: secondary
- **Secondary archetype**: only if meaningful
- **Favored kimarite**: visible proof
- Physique shown indirectly via notes, not raw stats by default

### 11.2 Advanced Views
- Physique history
- Style drift timeline
- Kimarite usage charts
- Career journal entries

---

## 12. Narrative Integration

Narrative systems consume evolution:
- “Former speedster adapts to belt fighting”
- “Signature throw fades after knee injury”
- “Late-career reinvention”

Narrative never changes outcomes.

---

## 13. Why This Works

- Careers feel authored, but are not scripted.
- Decline feels earned, not punitive.
- Specialization emerges organically.
- Players learn to *read* wrestlers, not stats.

---

## 14. Canon One-Liner

> **Rikishi evolution is the story of a body adapting to time, pressure, and consequence — expressed through style, behavior, and the techniques that survive.**

---

End of document.

```



---

# PART IX — INJURY STATE MACHINE (EXPLICIT)

## 30. Injury States

Each rikishi maintains exactly one InjuryState:

| State | Description |
|---|---|
| Healthy | No active injury |
| Minor | Short-term strain |
| Moderate | Noticeable impairment |
| Severe | Long-term impairment |
| Chronic | Persistent recurring condition |
| CareerEnding | Forced retirement trigger |

## 31. Injury Severity Thresholds

Severity is determined by:
- fatigue band
- physique stress ratio
- bout intensity band
- accumulated micro-injury count

No random rolls; thresholds are deterministic.

## 32. Recovery Curves

Each state defines:
- minimum recovery weeks
- performance penalty band
- re-injury amplification factor

Chronic injuries permanently reduce recovery efficiency.

---

# PART X — STYLE DRIFT & RECLASSIFICATION

## 33. Style Confidence Model

Each style label maintains a confidence score:
- oshi
- yotsu
- hybrid

Scores update monthly using:
- kimarite usage distribution
- grip success ratios
- physique suitability

## 34. Drift Thresholds

Style changes only when:
- new style confidence > old style by X margin
- sustained for ≥2 basho
- not blocked by injury limitations

Abrupt style flips are impossible.

---

## 35. Favored Kimarite Evolution

Favored kimarite list updates when:
- same kimarite used ≥N times
- above-average success rate
- fits current style

Favorites decay if unused for extended periods.

---

# PART XI — WORKED EXAMPLE (10-YEAR CAREER)

## 36. Rikishi Example: “Kazanoumi”

### Year 1–2 (Prospect)
- rapid weight gain
- minor injuries
- style confidence unclear

### Year 3–5 (Rise)
- oshi style locks in
- favored kimarite: oshidashi, tsukidashi
- first makuuchi promotion

### Year 6–7 (Prime)
- peak power output
- rare injury-free stretch
- sansho awards

### Year 8–9 (Decline)
- chronic knee injury
- style drifts toward defensive yotsu
- fewer favored techniques

### Year 10 (Exit)
- chronic state escalates
- retirement eligibility triggered
- legacy logged

Every step corresponds to weekly and monthly ticks.

---

# PART XII — ADDITIONAL FAILURE & EDGE CASES

- Sudden injury-caused plateau
- Style-lock preventing adaptation
- Late-blooming technique specialists
- Premature burnout via overtraining

All are deterministic outcomes.

---

# PART XIII — EXTENDED SOURCE PRESERVATION

This document preserves **all v1.1 content verbatim**, plus expanded systems.
No earlier rules are removed or weakened.

---

END OF Rikishi Development Canon v1.2


---

# PART XIV — MENTAL & PSYCHOLOGICAL LOAD SYSTEM

## 40. Mental State Model

Each rikishi maintains a **MentalState** vector, separate from physical fatigue:

| Dimension | Description |
|---|---|
| Confidence | Belief in own execution |
| Pressure | External expectation weight |
| Fear | Hesitation under risk |
| Focus | Consistency of decision-making |
| Resilience | Recovery from setbacks |

MentalState values are internal scalars; players see **narrative descriptors only**.

---

## 41. Mental State Inputs (Deterministic)

Mental updates occur weekly and post-bout:

- Win/Loss streaks
- Upsets (positive or negative)
- Rivalry bouts
- Media tone
- Stable stature pressure
- Career phase

No random swings are permitted.

---

## 42. Mental → Performance Mapping

Mental states affect:
- initiative bands
- error likelihood bands
- comeback probability bands
- injury escalation risk

These effects are capped to prevent total collapse.

---

## 43. Psychological Failure Modes

- Confidence spiral (loss streaks)
- Fear lock (post-injury hesitation)
- Pressure collapse (elite expectations)
- Veteran composure advantage

These are system-authored outcomes.

---

# PART XV — TRAINING FACILITIES & STAFF MICRO-EFFECTS

## 50. Facility Bands

Facilities are modeled in qualitative bands:

| Band | Description |
|---|---|
| Primitive | Minimal, outdated |
| Basic | Functional |
| Adequate | Competitive |
| Advanced | Modern, specialized |
| Elite | Cutting-edge |

Facilities modify:
- training efficiency
- injury risk
- recovery speed
- mental fatigue

---

## 51. Staff Roles

Each stable may have:
- Head Coach
- Conditioning Coach
- Medical Staff
- Mental Coach (rare)

Each role provides:
- bias modifiers
- risk dampening
- specialization bonuses

---

## 52. Facility × Training Interaction

Training outputs are multiplied by:
- facility band modifier
- staff competency modifier

Modifiers are deterministic and logged.

---

# PART XVI — RETIREMENT, POST-CAREER & LEGACY

## 60. Retirement Eligibility

Triggered by:
- age thresholds
- chronic injury state
- sustained decline
- governance events

Retirement is optional unless forced.

---

## 61. Retirement Outcomes

Possible paths:
- Stable staff role
- Independent coach
- Oyakata candidate
- Exit from sumo world

Each path affects:
- legacy score
- institutional memory
- future NPC behavior

---

## 62. Legacy Scoring (Narrative)

Legacy is computed from:
- peak rank
- career longevity
- rivalries
- championships
- scandals

Legacy affects:
- how the rikishi is referenced in history
- eligibility for honors
- successor narratives

---

## 63. Post-Career Persistence

Retired rikishi remain:
- in historical records
- as NPCs (if relevant)
- as reference points in commentary

No character is deleted from history.

---

# PART XVII — FULL DEVELOPMENT FLOW SUMMARY

Weekly:
- Training
- Mental update
- Fatigue/injury check

Monthly:
- Evolution consolidation
- Style drift check
- Favored kimarite update

Basho-End:
- Career phase review
- Mental pressure recalibration
- Retirement eligibility check

---

END OF Rikishi Development Canon v1.3
```

```



## SOURCE 03 — Basho_Reputation_Deviance_Archetype_and_Beya_Lineage_Canon_v1.9_Ultra_Granular.md

```md

BASHO — REPUTATION DEVIANCE, ARCHETYPES, BEYA LINEAGE & EVOLUTION CANON
v1.9 ULTRA-GRANULAR DEFINITIVE

This document extends v1.8 and integrates:
• Intergenerational / beya archetype expectations
• Stable-level identity memory and pressure
• Lineage-driven perception and evolution constraints

This canon governs how stables (beya) themselves acquire reputations,
and how those reputations shape the careers of future rikishi.

======================================================================
SECTION VI — BEYA ARCHETYPE LINEAGE & EXPECTATION SYSTEM
======================================================================

1. Beya Identity Profile (BIP)

Each beya maintains a persistent Beya Identity Profile derived from:
• Historical tactical archetypes produced
• Coaching philosophies across generations
• Public scandals or exemplary conduct
• Media and fan faction memory inheritance

Tracked Axes:
• Style Expectation Vector (oshi / yotsu / trick / hybrid)
• Reputation Deviance Bias (positive or negative)
• Discipline Expectation
• Injury Culture (rush-through vs conservative)

2. Archetype Expectation Inheritance

When a new rikishi enters a beya:
• They inherit a portion of the Beya Identity Profile
• This does NOT alter stats
• It alters perception, scrutiny, and pressure

Example:
“This stable always produces bullies”
→ Higher baseline Tactical Deviance suspicion
→ Faster media escalation for henka or intimidation

“This is a technician’s stable”
→ Rare kimarite praised
→ Losses forgiven more easily

3. Expectation Pressure Mechanics

Expectation Pressure (EP) applies per basho:
EP = BeyaIdentityStrength × MediaAttention × FanTraditionLock

High EP causes:
• Faster myth formation
• Reduced tolerance for deviation
• Accelerated reputation swings

======================================================================
SECTION VII — INTERGENERATIONAL STYLE REINFORCEMENT & BREAKOUT
======================================================================

1. Reinforcement Loop

If a rikishi conforms to beya expectation:
• Reduced drift resistance
• Faster mastery growth
• Sponsor alignment bonuses

2. Breakout Penalty & Reward

If a rikishi defies beya identity:
• Initial fan/media skepticism
• Higher scrutiny
• But successful defiance creates:
  - “Reformer” myth
  - Beya identity evolution

3. Beya Identity Drift

Beya identities are not static.
They drift when:
• Multiple successful deviations occur
• Coaching leadership changes
• Scandals force redefinition

Drift is slow (decades), logged, and visible.

======================================================================
SECTION VIII — SYSTEMIC INTEGRATION
======================================================================

Beya lineage feeds into:
• Rikishi Reputation Deviance calculations
• Crowd intimidation and forgiveness
• Media bias baselines
• Sponsor confidence
• AI opponent expectation modeling
• Historical Almanac & lineage trees

======================================================================
SECTION IX — CANONICAL GUARANTEES
======================================================================

• No stable is permanently typecast
• Breaking tradition is possible but costly
• Lineage creates pressure, not destiny
• Legends shape futures

======================================================================
END OF CANON

```



## SOURCE 04 — Basho_Tactical_Archetypes_Myth_Sponsor_Coaching_Fans_and_Media_Canon_v1.6_Ultra_Granular.md

```md

BASHO — TACTICAL ARCHETYPES, RISK, COACHING, LEGACY, RIVALRIES, MYTH,
FAN FACTIONS & MEDIA PERSONALITIES CANON
v1.6 ULTRA-GRANULAR DEFINITIVE

This document extends v1.5 and fully integrates:
• Fan faction systems (regional, national, traditionalist, spectacle-driven)
• Media personalities with persistent bias profiles

This canon governs perception pressure, crowd dynamics, narrative amplification,
and long-horizon reputation volatility.

======================================================================
SECTION X — FAN FACTION SYSTEMS
======================================================================

1. Fan Faction Definition

Fan Factions represent semi-coherent audience blocs that react differently
to styles, outcomes, scandals, and personalities.

Canonical Fan Factions:
• Regional Loyalists — support rikishi/beya tied to birthplace or home prefecture
• National Icons — favor dominant yokozuna and title holders
• Traditionalists — prefer orthodox yotsu-zumo, discipline, humility
• Spectacle Seekers — favor oshi, trickery, rare kimarite, drama
• Underdog Sympathizers — rally behind low-ranked or injured rikishi

Each faction tracks:
• Approval Score (−100 to +100) per rikishi, coach, and beya
• Memory half-life (how long grudges/praise last)
• Sensitivity vectors (injury, scandal, dominance, humility)

2. Faction Influence Mechanics

Faction Approval influences:
• Crowd reaction intensity
• Media narrative framing
• Sponsor confidence
• Myth Stability Score modifiers

CrowdResponse =
Σ(FactionApproval × FactionPresence × EventSalience)

3. Faction Drift & Polarization

Events can polarize factions:
• Pull-down heavy wins anger Traditionalists
• Injury perseverance boosts Underdog faction
• Sponsor scandals alienate Regional Loyalists

Polarization increases:
• Narrative volatility
• Rivalry hardening
• Myth collapse probability

======================================================================
SECTION XI — MEDIA PERSONALITIES WITH BIAS
======================================================================

1. Media Personality Profiles

Media is not neutral. Each personality has:
• Bias Archetype
• Preferred narratives
• Target sensitivities

Canonical Media Bias Archetypes:
• Old Guard Commentator — pro-tradition, anti-trickery
• Sensationalist Analyst — drama-first, volatility amplifying
• Technical Purist — favors clean technique, mastery
• Regional Booster — biased toward local rikishi
• Cynical Veteran — quick to declare decline or fraud

2. Bias Scoring

Each media personality applies a BiasModifier:
BiasModifier =
AlignmentWithStyle × 0.4 +
AlignmentWithMyth × 0.3 −
ScandalAversion × 0.3

This modifier affects:
• Headline tone
• Myth Stability adjustments
• Player-facing narrative color

3. Media Momentum Effects

Repeated biased coverage can:
• Accelerate myth reinforcement
• Trigger early myth collapse
• Influence sponsor churn
• Affect AI perception models

======================================================================
SECTION XII — SYSTEMIC FEEDBACK LOOPS
======================================================================

Fan factions + media personalities feed back into:
• Sponsor pressure indices
• Coach philosophy stress
• Rikishi risk tolerance
• Archetype drift acceleration

Example Loop:
Spectacle Faction Cheers → Media Hype → Sponsor Pressure → Risky Style Shift → Injury → Myth Collapse

======================================================================
SECTION XIII — PLAYER AGENCY & UI SURFACES
======================================================================

Players can:
• View faction approval heatmaps
• Track media personality stances
• Choose to appease or defy blocs
• Leverage polarization for fame at cost of stability

======================================================================
SECTION XIV — CANONICAL GUARANTEES
======================================================================

• No system introduces randomness without cause
• All narrative volatility is traceable
• Crowd turns are earned, not scripted
• Legends rise and fall visibly

======================================================================
END OF CANON

```



## SOURCE 05 — Basho_Tactical_Archetypes_Myth_Sponsor_and_Coaching_Canon_v1.5_Ultra_Granular.md

```md

BASHO — TACTICAL ARCHETYPES, RISK, COACHING, LEGACY, RIVALRIES & MYTH DYNAMICS CANON
v1.5 ULTRA-GRANULAR DEFINITIVE

This document extends v1.4 and integrates:
• Sponsor-driven style pressure scandals
• Player-created coaching philosophies
• Myth collapse events (crowd turns on a legend)

This canon governs identity pressure, institutional conflict, and narrative volatility.

======================================================================
SECTION VI — SPONSOR-DRIVEN STYLE PRESSURE & SCANDALS
======================================================================

1. Sponsor Style Pressure Index (SSPI)

Each major sponsor applies implicit style pressure based on brand identity.

Sponsor Style Preferences:
• Conservative Corporate: Low-risk, orthodox sumo
• Aggressive Corporate: High-dominance, forceful styles
• Media / Entertainment: Volatility, rare kimarite
• Local Kōenkai: Loyalty, perseverance narratives

SSPI is calculated per basho:
SSPI = SponsorTier × PreferenceStrength × MediaVisibility

2. Pressure Outcomes

If SSPI exceeds Rikishi Resistance Threshold:
• Forced archetype drift acceleration
• Increased injury risk (misaligned style)
• Narrative flags: “fighting for the sponsors”

3. Scandal Trigger Conditions

A Sponsor Style Scandal triggers if:
• SSPI > 70
• Performance declines for 2+ basho
• Injury occurs during pressured adaptation

Effects:
• Sponsor withdrawal risk
• Governance review
• Permanent narrative stain

======================================================================
SECTION VII — PLAYER-CREATED COACHING PHILOSOPHIES
======================================================================

1. Philosophy Creation System

Players may define a Coaching Philosophy:
• Core Values (Longevity, Aggression, Innovation, Tradition)
• Risk Posture (Low → Extreme)
• Style Emphasis (Push, Belt, Counter, Hybrid)

Each philosophy generates:
• Drift bias vectors
• Injury tolerance modifiers
• Sponsor alignment changes

2. Adoption & Resistance

Rikishi adopt philosophies based on:
• Style Inertia
• Trust in coach
• Career phase

Resistance creates:
• Slower growth
• Morale penalties
• Media tension

======================================================================
SECTION VIII — MYTH COLLAPSE EVENTS
======================================================================

1. Myth Stability Score (MSS)

Every Myth Tag maintains an MSS:
• Reinforced by success
• Degraded by failure, injury, scandal

2. Collapse Thresholds

If MSS < CollapsePoint:
• Myth flips into Negative Narrative
• Crowd reaction turns hostile
• AI opponents gain psychological edge

Examples:
• “Iron Man” → “Broken Idol”
• “Giant Killer” → “Past His Time”

3. Recovery Paths

Recovery possible via:
• Redemption basho
• Coach-led reinvention
• New myth formation

======================================================================
SECTION IX — FULL SYSTEM INTEGRATION
======================================================================

All systems interact with:
• Combat & Kimarite Engine
• Economy & Sponsor Canon
• Governance & Sanctions
• NPC AI Adaptation
• PBP & Media Narrative
• Historical Almanac

Identity pressure is now:
• Multi-directional
• Deterministic
• Player-readable
• Narratively explosive

======================================================================
END OF CANON

```



## SOURCE 06 — Basho_Tactical_Archetypes_Risk_Injury_Coaching_Legacy_Rivalries_Canon_v1.4_Ultra_Granular.md

```md

BASHO — TACTICAL ARCHETYPES, RISK, COACHING, LEGACY & META INTERACTION CANON
v1.4 ULTRA-GRANULAR DEFINITIVE

This document extends v1.3 and formally integrates:
• Coach archetype × sponsor preference interactions
• Legacy decay vs myth reinforcement
• Player-visible Style School Trees (UI & progression)
• Rivalry-driven archetype hardening

This canon is authoritative for behavioral identity evolution across combat, economy, governance, AI, and narrative systems.

======================================================================
SECTION I — COACH ARCHETYPES × SPONSOR PREFERENCE INTERACTIONS
======================================================================

1. Coach Archetypes (Behavioral Governance Layer)

Each coach (oyakata or senior trainer) has a CoachArchetype that shapes:
• Training emphasis
• Tactical drift pressure
• Sponsor alignment
• Media posture

Canonical Coach Archetypes:
• Traditionalist — conservative, legacy-focused, sponsor-stable
• Innovator — embraces rare kimarite, volatile sponsors
• Taskmaster — results-first, tolerates injury risk
• Caretaker — longevity-first, health-aligned sponsors
• Showman — spectacle-driven, sponsor-attractive

2. Sponsor Preference Mapping

Sponsors have implicit preferences:
• Conservative Corporate → Traditionalist, Caretaker
• Aggressive Corporate → Taskmaster, Innovator
• Bandwagon / Media → Showman
• Local / Kōenkai → Traditionalist

Interaction Rule:
SponsorAffinityScore =
(CoachAlignment × 0.4) +
(StablePrestige × 0.3) +
(StarPower × 0.2) −
(ScandalRisk × 0.1)

Misalignment causes:
• Reduced Kenshō allocations
• Increased churn probability
• Narrative pressure on coach

======================================================================
SECTION II — LEGACY DECAY VS MYTH REINFORCEMENT
======================================================================

1. Legacy Strength Index (LSI)

Every rikishi, coach, and beya maintains an LSI:
• Starts at 0
• Increases via titles, streaks, myth tags
• Decays slowly over inactive or poor-performance periods

2. Decay Formula (Per Basho):
LSI = LSI − (BaseDecay × EraParityModifier)

3. Myth Reinforcement Triggers:
• Repeat achievements reinforce myths
• Coaching lineage propagates myth persistence
• Media narrative boosts slow decay

Example:
“Giant Killer” myth reinforced if Kinboshi recur within 6 basho

======================================================================
SECTION III — STYLE SCHOOL TREES (PLAYER-VISIBLE UI SYSTEM)
======================================================================

1. Style Schools

Each beya exposes a Style School Tree derived from:
• Head coach archetype
• Historical success
• Alumni archetypes

Branches include:
• Oshi Lineage
• Yotsu Lineage
• Counter Lineage
• Hybrid Lineage

2. Tree Mechanics

Nodes unlock:
• Reduced mastery cost for certain kimarite
• Faster archetype drift
• Narrative identity tags

Locked branches require:
• Sponsor support
• Coach authority
• Historical precedent

UI Features:
• Hoverable nodes with alumni examples
• Forecasted drift outcomes
• Risk warnings

======================================================================
SECTION IV — RIVALRY-DRIVEN ARCHETYPE HARDENING
======================================================================

1. Rivalry Intensity Index (RII)

Tracked between:
• Rikishi vs Rikishi
• Beya vs Beya
• Coach vs Coach

RII increases via:
• Frequent matchups
• Close outcomes
• Media framing

2. Hardening Effect

High RII causes:
• Archetype bias amplification
• Reduced adaptability
• Higher injury risk (overcommitment)

Formula:
EffectiveBias = BaseBias × (1 + RII × 0.15)

3. Narrative & AI Effects

• Commentators note “refusal to change”
• AI exploits predictability
• Historic rivalries resist drift longer

======================================================================
SECTION V — SYSTEMIC INTEGRATION SUMMARY
======================================================================

This canon feeds into:
• Combat & Kimarite Engine (biases, risk curves)
• Economy & Sponsors (alignment, churn)
• NPC AI (targeting, adaptation delays)
• Narrative & PBP (identity language)
• Historical Memory & Almanac (legacy arcs)

Nothing here overrides physics.
Everything here shapes intent, evolution, and meaning.

======================================================================
END OF CANON

```



## SOURCE 07 — Basho_Tactical_Archetypes_Risk_Injury_Coaching_and_Legacy_Canon_v1.3_Ultra_Granular.md

```md

# Basho — Tactical Archetypes, Risk, Injury, Coaching, and Legacy Canon v1.3
## Ultra-Granular Identity, Evolution, and Institutional Continuity Specification

Status: IMPLEMENTATION-GRADE / DEFINITIVE  
Scope: Combat Engine, Kimarite Selection, Injury & Fear Modeling, Coaching Systems, Retirement Logic, Legacy Inheritance, Narrative & AI

---

## 1. Grand Design Thesis (Finalized)

A rikishi’s identity in Basho is a **living system** shaped by:

- Tactical intent (Tactical Archetype)
- Physical truth (Leverage Class)
- Risk appetite (Risk Curves)
- Bodily consequence (Injury & Fear)
- Institutional pressure (Coaches & Beya philosophy)
- Time (Aging, decay, experience)
- Memory (Reputation, myth, legacy)

> **Behavior biases intent.  
> Body biases outcomes.  
> Pain reshapes courage.  
> Coaching reshapes habit.  
> Time reshapes all.  
> Legacy outlives the body.**

---

## 2. Coach Archetypes & Philosophies

Coaches themselves have archetypes that influence how they reshape rikishi.

### 2.1 Coach Archetype Enum

1. **Traditional Enforcer**
   - Emphasizes grit, pain tolerance, rank obedience
   - Suppresses fear effects
   - High injury risk, high short-term results

2. **Technical Purist**
   - Focuses on clean kimarite execution
   - Accelerates mastery curves
   - Encourages Yotsu / CounterSpecialist drift

3. **Pragmatic Survivor**
   - Minimizes injury and demotion risk
   - Encourages conservative styles
   - Extends careers, lowers peak

4. **Adaptive Modernist**
   - Reads meta and era parity
   - Encourages Hybrid styles
   - Fastest archetype reshaping

5. **Legacy Master**
   - Imprints personal style on pupils
   - Drives legacy inheritance (see §6)
   - Strong narrative identity

Each coach also has:
- Authority (0–100)
- Patience (slow vs fast reshaping)
- Compassion (fear tolerance)
- Reputation (media bias)

---

## 3. Risk × Injury × Coaching Interaction Loop

### 3.1 Fear Modulation by Coaching

Effective IFI = Base IFI × (1 – CoachFearBuffer)

CoachFearBuffer examples:
- Traditional Enforcer: –0.20 (amplifies fear suppression)
- Pragmatic Survivor: +0.15 (fear acknowledged)
- Legacy Master: contextual (depends on shared style)

---

## 4. Fear → Retirement Decision Modeling

### 4.1 Retirement Pressure Index (RPI)

Each rikishi tracks RPI ∈ [0–100], recalculated per basho.

RPI increases with:
- High IFI sustained over time
- Recurrent injuries to same region
- Demotion threats
- Loss of preferred win condition viability
- Coaching mismatch

RPI decreases with:
- Successful basho outcomes
- Supportive coaching
- Medical recovery success
- Achievement of career milestones

---

### 4.2 Retirement Thresholds

| RPI | Outcome |
|----|---------|
| <40 | Compete normally |
| 40–60 | Public hesitation narratives |
| 60–80 | Withdrawal likelihood rises |
| 80+ | Retirement check triggered |

Retirement checks are deterministic:
- no randomness
- logged with reasons
- historically visible

---

## 5. Career Arc Outcomes

Possible deterministic endpoints:
- Sudden collapse (injury-triggered)
- Gradual decline (fear + age)
- Graceful exit (achievement satisfied)
- Forced exit (demotion spiral)

Each path generates different myth tags.

---

## 6. Style Legacy Inheritance

### 6.1 Legacy Transmission Concept

When a rikishi retires and becomes:
- Oyakata
- Senior Coach
their **style imprint** may pass to recruits.

### 6.2 Inheritance Channels

New rikishi entering a beya may inherit:
- partial tactical bias
- preferred win condition tendencies
- narrative style descriptors

Inheritance strength depends on:
- Coach Archetype
- Authority
- Shared Leverage compatibility
- Time spent training under the coach

This creates:
- recognizable “schools”
- dynastic styles
- generational identity

---

## 7. AI & Meta Effects

AI managers track:
- coach archetypes
- legacy schools
- retirement risk

They adapt recruitment, match strategy, and sponsorship focus accordingly.

---

## 8. Narrative & Historical Integration

All systems feed:
- PBP language
- Almanac entries
- Hall of Fame plaques
- Era labels (“The Age of the Iron Wall”)

Legacy Masters may be remembered more for pupils than titles.

---

## 9. Canonical Guarantees

- No sudden personality flips
- No hidden dice in retirement
- Coaching influence is visible and logged
- Legacy is explainable and inspectable

---

## 10. Final Canon Rule

> **Basho is not about matches.  
> It is about how bodies, fear, and teaching shape time.  
> Champions fall.  
> Styles remain.**

---

```



## SOURCE 08 — Basho_Tactical_Archetypes_Risk_Injury_and_Coaching_Canon_v1.2_Ultra_Granular.md

```md

# Basho — Tactical Archetypes, Risk, Injury Feedback, Drift, and Coaching Canon v1.2
## Ultra-Granular Identity, Behavior, and Evolution Specification

Status: IMPLEMENTATION-GRADE / DEFINITIVE  
Scope: Combat Engine, Kimarite Selection, Injury Modeling, Career Evolution, Coaching, Narrative, AI

---

## 1. Reaffirmed Design Thesis

A rikishi’s fighting identity is *not static* and not purely physical.
It is shaped by:

- Behavioral intent (Tactical Archetype)
- Physical reality (Leverage Class)
- Risk appetite (Risk Tolerance Curves)
- Bodily consequence (Injury History)
- Institutional pressure (Coaching & Beya philosophy)
- Public perception (Crowd & Media Bias)

> **Behavior biases intent.  
> Body biases outcomes.  
> Injury induces fear.  
> Coaching reshapes habit.  
> History creates legend.**

---

## 2. Risk × Injury Feedback Loops (Fear as a System)

### 2.1 Concept

In Basho, injuries are **not isolated events**.
They leave *psychological and tactical residue* that feeds back into decision-making.

This is modeled explicitly as a **Risk Suppression Feedback Loop**.

---

### 2.2 Injury Fear Index (IFI)

Each rikishi tracks an `InjuryFearIndex` ∈ [0.0 – 1.0]

IFI increases deterministically when:
- sustaining a moderate or major injury
- re-injuring the same body region
- competing while injured
- public “fragile” stigma is applied (e.g. Glass Giant)

IFI decays slowly when:
- completing basho without injury
- medical recovery exceeds expectations
- coaching intervention succeeds

---

### 2.3 IFI Effects on Risk Curves

EffectiveRisk = BaseRisk × (1 – IFI × SuppressionFactor)

SuppressionFactor depends on archetype:

| Archetype | SuppressionFactor |
|----------|-------------------|
| Oshi Specialist | 0.60 |
| Yotsu Specialist | 0.45 |
| Speedster | 0.75 |
| Trickster | 0.30 |
| All-Rounder | 0.40 |
| HybridOshiYotsu | adaptive |
| CounterSpecialist | 0.20 |

Result:
- previously aggressive rikishi become hesitant
- collapse probability drops
- counter susceptibility may rise

This produces:
- visible style softening
- “gun-shy” narratives
- late-career transformations

---

### 2.4 Injury-Specific Fear Channels

Fear is body-part specific and feeds into kimarite gating:

| Injury Region | Suppressed Families |
|--------------|---------------------|
| Knee/Ankle | Trips, explosive drives |
| Shoulder | Throws, lifts |
| Neck/Spine | High-impulse collisions |
| Elbow/Wrist | Grip-heavy techniques |

Suppression is gradual, not binary.

---

## 3. Coach-Driven Archetype Reshaping

### 3.1 Coaches as Behavioral Modifiers

Coaches are not stat sticks.
They exert **long-term pressure** on:

- Tactical Archetype drift
- Risk appetite moderation
- Preferred Win Condition emphasis

Each coach has:
- Philosophy (Aggressive / Conservative / Technical / Adaptive)
- Authority (soft vs hard enforcement)
- Patience (time-to-effect)

---

### 3.2 Coaching Influence Channels

Coaching effects apply via **training seasons**, not mid-bout.

Channels:
1. Bias table nudging
2. Risk curve reshaping
3. Mastery focus reallocation
4. Injury avoidance emphasis

---

### 3.3 Archetype Reshaping Paths

Examples:

| Coach Philosophy | Effect |
|----------------|--------|
| Conservative | Oshi → All-Rounder |
| Technical | Oshi → Yotsu |
| Adaptive | All-Rounder → Hybrid |
| Defensive | Speedster → CounterSpecialist |

Reshaping:
- takes 6–12 basho
- visible in narrative
- reversible if coach leaves

---

### 3.4 Coach vs Rikishi Resistance

Each rikishi has `StyleInertia` ∈ [0–100]

- High inertia resists reshaping
- Injuries lower inertia
- Aging lowers inertia
- Success raises inertia

EffectiveCoachImpact = CoachAuthority × (1 – StyleInertia)

---

## 4. Combined Drift Model (Injury + Coaching + Time)

Archetype drift is now driven by three forces:

1. Performance outcomes
2. Injury fear accumulation
3. Coaching pressure

Drift resolves as:
- blended bias tables
- narrative “transition periods”
- mixed style descriptors

No sudden flips.

---

## 5. Narrative & Media Integration

### 5.1 Fear Narratives

IFI thresholds trigger narrative beats:
- “hesitant to commit weight”
- “protecting the knee”
- “no longer throwing with abandon”

### 5.2 Coaching Narratives

- “under new guidance…”
- “a more measured approach”
- “stable philosophy taking hold”

These are deterministic, not scripted.

---

## 6. AI Adaptation (Extended)

AI managers read:
- IFI level
- injury region
- coach philosophy

Example:
- High knee IFI → AI increases lateral pressure
- Conservative coach → AI expects fewer risky finishes

---

## 7. Canonical Guarantees

- Injury never directly changes archetype; it *pressures* it
- Coaching never overrides physics
- Fear is gradual, reversible, and legible
- Narrative always reflects engine truth

---

## 8. Final Canon Rule

> **Pain teaches caution.  
> Time teaches patience.  
> Coaching teaches discipline.  
> Legends are those who adapt.**

---

```



## SOURCE 09 — Basho_Tactical_Archetypes_Risk_Drift_and_Narrative_Canon_v1.1_Ultra_Granular.md

```md

# Basho — Tactical Archetypes, Risk, Drift, and Narrative Interaction Canon v1.1
## Ultra-Granular Design & Implementation Specification

Status: IMPLEMENTATION-GRADE / DEFINITIVE  
Scope: Combat Engine, Kimarite Selection, Career Evolution, Narrative & Media Systems, AI Adaptation

---

## 1. Design Philosophy (Reaffirmed)

Basho combat identity is not static. A rikishi is defined by:
- **Intent** (Tactical Archetype)
- **Body** (Leverage Class)
- **Risk Appetite** (Risk Tolerance Curve)
- **Experience** (Technique Mastery)
- **History** (Myth Tags)
- **Perception** (Crowd & Media Bias)

> **Behavior biases intent. Body biases outcomes. Risk shapes decisions. History creates legend.**

---

## 2. Tactical Archetypes (Behavioral Policy)

Canonical archetypes (engine-truth):

1. Oshi Specialist  
2. Yotsu Specialist  
3. Speedster  
4. Trickster  
5. All-Rounder  
6. HybridOshiYotsu  
7. CounterSpecialist

Archetypes bias *attempted solutions*, never physical possibility.

---

## 3. Risk Tolerance Curves (Per-Archetype)

Each Tactical Archetype has a **risk tolerance curve** defining how aggressively it:
- commits weight forward
- attempts low-probability finishes
- accepts edge pressure
- resists disengagement

RiskTolerance ∈ [0.0 – 1.0], recalculated per bout phase.

### 3.1 Base Risk Curves

| Archetype | Early Bout | Mid Bout | Late Bout | Edge Proximity |
|----------|------------|----------|-----------|----------------|
| Oshi Specialist | 0.75 | 0.85 | 0.90 | 0.95 |
| Yotsu Specialist | 0.55 | 0.65 | 0.75 | 0.80 |
| Speedster | 0.45 | 0.55 | 0.70 | 0.60 |
| Trickster | 0.65 | 0.75 | 0.85 | 0.90 |
| All-Rounder | 0.50 | 0.60 | 0.65 | 0.70 |
| HybridOshiYotsu | adaptive | adaptive | adaptive | adaptive |
| CounterSpecialist | 0.30 | 0.40 | 0.55 | 0.65 |

Risk modifies:
- impulse overcommit chance
- counter vulnerability
- injury probability multipliers

---

## 4. Archetype Drift (Career Evolution)

Tactical Archetypes are **not locked for life**.

### 4.1 Drift Triggers
Drift is deterministic and slow. It may occur if:

- repeated failure using primary archetype
- long-term injury accumulation
- aging + loss of speed/power
- coaching intervention
- successful adoption of secondary techniques

### 4.2 Drift Paths (Examples)

| From | To | Condition |
|----|----|----------|
| Speedster | Trickster | Speed < 40, Age > 30 |
| Oshi Specialist | All-Rounder | Repeated edge collapses |
| Yotsu Specialist | CounterSpecialist | Injury history + high experience |
| All-Rounder | Yotsu Specialist | Sustained belt success |

Drift:
- takes 6–12 basho
- gradually blends bias tables
- is visible narratively (“changing style” headlines)

---

## 5. Per-Kimarite Numeric Bias Tables

Each kimarite has **explicit per-archetype modifiers** applied *after* family bias.

### 5.1 Example (Subset)

| Kimarite | Oshi | Yotsu | Speedster | Trickster | Counter |
|---------|------|-------|-----------|-----------|---------|
| Oshidashi | 1.40 | 0.70 | 0.60 | 0.65 | 0.75 |
| Yorikiri | 0.80 | 1.50 | 0.70 | 0.75 | 0.85 |
| Katasukashi | 0.60 | 0.65 | 1.40 | 1.20 | 1.10 |
| Hatakikomi | 0.75 | 0.60 | 1.10 | 1.50 | 1.30 |
| Uwatenage | 0.70 | 1.45 | 0.65 | 0.80 | 0.90 |

(All 82 kimarite follow this schema in the full table.)

---

## 6. Crowd & Media Bias System

Crowd and media perception feeds back into:
- narrative tone
- pressure situations
- AI expectation modeling

### 6.1 Crowd Bias Modifiers

CrowdBias ∈ [–1.0 to +1.0]

Influenced by:
- Myth Tags
- Archetype stigma (e.g. Trickster)
- Recent injuries
- Venue memory

Examples:
- Trickster overuse → negative bias (“skepticism”)
- Iron Man → positive bias (“admiration”)

Bias affects:
- narrative intensity escalation
- crowd shock magnitude on upsets

---

## 7. Media Framing & Headlines

Media tone is archetype-aware.

Examples:
- Oshi collapse → “Overcommitment punished”
- Speedster loss → “Ran out of angles”
- CounterSpecialist win → “Waited, then struck”

Media framing never alters combat outcomes but shapes:
- long-term reputation
- sponsor interest
- myth tag likelihood

---

## 8. AI Adaptation (Extended)

AI managers track:
- opponent archetype
- risk tolerance curve
- drift trajectory
- myth tags
- crowd bias

### 8.1 Example Rules

- Against high-risk Oshi late basho → increase pull/trip attempts
- Against drifting Speedster → force clinch
- Against CounterSpecialist → reduce overextension

AI reactions respect meta-drift delays.

---

## 9. Guarantees

- No randomness beyond seeded resolution
- Drift is slow, visible, and explainable
- Narrative never contradicts engine truth
- Identity evolves but remains legible

---

## 10. Final Canon Rule

> **The engine enforces reality.  
> Risk creates tension.  
> Time shapes style.  
> The crowd remembers everything.**

---

```



## SOURCE 10 — Basho_Tactical_Archetypes_Identity_and_Narrative_Canon_v1.0_Ultra_Granular.md

```md

# Basho — Tactical Archetypes, Leverage Classes, and Identity Interaction Canon v1.0
## Ultra-Granular Design & Implementation Specification

Status: IMPLEMENTATION-GRADE / DEFINITIVE  
Scope: Combat Engine, Kimarite Selection, Narrative Binding, AI Adaptation

---

## 1. Purpose and Design Philosophy

This document defines the **identity layer** of Basho combat: how a rikishi’s
*behavioral intent*, *physical reality*, and *career myth* interact deterministically
to produce believable behavior, earned upsets, and legendary narrative moments.

Core rule:

> **Behavior biases intent. Body biases outcomes. History creates myth.**

---

## 2. Tactical Archetypes (Behavioral Policy Layer)

Tactical Archetypes define *what a rikishi tries to do* under pressure.
They bias decision-making but never override physics, stance, leverage, or edge rules.

### Canonical Tactical Archetypes

1. **Oshi Specialist** – push/thrust pressure focus  
2. **Yotsu Specialist** – belt/grapple focus  
3. **Speedster** – agility, trips, evasion  
4. **Trickster** – reversals, slap-downs  
5. **All-Rounder** – balanced  
6. **HybridOshiYotsu** ** – adaptive switch-hitter  
7. **CounterSpecialist** ** – reactive, counter-focused  

---

## 3. Leverage Classes (Physical Interaction Layer)

Leverage Classes are computed from physique and determine physical interaction outcomes.

- Compact Anchor
- Long Lever
- Top-Heavy
- Mobile Light
- Standard

---

## 4. Kimarite Selection Pipeline (Authoritative)

1. Viability Gates  
2. Base Tier Weights  
3. Physics Multipliers  
4. Tactical Archetype Bias  
5. Technique Mastery  
6. Preferred Win Condition Bias  

---

## 5. Numeric Bias Tables  
### Tactical Archetype × Kimarite Family

| Archetype | Push | Belt/Throw | Trip | Pull | Counter |
|----------|------|------------|------|------|---------|
| Oshi Specialist | 1.45 | 0.85 | 0.70 | 0.60 | 0.80 |
| Yotsu Specialist | 0.70 | 1.50 | 0.75 | 0.65 | 0.85 |
| Speedster | 0.80 | 0.75 | 1.45 | 1.20 | 1.00 |
| Trickster | 0.75 | 0.70 | 1.10 | 1.50 | 1.35 |
| All-Rounder | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| HybridOshiYotsu | 1.20 | 1.20 | 0.85 | 0.75 | 0.90 |
| CounterSpecialist | 0.65 | 0.80 | 0.90 | 1.10 | 1.60 |

---

## 6. Preferred Win Condition

- ForceOutFinish
- ThrowFinish
- TripFinish
- PullFinish
- CounterFinish

Adds +10–25% weight to eligible finishers.

---

## 7. Narrative Phrase Pools (Identity-Keyed)

Phrase pools are keyed by:
- Tactical Archetype
- Leverage Class
- Preferred Win Condition
- Myth Tags

Pools are deterministic, intensity-gated, and non-repeating within a basho.

---

## 8. Myth Tags (Career Reputation Layer)

Examples:
- Iron Man
- Glass Giant
- Giant Killer
- Eternal Sekiwake
- Late Bloomer

Affect crowd, AI adaptation, and narrative tone.

---

## 9. AI Adaptation Rules (Myth-Driven)

Examples:
- **Glass Giant:** late basho AI targets legs (+20% trip bias)
- **Iron Man:** AI pressures fatigue
- **Giant Killer:** AI defensive posture increases

---

## 10. Final Rule

> **The engine knows truth.  
> The narrative speaks it.  
> The player remembers the legend.**

---

```


---

### Annex 2 — Basho_Talent_Pools_and_Pipelines_Canon_v1.1 (verbatim)
<a id="annex-2--basho_talent_pools_and_pipelines_canon_v11"></a>

---

# Basho — Talent Pools & Institutional Pipelines Canon v1.0
## Ultra-Granular, Implementation-Grade Specification (Foundations Layer)

**Status:** DEFINITIVE (Foundations-owned)  
**Scope:** Procedural generation and lifecycle of *available people* and *institutional candidates* in the world:
- New **rikishi intake pools** (domestic + foreign)
- **Staff / coach labor markets**
- **Oyakata / kabu successor pools**
- **Officials & support roles** (medical, admin, scouts)
- **Pipelines** between these pools (e.g., retired rikishi → coach → oyakata candidate)
- **Visibility / scouting / fog-of-war** constraints on pools
- Deterministic refresh cadence, competition, and depletion rules

**Out of scope:** bout resolution, banzuke math, economy amounts (those consume pool outputs).  
**Design mandate:** deterministic, replay-safe, non-random-feeling, and larger/denser than any implied references.

---

## 0. Why Pools Exist (Design Laws)

### 0.1 Scarcity is gameplay
Pools are the **supply-side physics** of Basho. They create:
- genuine competition (AI and player fighting over the same candidates)
- narrative plausibility (eras of talent drought/booms)
- difficulty that emerges from world state (not sliders)
- governance pressure (kabu scarcity, succession crises)
- economic pressure (wage inflation, sponsor confidence tied to “star supply”)

### 0.2 Pools are not “spawns”
A pool is **a finite, persistent set of candidates** with:
- identity
- history
- competing suitors
- eligibility gates
- visibility constraints

### 0.3 Determinism
All pool outcomes are deterministic functions of:
- `WorldSeed`
- `EraSeed` (derived from WorldSeed + decade index)
- `CalendarIndex` (year/week/month)
- `InstitutionState` snapshots (prestige, scandals, sanctions, finances)
- `PoolState` (who is already in/out, who was hired, who is locked)

No runtime RNG.

---

## 1. Canonical Pool Types (World Truth)

### 1.1 Primary Pools (People)
1) **Rikishi Intake Pool (Domestic)**  
2) **Rikishi Intake Pool (Foreign)**  
3) **Staff Labor Pool** (coaches, conditioning, admin, scouts, etc.)  
4) **Medical Labor Pool** (doctors, physios, therapists)  
5) **Oyakata Candidate Pool** (kabu-eligible succession candidates)

### 1.2 Secondary Pools (Institutional roles)
6) **Officials Pool** (gyoji candidates, yobidashi candidates, tokoyama candidates) — optional if modeled  
7) **Media / PR Pool** (journalists, commentators) — optional, narrative only

> Note: Sponsors are “actors” but are specified in the sponsor canon. This document only provides *people pools* and pipelines.

---

## 2. Shared Data Model (All Pools)

### 2.1 Pool Identity
Each pool is uniquely identified:
- `poolId = hash(WorldSeed, PoolType, Region?, EraIndex?)`

### 2.2 Pool State Object
```ts
TalentPoolState {
  poolId
  poolType
  refreshCadence: "weekly" | "monthly" | "basho" | "yearly"
  populationCap: number               // maximum listed candidates at once
  hiddenReserveCap: number            // unseen candidates (fog-of-war buffer)
  candidatesVisible: CandidateId[]
  candidatesHidden: CandidateId[]
  lastRefreshTick: number
  scarcityBand: "plentiful" | "normal" | "tight" | "scarce" | "crisis"
  qualityBand: "low" | "normal" | "high" | "golden_age"
  churnRules: ChurnRuleSet
  eligibilityRules: EligibilityRuleSet
}
```

### 2.3 Candidate Object (Normalized)
All candidates share a base schema; role-specific extensions apply.

```ts
CandidateBase {
  candidateId
  personId                     // permanent identity id if promoted into world
  name
  birthYear
  originRegion
  nationality
  citizenshipFlags             // supports dual citizenship
  visibilityBand               // what the player can know without scouting
  reputationSeed               // latent reputation potential
  scandalFlags?                // if any (rare at entry)
  tags[]                       // narrative tags (e.g., "disciplined", "volatile")
  availabilityState: "available" | "in_talks" | "signed" | "locked" | "withdrawn"
  competingSuitors: SuitorRef[]
}
```

### 2.4 SuitorRef
```ts
SuitorRef {
  beyaId
  interestBand: "low"|"medium"|"high"|"all_in"
  offerType: "standard"|"aggressive"|"prestige_pitch"|"covert"
  deadlineTick
}
```

---

## 3. Visibility, Scouting, and Fog-of-War (Pool Layer)

### 3.1 Visibility bands
Candidates have a **VisibilityBand** that controls what is revealed:

| Band | Player can see by default |
|---|---|
| Public | Name, age, origin, headline traits |
| Rumored | Name + vague descriptor (“strong amateur record”) |
| Obscure | Only existence (“unknown prospect in region”) |
| Hidden | Not listed until discovered |

### 3.2 Scouting reveals, not creates
Scouting:
- moves candidates from `Hidden` → `Obscure` → `Rumored` → `Public`
- increases precision of competence bands
- reveals hidden tags (injury risk, temperament, corruption risk)

### 3.3 AI symmetry rule
NPC stables operate under **the same pool**.
They may have different scouting reach, but **cannot access non-existent candidates**.

---

## 4. Rikishi Intake Pools (Domestic + Foreign)

### 4.1 Intake cadence
Rikishi intake refreshes **yearly** with **monthly trickle**:

- **Yearly intake generation**: creates the new cohort (ages 15–19 typical, tunable)
- **Monthly trickle**: reveals subsets of the cohort based on scouting visibility

This prevents “January hiring rush only” behavior.

### 4.2 Domestic intake generation (deterministic)
Generated from:
- `EraQualityBand`
- `RegionTalentBand`
- `InstitutionPrestigeBand` (sumo popularity)
- recent scandal pressure (reduces intake)

Outputs:
- cohort size
- distribution of body potentials (height/weight potentials)
- distribution of talent seeds
- distribution of temperament tags

### 4.3 Foreign intake generation
Foreign intake is generated as a **separate pool** with gates:

- pool size is limited per year (world plausibility + foreigner rule pressure)
- candidates have nationality and citizenship metadata
- **Dual citizenship** is allowed:
  - `citizenshipFlags = {primary, secondary?}`
  - eligibility for “foreigner slot” depends on governance rule:
    - default: **foreign slot applies unless Japanese citizenship exists**
    - optional: apply stricter interpretation if desired

### 4.4 Foreigner limits integration (hard rule)
When evaluating a candidate signing:
- if candidate counts as “foreign” under the rule,
- and beya already has max foreign quota,
- candidate cannot be signed (UI must explain).

The pool system does **not** override governance.

### 4.5 Recruitment competition model
When a candidate is visible:
- eligible stables compute interest bands deterministically:
  - need (roster gaps)
  - prestige pitch
  - finances
  - scandal risk tolerance
  - rivalry pressures

Candidate has a preference model (deterministic):
- stability preference (prestige)
- development preference (coach reputation)
- location preference (region ties)
- risk preference (aggressive offers vs safety)

Signing resolves as:
- **offer window** (weeks)
- **resolution tick** where candidate chooses highest utility offer
- candidates can remain unsigned and drift into obscurity (withdrawn state)

### 4.6 “Amateur star” injection
To create headline prospects, the pool can create rare “amateur star” candidates:
- very high talent seed
- high public visibility
- many suitors
- strong preference rules (prestige + coach quality)

This is deterministic, rare, and era-weighted.

---

## 5. Staff / Coach Labor Pools

### 5.1 Staff categories
Staff pool includes:
- technique coaches
- conditioning coaches
- nutritionists
- scouts
- administrators
- mental coaches (rare)

Medical pool is separate (see §6).

### 5.2 Supply generation
Supply is generated from:
- retired staff exits
- retired rikishi pipeline (see §7)
- “external professional” pipeline (rare, expensive, high variance)
- scandal expulsions (reduce supply)

Cadence: **monthly refresh**, with some yearly graduation events.

### 5.3 Staff candidate attributes
Staff candidates have:
- competence bands (primary/secondary)
- career phase (apprentice/established/senior)
- reputation band
- loyalty bias (e.g., prefers certain stable styles)
- scandal exposure risk

### 5.4 Hiring competition
Hiring uses the same suitor mechanism:
- stables bid with salary bands + role + narrative pitch
- candidate preference includes:
  - salary
  - prestige
  - stability (welfare, compliance)
  - autonomy (will they be blamed)
  - rivalry considerations (avoid hated stable)

### 5.5 Replacement pressure
When a stable loses staff (retirement/scandal/poaching):
- it must fill role or accept operational penalties
- AI will preemptively hire if risk signals rise

---

## 6. Medical Labor Pool (Welfare Critical)

### 6.1 Why separate
Medical staff affects:
- injury escalation curves
- welfare risk accumulation
- scandal triggers (negligence)
- governance sanctions

Thus medical supply must be explicitly scarce.

### 6.2 Cadence and scarcity
Cadence: **monthly**
Scarcity bands are influenced by:
- era (medical modernity)
- scandal climate (doctors avoid risky stables)
- economy (can you pay)

### 6.3 Medical credential gating
Medical candidates have credential tiers:
- basic
- certified
- elite

A stable under investigation may be restricted to certified+.

### 6.4 Liability memory
Medical candidates track:
- “prior scandal association”
- “complaint history”
They may refuse offers from stables with a bad welfare record.

---

## 7. Oyakata & Kabu Successor Pools

### 7.1 Kabu scarcity is structural
The kabu successor pool is not “generated freely.”
It is constrained by:
- kabu availability
- candidate eligibility (years served, reputation)
- council tolerance

### 7.2 Candidate sources (pipelines)
Candidates enter the pool from:
- retiring rikishi with sufficient reputation
- assistant oyakata promotions
- institutional administrators (rare)
- council appointments (very rare)

### 7.3 Eligibility gates (deterministic)
A candidate is eligible if:
- meets age + service requirements (configurable)
- reputation above threshold
- scandal exposure below threshold
- council relations not hostile

### 7.4 Succession competition
When a kabu becomes available:
- eligible candidates appear in the pool (visible to relevant actors)
- stables/council factions may back candidates
- outcomes are deterministic and recorded in governance history

---

## 8. Pipelines (The Heart of the System)

Pipelines are **state machines** that move people between pools.

### 8.1 Pipeline: Rikishi → Retired
Trigger conditions:
- retirement decision
- forced retirement (injury/governance)
Outputs:
- retired personId persists
- enters “post-career roles consideration”

### 8.2 Pipeline: Retired Rikishi → Coach Candidate
Eligibility:
- technical style fit
- reputation
- temperament tags
- willingness preference

This produces a new candidate in Staff Pool with:
- “ex-rikishi” tag
- technique competence bias tied to former style/archetype

### 8.3 Pipeline: Coach → Assistant Oyakata
Eligibility:
- tenure at beya
- loyalty band
- council reputation
- kabu plan exists

### 8.4 Pipeline: Assistant Oyakata → Oyakata Candidate Pool
A candidate enters the kabu pool when:
- kabu opportunity exists OR candidate seeks one
- candidate meets eligibility gates

### 8.5 Pipeline: Scandal → Expulsion / Cooling-off
Staff or coaches can be:
- suspended (cooling off pool, time-locked)
- expelled (permanent removal from eligible pools)
- rehabilitated (rare, requires clean years + narrative repair)

All outcomes are deterministic and logged.

---

## 9. Era Drift & Macro Supply (Boons and Droughts)

### 9.1 EraQualityBand
Every decade (or configurable window), the world computes:
- `EraQualityBand` for rikishi
- `EraStaffBand` for coaches/medical
- `EraPopularityBand` for sumo as institution

Derived deterministically from:
- historical prestige
- scandal climate
- sponsor health
- “legendary generation” memory

### 9.2 Effects
- Golden age: more high-end prospects, more sponsors, more staff supply
- Drought: fewer prospects, higher wage pressure, more risky hires
- Scandal era: reduced intake, reduced medical supply, harder governance

---

## 10. Pool Depletion, Locking, and Churn

### 10.1 Depletion
Once signed:
- candidate moves to `signed`
- removed from other stables’ visible lists
- identity promoted to a world person

### 10.2 Locking
Some candidates are “locked” due to:
- age (not ready)
- eligibility not met
- ongoing investigations
- visa/citizenship restrictions

### 10.3 Churn
Unsold candidates may:
- withdraw (join other life path)
- become obscure
- reappear later via “late starter” rule (rare)

Churn is deterministic and explained by narrative tags.

---

## 11. Interaction Hooks (Cross-System Contracts)

This section specifies **exactly who consumes what** from pools.

### 11.1 Beya Management consumes:
- candidate lists (staff and rikishi)
- scarcity bands (for decision weighting)
- replacement time-locks

### 11.2 NPC Manager AI consumes:
- visibility-filtered candidate lists
- scarcity + quality bands
- rival hiring events (narrative + strategy)

### 11.3 Economy consumes:
- wage pressure index derived from staff scarcity
- sponsor confidence (indirectly affected by star supply)

### 11.4 Governance consumes:
- kabu candidate pool membership
- eligibility flags
- scandal rehabilitation timers

### 11.5 Narrative / Journals consumes:
- “signing events”
- “poaching events”
- “succession appointment events”
- “drought/boom” era announcements

---

## 12. Event Taxonomy (Pool Events)

Pools emit canonical events:

| Event | Payload |
|---|---|
| CandidateRevealed | candidateId, poolId, visibilityBand |
| OfferSubmitted | candidateId, beyaId, offerBand |
| CandidateSigned | personId, beyaId, contractType |
| CandidateWithdrawn | candidateId, reasonTag |
| StaffPoached | staffId, fromBeyaId, toBeyaId |
| KabuVacancyOpened | kabuId |
| KabuAssigned | kabuId, candidateId |
| EraBandShifted | eraIndex, bandType, newBand |

All events are deterministic, loggable, and replay-safe.

---

## 13. UI Surfaces (Narrative-first)

### 13.1 Player-facing language
Players see:
- “The amateur scene is brimming this year.”
- “Medical staff are scarce; reputations travel fast.”
- “A promising teenager is rumored in Kyushu.”

Players do not see:
- raw pool sizes
- hidden reserve counts
- exact preference utilities

### 13.2 Stable selection (difficulty)
When picking a stable, the UI shows:
- stable stature
- coach quality
- recruiting reach
- sponsor base

This indirectly changes pool access via visibility/scouting capacity.

---

## 14. Implementation Notes (Non-negotiable)

### 14.1 No duplicated generation
Pools are the only generator of new people.  
No other system may “create a coach” or “spawn a prospect.”

### 14.2 Identity promotion
Only when signed does a Candidate become a full Person (world entity).

### 14.3 Auditability
Every pool change must create:
- ledger line (if economic)
- governance log (if political)
- narrative memory entry (if notable)

---

## 15. Annex — Integration Checklist (Where to Reference This Doc)

Add delegation notes to:
- Foundations / World Entry: “Population intake uses Pools Canon v1.0”
- Beya Staff & Welfare: “Staff hiring uses Pools Canon v1.0”
- NPC Manager AI: “AI hiring uses Pools Canon v1.0”
- Governance: “Kabu candidates come from Pools Canon v1.0”
- Scouting/Fog-of-War: “Visibility bands defined in Pools Canon v1.0”
- Narrative/Journals: “Signing and poaching events defined in Pools Canon v1.0”

---

**END OF DOCUMENT**



---

# APPENDIX A — Worked Example Year (Implementation Test Case)

This appendix provides a deterministic “one year in the world” timeline showing:
- pool refresh cadence
- visibility reveal
- recruitment competition
- staff poaching
- medical scarcity event
- kabu vacancy + assignment
- event emissions and which systems consume them

It is intended as a **QA harness spec**: engineers can simulate this exact year and assert identical event logs.

## A0. Setup (Fixed Seeds & Starting Conditions)

### A0.1 Seeds
- WorldSeed: `0xSL-2037-ALPHA`
- EraIndex: `2030s-2` (derived)
- Calendar Year: `2037`

### A0.2 Institution Snapshot at Year Start (Bands only)
- National prestige: **High**
- Scandal climate: **Normal**
- Sponsor health: **High**
- Council tolerance: **Normal**
- Medical labor scarcity: **Tight**
- Recruitment popularity (sumo intake): **High**

### A0.3 Player Stable (for example)
- Beya: **Kitasakura-beya**
- Stature: **Mid-table**
- Recruiting reach: **Adequate**
- Staff quality: **Adequate**
- Foreign slot used: **0 / 1**
- Welfare record: **Compliant**
- Finances: **Stable**

### A0.4 Example NPC Stables (for competition)
- **Tenkō-beya** (elite, high prestige, aggressive recruitment)
- **Minatogawa-beya** (low prestige, bargain hunting)
- **Shiranui-beya** (mid prestige, staff-heavy development)

---

## A1. Yearly Intake Generation (January 1)

### A1.1 Domestic Rikishi Intake Pool — Cohort Generation
Pool refresh: **yearly**
- Cohort size generated: **N = 42** (hidden reserve + visible list cap applied)
- Visible cap: **12**
- Hidden reserve: **30**

Outcome bands:
- 4 “headline” prospects (Public/Rumored)
- 14 “strong” prospects (Rumored/Obscure)
- 24 “longshot” prospects (Obscure/Hidden)

Emitted events:
- `EraBandShifted` (if decade-level recalculated)
- *No CandidateRevealed events yet* (reveals happen monthly via trickle)

### A1.2 Foreign Rikishi Intake Pool — Cohort Generation
- Cohort size: **N = 6**
- Visible cap: **3**
- Hidden reserve: **3**
- Dual citizenship candidates: **1** (flagged)

Eligibility:
- Counts toward foreign quota unless Japanese citizenship exists (default rule)

---

## A2. Monthly Trickle & Scouting Reveals (Jan–Dec)

Each month, pools execute:
1) Reveal pass (moves some Hidden → Obscure, Obscure → Rumored, Rumored → Public)
2) Suitor interest recompute pass
3) Offer window resolution pass for candidates whose deadline arrives

### A2.1 January Reveal
Domestic reveals:
- 2 candidates become **Public** (headline prospects)
- 3 become **Rumored**
Foreign reveals:
- 1 becomes **Public**, 1 becomes **Rumored**

Emitted:
- `CandidateRevealed` × 7

Consumption:
- Scouting/UI: updates “rumor board”
- NPC AI: computes interest bands
- Narrative/Journals: may create “New Year Prospects” article if Public reveals ≥2

### A2.2 February: First Offer Window Opens
Player stable scouts a Rumored domestic prospect (Candidate D-07) → becomes Public.

Player submits offer:
- Offer type: `prestige_pitch` (narrative promise of fast development)
NPC stables submit:
- Tenkō: `aggressive`
- Shiranui: `standard`

Emitted:
- `OfferSubmitted` × 3

Candidate preference resolution tick (end of Feb):
- Candidate chooses **Tenkō** (highest utility; prestige dominates)

Emitted:
- `CandidateSigned` (personId promoted)
- Narrative hook: “Elite stable secures top amateur”

### A2.3 March: Staff Market Refresh + Poaching
Staff pool monthly refresh reveals a Senior Technique Coach candidate (S-22) Public.

Shiranui offers high salary band; player offers standard.
Coach prefers Shiranui (autonomy + prestige).

Emitted:
- `CandidateSigned` (staff)
- If coach came from another stable: `StaffPoached` (not in this case)

### A2.4 April: Medical Scarcity Shock
Medical pool scarcity band shifts: **Tight → Scarce** (deterministic due to high national injury rate + scandal climate drift).

Effects:
- fewer candidates revealed
- certified/elite candidates raise refusal probability for scandal-marked stables

Emitted:
- `EraBandShifted` (bandType = medical_supply)

Consumption:
- Beya Welfare: raises hiring urgency
- NPC AI: reduces risky training choices
- Narrative: “Medical staff scarce across the stables”

### A2.5 May: Player Signs First Recruit
Candidate D-19 (Rumored) chooses player stable due to:
- development promise
- low scandal risk
- local region tie

Emitted:
- `CandidateSigned` (rikishi)

World effects:
- Beya roster grows
- Training pipeline activates
- Narrative: “Quiet signing with local roots”

### A2.6 June: Foreign Candidate & Quota Check
Foreign candidate F-02 becomes Public. Player attempts offer.

Quota check:
- Player foreign slot used: 0/1 → eligible
Candidate has dual citizenship but no Japanese flag → counts foreign.

NPC Tenkō also offers.
Candidate chooses player due to “opportunity to become stable centerpiece” utility.

Emitted:
- `CandidateSigned` (foreign rikishi)
- Narrative: “Foreign prospect commits to Kitasakura-beya”

### A2.7 July: Candidate Withdrawals & Churn
Two longshot domestic candidates time out, withdraw (education path).

Emitted:
- `CandidateWithdrawn` × 2 (reasonTag: “returns_to_school”)

Consumption:
- Pools: reduce hidden reserve
- Narrative: generally none (unless notable)

### A2.8 August: Mid-year Amateur Star Injection (Rare)
A deterministic “amateur star” event triggers (era band + year index).

Candidate STAR-01 appears immediately **Public** with many suitors.
Offer war:
- Elite stables bid aggressively
- Player can bid but utility is usually dominated

Outcome:
- STAR-01 signs to Tenkō.

Emitted:
- `CandidateRevealed`
- `OfferSubmitted` × many
- `CandidateSigned`

Narrative:
- Major headline guaranteed

### A2.9 September: Staff Burnout Replacement
A mid-table stable loses Medical Staff to retirement; triggers replacement hiring.
A certified doctor candidate accepts Shiranui due to strong welfare record.

Emitted:
- `CandidateSigned` (medical staff)

### A2.10 October: Kabu Vacancy Opens
An oyakata retires → kabu vacancy event.

Emitted:
- `KabuVacancyOpened`

Candidate pool construction:
- eligible candidates enumerated deterministically
- two assistant oyakata + one retired rikishi appear as candidates

Emitted:
- `CandidateRevealed` (oyakata candidates) × 3

Council factions preference:
- favor clean record + continuity

Resolution:
- Assistant Oyakata A-02 assigned kabu

Emitted:
- `KabuAssigned`

Narrative:
- “Council approves succession, stability maintained”

### A2.11 November: Poaching Event
A well-regarded Conditioning Coach is poached from Minatogawa by Tenkō.

Emitted:
- `StaffPoached`

Consumption:
- Rivalry system increases tension between stables
- Media: “poaching controversy” if Minatogawa complains

### A2.12 December: Year Close Consolidation
Pools perform end-of-year:
- churn reconciliation
- hidden reserve carryover
- era band recalculation check for next year

Emitted:
- `EraBandShifted` (if any)
- No forced reveals

---

## A3. Required Assertions (QA Harness)

A simulator implementation should be able to assert:

1) Candidate lists and reveal counts per month match
2) Offer submission ordering and resolution outcomes match
3) Foreign quota blocks illegal signings deterministically
4) Medical scarcity shift occurs in April (given seeds)
5) Kabu vacancy opens in October and assigns A-02
6) Event log ordering is stable and replayable

### A3.1 Minimal Event Log (ordered)
- CandidateRevealed (Jan × 7)
- OfferSubmitted (Feb × 3)
- CandidateSigned (Feb)
- CandidateSigned (Mar)
- EraBandShifted (Apr medical_supply)
- CandidateSigned (May)
- CandidateSigned (Jun foreign)
- CandidateWithdrawn (Jul × 2)
- CandidateRevealed (Aug STAR-01)
- OfferSubmitted (Aug × many)
- CandidateSigned (Aug)
- CandidateSigned (Sep)
- KabuVacancyOpened (Oct)
- CandidateRevealed (Oct × 3)
- KabuAssigned (Oct)
- StaffPoached (Nov)

---

## A4. Cross-System Interaction Summary (What consumes these events)

| Event | Pools | Beya | AI | Economy | Governance | Narrative |
|---|---|---|---|---|---|---|
| CandidateRevealed | update lists | optional | interest calc | none | none | rumor/headline |
| OfferSubmitted | lock talks | none | strategy | none | none | optional |
| CandidateSigned | promote person | roster | update plans | salary sink | eligibility | headline/journal |
| StaffPoached | move staff | staff gap | rivalry shift | wage pressure | none | scandal potential |
| EraBandShifted | adjust supply | warnings | risk posture | inflation | tolerance | season tone |
| KabuVacancyOpened | build candidates | none | lobbying | none | pipeline | headline |
| KabuAssigned | remove candidates | stable continuity | long-term plan | none | log | history entry |

---

END APPENDIX A


---

### Annex 3 — Basho_Rikishi_Development_Canon_v1.3 (verbatim)
<a id="annex-3--basho_rikishi_development_canon_v13"></a>

---


# Basho — Rikishi Development Canon v1.3
## Ultra-Granular Training, Evolution, Injury, Style, Psychology & Facilities

Status: **DEFINITIVE / EXPANDED**
Scope: Rikishi development systems only.
Guarantee: Larger than v1.2, non-lossy, implementation-grade.

This document extends v1.2 by fully specifying:
1. Mental & Psychological Load System
2. Training Facility & Staff Micro-Effects
3. Retirement, Post-Career & Legacy Transitions

---


# Basho — Rikishi Development Canon v1.2
## Ultra-Granular Training, Evolution, Injury, Style Drift & Worked Example

Status: **DEFINITIVE / EXPANDED**
Scope: Rikishi development systems only.
Guarantee: Larger than v1.1, non-lossy, implementation-grade.

This document **extends v1.1** by fully specifying:
- Injury State Machine (explicit)
- Style Drift & Reclassification Math
- Favored Kimarite Evolution
- Full Worked Example (10-year career timeline)

---


# Basho — Rikishi Development Canon v1.1
## Ultra-Granular Training + Evolution Constitution (Implementation Grade)

Status: **DEFINITIVE**
Scope: **Only rikishi development over time**
Explicitly excludes: combat resolution, economy amounts, roster admin

This document is:
- larger than its source material
- non-lossy
- explicit down to weekly ticks and state transitions
- suitable for direct engineering implementation

It consolidates and EXPANDS:
- Training System v1.0
- Rikishi Evolution System v1.0

---

# PART I — ABSOLUTE DESIGN LAWS (DEVELOPMENT SCOPE)

## 1. Determinism
All development outcomes are a pure function of:
- WorldSeed
- RikishiSeed
- TimeIndex (week)
- Training profile selections
- Injury history
- Career phase

No runtime RNG.
No “soft” decay.

## 2. Separation of Timescales
- **Training** operates weekly
- **Evolution** accumulates monthly and basho-end
- **Career phase** shifts are rare and thresholded

This separation prevents oscillation.

---

# PART II — RIKISHI STATE MODEL (NORMALIZED)

## 3. Permanent Identity (Immutable)
- rikishiId
- shikona registry entry
- origin
- base talent seed
- growth profile seed
- dominant archetype seed

## 4. Evolving State (Mutable)
Grouped by layer:

### 4.1 Body Layer
- heightCurrentCm
- weightCurrentKg
- heightPotentialCm
- weightPotentialKg
- growthFulfillment

### 4.2 Execution Layer
- powerOutput
- speedOutput
- balanceOutput
- techniqueOutput
- experienceOutput

### 4.3 Condition Layer
- fatigue
- injuryState
- injuryHistory[]
- recoveryModifier

### 4.4 Identity Layer
- styleLabel
- styleConfidence
- archetypeSecondary (optional)
- favoredKimarite[]

### 4.5 Arc Layer
- careerPhase
- phaseEntryTick
- retirementEligibility

---

# PART III — TRAINING SYSTEM (EXPANDED + WIRED)

# Basho — Training System v1.0 (Canonical)

Date: 2026-01-06  
Status: Canonical, verbose, implementation-ready  
Scope: Defines **training mechanics** at both beya and individual levels, and how training shapes rikishi evolution.  
This document intentionally excludes roster management, economics, and AI manager logic, which are defined elsewhere.

---

## 1. Design Goals

The training system must:
- Provide **meaningful player agency** without micromanagement
- Shape long-term **rikishi evolution**, not short-term bout outcomes
- Create **risk–reward trade-offs**
- Be **deterministic and legible**
- Integrate cleanly with:
  - Rikishi Evolution System
  - Beya Management System
  - NPC Manager AI System

> Training biases probability; it never guarantees greatness.

---

## 2. Core Training Philosophy

Training operates on **bias and pressure**, not direct stat control.

Players and AI:
- do not assign drills or skills directly
- choose **intensity, focus, and protection**
- accept downstream consequences via fatigue, injuries, and style drift

Training is evaluated **weekly** during interim periods.

---

## 3. Training Layers

Training exists on three stacked layers:

1. **Beya-Wide Training Profile** (default environment)
2. **Individual Focus Slots** (limited overrides)
3. **Facilities & Staff Modifiers** (multipliers, not decisions)

This ensures:
- consistency
- scarcity of attention
- emergent specialization

---

## 4. Beya-Wide Training Profile

Each beya selects one active training profile per interim.

### 4.1 Training Axes

Training profile is defined by four axes:

#### A) Intensity
- Conservative
- Balanced
- Intensive
- Punishing

#### B) Focus Bias
- Power
- Speed
- Technique
- Balance
- Neutral

#### C) Style Bias
- Oshi
- Yotsu
- Neutral

#### D) Recovery Emphasis
- Low
- Normal
- High

These axes modify growth, fatigue, and injury risk.

---

### 4.2 Default Numeric Effects (Illustrative)

#### Intensity Effects

| Intensity | Growth Mult | Fatigue Gain | Injury Risk |
|---|---:|---:|---:|
| Conservative | 0.85 | 0.75 | 0.80 |
| Balanced | 1.00 | 1.00 | 1.00 |
| Intensive | 1.20 | 1.25 | 1.15 |
| Punishing | 1.35 | 1.50 | 1.35 |

#### Recovery Emphasis Effects

| Recovery | Fatigue Decay | Injury Recovery |
|---|---:|---:|
| Low | 0.80 | 0.85 |
| Normal | 1.00 | 1.00 |
| High | 1.25 | 1.20 |

---

### 4.3 Focus Bias → Skill Growth Bias

| Focus | Power | Speed | Technique | Balance |
|---|---:|---:|---:|---:|
| Power | 1.30 | 0.85 | 0.95 | 0.95 |
| Speed | 0.85 | 1.30 | 0.95 | 0.95 |
| Technique | 0.90 | 0.90 | 1.35 | 1.10 |
| Balance | 0.90 | 0.95 | 1.10 | 1.35 |
| Neutral | 1.00 | 1.00 | 1.00 | 1.00 |

---

## 5. Individual Focus Slots

### 5.1 Focus Slot Availability
- Base slots: **3**
- +1 at prestige tier 2
- +1 at prestige tier 4
- Max: **5**

Only focused rikishi may receive individual overrides.

---

### 5.2 Focus Modes

Each focus slot selects one mode:

| Mode | Growth | Fatigue | Injury Risk | Notes |
|---|---:|---:|---:|---|
| Develop | +25% | +10% | +5% | Default growth |
| Push | +35% | +20% | +20% | Win-now pressure |
| Protect | −15% | −25% | −30% | Longevity |
| Rebuild | +10% | −10% | −15% | Post-injury |

Focus modes stack multiplicatively with beya-wide profile.

---

## 6. Training → Rikishi Evolution Wiring

### 6.1 Physique
- High intensity → faster weight gain
- High recovery → controlled weight, better fulfillment
- Overtraining → stalled growth + injury spikes

Height is unaffected after youth.

---

### 6.2 Skills
Training biases **effectiveness growth**, not raw skill caps.

Growth is:
- fast early
- diminishing in prime
- fragile in veteran phase

---

### 6.3 Style Drift
Training does not set style directly.

Instead:
- Style bias nudges recomputation thresholds
- Sustained mismatch between body and training causes inefficiency

This prevents “click to choose style” exploits.

---

### 6.4 Archetype Interaction
Training does **not** change dominant archetype.

It may:
- accelerate secondary archetype emergence
- suppress risky behaviors under conservative regimes

---

## 7. Fatigue & Injury Integration

### 7.1 Fatigue
- Accumulates weekly from training
- Scales with intensity and focus
- Decays via recovery emphasis and facilities

High fatigue:
- reduces bout performance
- increases injury risk
- pushes kimarite selection toward short finishes

---

### 7.2 Injuries
Training contributes to injury probability.

Risk factors:
- high fatigue
- punishing intensity
- low recovery
- prior injury history

Injuries apply:
- attribute penalties
- recovery timelines
- narrative hooks

---

## 8. Career Phase Sensitivity

Training effectiveness varies by phase:

| Phase | Growth | Injury Sensitivity |
|---|---:|---:|
| Youth | High | Low |
| Development | High | Medium |
| Prime | Medium | Medium |
| Veteran | Low | High |
| Late | Very Low | Very High |

This encourages different strategies across careers.

---

## 9. AI Use of Training

AI managers select training profiles based on:
- their profile traits
- roster composition
- injury load
- meta drift signals
- financial runway

Examples:
- Survivor favors Conservative + High Recovery
- Gambler spikes Punishing during contention
- Talent Factory uses Balanced + Neutral

AI obeys same focus slot limits as player.

---

## 10. Player UX Rules

Players see:
- training philosophy descriptions
- warnings (“Injury risk rising”)
- trend indicators (“Style drifting toward Yotsu”)

Players never see:
- raw multipliers
- hidden fatigue math

---

## 11. Failure Modes (By Design)

- Overtraining cascades
- Burned-out prospects
- Injury-plagued stars
- Short primes with spectacular peaks

These are outcomes, not bugs.

---

## 12. Canon One-Liner

> **Training shapes the conditions under which bodies, habits, and styles evolve — it never dictates the result of a single bout.**

---

End of document.


---

# PART IV — EVOLUTION SYSTEM (EXPANDED + WIRED)

# Basho — Rikishi Evolution System v1.0 (Canonical)

Date: 2026-01-06  
Scope: Full, end-to-end specification of **rikishi evolution** in Basho, covering physique, skills, style, archetype, kimarite identity, and career arcs.  
Status: Canonical, deterministic, implementation-ready.

This document explains **how a rikishi changes over time**, why those changes occur, and how they connect to combat, narrative, and UI.

---

## 1. Design Goals

Rikishi evolution must:
- Be **deterministic** and reproducible.
- Produce **believable career arcs** without scripted outcomes.
- Be **readable to players** (no hidden “RPG decay”).
- Integrate cleanly with:
  - Combat Engine V3
  - Kimarite tier/style/archetype system
  - Rivalries and narrative
  - Career journals and governance

---

## 2. Core Principle

> **Rikishi do not gain or lose abstract “power.”  
They change bodies, habits, and constraints — and the simulation responds.**

Evolution is the interaction of:
1. Physique (body)
2. Skills (execution)
3. Style (technical preference)
4. Archetype (temperament)
5. Kimarite identity (proof of behavior)
6. Career phase (time + pressure)

Each layer evolves on a different timescale.

---

## 3. Data Model Overview

### 3.1 Permanent Identity (Never Changes)
- `id`
- `shikona`
- origin metadata
- base talent seed
- growth profile seed
- dominant archetype (initial)

These define *who the rikishi is*.

### 3.2 Evolving State (Changes Over Time)
- heightCurrent / weightCurrent
- growth fulfillment
- skill outputs (power, speed, balance, technique, experience)
- fatigue, injuries, momentum
- style (oshi / yotsu / hybrid)
- secondary archetype tendency (optional)
- favored kimarite (tokui-waza)
- career phase

---

## 4. Physique Evolution (The Body Layer)

### 4.1 Height
- Grows early career only.
- Stops deterministically based on growth profile.
- Influences reach, leverage, grip geometry.

Height explains *structural possibility*, not tactical choice.

### 4.2 Weight (Primary Evolution Lever)
- Changes throughout career.
- Influences:
  - power effectiveness
  - speed effectiveness
  - fatigue accumulation
  - injury risk
  - recovery rate
- Strongest driver of style drift.

### 4.3 Current vs Potential
Each rikishi has:
- `heightPotentialCm`
- `weightPotentialKg`
- `growthFulfillment` ∈ [0,1]

Potential is a **ceiling**, not a guarantee.
Training, injuries, and facilities determine how close it is reached.

---

## 5. Skill Evolution (Execution Layer)

Canonical skill outputs:
- **Power** — force generation and drive
- **Speed** — burst and lateral movement
- **Balance** — resistance to displacement and counters
- **Technique** — grip craft, throw timing, transitions
- **Experience** — decision quality and counters

### 5.1 Growth Pattern
- Youth: spiky, uneven gains
- Development: steady improvement
- Prime: diminishing returns
- Veteran: flat or declining effectiveness
- Late: managed decline

Skills are modified by physique:
- Same technique score behaves differently at different weights.

---

## 6. Style Evolution (Primary Public Identity)

Styles:
- **Oshi** — distance, push/thrust
- **Yotsu** — belt, control, throws
- **Hybrid** — adaptable

### 6.1 Style Is Derived
Style is recomputed periodically from:
- weight trends
- balance vs speed ratio
- grip success rates
- kimarite usage distribution
- career phase bias

### 6.2 Hysteresis
- Style changes require sustained signals.
- Prevents oscillation basho-to-basho.

Style is **what the rikishi usually tries to do**.

---

## 7. Archetype Evolution (Temperament Layer)

Archetypes describe **behavior under pressure**.

### 7.1 Dominant Archetype
- Seeded at creation.
- Rarely changes.
- Represents temperament.

### 7.2 Secondary Archetype Drift
- Optional, slow-moving.
- Emerges from repeated behavior patterns.
- Strength ∈ [0.1–0.5].

Dominant archetype applies fully.  
Secondary archetype bends behavior slightly.

---

## 8. Kimarite Identity (Proof of Evolution)

### 8.1 Favored Kimarite (Tokui-waza)
- Tracked from actual wins.
- Top 2–3 maintained.
- Applies 2× selection bonus in combat.

### 8.2 Feedback Loop
Body → Style → Kimarite usage → Favorites → Reinforcement

As the body changes, favored moves may fade or be replaced.

---

## 9. Career Phases (Arc Layer)

Phases are computed, not age-locked:
1. Youth / Prospect
2. Development / Rise
3. Prime
4. Veteran / Decline
5. Late Career / Exit

Inputs:
- age
- growth fulfillment plateau
- injury accumulation
- fatigue recovery slowdown
- performance trends

Phases bias:
- growth rates
- injury risk
- style drift likelihood
- retirement triggers

---

## 10. Determinism Contract

Every evolution step is derived from:
- World seed
- Rikishi seed
- Time index
- Player inputs (training, facilities)
- Deterministic outcomes (bouts, injuries)

No hidden randomness.  
Same inputs → same careers.

---

## 11. UI & Readability Rules

### 11.1 Rikishi Card
- **Style**: primary label
- **Archetype**: secondary
- **Secondary archetype**: only if meaningful
- **Favored kimarite**: visible proof
- Physique shown indirectly via notes, not raw stats by default

### 11.2 Advanced Views
- Physique history
- Style drift timeline
- Kimarite usage charts
- Career journal entries

---

## 12. Narrative Integration

Narrative systems consume evolution:
- “Former speedster adapts to belt fighting”
- “Signature throw fades after knee injury”
- “Late-career reinvention”

Narrative never changes outcomes.

---

## 13. Why This Works

- Careers feel authored, but are not scripted.
- Decline feels earned, not punitive.
- Specialization emerges organically.
- Players learn to *read* wrestlers, not stats.

---

## 14. Canon One-Liner

> **Rikishi evolution is the story of a body adapting to time, pressure, and consequence — expressed through style, behavior, and the techniques that survive.**

---

End of document.


---

# PART V — TRAINING → EVOLUTION WIRING (NEW, GRANULAR)

## 15. Weekly Tick Algorithm (Explicit)

For each rikishi, each week:

1. Read beya training profile
2. Read individual focus (if any)
3. Compute growthBiasVector
4. Compute fatigueDelta
5. Compute injuryRiskDelta
6. Apply fatigue accumulation
7. Roll deterministic injury check
8. Apply injury state transitions
9. Accumulate growth progress (buffered)
10. Log DevelopmentEvent

No evolution is applied immediately to combat outputs until monthly consolidation.

---

## 16. Monthly Consolidation

Every 4 weeks:
- buffered growth applies to physique and skills
- style recomputation check runs
- favored kimarite may update
- career phase transition check runs

---

## 17. Career Phase Transition Rules (Explicit)

Transitions require **multiple signals**:
- growthFulfillment plateau
- fatigue recovery slowdown
- injury frequency
- performance trend

Single signals never force a phase change.

---

# PART VI — FAILURE MODES (INTENTIONAL)

- Burned prospects
- Late bloomers
- Short primes
- Reinvention arcs
- Chronic injury decline

These outcomes are authored by systems, not random chance.

---

# PART VII — UI CONTRACT (DEVELOPMENT)

Players see:
- philosophy language
- warnings
- trend descriptors

Players never see:
- growth buffers
- raw multipliers
- phase thresholds

---

# PART VIII — SOURCE PRESERVATION ANNEX (VERBATIM)

## Training System v1.0
```md
# Basho — Training System v1.0 (Canonical)

Date: 2026-01-06  
Status: Canonical, verbose, implementation-ready  
Scope: Defines **training mechanics** at both beya and individual levels, and how training shapes rikishi evolution.  
This document intentionally excludes roster management, economics, and AI manager logic, which are defined elsewhere.

---

## 1. Design Goals

The training system must:
- Provide **meaningful player agency** without micromanagement
- Shape long-term **rikishi evolution**, not short-term bout outcomes
- Create **risk–reward trade-offs**
- Be **deterministic and legible**
- Integrate cleanly with:
  - Rikishi Evolution System
  - Beya Management System
  - NPC Manager AI System

> Training biases probability; it never guarantees greatness.

---

## 2. Core Training Philosophy

Training operates on **bias and pressure**, not direct stat control.

Players and AI:
- do not assign drills or skills directly
- choose **intensity, focus, and protection**
- accept downstream consequences via fatigue, injuries, and style drift

Training is evaluated **weekly** during interim periods.

---

## 3. Training Layers

Training exists on three stacked layers:

1. **Beya-Wide Training Profile** (default environment)
2. **Individual Focus Slots** (limited overrides)
3. **Facilities & Staff Modifiers** (multipliers, not decisions)

This ensures:
- consistency
- scarcity of attention
- emergent specialization

---

## 4. Beya-Wide Training Profile

Each beya selects one active training profile per interim.

### 4.1 Training Axes

Training profile is defined by four axes:

#### A) Intensity
- Conservative
- Balanced
- Intensive
- Punishing

#### B) Focus Bias
- Power
- Speed
- Technique
- Balance
- Neutral

#### C) Style Bias
- Oshi
- Yotsu
- Neutral

#### D) Recovery Emphasis
- Low
- Normal
- High

These axes modify growth, fatigue, and injury risk.

---

### 4.2 Default Numeric Effects (Illustrative)

#### Intensity Effects

| Intensity | Growth Mult | Fatigue Gain | Injury Risk |
|---|---:|---:|---:|
| Conservative | 0.85 | 0.75 | 0.80 |
| Balanced | 1.00 | 1.00 | 1.00 |
| Intensive | 1.20 | 1.25 | 1.15 |
| Punishing | 1.35 | 1.50 | 1.35 |

#### Recovery Emphasis Effects

| Recovery | Fatigue Decay | Injury Recovery |
|---|---:|---:|
| Low | 0.80 | 0.85 |
| Normal | 1.00 | 1.00 |
| High | 1.25 | 1.20 |

---

### 4.3 Focus Bias → Skill Growth Bias

| Focus | Power | Speed | Technique | Balance |
|---|---:|---:|---:|---:|
| Power | 1.30 | 0.85 | 0.95 | 0.95 |
| Speed | 0.85 | 1.30 | 0.95 | 0.95 |
| Technique | 0.90 | 0.90 | 1.35 | 1.10 |
| Balance | 0.90 | 0.95 | 1.10 | 1.35 |
| Neutral | 1.00 | 1.00 | 1.00 | 1.00 |

---

## 5. Individual Focus Slots

### 5.1 Focus Slot Availability
- Base slots: **3**
- +1 at prestige tier 2
- +1 at prestige tier 4
- Max: **5**

Only focused rikishi may receive individual overrides.

---

### 5.2 Focus Modes

Each focus slot selects one mode:

| Mode | Growth | Fatigue | Injury Risk | Notes |
|---|---:|---:|---:|---|
| Develop | +25% | +10% | +5% | Default growth |
| Push | +35% | +20% | +20% | Win-now pressure |
| Protect | −15% | −25% | −30% | Longevity |
| Rebuild | +10% | −10% | −15% | Post-injury |

Focus modes stack multiplicatively with beya-wide profile.

---

## 6. Training → Rikishi Evolution Wiring

### 6.1 Physique
- High intensity → faster weight gain
- High recovery → controlled weight, better fulfillment
- Overtraining → stalled growth + injury spikes

Height is unaffected after youth.

---

### 6.2 Skills
Training biases **effectiveness growth**, not raw skill caps.

Growth is:
- fast early
- diminishing in prime
- fragile in veteran phase

---

### 6.3 Style Drift
Training does not set style directly.

Instead:
- Style bias nudges recomputation thresholds
- Sustained mismatch between body and training causes inefficiency

This prevents “click to choose style” exploits.

---

### 6.4 Archetype Interaction
Training does **not** change dominant archetype.

It may:
- accelerate secondary archetype emergence
- suppress risky behaviors under conservative regimes

---

## 7. Fatigue & Injury Integration

### 7.1 Fatigue
- Accumulates weekly from training
- Scales with intensity and focus
- Decays via recovery emphasis and facilities

High fatigue:
- reduces bout performance
- increases injury risk
- pushes kimarite selection toward short finishes

---

### 7.2 Injuries
Training contributes to injury probability.

Risk factors:
- high fatigue
- punishing intensity
- low recovery
- prior injury history

Injuries apply:
- attribute penalties
- recovery timelines
- narrative hooks

---

## 8. Career Phase Sensitivity

Training effectiveness varies by phase:

| Phase | Growth | Injury Sensitivity |
|---|---:|---:|
| Youth | High | Low |
| Development | High | Medium |
| Prime | Medium | Medium |
| Veteran | Low | High |
| Late | Very Low | Very High |

This encourages different strategies across careers.

---

## 9. AI Use of Training

AI managers select training profiles based on:
- their profile traits
- roster composition
- injury load
- meta drift signals
- financial runway

Examples:
- Survivor favors Conservative + High Recovery
- Gambler spikes Punishing during contention
- Talent Factory uses Balanced + Neutral

AI obeys same focus slot limits as player.

---

## 10. Player UX Rules

Players see:
- training philosophy descriptions
- warnings (“Injury risk rising”)
- trend indicators (“Style drifting toward Yotsu”)

Players never see:
- raw multipliers
- hidden fatigue math

---

## 11. Failure Modes (By Design)

- Overtraining cascades
- Burned-out prospects
- Injury-plagued stars
- Short primes with spectacular peaks

These are outcomes, not bugs.

---

## 12. Canon One-Liner

> **Training shapes the conditions under which bodies, habits, and styles evolve — it never dictates the result of a single bout.**

---

End of document.

```

## Rikishi Evolution System v1.0
```md
# Basho — Rikishi Evolution System v1.0 (Canonical)

Date: 2026-01-06  
Scope: Full, end-to-end specification of **rikishi evolution** in Basho, covering physique, skills, style, archetype, kimarite identity, and career arcs.  
Status: Canonical, deterministic, implementation-ready.

This document explains **how a rikishi changes over time**, why those changes occur, and how they connect to combat, narrative, and UI.

---

## 1. Design Goals

Rikishi evolution must:
- Be **deterministic** and reproducible.
- Produce **believable career arcs** without scripted outcomes.
- Be **readable to players** (no hidden “RPG decay”).
- Integrate cleanly with:
  - Combat Engine V3
  - Kimarite tier/style/archetype system
  - Rivalries and narrative
  - Career journals and governance

---

## 2. Core Principle

> **Rikishi do not gain or lose abstract “power.”  
They change bodies, habits, and constraints — and the simulation responds.**

Evolution is the interaction of:
1. Physique (body)
2. Skills (execution)
3. Style (technical preference)
4. Archetype (temperament)
5. Kimarite identity (proof of behavior)
6. Career phase (time + pressure)

Each layer evolves on a different timescale.

---

## 3. Data Model Overview

### 3.1 Permanent Identity (Never Changes)
- `id`
- `shikona`
- origin metadata
- base talent seed
- growth profile seed
- dominant archetype (initial)

These define *who the rikishi is*.

### 3.2 Evolving State (Changes Over Time)
- heightCurrent / weightCurrent
- growth fulfillment
- skill outputs (power, speed, balance, technique, experience)
- fatigue, injuries, momentum
- style (oshi / yotsu / hybrid)
- secondary archetype tendency (optional)
- favored kimarite (tokui-waza)
- career phase

---

## 4. Physique Evolution (The Body Layer)

### 4.1 Height
- Grows early career only.
- Stops deterministically based on growth profile.
- Influences reach, leverage, grip geometry.

Height explains *structural possibility*, not tactical choice.

### 4.2 Weight (Primary Evolution Lever)
- Changes throughout career.
- Influences:
  - power effectiveness
  - speed effectiveness
  - fatigue accumulation
  - injury risk
  - recovery rate
- Strongest driver of style drift.

### 4.3 Current vs Potential
Each rikishi has:
- `heightPotentialCm`
- `weightPotentialKg`
- `growthFulfillment` ∈ [0,1]

Potential is a **ceiling**, not a guarantee.
Training, injuries, and facilities determine how close it is reached.

---

## 5. Skill Evolution (Execution Layer)

Canonical skill outputs:
- **Power** — force generation and drive
- **Speed** — burst and lateral movement
- **Balance** — resistance to displacement and counters
- **Technique** — grip craft, throw timing, transitions
- **Experience** — decision quality and counters

### 5.1 Growth Pattern
- Youth: spiky, uneven gains
- Development: steady improvement
- Prime: diminishing returns
- Veteran: flat or declining effectiveness
- Late: managed decline

Skills are modified by physique:
- Same technique score behaves differently at different weights.

---

## 6. Style Evolution (Primary Public Identity)

Styles:
- **Oshi** — distance, push/thrust
- **Yotsu** — belt, control, throws
- **Hybrid** — adaptable

### 6.1 Style Is Derived
Style is recomputed periodically from:
- weight trends
- balance vs speed ratio
- grip success rates
- kimarite usage distribution
- career phase bias

### 6.2 Hysteresis
- Style changes require sustained signals.
- Prevents oscillation basho-to-basho.

Style is **what the rikishi usually tries to do**.

---

## 7. Archetype Evolution (Temperament Layer)

Archetypes describe **behavior under pressure**.

### 7.1 Dominant Archetype
- Seeded at creation.
- Rarely changes.
- Represents temperament.

### 7.2 Secondary Archetype Drift
- Optional, slow-moving.
- Emerges from repeated behavior patterns.
- Strength ∈ [0.1–0.5].

Dominant archetype applies fully.  
Secondary archetype bends behavior slightly.

---

## 8. Kimarite Identity (Proof of Evolution)

### 8.1 Favored Kimarite (Tokui-waza)
- Tracked from actual wins.
- Top 2–3 maintained.
- Applies 2× selection bonus in combat.

### 8.2 Feedback Loop
Body → Style → Kimarite usage → Favorites → Reinforcement

As the body changes, favored moves may fade or be replaced.

---

## 9. Career Phases (Arc Layer)

Phases are computed, not age-locked:
1. Youth / Prospect
2. Development / Rise
3. Prime
4. Veteran / Decline
5. Late Career / Exit

Inputs:
- age
- growth fulfillment plateau
- injury accumulation
- fatigue recovery slowdown
- performance trends

Phases bias:
- growth rates
- injury risk
- style drift likelihood
- retirement triggers

---

## 10. Determinism Contract

Every evolution step is derived from:
- World seed
- Rikishi seed
- Time index
- Player inputs (training, facilities)
- Deterministic outcomes (bouts, injuries)

No hidden randomness.  
Same inputs → same careers.

---

## 11. UI & Readability Rules

### 11.1 Rikishi Card
- **Style**: primary label
- **Archetype**: secondary
- **Secondary archetype**: only if meaningful
- **Favored kimarite**: visible proof
- Physique shown indirectly via notes, not raw stats by default

### 11.2 Advanced Views
- Physique history
- Style drift timeline
- Kimarite usage charts
- Career journal entries

---

## 12. Narrative Integration

Narrative systems consume evolution:
- “Former speedster adapts to belt fighting”
- “Signature throw fades after knee injury”
- “Late-career reinvention”

Narrative never changes outcomes.

---

## 13. Why This Works

- Careers feel authored, but are not scripted.
- Decline feels earned, not punitive.
- Specialization emerges organically.
- Players learn to *read* wrestlers, not stats.

---

## 14. Canon One-Liner

> **Rikishi evolution is the story of a body adapting to time, pressure, and consequence — expressed through style, behavior, and the techniques that survive.**

---

End of document.

```



---

# PART IX — INJURY STATE MACHINE (EXPLICIT)

## 30. Injury States

Each rikishi maintains exactly one InjuryState:

| State | Description |
|---|---|
| Healthy | No active injury |
| Minor | Short-term strain |
| Moderate | Noticeable impairment |
| Severe | Long-term impairment |
| Chronic | Persistent recurring condition |
| CareerEnding | Forced retirement trigger |

## 31. Injury Severity Thresholds

Severity is determined by:
- fatigue band
- physique stress ratio
- bout intensity band
- accumulated micro-injury count

No random rolls; thresholds are deterministic.

## 32. Recovery Curves

Each state defines:
- minimum recovery weeks
- performance penalty band
- re-injury amplification factor

Chronic injuries permanently reduce recovery efficiency.

---

# PART X — STYLE DRIFT & RECLASSIFICATION

## 33. Style Confidence Model

Each style label maintains a confidence score:
- oshi
- yotsu
- hybrid

Scores update monthly using:
- kimarite usage distribution
- grip success ratios
- physique suitability

## 34. Drift Thresholds

Style changes only when:
- new style confidence > old style by X margin
- sustained for ≥2 basho
- not blocked by injury limitations

Abrupt style flips are impossible.

---

## 35. Favored Kimarite Evolution

Favored kimarite list updates when:
- same kimarite used ≥N times
- above-average success rate
- fits current style

Favorites decay if unused for extended periods.

---

# PART XI — WORKED EXAMPLE (10-YEAR CAREER)

## 36. Rikishi Example: “Kazanoumi”

### Year 1–2 (Prospect)
- rapid weight gain
- minor injuries
- style confidence unclear

### Year 3–5 (Rise)
- oshi style locks in
- favored kimarite: oshidashi, tsukidashi
- first makuuchi promotion

### Year 6–7 (Prime)
- peak power output
- rare injury-free stretch
- sansho awards

### Year 8–9 (Decline)
- chronic knee injury
- style drifts toward defensive yotsu
- fewer favored techniques

### Year 10 (Exit)
- chronic state escalates
- retirement eligibility triggered
- legacy logged

Every step corresponds to weekly and monthly ticks.

---

# PART XII — ADDITIONAL FAILURE & EDGE CASES

- Sudden injury-caused plateau
- Style-lock preventing adaptation
- Late-blooming technique specialists
- Premature burnout via overtraining

All are deterministic outcomes.

---

# PART XIII — EXTENDED SOURCE PRESERVATION

This document preserves **all v1.1 content verbatim**, plus expanded systems.
No earlier rules are removed or weakened.

---

END OF Rikishi Development Canon v1.2


---

# PART XIV — MENTAL & PSYCHOLOGICAL LOAD SYSTEM

## 40. Mental State Model

Each rikishi maintains a **MentalState** vector, separate from physical fatigue:

| Dimension | Description |
|---|---|
| Confidence | Belief in own execution |
| Pressure | External expectation weight |
| Fear | Hesitation under risk |
| Focus | Consistency of decision-making |
| Resilience | Recovery from setbacks |

MentalState values are internal scalars; players see **narrative descriptors only**.

---

## 41. Mental State Inputs (Deterministic)

Mental updates occur weekly and post-bout:

- Win/Loss streaks
- Upsets (positive or negative)
- Rivalry bouts
- Media tone
- Stable stature pressure
- Career phase

No random swings are permitted.

---

## 42. Mental → Performance Mapping

Mental states affect:
- initiative bands
- error likelihood bands
- comeback probability bands
- injury escalation risk

These effects are capped to prevent total collapse.

---

## 43. Psychological Failure Modes

- Confidence spiral (loss streaks)
- Fear lock (post-injury hesitation)
- Pressure collapse (elite expectations)
- Veteran composure advantage

These are system-authored outcomes.

---

# PART XV — TRAINING FACILITIES & STAFF MICRO-EFFECTS

## 50. Facility Bands

Facilities are modeled in qualitative bands:

| Band | Description |
|---|---|
| Primitive | Minimal, outdated |
| Basic | Functional |
| Adequate | Competitive |
| Advanced | Modern, specialized |
| Elite | Cutting-edge |

Facilities modify:
- training efficiency
- injury risk
- recovery speed
- mental fatigue

---

## 51. Staff Roles

Each stable may have:
- Head Coach
- Conditioning Coach
- Medical Staff
- Mental Coach (rare)

Each role provides:
- bias modifiers
- risk dampening
- specialization bonuses

---

## 52. Facility × Training Interaction

Training outputs are multiplied by:
- facility band modifier
- staff competency modifier

Modifiers are deterministic and logged.

---

# PART XVI — RETIREMENT, POST-CAREER & LEGACY

## 60. Retirement Eligibility

Triggered by:
- age thresholds
- chronic injury state
- sustained decline
- governance events

Retirement is optional unless forced.

---

## 61. Retirement Outcomes

Possible paths:
- Stable staff role
- Independent coach
- Oyakata candidate
- Exit from sumo world

Each path affects:
- legacy score
- institutional memory
- future NPC behavior

---

## 62. Legacy Scoring (Narrative)

Legacy is computed from:
- peak rank
- career longevity
- rivalries
- championships
- scandals

Legacy affects:
- how the rikishi is referenced in history
- eligibility for honors
- successor narratives

---

## 63. Post-Career Persistence

Retired rikishi remain:
- in historical records
- as NPCs (if relevant)
- as reference points in commentary

No character is deleted from history.

---

# PART XVII — FULL DEVELOPMENT FLOW SUMMARY

Weekly:
- Training
- Mental update
- Fatigue/injury check

Monthly:
- Evolution consolidation
- Style drift check
- Favored kimarite update

Basho-End:
- Career phase review
- Mental pressure recalibration
- Retirement eligibility check

---

END OF Rikishi Development Canon v1.3


---

```



## SYSTEM 5 — Play-by-Play (PBP) ↔ Institutional Power/Governance/Media
**Source file:** `PBP_x_Institutional_Power_Governance_Media_Megacanon_v1.0_HARMONIZED_NONLOSSY.md`

```md
# Basho — PBP System v4.0 ↔ Institutional Power/Governance/Media v2.0 Megacanon v1.0 (Harmonized, Non‑Lossy)
**Build date:** 2026-01-12  
**Project name:** **Basho** (canonical; “Basho” deprecated for runtime/UI naming)  
**Status:** HARMONIZED / NON‑LOSSY / IMPLEMENTATION‑GRADE  
**Scope:** Deterministic bout Play‑by‑Play (PBP) generation (intensity tiers, phrase ledgers, headlines/plaque binding) integrated with institutional actors, staff careers, scandal/governance pipeline, and media narrative generation — with explicit truth→text causality walls and no‑leak observability constraints.

## What this file is
This megacanon merges **two authoritative systems** into one integrated contract:

1) **Basho — Sumo Play‑by‑Play (PBP) System v3.2 + Binding Addendum v4.0**  
2) **(Legacy title) Institutional Power, Staff Careers, Governance Politics & Narrative Media Canon v2.0**  
   - Title is legacy; **all runtime/UI references must say “Basho.”**

### Non‑lossy guarantee
- **Part A:** curated, hierarchical harmonized spec documenting *all interactions* between PBP and institution/governance/media.
- **Part B:** **verbatim Source Preservation Annex** embedding both sources in full (no deletions), guaranteeing nothing is lost.

### Precedence & resolution rules (binding within this file)
1. **Part A** is authoritative for cross‑system interfaces, ordering, and “who consumes what.”
2. If Part A is silent:
   - PBP flow, binding maps, intensity tiers, phrase ledgers, headline/plaque rules → **PBP v4.0**
   - actors, staff careers, scandal pipeline, council rulings, media events, memory pressure → **Institutional v2.0**
3. **Determinism wins**: same seeds + same truth events → identical PBP text and identical media headlines.
4. **Narrative/media never invent facts**: all claims must reference one or more truth events.
5. **No‑leak**: PBP and media must not expose internal numbers, probabilities, weights, or thresholds; only banded/tiered language.

---

# PART A — Harmonized Specification (Curated, Cross‑System)

## A0. Unified design thesis
Basho is an institutional simulation where:
- **the engine** decides outcomes and produces truth events,
- **institutions** react via people (staff careers, council politics, sponsor pressure),
- **media and PBP** render those truths into culture and memory,
- **history remembers** through immutable logs and derived artifacts.

**Hard wall (binding):**
> Truth is computed first. Text is a deterministic projection over truth.  
> Text never changes truth, never changes AI decisions, and never changes economy/governance math.

---

## A1. System roles and separation of concerns

### A1.1 PBP (bout-local narrator)
PBP is the **sole authority** for rendering bouts as cultural experience:
- one uninterrupted passage per bout
- canonical beats (ritual → tachiai → control → turning points → kimarite → ceremony)
- intensity tiers T0–T6 govern verbosity, metaphor, and heat
- phrase pools + cooldown ledgers prevent repetition within a basho

**PBP must not:**
- display numbers/probabilities
- imply alternate outcomes
- expose engine phases or internal ratings

### A1.2 Institutional power & governance (people-driven truth)
Institutional canon defines:
- actor classes (rikishi, staff, oyakata, beya, council, media, sponsors, public)
- staff as persistent careers (fatigue, reputation, loyalty, scandals)
- scandal trigger detection + responsibility assignment
- council tolerance adjustment by history
- deterministic rulings (sanctions/restrictions/forced mergers where applicable)
- media amplification as structured outputs (“narrative is a system”)

### A1.3 Media (institution-global narrator)
Media produces headlines and story arcs driven by:
- truth events (scandal triggers, rulings, sponsor withdrawals, key results)
- staff reputations and roles
- council posture and political climate
- historical echoes (memory flags)

**Media must not:**
- invent events
- leak numeric thresholds
- contradict governance outcomes

---

## A2. Canonical truth event graph (inputs to all text)
To interlock PBP and institutional media safely, all narrative surfaces consume an immutable event log.

### A2.1 Required truth event types (minimum set)
**Bout/tournament truth (PBP inputs):**
- `BOUT_RESULT` (winner/loser, kimarite, decision/ruling, durationClass, playoffFlag)
- `SPECIAL_RULING` (mono‑ii / torinaoshi / mizui‑iri) (may be encoded inside decision)
- `INJURY_EVENT` and `KYUJO_START` / `WITHDRAWAL` / `RETIREMENT` (public surface)

**Institutional truth (media/governance inputs):**
- `STAFF_ACTION` (hire/fire/promotion/role changes)
- `SCANDAL_TRIGGER_DETECTED` (category + implicated staff + beya)
- `RESPONSIBILITY_ASSIGNED` (primary staff; derivative to oyakata/beya)
- `COUNCIL_RULING` (sanctions/restrictions/orders)
- `SPONSOR_ACTION` (withdrawal/return/association change)
- `PUBLIC_SENTIMENT_SHIFT` (banded; optional if modeled)

### A2.2 Derived narrative artifacts (outputs, never causal)
- `PBP_TEXT_RENDERED` (stores NarrativeFingerprint + references its truth inputs)
- `MEDIA_EVENT_PUBLISHED` (headline, tone, severity, actors, linkedTruthEventIds, fingerprint)
- `HEADLINE_LOCKED` / `PLAQUE_TEXT_LOCKED` (PBP v4.0 headline levels H0–H4; for almanac/journal surfaces)

---

## A3. Unified ordering (binding) — “compute → rule → publish”
This ordering prevents contradictions and leaks.

### A3.1 Day with bouts
1) Resolve bouts and emit `BOUT_RESULT` (+ injury/ruling truth events).  
2) Run scandal/trigger detectors and emit trigger events.  
3) Assign staff responsibility (truth).  
4) Generate council posture adjustments and, if thresholds crossed, emit `COUNCIL_RULING`.  
5) Apply sponsor actions that are scheduled to occur after rulings (truth).  
6) Generate derived narrative:
   - PBP passages for each bout (bout-local)
   - Media headlines (institution-global)
   - Almanac/journal headlines for high intensity bouts (H-levels)
7) Append derived narrative artifacts to history with fingerprints and causal links.

### A3.2 Day without bouts
1) Run institutional pipelines due to scheduled events (staff, governance, sponsor actions).  
2) Emit truth events.  
3) Generate media narrative (no PBP).  
4) Append derived artifacts with links.

---

## A4. Shared interface objects (normalized)

### A4.1 BoutNarrativePacket (BNP) is the only PBP input
PBP v4.0 defines BNP. Institutional systems may contribute only **visible overlays**:
- venue mood bands (from public/council pressure)
- sponsor presence (if sponsor actions already applied)
- crowd memory tags (public, derived from history)
They may not change bout facts or add invented claims.

### A4.2 MediaEvent must cite its causes (required)
Institutional v2.0 defines a MediaEvent object. Basho integration requires causal linking:

```ts
MediaEvent {
  eventId
  headline
  tone
  severity
  actorsInvolved[]
  scandalLinked?: { scandalId, category }
  historicalWeight
  linkedTruthEventIds[]     // REQUIRED in Basho
  narrativeFingerprint?     // REQUIRED if templates/phrases are deterministically selected
}
```

**Rule:** a media headline is invalid if it cannot cite at least one truth event.

---

## A5. Intensity tiers as shared “heat governors”
PBP intensity tiers T0–T6 are bout-local. We harmonize them into institution-global policy:

### A5.1 Tier → headline level mapping (canonical)
- T0 → H0 (none)
- T1–T2 → H1 (bout headline)
- T3 → H2 (day lead)
- T4–T5 → H3 (basho headline)
- T6 → H4 (era plaque / immortal text)

### A5.2 Tier → media severity mapping (banded)
- T0–T1: local note / low severity
- T2–T3: “attention” / medium severity (front page possible)
- T4: high severity (crisis framing allowed if facts support)
- T5–T6: era-defining language permitted, still bounded by fact layer

### A5.3 Governance pressure caps on language
When governance pressure is elevated (watch/active/crisis):
- PBP may include a single restrained framing line **only if** a governance tag is in inputs.
- Media tone may shift to restraint (“under scrutiny”), but cannot claim outcomes not yet ruled.

---

## A6. Phrase pools and cooldowns across PBP and media
To prevent the world from sounding repetitive, **both** systems use ledgers.

### A6.1 Ledger unification
- `BashoPhraseLedger` (reset per basho)
- `SeasonPhraseLedger` (persists across the year/season)

PBP uses beat-slot phrase pools; media uses headline template pools.
Both must:
- filter by compatibility (tone, era, severity/tier)
- enforce cooldowns (default: “never repeat within a basho” except ritualized rulings)
- deterministic tie-break on seed hashes

### A6.2 Cross-domain de-duplication (optional but recommended)
If enabled:
- PBP and Media draw from separate pools but share a “recent phrase tokens” blacklist to avoid identical phrasing in the same day digest.

---

## A7. Scandal/governance integration into PBP without inventing facts
PBP is bout-local. It can acknowledge institutional context only in **bounded, factual** ways.

### A7.1 Allowed PBP institutional acknowledgements
Only if provided via BNP inputs:
- “under scrutiny” / “questions around the stable” (no accusations)
- “a tense hush in the hall” (mood)
- sponsor banner absence if kenshōPresent=false (after sponsor action applied)

### A7.2 Forbidden PBP institutional content
- naming a staff member as responsible unless a public ruling explicitly exists and is in inputs
- predicting sanctions
- implying investigations without a public event

---

## A8. Staff careers and “who gets named”
Institutional canon emphasizes staff as persistent actors. Basho narrative must respect observability.

### A8.1 Naming policy (no-leak)
- PBP: never names staff by default.
- Media: may name staff when:
  - a `RESPONSIBILITY_ASSIGNED` or `COUNCIL_RULING` exists AND
  - the disclosure policy says it is public.

Otherwise media uses role-only phrasing (“medical oversight”, “assistant coach”).

### A8.2 Staff-to-headline template conditioning
Media headline templates vary with staff:
- role (medical/training/finance/recruitment)
- reputation band (trusted/controversial)
- fatigue band (overextended narrative)
- political capital (council sympathy)

All of this remains **qualitative**.

---

## A9. Memory: how PBP and governance cohere over decades
Institutional v2.0 defines persistent narrative memory; PBP v4.0 defines venue crowd memory + headline locking.

### A9.1 Memory objects
- `VenueCrowdMemory` (PBP) — per venue feelings and expectations
- `InstitutionalMemoryFlags` (governance) — council tolerance, sponsor confidence, media escalation speed
- `CareerJournalEntries` — long-run log for staff and rikishi

### A9.2 Update timing
Memory updates occur:
- after bout narration and ceremony (PBP rule)
- after governance rulings are locked (institution rule)
Both write immutable entries; neither overwrites.

---

## A10. Discrepancies and reconciliation notes
1) **Naming:** Institutional canon uses “Basho” in its title; **project name is Basho**. Runtime strings must say Basho; legacy titles remain in archives only.
2) **MediaEvent schema:** Institutional canon does not require causal links; Basho requires `linkedTruthEventIds[]` for auditability and to enforce “media never invents events.”
3) **Tone heat:** PBP intensity tiers are explicit; institutional media “severity” is banded. We map them (A5) to prevent incoherent tone jumps.
4) **Staff visibility:** Institutional canon implies deep staff detail; PBP forbids mechanics leaks. We enforce role-only default + public-only naming gates.

---

# PART B — Source Preservation Annex (Verbatim)
> Everything below is embedded verbatim. No deletions. No rewriting.


## SOURCE 01 — Basho_Sumo_Play_by_Play_System_v4.0_PBP_Binding_Intensity_PhrasePools.md

```md
# Basho — Sumo Play‑by‑Play (PBP) System v3.2  
## Ultimate Definitive Canon: Narrative, Ritual, Memory, Variety & Commerce

Date: 2026‑01‑06  
Status: **ULTIMATE DEFINITIVE CANON — FULL DETAIL, NON‑HIGH‑LEVEL**  
Supersedes:
- PBP v1.0
- PBP v1.1
- PBP v1.2
- PBP v1.3
- PBP v2.0
- PBP v2.1
- PBP v2.3
- PBP v3.0
- PBP v3.1

This document **fully and explicitly consolidates every PBP system feature, rule, constraint, and design ideal** defined across all prior Basho PBP documents.

Nothing is summarized.
Nothing is implied.
Nothing is deferred.

If a question concerns **how a bout is presented, narrated, ritualized, remembered, or described**, this document governs.

---

## 1. System Authority & Role

The PBP system is the **sole narrative presentation authority** for sumo bouts.

It:
- renders deterministic Combat Engine V3 outcomes into cultural experience
- preserves sumo ritual, restraint, and institutional gravity
- creates long‑term memory through language
- teaches sumo implicitly without exposing mechanics

The PBP system **never influences**:
- bout outcomes
- AI decisions
- economy calculations
- governance logic

> The engine decides the bout.  
> The hall remembers it.  
> PBP gives it voice.

---

## 2. Binding Constraints (Hard Rules)

### 2.1 Narrative‑Only Surface
PBP output must NEVER:
- display numbers
- reference probabilities or rarity
- expose stats, tiers, weights, or ratings
- describe internal engine phases
- imply alternate outcomes

### 2.2 Determinism Contract
Given identical:
- world seed
- bout state
- venue
- crowd memory
- sponsor state
- phrase history

The generated PBP text **must be identical**.

No RNG prose.  
No stochastic applause.  
No drifting tone.

---

## 3. Narrative Flow Architecture

### 3.1 Continuous Flow Rule
A bout is rendered as **one uninterrupted narrative passage**.

The player never sees:
- phase headings
- timers
- meters
- mechanical state labels

Pauses, silence, and brevity are deliberate narrative tools.

---

### 3.2 Canonical Narrative Beats (Ordered, Optional)

1. Venue & day framing  
2. Rank / stake context  
3. Ring entrance rituals  
4. Shikiri tension  
5. Tachiai impact  
6. Control establishment  
7. Momentum shift(s)  
8. Decisive action  
9. Gyoji ruling  
10. Winning move (kimarite) emphasis  
11. Kenshō ceremony (if present)  
12. Immediate aftermath framing  

Omission of a beat is meaningful and deterministic.

---

## 4. Language Priority Model

Every sentence must map to at least one axis:

1. **Position** — center, drifting, edge, straw  
2. **Balance** — planted, wavering, scrambling  
3. **Intent** — pressing, waiting, adjusting  
4. **Turning Point** — hesitation, grip, angle break  

Forbidden language:
- numbers
- mechanical terms
- probability words
- rarity descriptors

---

## 5. Commentator Voice System

### 5.1 Deterministic Voice Selection
Voice is chosen once per bout based on:
- era preset
- broadcaster identity
- basho day
- rank & narrative stakes

Voice NEVER changes mid‑bout.

---

### 5.2 Voice Styles (Explicit)

**Formal (Traditional / NHK‑like)**  
- short declarative sentences  
- restrained emotion  
- ceremonial authority  

**Dramatic (Late Basho / High Stakes)**  
- rising cadence  
- heightened verbs  
- crowd foregrounded  

**Understated (Early Basho / Analytical)**  
- neutral phrasing  
- implication over emphasis  

Voice affects cadence and adjective density only.

---

## 6. Regional Broadcast Tone Overlay

Regional tone overlays voice and affects phrasing only.

- **Tokyo (Ryōgoku):** authoritative, historical, restrained  
- **Osaka / Nagoya:** warmer, momentum‑focused, reactive  
- **Fukuoka:** intimate, expressive, crowd‑forward  

Tone never alters facts or outcomes.

---

## 7. Ring Entrance & Ritual Layer

### 7.1 Ritual Eligibility
Entrance narration may appear when:
- bout is sekitori‑level
- rivalry or late‑basho stakes exist
- venue tone supports ritual emphasis

---

### 7.2 Ritual Elements (Selective)
- salt toss (shio‑maki)
- foot stamping
- towel handling
- posture & breathing
- eye contact
- crowd hush

Rules:
- concise
- atmospheric
- never padded
- never identical unless deterministically required

---

## 8. Crowd Reaction System

### 8.1 Hidden Crowd State
Tracked internally:
- anticipation
- tension
- surprise
- release

Derived from rank gap, rivalry, venue memory, and outcome shock.

---

### 8.2 Narrative Crowd Reactions
Expressed as:
- murmurs
- gasps
- rising noise
- eruptions
- silence

Silence is a deliberate narrative beat.

---

## 9. Persistent Crowd Memory System

### 9.1 Scope
Tracked **per venue**:
- rikishi
- stables
- notable oyakata

Memory is never erased — only diluted.

---

### 9.2 Memory Dimensions (Hidden)
- favorability
- trust
- expectation
- overexposure

Decay is slow and uneven.

---

### 9.3 Narrative Effects
Memory influences:
- timing of reactions
- warmth vs skepticism
- pressure framing

---

## 10. Special Ruling Narrative Branches

### Mono‑ii
- gyoji hesitation
- judges enter
- hall falls silent
- formal ruling delivered

### Torinaoshi
- continuation, not reset
- fatigue implied
- tighter narration

### Mizui‑iri
- ritual pause
- respectful quiet
- stiffness emphasized post‑break

---

## 11. Winning Move (Kimarite) Emphasis

Every bout MUST explicitly acknowledge the winning move.

Rules:
- framed as execution, not selection
- culturally accurate phrasing
- reinforces stylistic identity

Each kimarite has a **dedicated descriptor pool**.

---

## 12. Sponsor & Kenshō Ceremony Layer

### 12.1 Sponsor Identity Slots
Optional placeholders:
- sponsorName
- sponsorCategory

Rules:
- neutral phrasing
- no brand tone
- no monetary reference

---

### 12.2 Kenshō Ceremony Sequence
Occurs after ruling & kimarite emphasis:

1. banners lowered  
2. envelopes presented  
3. rikishi acknowledgment  
4. crowd response  

Crowd memory updates AFTER ceremony.

---

## 13. Descriptor Variety & De‑Duplication Engine

### 13.1 Descriptor Sets
Each narrative beat owns a **Descriptor Set**.

Selection uses a deterministic hash of:
- boutId
- rikishiId(s)
- venueId
- voice
- tone
- crowd memory
- phrase usage history

---

### 13.2 Phrase Cooldown
- phrases have cooldown windows
- recently used phrases deprioritized
- least‑recently‑used selected if needed

---

### 13.3 Synonym Clusters
Semantically equivalent phrases grouped into clusters.

Only one cluster per beat.
Cluster selection is deterministic.

---

### 13.4 Guardrails
Forbidden:
- mixed tones
- adjective stacking
- metaphor drift
- contradictory reactions

---

## 14. Backend Fidelity (Hidden Contract)

Combat Engine V3 resolves:
1. Tachiai initiative  
2. Grip & stance  
3. Momentum & fatigue  
4. Position drift  
5. Finisher window  
6. Counter legality  
7. Kimarite selection  
8. Special ruling legality  

PBP consumes **resolved outputs only**.

---

## 15. Canonical Sample PBP Bout (Complete)

**Honbasho:** Kyushu Basho  
**Day:** 13  
**Division:** Makuuchi  
**Venue:** Fukuoka  
**Voice:** Dramatic  

**East Maegashira 3 — Kiryuzan**  
**West Komusubi — Hoshitora**

> “Day Thirteen in Fukuoka, and the hall is already alive.”  
> “Kiryuzan steps forward, lifting the salt high before casting it across the ring.”  
> “Hoshitora follows, stamping the clay, eyes fixed ahead.”  
> “The banners from [Sponsor Name] frame the dohyo as the crowd settles.”  
> “They crouch at the shikiri‑sen.”  
> “The fan drops—*tachiai!*”  
> “They crash together—the sound ripples through the hall!”  
> “Hoshitora presses—Kiryuzan bends but does not break.”  
> “A murmur spreads—he has the belt.”  
> “They drift toward the edge—voices rising!”  
> “A hesitation—just enough!”  
> “Kiryuzan drives through with **a textbook yorikiri!**”  
> “Out!”  
> “The hall erupts!”  
> “The banners are lowered.”  
> “The envelopes are presented, one by one.”  
> “Kiryuzan receives the kenshō with a measured bow.”

---

## 16. Canonical Lock‑In Principles

- Ritual precedes combat  
- The move defines the memory  
- Silence is meaningful  
- Ceremony completes victory  
- Numbers never appear  

---

**END OF Sumo Play‑by‑Play System v3.2 — ULTIMATE DEFINITIVE CANON**



---

# Basho — PBP / Narrative / History Binding Addendum v4.0  
## Engine-to-Language Contract, Intensity Tiers, and Non-Repeating Phrase Pools

Date: 2026-01-12  
Status: **DEFINITIVE ADDENDUM — FULL DETAIL, NON-HIGH-LEVEL**  
Applies To: *Basho* (game name; “Basho” terminology deprecated).

This addendum extends the v3.2 PBP canon with a binding specification that wires:
- Combat & Kimarite Engine outputs (including physics-informed states, era parity, form, mastery, injuries)
into
- PBP language output
- Historical headlines (almanac / journals)
- “FM moments” framing that sounds legendary and **feels earned**.

**Hard rule:** Nothing in this addendum may introduce randomness. Every text choice is deterministic given the same seeds and history state.

---

## 0. Terminology Migration (Hard Canon)
- Replace “Basho” with **Basho** in all player-facing strings, titles, and UI surfaces.
- Legacy document titles may remain in source archives, but **runtime references must use Basho**.
- PBP narrator never says “Basho”.

---

## 1. PBP / Narrative Binding Spec (Engine → Language) — Authority Layer

### 1.1 Why This Spec Exists
The Combat Engine is now rich enough (impulse bands, stance, leverage, edge pressure, era parity, basho form, mastery curves, injury profiles) that:
- the *same* mechanical patterns should consistently produce recognizable prose patterns,
- memorable upsets should read as *earned shifts* rather than coin flips,
- legendary moments should be *rare in language* and *grounded in state*.

This binding spec is the contract that guarantees those outcomes.

### 1.2 Binding Rule: Facts vs Flavor
PBP text is constructed from two layers:

**A) Fact Layer (must be exact)**
Derived directly from engine outputs:
- winner/loser, kimarite id, gyoji ruling
- position arc (center → edge progression)
- stance arc (stable → broken)
- momentum/impulse arc (even → runaway)
- grip events (none → inside/outside → lost)
- special rulings (mono-ii / torinaoshi / mizui-iri)
- injuries (if triggered) and visible impact (kyujo, limp, withdrawal if applicable)
- sponsor/kenshō ceremony presence + sponsor slots

**B) Flavor Layer (must be consistent, never contradictory)**
Derived from:
- voice style (formal/dramatic/understated)
- regional tone overlay (Tokyo/Osaka/Nagoya/Fukuoka)
- crowd state + crowd memory
- narrative intensity tier (Section 2)
- phrase pools and cooldown rules (Section 3)

**Hard rule:** Flavor can never imply a fact that the engine did not output.

### 1.3 Combat Output Surface (Required Inputs)
The PBP generator must receive, per bout, a fully resolved `BoutNarrativePacket` (BNP).

#### 1.3.1 BoutNarrativePacket (BNP) — Schema
**Identifiers**
- boutId
- bashoId
- dayIndex
- boutIndex
- venueId
- divisionId
- rikishiAId, rikishiBId
- eastWest, ranks (for framing only)

**Outcome**
- winnerId
- loserId
- kimariteId (official 82 list)
- winType: {forceOut, pushOut, throw, trip, pullDown, slapDown, reversal, sacrifice, default}
- decision: {gyoji, monoIi, torinaoshi, fusen, kyujo, hansoku}
- durationClass: {blink, quick, standard, long, marathon}
- playoffFlag (if applicable; from scheduling system)

**Physics-Informed States (per engine extensions)**
- impulseArc: list[ImpulseBand] (0–4) OR collapsed arc summary (startBand, peakBand, endBand)
- stanceArc: list[StanceState] (Square/Braced/HighHips/Staggered/Twisted)
- leverageClasses: attackerClass/defenderClass at key moments
- ringPositionArc: list[RingState] (Center/MidRing/NearEdge/OnTawara/OverTawara)

**Grip & Control**
- gripEvents: ordered list of {timeSlice, gripType, side, gainedBy}
- controlSwaps: count and key timestamps

**Form & Era Context**
- eraParityBand: {dominant, structured, contested, open, wild}
- winnerBashoFormBand: {cold, off, normal, hot, transcendent}
- loserBashoFormBand: same
- upsetFlag: boolean (derived; see 1.4)
- upsetMagnitude: {minor, major, historic} (derived; see 2.3)

**Injury Surface (public)**
- injuryEvent: optional {injuredRikishiId, region, severityBand, causedByKimariteId, tickIndex, recoveryEstimate}
- kyujoFlagNow: boolean (if immediate withdrawal)
- withdrawalDuringBasho: boolean (if match/record indicates mid-basho retirement/withdrawal)
- medicalDisclosureTone: {official, guarded, unspoken} (deterministic; see 4.8)

**Commerce / Ceremony**
- kenshoPresent: boolean
- sponsorBanners: list[{sponsorId, sponsorDisplayName, sponsorTier}] (may be empty if generic)
- envelopeCountBand: {few, several, many} (no numeric mention)

**Crowd System Inputs**
- crowdAnticipationBand
- crowdShockBand
- crowdFavorabilityA/B (hidden; narrative uses “warm”, “cool”, etc)
- venueMemoryTags: list (e.g., “remembers upset”, “skeptical of pull-down”)

**Phrase State Inputs**
- bashoPhraseLedgerId (reference; see Section 3)
- seasonPhraseLedgerId (reference; see Section 3)

---

## 1.4 Upset & “FM Moment” Definitions (Deterministic)
Basho must produce “FM moments” (shock results, wonder basho runs, sudden collapses) without dice-feel.

### 1.4.1 UpsetFlag (Engine-Derived)
`upsetFlag = true` if ALL:
- preBoutExpectationWinnerId != actualWinnerId, where expectation is computed deterministically from rank + form + recent strength snapshot
- AND expectationConfidenceBand >= {medium}
- AND the winner’s form band is {hot or transcendent} OR the loser’s form band is {off or cold} OR a stance collapse event occurred (Twisted/Staggered near edge)

### 1.4.2 Upset Magnitude (Minor / Major / Historic)
Magnitude is derived from rank gap and expectation confidence:
- Minor: small rank gap OR low confidence
- Major: meaningful rank gap AND medium/high confidence
- Historic: sanyaku/yokozuna upset with high confidence OR playoff yusho decided by upset OR era-tag “dominant” yet upset occurs

### 1.4.3 FM Moment Taxonomy (for language + headlines)
A bout can be tagged (0–2 tags max) with one of:
- Giant-Killing
- Collapse
- Wonder Basho
- Signature Unleashed
- Edge Escape
- Judges’ Drama
- War of Attrition
- Injury Shadow

Tags drive intensity tier selection and headline rendering.

---

# 2. Narrative Intensity Tiers (Routine → Historic)

### 2.1 Tier List (7 Tiers)
T0 Routine — ordinary, clean, early basho, no stakes  
T1 Notable — crisp technique, mild crowd lift  
T2 Charged — rivalry hint, rank tension, edge pressure  
T3 High Stakes — sanyaku, late basho, yusho implications  
T4 Shocking — major upset, visible collapse, judges’ drama  
T5 Mythic — historic upset, signature rare/legendary move, decisive yusho swing  
T6 Eternal — record-breaking, era-defining, remembered for decades

### 2.2 Deterministic Tier Selection Rule (Exact)
Compute IntensityScore (0–100):
- StakesBand (0–30)
- CrowdHeatBand (0–20)
- UpsetBand (0–25): none 0; minor 10; major 18; historic 25
- TechniqueRarityBand (0–15): common 0; uncommon 5; rare 10; legendary 15
- InjuryBand (0–10): none 0; visible 5; withdrawal/kyujo 10
IntensityScore = sum(bands)

Map:
0–14 → T0
15–26 → T1
27–40 → T2
41–58 → T3
59–72 → T4
73–88 → T5
89–100 → T6

### 2.3 Tier Guardrails (Caps)
| Tier | Max Metaphors | Max Exclamation | Max Adjectives/Sentence |
|------|---------------|-----------------|--------------------------|
| T0   | 0             | 0               | 1                        |
| T1   | 0             | 0               | 1                        |
| T2   | 0             | 1               | 2                        |
| T3   | 1             | 2               | 2                        |
| T4   | 1             | 3               | 3                        |
| T5   | 2             | 3               | 3                        |
| T6   | 2             | 4 (rare)        | 3                        |

---

# 3. Phrase Pools, De-Duplication, and “Never Repeat Within a Basho”

### 3.1 Phrase Library Metadata
Each phrase includes:
- phraseId
- text
- beatSlot
- voiceCompat
- toneCompat
- intensityMin/Max
- tags
- cooldownBasho
- cooldownSeason
- rarityWeight (language-only)

### 3.2 Ledgers
- BashoPhraseLedger (reset per basho)
- SeasonPhraseLedger (persist yearly, slow decay)
Ledgers track last use and counts.

### 3.3 Deterministic Selection Algorithm
For each beat slot:
1) filter candidates by compat + intensity + tags  
2) enforce basho cooldown (default infinite)  
3) apply recency penalties + same-rikishi penalties  
4) select lowest penalty; tie-break with hash(boutId, slotId, phraseId)

### 3.4 “Never Repeat Within a Basho” Policy
Default: cooldownBasho = ∞
Exceptions: formal judge rulings, minimal gyoji calls, neutral sponsor ceremony lines.

### 3.5 Restricted Metaphor Pool
Metaphor only T3+, drawn from canonical micro-pool; must not imply non-existent events.

### 3.6 Kimarite Descriptor Pools
Per kimarite:
- 6–12 descriptors for T0–T2
- 6–12 for T3–T4
- 6–12 for T5–T6
Legendary descriptors require T5+ and “earned legend” conditions.

---

# 4. Engine → Language Binding Maps

## 4.1 ImpulseBand Peak → Verb Families
| PeakBand | Cadence | Verb Family |
|----------|---------|------------|
| 0 Even   | balanced | meets / holds / tests |
| 2 Drive  | forward  | presses / drives / leans |
| 3 Surge  | rising   | surges / storms / bulldozes |
| 4 Runaway| abrupt   | overwhelms / runs through / blows past |

If arc reverses sharply, insert a turning-point clause from a pool.

## 4.2 StanceArc → Balance Imagery
| StanceState | Pool Keywords |
|-------------|--------------|
| Square      | planted / set / square |
| Braced      | braced / hips locked |
| HighHips    | caught tall / weight high |
| Staggered   | scrambling / steps stutter |
| Twisted     | torqued / body turns / spine out of line |

## 4.3 Leverage → Body Shape Phrasing (Non-Stat)
CompactAnchor: low and rooted  
LongLever: hooks him long  
MobileLight: slips the line  
TopHeavy: weight spills forward

## 4.4 Ring Position → Straw/Tawara Phrasing
Peak RingState drives edge emphasis; OnTawara mandates “heels on straw” style beat.

## 4.5 Era Parity → Premise Lines (Optional, T3+)
Dominant: “In an era that rarely forgives…”  
Open: “In a basho where anyone can fall…”

## 4.6 Basho Form → Run/Slump Lines (FM Feel)
Hot/Transcendent: “something burning this basho…”  
Off/Cold: “timing late… shape wrong…”  
Max one form sentence unless T5+.

## 4.7 Mastery / Signature Unleashed
If tag present, descriptor must be drawn from signature pool; allowed T4+.

## 4.8 Injuries (Public) — Respectful Disclosure
Disclosure tone deterministic:
- Official: kyujo or withdrawal now
- Guarded: moderate, continues
- Unspoken: low, no visible impairment

Examples are pulled from tone/voice compatible pools.

---

# 5. Historical Headlines Binding (Almanac / Journals)

### 5.1 Headline Levels by Intensity
T0 → H0 none  
T1–T2 → H1 bout headline  
T3 → H2 day lead  
T4–T5 → H3 basho headline  
T6 → H4 era plaque

### 5.2 Headline Families (Tag Driven)
Giant-Killing / Wonder Basho / Collapse / Judges’ Drama / Signature Unleashed / Injury Shadow.

Each family has a large template pool and ledger cooldowns.

### 5.3 Variables Allowed in Headlines
- shikona
- rank labels (no numbers)
- kimarite name (locale-specific)
- basho day / venue
- sponsor names only if permitted

### 5.4 Plaque Text (T6)
2–4 sentences referencing:
- venue
- stakes
- decisive kimarite
- why remembered (upset magnitude / yusho swing / record snap / injury shadow)

Store NarrativeFingerprint to allow exact replay later.

---

# END ADDENDUM v4.0

```



## SOURCE 02 — Basho_Institutional_Power_Staff_Governance_and_Narrative_Canon_v2.0_Ultra_Granular.md

```md

# Basho — Institutional Power, Staff Careers, Governance Politics & Narrative Media Canon v2.0
## Ultra-Granular, Implementation-Grade Specification

Status: DEFINITIVE
Guarantee:
- Non-lossy relative to all source documents
- Equal or greater length than combined inputs
- Deterministic, explicit, engineer-ready
- Narrative-first in presentation, numeric underneath

---

## PART I — DESIGN INTENT (WHY THIS EXISTS)

Basho is not a sports sim.
It is an **institutional simulation**.

This document exists to bind together:
- Beya operations
- Staff careers
- Governance politics
- Scandal escalation
- Media narratives
- AI behavior
- Historical memory

into **one causal, legible system**.

> Power in Basho flows through people, not numbers.

---

## PART II — INSTITUTIONAL ACTORS

### 1. Actor Classes

| Actor | Description |
|-----|------------|
| Rikishi | Competitive performers |
| Staff | Long-lived institutional operators |
| Oyakata | Political and legal authority |
| Beya | Employer and liability container |
| Council | Arbiter of legitimacy |
| Media | Narrative amplifier |
| Sponsors | Economic signalers |
| Public | Memory and pressure vector |

All actors persist across decades.

---

## PART III — STAFF CAREERS (FULLY INTEGRATED)

### 2. Staff Are Careers, Not Slots

Staff exist on a **career timeline**:
- They age
- They gain reputations
- They accumulate fatigue
- They create scandals
- They leave legacies

They cannot be safely min-maxed.

### 3. Staff Entity (Expanded)

```ts
Staff {
  staffId
  name
  role
  age
  careerPhase
  reputationBand
  loyaltyBand
  fatigueBand
  competenceProfile {
    primary
    secondary?
  }
  scandalExposure
  politicalCapital
  mediaVisibility
  successorEligibility
  careerHistory[]
}
```

Each field has **direct downstream effects**.

---

## PART IV — STAFF → GOVERNANCE POLITICS

### 4. Governance Is People-Driven

Governance outcomes are influenced by:
- Oyakata reputation
- Assistant oyakata standing
- Prior scandals
- Staff negligence patterns
- Media pressure
- Rival beya lobbying

There is no neutral arbitration.

### 5. Council Decision Pipeline (Explicit)

1. Trigger detected (scandal, insolvency, succession)
2. Staff responsibility assigned
3. Media severity seeded
4. Council tolerance adjusted by history
5. Deterministic ruling generated
6. Sanctions & restrictions issued
7. Narrative logged permanently

---

## PART V — SCANDALS & STAFF LIABILITY

### 6. Staff-Originated Scandals

| Category | Examples |
|--------|---------|
| Medical | Negligence, concealment |
| Training | Abuse, overtraining |
| Financial | Misreporting |
| Recruitment | Illegal inducements |
| Political | Kabu manipulation |

Each scandal attaches to:
- Staff member
- Oyakata (derivative)
- Beya (institutional)

---

## PART VI — MEDIA & NARRATIVE LAYER (NEW)

### 7. Narrative Is a System

Narrative is **not flavor text**.
It is a structured output of the simulation.

Media events are generated when:
- Thresholds are crossed
- Patterns emerge
- Rivalries intersect
- Governance acts

### 8. Media Event Object

```ts
MediaEvent {
  eventId
  headline
  tone
  severity
  actorsInvolved[]
  scandalLinked?
  historicalWeight
}
```

Media never invents events.
It amplifies reality.

---

## PART VII — STAFF-DRIVEN HEADLINE GENERATION (NEW)

### 9. Headline Engine Inputs

Headlines are generated from:
- Staff role
- Reputation band
- Event type
- Outcome severity
- Rival context
- Historical echoes

### 10. Headline Templates (Examples)

**Success**
- “Veteran Coach’s Methods Bear Fruit at [Beya Name]”
- “Quiet Architect Behind [Rikishi]’s Rise Revealed”

**Failure**
- “Questions Raised Over Medical Oversight at [Beya Name]”
- “Once-Trusted Aide Now Under Scrutiny”

**Scandal**
- “Pattern of Neglect Emerges Around [Staff Name]”
- “Council Faces Pressure Over [Beya] Handling”

Templates select vocabulary by:
- Era
- Region
- Broadcast tone

---

## PART VIII — CAREER JOURNALS & HISTORICAL MEMORY

### 11. Persistent Narrative Memory

Every major event creates:
- Career journal entries
- Institutional memory flags
- Future bias in AI and governance

Nothing is forgotten.

### 12. Memory Effects

History modifies:
- Council tolerance
- Sponsor confidence
- AI risk tolerance
- Media escalation speed

---

## PART IX — AI BEHAVIOR (FULLY WIRED)

### 13. NPC AI Perception

AI managers perceive:
- Narrative tone
- Staff fatigue
- Scandal trends
- Political danger

They do NOT see raw numbers.

### 14. AI Strategic Adaptation

AI will:
- Sacrifice wins to reduce scrutiny
- Replace staff preemptively
- Accept mergers to preserve legitimacy
- Avoid rival escalation when weak

AI failures are believable, not random.

---

## PART X — ECONOMY & SPONSORS (STAFF-INTERACTED)

### 15. Sponsors React to People

Sponsors track:
- Oyakata reputation
- Staff scandal history
- Media tone

Sponsor withdrawal accelerates when staff credibility collapses.

---

## PART XI — FAILURE MODES (INTENTIONAL)

- Legendary coach downfall
- Medical scandal destroying dynasty
- Political isolation leading to forced merger
- Loyal staff preventing reform

These are **designed outcomes**.

---

## PART XII — CANON STATEMENT

> **Basho is a game about institutions built by people, remembered by history, and judged by consequence.**

---

END OF DOCUMENT

```

```



## SYSTEM 6 — Master Context ↔ System Interaction Megacontract ↔ Technical Addenda
**Source file:** `MasterContext_x_SystemInteraction_x_TechnicalAddenda_Megacanon_v1.0_HARMONIZED_NONLOSSY.md`

```md
# Basho — Master Context v2.2 ↔ System Interaction Megacontract v1.0 ↔ Technical Addenda Pack v1.0 — Unified Megacanon v1.0 (Harmonized, Non‑Lossy)
**Build date:** 2026-01-12  
**Project name:** **Basho** (canonical runtime/UI name; “Basho” appears only in legacy source titles)  
**Status:** HARMONIZED / NON‑LOSSY / IMPLEMENTATION‑GRADE  
**Merged sources:** Master Context Canon v2.2, System Interaction Megacontract v1.0, Technical Addenda Pack v1.0

## What this file is
This megacanon merges:
1) **Basho Master Context (v2.2)** — the constitution: design laws, tick order, IDs, registries, narrative-first rules, normalized schemas.  
2) **Basho System Interaction Megacontract (v1.0)** — the integration spine: cross-system sequencing, event bus, interface contracts, invariants.  
3) **Basho Technical Addenda Pack (v1.0)** — implementation-critical tables/formulas referenced across canon.

### Non‑lossy guarantee
- **Part A:** Curated, hierarchical, harmonized “single contract” that reconciles overlaps and documents *all interactions*.  
- **Part B:** **Verbatim Source Preservation Annex** embedding each source in full — no deletions.

### Binding precedence rules (within this file)
1) **Part A** is authoritative for cross-system integration, sequencing, and conflict resolution.  
2) If Part A is silent:
   - For constitution/tick order/IDs/schemas/bands → **Master Context v2.2**  
   - For inter-system ordering, event bus, interface contracts → **System Interaction Megacontract v1.0**  
   - For exact formulas/tables/threshold exceptions → **Technical Addenda Pack v1.0**  
3) **Determinism is absolute**: same seeds + same inputs → identical world state and narrative artifacts.  
4) **Narrative never changes truth**: narrative writes artifacts only; it cannot alter simulation state.

---

# PART A — Harmonized Unified Contract (Curated)

## A0. Unified thesis: Constitution → Integration Spine → Exact Addenda
- **Master Context v2.2** defines *what exists* and the global *laws* (determinism, narrative-first, institutions).  
- **Megacontract v1.0** defines *how systems talk* and the global *order-of-operations*.  
- **Addenda v1.0** defines *exact math knobs* and “hard exceptions” needed for implementation and QA.

In practice:
- v2.2 tells you the **shape of the world and ticks**.
- v1.0 Megacontract tells you the **order and interfaces on each tick**.
- Addenda tells you the **exact equations/tables** inside the systems that those ticks invoke.

---

## A1. Global laws (canonical)
### A1.1 Determinism (absolute)
All state-changing systems must be pure functions of:
- `WorldState snapshot`
- explicit player inputs for the tick
- deterministic seeds derived from WorldSeed + event keys  
Forbidden: unseeded RNG, time-of-day dependencies, “hidden dice” in AI.

### A1.2 Narrative-first UI (absolute)
Player surfaces are language. Numbers are allowed only for:
- money amounts (yen)
- rank/record
- time (days/weeks/basho)  
Everything else is expressed as qualitative bands/descriptors. No leakage of raw stats/thresholds.

### A1.3 Institutions over individuals
Stables, governance, sponsors, staff, rivalries, and records persist beyond careers.  
Every meaningful change appends to immutable history.

---

## A2. Canonical time model and tick ordering (reconciled)
Master Context v2.2 provides the global tick order; Megacontract adds a precedence list for same-tick writers. Harmonized ordering:

### A2.1 Time scales
- 6 honbasho/year (Hatsu, Haru, Natsu, Nagoya, Aki, Kyushu)  
- Basho: 15 **DayTicks**  
- Inter-basho: 6 **WeekTicks**  

### A2.2 Tick types
- `WeekTick` (between basho)
- `DayTick` (during basho)
- `BoutTick` (per scheduled bout; nested within a DayTick)

### A2.3 Authoritative tick order (binding)
At each tick, systems execute in this order (merged v2.2 + Megacontract):

1) **Input ingestion**
   - lock player inputs
   - lock NPC AI decisions (deterministic tie-break)
2) **Institutional constraints**
   - governance restrictions applied (`ActiveRestrictions`)
   - legality checks (foreign slot, bans, participation constraints)
3) **Economy pass**
   - incomes/expenses, loans schedules, insolvency state updates
4) **Roster & staff administrative pass**
   - hires/fires/promotions, capacity legality, roster changes
5) **Training & recovery pass** *(weekly only)*
   - training plans, fatigue/recovery, injury recurrence shaping
6) **Combat pass** *(during basho daily)*
   - torikumi retrieval, per-bout resolution, injury events
7) **Awards pass** *(basho end)*
8) **Rankings/Banzuke pass** *(basho end)*
9) **Narrative rendering pass**
   - PBP, headlines, journals, recaps
10) **History & analytics persistence**
   - finalize immutable ledger rows, fingerprints, references

**Rule:** narrative/UI write artifacts only; never simulation truth.

---

## A3. Identity, registries, and single source of truth (SSOT)
### A3.1 IDs are primary keys everywhere
All cross-system references use immutable IDs; names are presentation. Required IDs include:
- RikishiID, BeyaID, OyakataID, BashoID, BoutID
- SponsorID, KenshoBannerID, SupporterGroupID
- GovernanceRulingID, MediaEventID, JournalEntryID, AwardID

### A3.2 Entity surfaces (shared object model)
Every entity has:
- CoreRecord (identity)
- StateRecord (current values)
- HistoryLog (append-only events)
- VisibilityMask[viewer]

No duplicate identity across systems.

---

## A4. Event bus (harmonized)
Megacontract’s `WorldEventLog` is adopted as the *mandatory* cross-system notification path, aligned to v2.2’s immutable ledger.

### A4.1 Event shape (binding)
```ts
WorldEvent {
  id: EventID
  tick: TickID
  type: string
  entities: { rikishiIds?: string[], beyaIds?: string[], oyakataIds?: string[], sponsorIds?: string[] }
  payload: object          // schema-versioned, deterministic, minimal
  cause?: { eventId: EventID }  // source-of-truth chain
}
```

### A4.2 Causality rule (no-invention)
Every consequential output must cite an input cause; no subsystem may “invent” restrictions, money, or history.

---

## A5. Cross-system interfaces: ownership, read/write, forbidden actions
This section reconciles v2.2 “binding interfaces” with Megacontract’s interaction matrices.

### A5.1 Banzuke/Scheduling ↔ Combat
- Scheduling owns bout list/eligibility; Combat owns bout outcomes (winner/kimarite/duration/special branches) + injuries.
- Scheduling may not choose winners; Combat may not alter banzuke mid-basho.

### A5.2 Combat ↔ Development
- Combat reads physique/skills/style/archetype tendencies; writes injury + fatigue deltas + kimarite usage ledgers.
- Development updates physique/skills/style drift between basho; identity changes require ledger proof (“proof before identity”).

### A5.3 Training ↔ Staff/Welfare ↔ Development
- Training plan is a weekly contract; staff/facilities shape ceilings/variance/recovery.
- Capacity enforcement is deterministic; welfare states feed AI and (qualitative) narrative scrutiny.

### A5.4 Economy/Sponsors ↔ Bouts ↔ Narrative
- Sponsors attach banners to bouts; economy schedules payouts.
- Narrative may sample sponsor names (presentation), but ledger holds full truth.

### A5.5 Governance/Scandal ↔ Economy/Supporters ↔ AI
- Governance owns restrictions/sanctions/merger/closure arbitration (when active).
- Scandals are structured multi-system events: trigger → review → ruling → economy/AI consequences → media artifacts.

---

## A6. Exact addenda integration (engineering‑critical)
This section binds the addenda tables/formulas to the global tick/order.

### A6.1 AI Meta Drift recognition delays (Addendum A)
- **Consumes:** post-basho public outcomes, meta state
- **Writes:** AI strategy change eligibility only after `recognitionTurn` (deterministic delay band by manager profile)
- **Tick:** post-basho resolution pass; affects future WeekTicks

### A6.2 Combat injury probability + counter threshold (Addendum B)
- **Injury probability** is evaluated per combat tick using BaseChance × FatigueMult × MassDiffMult.
- **Counter trigger** occurs in Phase 5 when DefenseScore exceeds AttackScore by a safety margin.
- **Tick:** Combat pass (BoutTick)

**Narrative rule:** no numeric leakage; PBP uses qualitative risk/descriptors.

### A6.3 Ozeki kadoban + playoffs (Addendum C)
- Kadoban status transitions and special immediate re-promotion rule are binding.
- Playoff bracket seeding is random draw but deterministic under seed.
- **Tick:** Awards/Rankings passes (post-basho), and Day 15 special scheduling when triggered.

### A6.4 Sponsor churn + payment timing (Addendum D)
- Post-basho churn check uses the satisfaction score formula with scandal severity penalty.
- If churn: kenshō allocations removed immediately; kōenkai payments stop the following month.
- **Tick:** Post-basho economy pass + monthly cadence.

### A6.5 Staff diminishing returns (Addendum E)
- Coach stacking caps: 100% primary, 50% secondary (same type), max 2 duplicates.
- Oyakata stats stack additively with primary coach.
- **Tick:** Training & recovery pass (weekly), AI hiring evaluation, UI staff planners.

---

## A7. Discrepancies resolved (explicit)
1) **Project name:** Canon sources say “Basho” in titles; runtime project name is **Basho**.  
2) **Tick ordering duplication:** v2.2 and Megacontract agree in substance; Part A locks a single merged order (A2.3).  
3) **Ledger vs WorldEventLog:** treated as the same append-only truth layer; WorldEvent is the normalized envelope; v2.2 ledger rows are a storage representation.  
4) **Random draw in playoffs:** allowed because it is deterministic under seeds; never unseeded randomness.  
5) **Numbers on UI:** Addenda contains formulas; UI still cannot show raw risk/probabilities; only qualitative translations.

---

# PART B — Source Preservation Annex (Verbatim)
> Everything below is embedded verbatim. No deletions. No rewriting.


## SOURCE 01 — Basho_Master_Context_Canon_v2.2_Granular_Definitive.md

```md
# Basho — MASTER CONTEXT CANON v2.2
## Granular Definitive Constitution (Harmonized Spec + Source Preservation Annex)

Date: 2026-01-10  
Status: **DEFINITIVE / IMPLEMENTATION-GRADE / NON–HIGH-LEVEL**

This version exists because prior v2.0/v2.1 outputs were too condensed.  
v2.2 is explicitly designed to be:

- **Totally granular** (every system has inputs → process → outputs → state changes → logs)
- **Non-lossy** (no feature can be dropped accidentally)
- **Larger than the full source set** by including a **verbatim Source Preservation Annex**

If anything in the harmonized spec is ambiguous, the annex provides the exact original phrasing.

---

## How to use this document

- **Part A (Harmonized Granular Spec):** the single authoritative contract for implementation.
- **Part B (Data Contracts & Tables):** explicit schemas, enumerations, and deterministic rules.
- **Part C (Resolution & Precedence Rules):** how conflicts are resolved.
- **Part D (Source Preservation Annex):** full source documents embedded verbatim (completeness guarantee).

---

## Precedence Rules (Binding)

When consolidating legacy docs, precedence is:

1. **v2.2 Part A/B** (this file) — authoritative.
2. If v2.2 is silent: newest Clean Canon (v1.4 → v1.1).
3. If still silent: Consolidated v0.4.1.
4. If still silent: v0.4.0 FULL then v0.4.0 short.

However, Part D preserves all text for traceability.

---

# PART A — Harmonized Granular Spec (Authoritative)

## A1. Design Laws

### A1.1 Determinism (Absolute)
**Definition:** Any system that evolves state must be a pure function of:
- current WorldState snapshot
- explicit player inputs for the tick
- explicit random seed(s) derived deterministically from WorldSeed + event keys

**Forbidden:** runtime RNG, non-seeded noise, time-of-day dependencies.

**Required output for every state-changing system:**
- `EventLogRow[]` appended to the immutable ledger (see B4)
- `StateDiff` applied atomically

### A1.2 Narrative-First UI (Absolute)
The player surface is primarily language. Numbers are permitted only in:
- economy amounts (yen)
- rank / record (wins-losses, division labels, basho day)
- time (dates, weeks)

Everything else must be expressed as:
- qualitative bands
- descriptors
- inferred confidence language (scouting)

**Hard prohibition:** raw attribute values, hidden thresholds, probability outputs.

### A1.3 Institutions Over Individuals
Stables, governance, sponsors, rivalries and records persist beyond careers.
Every system must write to history.

---

## A2. Time & Tick Model (Exact)

### A2.1 Calendar
- 6 basho/year: Hatsu, Haru, Natsu, Nagoya, Aki, Kyushu
- Basho phase: **15 daily ticks**
- Inter-basho: **6 weekly ticks**

### A2.2 Tick Order (Global)
The global simulation tick order is fixed. At each tick, systems run in this order:

1. **Input ingestion**
   - player decisions locked
   - NPC decision pass locked (see A12)
2. **Institutional constraints**
   - governance restrictions applied (if active)
   - foreign-slot constraints enforced
3. **Economy pass**
   - incomes apply (cadence dependent)
   - expenses apply
   - loan schedules (interest/principal)
   - insolvency state machine update
4. **Roster & staff administrative pass**
   - promotions/retirements queued
   - releases/joins resolved
5. **Training & recovery pass** (weekly, not daily)
6. **Combat pass** (daily during basho)
   - torikumi generation or retrieval
   - bout resolution and logs
7. **Awards pass** (basho end)
8. **Rankings pass** (basho end)
9. **Narrative rendering pass**
   - PBP, headlines, journals
10. **History & analytics persistence**
    - finalize immutable ledger rows for the tick

Any doc that describes a different ordering is overridden by this canonical order.

---

## A3. Entity Identity & Registries (Immutable)

### A3.1 Entities and IDs
All major entities have immutable IDs; names are presentation.

Required registries:
- `RikishiRegistry`
- `BeyaRegistry`
- `OyakataRegistry`
- `SponsorRegistry`
- `BoutRegistry`
- `EventLedger` (immutable)

### A3.2 ID Formats (Recommended; stable per world)
- RikishiID: `R-<worldSeed>-<birthYear>-<seq>`
- BeyaID: `B-<worldSeed>-<foundingIndex>`
- OyakataID: `O-<worldSeed>-<kabuIdOrSeq>`
- SponsorID: `S-<worldSeed>-<tier>-<seq>`
- BoutID: `BT-<worldSeed>-<bashoId>-<day>-<index>`
- GovernanceRulingID: `G-<worldSeed>-<tick>-<seq>`
- MediaEventID: `M-<worldSeed>-<tick>-<seq>`

### A3.3 Uniqueness Rules
- IDs never reused.
- Shikona uniqueness enforced at registry level (see A6).
- Stable names unique; can be duplicated only if governance explicitly authorizes a “revival” (dormant hook).

---

## A4. World Generation (Granular)

### A4.1 Worldgen Inputs
- WorldSeed
- WorldSizeScalar (defaults to 1)
- DifficultyPreset (optional; affects only recommended stable list, not simulation physics)

### A4.2 Worldgen Outputs
- Fully populated registries
- Initial banzuke
- Initial financial state (per stable)
- Initial supporters (kōenkai) state
- Initial sponsor pool
- Initial rivalries (low-to-moderate only)
- FTUE flags

### A4.3 Worldgen Steps (Detailed)
1. Create registries and counters
2. Generate stables (39–45 target)
3. Assign each stable:
   - region
   - baseline facilities band
   - baseline prestige band
4. Generate kabu/oyakata pool (if governance dormant, still create IDs and placeholders)
5. Generate NPC managers for AI-run stables:
   - archetype
   - trait vector
6. Generate rikishi population:
   - age distribution
   - physique potentials
   - temperament
7. Assign each rikishi to a stable roster based on stable profile
8. Generate shikona (registry enforced)
9. Seed initial rivalries:
   - 0–2 per stable (low intensity)
   - 0–1 per notable rikishi (if any)
10. Generate initial banzuke from strength estimates (no “perfect truth”)
11. Initialize economy:
   - stable budgets
   - supporter bands
   - existing debts (rare; never immediate bankruptcy)
12. Validate world invariants (B6 checklist)
13. Enter World Entry flow (A5)

---

## A5. World Entry, Stable Selection & FTUE (Granular)

### A5.1 Player Entry Choices
The player chooses exactly one:
1) **Found new stable**
2) **Take over existing stable**
3) **Recommended start** (curated list; still chooses an existing stable)

### A5.2 Found New Stable
Player must:
- choose stable name or click Random

**Random naming**
- deterministic: `hash(worldSeed, clickIndex)` selects from the stable-name generator pools
- must pass uniqueness check; if collision, deterministic disambiguation rule applied

New stable starts with:
- lowest prestige band
- minimal facilities band
- weak/no kōenkai
- no sekitori
- roster size minimal (configurable; recommended 6–10 recruits)

### A5.3 Take Over Existing Stable (FM-style difficulty)
The stable selection screen shows:
- stable name
- stature band (qualitative difficulty)
- short descriptor (one sentence)
- risk icons: finance, governance pressure, rivalry heat

Detail panel shows:
- supporters band
- facilities band
- recent narrative record
- rivalries (publicly known)
- governance watch status (publicly known)

**No hidden numbers exposed.**

### A5.4 FTUE Flags (1 basho)
FTUE prevents terminal outcomes but logs everything:
- closures suppressed
- forced mergers suppressed
- severe sanctions suppressed
- insolvency can occur, but “terminal collapse” is delayed

FTUE messaging adapts to chosen stable stature:
- elite: expectation pressure
- fragile: survival guidance
- new: institution-building framing

---

## A6. Shikona System (Granular)

### A6.1 Registry Guarantees
- global uniqueness for active shikona
- alias history stored permanently
- lineage kanji preferences per stable

### A6.2 Generation Inputs
- rikishi birth region
- stable lineage pool
- worldSeed
- sequence counters

### A6.3 Generation Process
1. Select pattern (prefix+core+suffix) weighted by stable lineage
2. Construct kanji + romaji
3. Validate uniqueness
4. If collision:
   - apply deterministic alternate suffix
   - then alternate prefix
   - then rare honorific insertion (if allowed)
5. Register and attach to rikishi

### A6.4 Evolution
Allowed at:
- sekitori promotion thresholds
- major career events (yūshō, scandal redemption) if enabled
Rules:
- must preserve ≥1 lineage kanji unless honorary exception
- old shikona becomes alias
- governance approval may be required when governance active

---

## A7. Rikishi Model (Granular)

### A7.1 Stored State
- physique: heightCurrent, weightCurrent, potentials, growth profile
- age and career time
- health: injury state machine
- fatigue state
- momentum/form state
- style inference state
- archetype bias state
- favorite kimarite tendencies (emergent)

### A7.2 Growth & Physique
Growth is processed weekly:
- height grows early; weight can grow longer
- growth fulfillment ∈ [0,1] approaches 1 with diminishing returns
Modifiers:
- training plan (from Training doc, referenced)
- facility bands
- injuries
- age phase

### A7.3 Career Phase Computation
Not shown numerically. Derived from age and performance trend bands:
- Prospect
- Rise
- Prime
- Decline
- Exit

Phase affects:
- recovery speed band
- injury susceptibility band
- consistency band
- narrative tone templates

---

## A8. Combat Engine V3 (Context Contract Level)

The master canon does not replace the Combat Engine spec; it binds interfaces.

### A8.1 Engine Inputs (Per Bout)
- rikishi A state snapshot
- rikishi B state snapshot
- venue modifiers (ritual only)
- bout importance tags (for PBP and sponsors)
- deterministic BoutSeed

### A8.2 Engine Outputs (Per Bout)
- winnerId
- kimariteId (82 registry)
- durationBand (instant/short/medium/long)
- position story tokens (center/edge/reversal)
- special ruling token (none/mono-ii/torinaoshi/mizui-iri)
- injury events (if any)
- fatigue deltas
- narrative cue tokens for PBP

Engine outputs must be logged in the immutable ledger.

---

## A9. Banzuke, Scheduling, Awards (Binding Interfaces)

### A9.1 Scheduling
- torikumi pairing rules are deterministic
- east/west precedence
- avoidance rules for repeated matchups (unless late-basho contention demands)

### A9.2 Promotions/Demotions
Deterministic heuristics by division; no human “committee magic” unless governance layer explicitly enabled.

### A9.3 Awards
At basho end:
- yūshō / jun-yūshō
- sanshō categories
- trophy list integration as flavor (no balance impact beyond prestige/economy hooks)

Awards feed:
- prestige band changes
- sponsors interest changes
- narrative headlines

---

## A10. Economy & Supporters (Binding Interfaces)

The master canon binds the economy system at a contract level; the dedicated economy doc owns amounts.

### A10.1 Money Cadence
- Salaries monthly
- Allowances monthly
- Kenshō per bout
- Supporters monthly
- Facilities expenses weekly/monthly (as defined)

### A10.2 Salary Routing Rule (Realism)
Sekitori salaries belong to rikishi personal account, **not** directly to stable operating budget.
Stable operating budget relies on:
- supporters (kōenkai)
- oyakata subsidies
- sponsorship flows (kenshō share)
- ticket/appearance revenue (if modeled)
- loans/benefactors

### A10.3 Insolvency State Machine
States:
- Stable → Tight → Critical → Insolvent → Rescued / Closed / Merged
No random bankruptcy; all steps are warned and logged.

---

## A11. Sponsors (Procedural) and Kenshō Ceremony Linkage (Binding)

Sponsors exist as persistent entities with tiers and lifecycles.
Sponsors appear in:
- kenshō banners (per bout)
- kōenkai member lists (monthly)
- benefactor/loan identities (crisis)

Sponsor selection is deterministic and respects:
- tier budgets by bout importance
- cooldowns (avoid repetition)
- scandal tolerance and withdrawal

---

## A12. NPC Manager AI (Binding Interfaces)

NPC managers make decisions weekly using:
- perception snapshots (no cheating)
- rivalry pressure distortions
- meta drift narratives
- finance mood bands

Outputs:
- recruit/release intents
- facility investment intents
- foreign slot intents
- scandal mitigation intents
- succession recommendations

All decisions logged.

---

## A13. Governance (Dormant but Canonical Hooks)

Governance V1 exists as forward-declared but may be inactive.
Even when dormant:
- IDs exist
- UI placeholders exist
- history ledger is compatible

When active, governance controls:
- kabu availability
- sanctions
- merger/closure arbitration
- scandal escalation

---

## A14. Narrative Systems (Binding Interfaces)

### A14.1 PBP
PBP consumes combat outputs and sponsor banner assignments to produce:
- flowing narrative without phase headings
- explicit kimarite mention
- optional mono-ii/torinaoshi/mizui-iri branches
- sponsor banner mention slots
- kenshō envelope ceremony text
- crowd reaction and crowd memory callbacks
- text variety via descriptor sets + cooldown

### A14.2 Career Journals & Headlines
- deterministic headline phrase engine
- journal entries written at key thresholds:
  - promotion milestones
  - rivalry peaks
  - scandals and redemptions
  - retirement

---

# PART B — Data Contracts & Tables (Expanded)
(See annex for verbatim legacy tables. This part defines the normalized v2.2 schemas.)

## B1. WorldState Schema (Normalized)
```ts
WorldState {
  worldId: string
  worldSeed: string
  calendar: CalendarState
  registries: Registries
  stables: Record<BeyaID, Beya>
  rikishi: Record<RikishiID, Rikishi>
  sponsors: Record<SponsorID, Sponsor>
  governance: GovernanceState
  economy: EconomyState
  banzuke: BanzukeState
  narrative: NarrativeState
  ledger: EventLedger
}
```

## B2. Beya Schema (Normalized)
```ts
Beya {
  beyaId: BeyaID
  name: BeyaName
  regionId: RegionID
  statureBand: StatureBand
  prestigeBand: PrestigeBand
  facilitiesBand: FacilitiesBand
  koenkai: KoenkaiState
  roster: RikishiID[]
  staff: StaffState
  finances: BeyaFinanceState
  rivalries: RivalryID[]
  history: HistoryRefs
}
```

## B3. Sponsor Schema (Normalized)
(See sponsor doc annex; this includes tier, category, traits, relationships.)

## B4. EventLedger Row (Immutable)
```ts
EventLogRow {
  tickId: TickID
  type: string
  subjectId: string
  objectId?: string
  tags: string[]
  payload: Record<string, any>   // must be schema-versioned
}
```

## B5. Qualitative Bands (Standardized Enumerations)
- PrestigeBand: `legendary|powerful|established|rebuilding|fragile|new`
- FinanceMood: `flush|tight|danger`
- GovernancePressure: `none|watch|active|crisis`
- ScandalHeat: `low|medium|high|inferno`
- InjuryMood: `contained|worrying|spiraling`
- SupportersBand: `none|weak|moderate|strong|powerful`

## B6. World Validation Checklist (Hard)
- Unique IDs
- Unique active shikona
- Valid banzuke sizes per division
- No stable begins Insolvent
- Kabu placeholders valid
- Minimum roster size per stable met
- Sponsor pool present
- Ledger initialized

---

# PART C — Conflict Resolution Notes (Granular)

## C1. How conflicts were resolved
- v2.0 was compressed; v2.2 restores detail using v1.2 verbose as baseline.
- Any time a newer doc used narrative-first language that omitted mechanics, mechanics are preserved from older docs and narrative-first constraints are applied on top.
- Where two docs disagree about a number: economy doc is authoritative for money; banzuke doc for rank sizes; combat engine spec for combat.

---

# PART D — Source Preservation Annex (Verbatim, Non-Lossy)

This annex embeds the full text of each source document to guarantee that:
- no feature is missed
- nothing is “lost in translation”
- the combined file is not smaller than the source set

Each source is included under a collapsible-style heading.

---


## SOURCE — Basho_Master_Context_Canon_v2.0_Ultimate.md

```md
# Basho — Master Context Canon v2.0
## Definitive, Narrative‑First, Fully‑Specified Design Bible

Date: 2026‑01‑07  
Status: **ULTIMATE CANON — SINGLE SOURCE OF TRUTH**  
Supersedes:
- Master Context v0.4.0
- Consolidated Context v0.4.1
- Clean Canon v1.1, v1.2, v1.3, v1.4

---

## PURPOSE OF THIS DOCUMENT

This document **fully merges and reconciles** all prior Master Context and Clean Canon documents into **one explicit, implementation‑grade contract**.

It is:
- **not high‑level**
- **not aspirational**
- **not a roadmap**

It is the **binding truth** of how Basho works.

If something is not specified here, it is either:
- intentionally undefined, or
- forbidden

---

# PART I — CORE DESIGN CONTRACTS

## 1. Narrative‑First Presentation Contract (Binding)

Basho is not presented as a spreadsheet simulator.

Internally:
- the engine is numeric
- outcomes are deterministic
- logs are exact

Externally:
- the player sees **language, tone, implication, and consequence**
- numbers appear **only** where institutionally unavoidable

### 1.1 Where Numbers MAY Appear
Numbers are allowed **only** in:
- economy (yen, salaries, debts)
- rankings & records (wins/losses, rank names)
- time (days, weeks, basho count)

### 1.2 Forbidden Numeric Leakage
Raw values must **never** be shown for:
- attributes
- fatigue, morale, injury risk
- growth ceilings
- prestige
- rivalry heat
- AI intent or confidence
- governance thresholds

Breaking this rule is a design bug.

---

## 2. Pillars (Final Form)

### Pillar 1 — Authentic Institutions
Sumo is conservative, hierarchical, political, and slow‑moving.

Rules are learned through:
- repetition
- consequence
- narrative framing

### Pillar 2 — Deterministic Simulation
Given the same:
- world seed
- player inputs
- event stream

…the world resolves identically.

### Pillar 3 — Emergent Narrative
The game never scripts drama.
It **records and remembers** it.

### Pillar 4 — Always Playable
The game must always boot, load, and simulate safely, even with dormant systems.

---

# PART II — WORLD & TIME

## 3. Time Model

- 6 basho per year:
  - Hatsu, Haru, Natsu, Nagoya, Aki, Kyushu
- Basho time: **daily** (Day 1–15)
- Interim time: **weekly** (6 weeks)

No real‑time dependency exists.

---

## 4. World Structure

### 4.1 Flexible Stable Count
- Initial: ~42 stables (range 39–45)
- Ongoing soft bounds: 35–50

### 4.2 Core Entities
- WorldState
- Heya (stable)
- Rikishi
- Oyakata
- BashoState
- Bout
- Rivalry
- Sponsor / Supporter (procedural)

All entities have immutable IDs.

---

# PART III — STABLES (BEYA)

## 5. Beya Lifecycle

### 5.1 Founding
A new stable may be founded when:
- a retired rikishi meets eligibility
- elder stock access exists (when governance active)
- minimum funds/facilities met
- world cap allows

Founding produces:
- a new institutional identity
- baseline prestige
- seeded facilities
- narrative “founding moment”

### 5.2 Succession
Triggered on:
- retirement
- death
- disqualification

Pipeline:
1. build candidate pool
2. score candidates (prestige, loyalty, finances, conduct)
3. governance check (if active)
4. successor approved OR failure

### 5.3 Closure & Merger
If succession fails:
- closure is default
- merger is optional (future‑active)

Closures redistribute rikishi and generate historical records.

---

# PART IV — RIKISHI SYSTEM

## 6. Permanent Identity

Each rikishi has:
- immutable ID
- unique shikona (registry enforced)
- origin metadata

Shikona are generated deterministically from weighted syllable pools.

---

## 7. Physique & Growth

Each rikishi stores:
- current height/weight
- potential height/weight
- growth fulfillment scalar
- growth profile (early/late/steady)

Not all rikishi reach potential.

Growth depends on:
- age
- training
- injuries
- facilities

---

## 8. Career Phases

Phases are **implicit**, not shown numerically:
- Prospect
- Rise
- Prime
- Decline
- Exit

Narrative language communicates phase.

---

## 9. Style & Archetype

### 9.1 Tactical Archetypes (Behavior Bias)
- Oshi Specialist
- Yotsu Specialist
- Speedster
- Trickster
- All‑Rounder

Archetype is a bias layer, not destiny.

### 9.2 Style (Emergent Label)
- oshi
- yotsu
- hybrid

Style recalculates over time based on:
- physique
- kimarite usage
- grip success

---

## 10. Dynamic State

### Fatigue
- accumulates per bout and training
- recovers in interim
- affects initiative and injury risk

### Momentum
- short‑term form scalar
- rises from streaks and upsets
- decays naturally

### Injuries
- deterministic
- stateful
- visible with recovery timelines

---

# PART V — COMBAT ENGINE V3

## 11. Bout Phases
1. Tachiai
2. Stance / Grip
3. Momentum ticks
4. Finisher window
5. Resolution + log

---

## 12. Kimarite System (82)

- Full official registry
- Filtered by stance, grip, position
- Weighted by:
  - style
  - archetype
  - favorites
  - rarity dampening

Favorites (tokui‑waza) emerge naturally.

---

# PART VI — RANKINGS & BASHO

## 13. Banzuke
- Authentic hierarchy
- Deterministic promotion heuristics
- Correct bout counts

## 14. Awards & Kensho
- Yusho, jun‑yusho, sansho
- Kensho banners attach to bouts
- Ceremony narrated in PBP

---

# PART VII — ECONOMY & PRESTIGE

## 15. Economy (Numeric Core)

Includes:
- monthly sekitori salaries
- allowances for lower ranks
- kensho payouts
- retirement funds
- supporter income
- loans & benefactors

Failure is deterministic, never random.

---

## 16. Prestige (Narrative Scalar)
Prestige is never shown numerically.

It affects:
- sponsor interest
- media tone
- governance scrutiny
- recruitment ease

---

# PART VIII — INFORMATION & AI

## 17. Scouting & Fog‑of‑War
- incomplete information by default
- revealed through observation and rivalry
- expressed as analyst language

---

## 18. NPC Manager AI

Managers have:
- profiles
- risk tolerance
- adaptation lag
- rivalry awareness

AI responds to meta drift and scandals deterministically.

---

# PART IX — NARRATIVE SYSTEMS

## 19. Play‑by‑Play (PBP)
- ritual framing (salt throws, shikiri)
- flowing narration
- kimarite reveal
- kensho ceremony
- crowd & memory reactions

---

## 20. Career Journals & Media
- journals auto‑generated
- headlines selected deterministically
- scandals and governance recorded permanently

---

# PART X — FORWARD SYSTEMS

## 21. Dormant but Canonical
- Governance V1
- Kabu system
- Stable mergers
- Advanced media
- Analytics dashboards

Dormant systems may narrate, but never surprise.

---

# FINAL CONTRACT

Internally:
- exact numbers
- exact logs
- reproducibility

Externally:
- implication
- memory
- consequence

> “You do not manage numbers. You manage institutions.”

---

END OF MASTER CONTEXT CANON v2.0

```



## SOURCE — Basho_Master_Context_Clean_Canon_v1.4_Definitive.md

```md
# Basho — Master Context (Clean Canon v1.4)
## Narrative‑First, Fully‑Specified, Implementation Canon

Date: 2026‑01‑06  
Status: **Definitive Canon**  
Supersedes:
- Clean Canon v1.2 — Full Verbose
- Clean Canon v1.3 — Narrative‑First Edition

---

## How This Document Is Structured

This document **merges the full mechanical completeness of v1.2** with the **explicit narrative‑first presentation contract of v1.3**.

**Rule of precedence inside this document:**
- Mechanical rules from v1.2 are preserved unless explicitly overridden.
- Presentation, UI, and player‑facing interpretation follow the narrative‑first rules below.
- Internal simulation remains numeric and deterministic at all times.

If a conflict exists:
> **Mechanics stay numeric. Presentation becomes narrative.**

---

# 0. Narrative‑First Presentation Contract (Binding)

Basho is not presented as a spreadsheet simulation.  
It is presented as a **living chronicle of sumo institutions, careers, and decline**.

### 0.1 Engine vs Player Reality
- The engine uses precise numbers.
- The player consumes **language, tone, trends, and consequence**.
- Numbers appear only where money, rank, or time demand them.

> “The truth exists underneath. The player lives on the surface.”

### 0.2 Where Numbers Are Allowed
Raw numbers may appear **only** in:
- Economy ledgers (yen, salaries, debts, runway)
- Rankings & records (wins/losses, rank titles)
- Time (basho count, days, weeks)

All other values must be:
- banded
- comparative
- trend‑based
- described verbally

### 0.3 Forbidden Numeric Leakage
Never expose raw values for:
- attributes
- fatigue, morale, injury risk
- growth ceilings
- rivalry heat
- prestige
- governance thresholds
- AI confidence or intent

Breaking this rule is a design bug.

---

# 1. Core Vision & Pillars

(From v1.2, clarified narratively)

### Pillar 1 — Authentic Institutions
Sumo is:
- conservative
- hierarchical
- political
- tradition‑bound

Rules are inferred through outcomes, not tooltips.

### Pillar 2 — Deterministic Simulation
Nothing is random.
Everything is reproducible under seed + state + choice.

### Pillar 3 — Emergent Narrative
The game never scripts drama.
It **remembers** it.

### Pillar 4 — Always Playable
The game must always boot, load, and remain navigable, even with dormant systems.

---

# 2. Canonical Tech Stack
*(Unchanged from v1.2 — authoritative)*

[Full tech stack preserved verbatim]

---

# 3. Determinism Rules
*(Unchanged from v1.2 — authoritative)*

- World Seed
- Deterministic divergence
- Forbidden nondeterminism

---

# 4. World Structure & Time
*(Unchanged from v1.2, harmonized with World Generation Contract)*

- ~42 stables, flexible bounds
- 6 basho per year
- day‑based basho, week‑based interim

---

# 5. Beya System
*(Preserved mechanically, narrated institutionally)*

Founding, succession, closure, and mergers remain **rule‑driven**, but surfaced as:
- council deliberations
- lineage stories
- institutional failure or survival arcs

---

# 6. Rikishi Identity & Career System
*(Full v1.2 mechanics retained)*

### 6.1 Permanent Identity
- Immutable ID
- Unique shikona (registry‑enforced)
- Origin metadata

### 6.2 Career Phases
Youth → Rise → Prime → Decline → Exit

Phases are **never shown numerically**.
They are implied through:
- commentary
- consistency
- recovery speed
- narrative framing

---

# 7. Physique, Fatigue, Momentum & Injuries
*(Full mechanical model retained)*

### Presentation Rule
Players never see:
- fatigue values
- injury probabilities
- momentum numbers

Instead they see:
- body language
- form commentary
- recovery notes
- visible injuries with timelines

---

# 8. Combat Engine V3
*(Mechanically identical to v1.2)*

### Narrative Override
Combat logs are rendered as **story beats**:
- tachiai clash
- control shift
- decisive moment
- finish framing

The kimarite remains official; execution is narrated.

---

# 9. Banzuke & Rankings
*(Unchanged mechanically)*

- Authentic hierarchy
- Deterministic promotion heuristics
- Records shown numerically (allowed)

Narrative framing emphasizes:
- pressure
- expectation
- consequences of rank

---

# 10. 82‑Kimarite System
*(Fully preserved from v1.2)*

Registry, weighting matrices, stance biases, and tokui‑waza mechanics remain unchanged.

**Presentation rule:**  
Players learn tendencies through repetition and commentary, not probability tables.

---

# 11. Economy, Prestige & Rivalries

### 11.1 Economy (Numeric Core)
Salaries, kenshō, debt, loans, runway remain explicit numbers.

### 11.2 Prestige (Narrative Scalar)
Prestige is **never shown numerically**.
It is implied via:
- banner frequency
- media tone
- recruitment ease
- governance attention

### 11.3 Rivalries
Rivalry heat is hidden.
Importance is conveyed via:
- headline frequency
- commentary language
- crowd reaction
- AI behavior shifts

---

# 12. Scouting & Fog‑of‑War

*(Mechanics preserved; presentation narrative)*

Scouting reports read like analyst notes:
- “Appears vulnerable late.”
- “Struggles on the belt.”
- “Condition seems inconsistent.”

Confidence is verbal, not numeric.

---

# 13. Narrative Consumption Layer

Narrative is a **consumer**, never a driver.

Inputs:
- bout logs
- rivalries
- seasonal tone
- injuries
- governance events

Outputs:
- headlines
- journals
- retrospectives
- commentary

All deterministic.

---

# 14. Data Contracts & Helpers
*(Preserved from v1.2)*

Types, helpers, kimarite registry remain authoritative.

---

# 15. Forward‑Declared Systems
*(Preserved and aligned with narrative contract)*

- Governance V1
- Mergers
- Loans & benefactors
- Career journals & analytics

Dormant systems may produce **narrative signals only**, never hidden outcomes.

---

# 16. Final Developer Contract

Internally:
- numbers are precise
- logs are exact
- determinism is absolute

Externally:
- the player sees meaning, not machinery
- uncertainty is explicit
- explanation follows consequence

> “You don’t manage numbers. You manage consequences.”

---

**End of Clean Canon v1.4 — Definitive Narrative‑Mechanical Canon**

```



## SOURCE — Basho_Master_Context_Clean_Canon_v1.3_Narrative_First.md

```md
# Basho — Master Context (Clean Canon v1.3 — Narrative-First Edition)

Date: 2026-01-06  
Status: Canonical, narrative-first, implementation-ready  
Supersedes: Clean Canon v1.2 (Full Verbose)

Purpose:  
This document is the **definitive design bible** for Basho, rewritten to explicitly enforce a **narrative-first presentation philosophy**.  
The simulation remains fully deterministic and numeric internally, but the *player-facing experience* is deliberately **thematic, descriptive, and story-driven**, with **hard numbers shown only where economically necessary**.

If there is a conflict between *numeric transparency* and *narrative readability*, **narrative readability wins** (except for explicit economic ledgers).

---

## 0. Narrative-First Contract (NEW)

### 0.1 Core Rule
Basho is not presented as a spreadsheet.  
It is presented as **a living chronicle of sumo institutions and careers**.

- The engine uses numbers.
- The UI uses *language*.
- The player reasons in *stories and trends*, not raw stats.

> “The truth exists underneath. The player lives on the surface.”

---

### 0.2 Where Numbers Are Allowed
Numbers may be shown **only** in:
- **Economy ledgers** (yen amounts, salaries, debts, runway)
- **Rankings & records** (wins/losses, rank titles)
- **Time** (basho count, days, weeks)

Everywhere else, values must be:
- banded
- comparative
- trend-based
- described in prose

---

### 0.3 Forbidden Numeric Leakage
The following must *never* be shown as raw numbers:
- attributes (strength, balance, stamina)
- fatigue, morale, injury risk
- growth potential
- rivalry heat
- prestige
- governance thresholds
- AI confidence or intent

---

## 1. Core Vision & Pillars (Narrative Clarified)

### Pillar 1 — Authentic Institutions
The world behaves like real sumo:
- tradition-bound
- hierarchical
- conservative
- slow to change
- rich in subtext

Rules exist, but they are **rarely explained directly**. They are inferred through outcomes, commentary, and consequences.

---

### Pillar 2 — Deterministic, Explainable Simulation
Nothing is random.
Everything can be explained *after the fact*.

But the explanation is framed as:
- “He looked heavy-footed late”
- “The stable seems to be losing its edge”
- “Momentum abandoned him at the rope”

—not as equations.

---

### Pillar 3 — Narrative Consumption, Not Narrative Control
The player does not author stories.  
The player **manages an institution**, and the narrative *emerges*.

The game never invents drama.
It remembers it.

---

## 2. Presentation Philosophy by System

### 2.1 Rikishi Attributes (Narrative Bands)

Attributes are described as:
- “overwhelmingly strong”
- “technically refined”
- “still raw”
- “showing wear”
- “dangerous in short exchanges”

Each phrase maps deterministically to an internal band.

The mapping is consistent, but hidden.

---

### 2.2 Fatigue, Form, and Injuries

Instead of numbers, the UI uses:
- body language
- commentary cues
- recovery notes
- trainer observations

Examples:
- “His legs looked heavy today.”
- “He struggled to reset after the initial clash.”
- “Still favoring the knee.”

Exact values remain invisible.

---

### 2.3 Style & Evolution

Style is presented as **identity**, not math:
- “A relentless pusher.”
- “Comfortable on the belt.”
- “Adapting toward control as he ages.”

Style drift is narrated as *career evolution*, not stat change.

---

## 3. Combat & Bout Narrative

### 3.1 Phase Logs as Story Beats
Each bout produces:
- tachiai description
- control shift
- decisive moment
- finish framing

Example:
> “They collided hard, but it was Takamori who gave ground first.  
> Shirogane stayed patient, waited for the opening, and forced him out at the edge.”

The underlying engine is unchanged; only the *voice* matters.

---

### 3.2 Kimarite Presentation
The official kimarite is shown, but:
- accompanied by descriptive flavor
- contextualized (“late”, “counter”, “on the straw”)
- framed as habit (“another classic yorikiri”)

Players learn tendencies through repetition, not tooltips.

---

## 4. Economy (Exception: Numbers Are Explicit)

Economy is the **one place** where numbers are sacred:
- salaries
- kenshō
- debts
- loans
- runway

This is intentional:
- money is the *hard constraint*
- institutions die from cash, not vibes

However, *impact* is still narrated:
- “Supporters are losing faith.”
- “The books are tightening.”
- “This feels unsustainable.”

---

## 5. Rivalries & Institutional Memory

Rivalries are described as:
- “quiet tension”
- “bad blood”
- “unfinished business”
- “a defining feud”

Heat is never shown.

Players understand importance through:
- headline frequency
- commentary tone
- crowd reaction language
- AI behavior shifts

---

## 6. Governance & Scandals (Language First)

Governance is presented formally:
- notices
- warnings
- rulings
- decisions

But severity is conveyed through **language and ceremony**, not meters:
- “The council has taken note…”
- “This matter will not be ignored.”
- “The decision is final.”

---

## 7. Scouting & Fog-of-War (Narrative Intelligence)

Scouting reports read like analysis, not data dumps:
- “Appears vulnerable to lateral movement.”
- “Struggles when forced into prolonged grapples.”
- “Condition seems to dip late in tournaments.”

Confidence is expressed verbally:
- “Early read”
- “Consistent pattern”
- “Well-established tendency”

---

## 8. Career Journals & History (Chronicle Tone)

Journals are written as **career chronicles**, not timelines:
- chapters
- turning points
- rises and declines
- rivalries as arcs

Example:
> “This basho marked the beginning of his long rivalry with Kiyonoumi, a pairing that would define both careers.”

---

## 9. World Tone & Seasonal Flavor

Seasonal tone influences:
- commentary
- injury framing
- crowd descriptions
- fatigue narration

Winter is harsh.  
Summer is grinding.  
Autumn is tense.  
Spring feels hopeful.

No mechanical explanation is given unless necessary.

---

## 10. UI Language Rules (Binding)

- Prefer verbs over adjectives
- Prefer trends over snapshots
- Prefer comparisons over absolutes
- Prefer implication over explanation

If a tooltip explains *why* something happened, it must do so narratively first.

---

## 11. Developer Contract (Important)

Internally:
- numbers are precise
- determinism is strict
- debugging tools may expose truth

Externally:
- the player never sees the machinery
- the illusion of a living world is preserved

Breaking this contract is a design bug.

---

## 12. Canon One-Liners (Expanded)

- “You don’t manage numbers. You manage consequences.”
- “Careers end quietly long before they end officially.”
- “The most dangerous decline is the one you don’t notice.”
- “Money kills stables. Pride kills careers.”

---

End of Clean Canon v1.3 — Narrative-First Edition

```



## SOURCE — Basho_Master_Context_Clean_Canon_v1.2_FULL_VERBOSE.md

```md
# Basho / SumoGame — Master Context (Clean Canon v1.2 — Full)

Date: 2026-01-06  
Purpose: A **sprint-free**, restart-ready, fully explicit design bible describing the entire game, its systems, and the canonical tech/design contracts.

> This document is intended to be copy/pasted into a fresh chat as the full game context, and also used as the canonical reference for implementation.

---

## Table of Contents
1. Core Vision & Pillars  
2. Canonical Tech Stack (Basho Tech Spec v1.0)  
3. Determinism Rules (Deterministic but Divergent)  
4. World Structure (including flexible beya count)  
5. Time, Calendar, and the Six-Basho Loop  
6. Beya (Stable) System: Founding, Succession, Closure  
7. Rikishi Identity, Growth, Style Evolution, and Career Phases  
   7.10 Dynamic State Attributes (Fatigue, Momentum, Injuries)  
8. Combat Engine V3 (Deterministic): Phase Model, Logs, Counters  
9. Banzuke (Ranking) System: Hierarchy and Promotion Heuristics  
10. The 82-Kimarite System (Option A): Registry + Weighting Matrix  
11. Economy: Kenshō, Prestige, Stable Funds, Retirement Funds  
   11.3 Rivalries  
   11.4 Scouting & Fog of War  
   11.5 Seasonal Tone & World Flavor  
12. Narrative Consumption Layer (Formalized)  
13. Data Contracts (Types) and Helper Modules  
   13.4 Kimarite Aliases and Post-Processing Labels  
14. Forward-Declared Systems (Canonical but Dormant)
---

# 1. Core Vision & Pillars (Canonical)

## Pillar 1 — Authenticity
Basho is a **sumo management simulation** grounded in authentic structures:
- **Six basho per year**: Hatsu, Haru, Natsu, Nagoya, Aki, Kyushu.
- **Authentic rank hierarchy**: Yokozuna → Jonokuchi, with correct bout counts per division.
- **Kenshō banners**, payouts, and retirement funds as a core economic loop.
- **Beya-centered world** (stable culture, succession, reputation, facilities).

## Pillar 2 — Deterministic Simulation
- Every outcome is repeatable given the same **World Seed** and the same sequence of player choices.
- Combat is deterministic under seeded RNG (seedrandom), with **data-driven endings** from the 82-kimarite registry.

## Pillar 3 — Narrative-First
- Every bout generates a structured log of phases and pivotal moments.
- Systems (rivalries, seasonal tone, scandals, succession) are explicitly designed to produce “headlines” and story hooks.
- The sim should feel like it creates drama *without* scripting outcomes.

## Pillar 4 — Always Playable
- The build must boot locally and remain navigable at all times.
- Missing features must be guarded and degrade gracefully:
  - seeded demo data
  - stubbed services
  - safe UI states, empty-state copy, and error boundaries
  - offline-friendly packaging patterns

---

# 2. Canonical Tech Stack (Basho Tech Spec v1.0)

**Frontend Core**
- React (Vite) + TypeScript
- Zustand + Immer (state)
- Tailwind + Radix UI (layout/controls/dialogs)
- React Router (navigation)
- React Hook Form (configuration flows)

**Simulation Systems**
- Custom TypeScript sim engine
- seedrandom for deterministic outcomes
- Comlink + Web Workers for parallel simulation (long ticks, world updates)
- Zod for data validation
- Optional Ink.js for narrative integration (storylets generated from logs/events)

**Persistence & Packaging**
- Dexie.js for IndexedDB saves
- pako + JSZip for compression/export
- versioned Dexie migrations
- Vite PWA for offline play

**Audio/Visual Layer**
- howler.js (sound)
- Framer Motion (animation)
- Lucide React (icons)
- Recharts (analytics)
- react-markdown (dynamic text rendering)

**Tooling**
- Vite / ESBuild
- ESLint + Prettier
- Vitest + React Testing Library
- GitHub Actions (build automation)

---

# 3. Determinism Rules (Deterministic but Divergent)

## 3.1 World Seed
A single **World Seed** deterministically drives:
- world generation (beya count, starting rosters, initial attributes)
- schedule generation rules (where applicable)
- combat RNG (via bout seeds derived from world seed + participants + match identifiers)

## 3.2 Divergence That’s Allowed (Still Deterministic)
The world is deterministic, but outcomes can still vary because inputs vary:
- training choices
- facility upgrades
- scouting decisions (when introduced)
- roster changes (recruitment, transfers, retirements)
- event triggers (seasonal events, scandals, injuries) *when those triggers are themselves deterministic*

## 3.3 Forbidden Non-Determinism
When operating in canonical deterministic mode:
- do **not** call `Date.now()` inside simulation logic
- do **not** use unseeded `Math.random()`
- do **not** run asynchronous UI timing that affects sim results

---

# 4. World Structure

## 4.1 Flexible Beya Count
- Initial world spawns approximately **42 stables**, randomized within **39–45**.
- Long-term world target remains “around 42” but flexible to support:
  - new stable founding by retired rikishi
  - stable closure on failed succession
- Soft world bounds: typically **35–50 active stables**.

## 4.2 Core Entities (High Level)
- **Heya (Stable)**: roster, oyakata, funds, reputation, facilities.
- **Rikishi**: permanent identity + evolving body + evolving performance profile.
- **BashoState**: schedule, results, day progression, standings.
- **WorldState**: seed, time, entity registries, history.

---

# 5. Time, Calendar, and the Six-Basho Loop

## 5.1 Annual Loop
- 6 basho per in-game year.
- Basho index cycles (0–5) across: Hatsu, Haru, Natsu, Nagoya, Aki, Kyushu.

## 5.2 Time Progression Modes
- **During basho**: advance by **day** (Day 1–15).
- **Between basho**: advance by **week** (interim).

## 5.3 Interim Length
- Interim phase is **6 weeks** bridging tournaments.

---

# 6. Beya (Stable) System: Founding, Succession, Closure

## 6.1 Oyakata Eligibility (Rules + Hook)
A candidate must satisfy:
- Rank/standing threshold (design intent: sanyaku-caliber career)
- Age ≥ 28
- Clean conduct (no severe sanctions)
- Access to elder stock line (kabu/toshiyori) when governance is fully modeled

## 6.2 Succession Rules (Explicit)
**Trigger moments**
- end of each basho (review hook)
- oyakata retirement
- oyakata death/disqualification (event-driven)

**Selection pipeline**
1. Identify successor pool
   - internal candidates (stable elders, retired stars)
   - external candidates (available elder stock holders)
2. Score candidates
   - leadership, reputation, prestige
   - loyalty and stable cohesion
   - finances/facilities compatibility
   - conduct and reliability
3. Select successor if any clears threshold
4. If no successor clears threshold → closure or merge (merge is optional/future)

## 6.3 Closure Rules (Full)
A stable closes when any of the following occurs:
- oyakata retires/dies and no qualified successor exists
- forced dissolution due to severe governance sanction (future: match-fixing, violence)
- insolvency after grace period and rescue attempts (future: loans/benefactors)

## 6.4 Founding New Stables (Detailed)
A new stable may be founded when:
- a qualified retired rikishi obtains elder stock
- world cap is not exceeded (soft constraint)
- minimum funds/facilities are met (can be modest)

Founding creates:
- new heya entity with seeded facilities
- reputation baseline
- recruitment slots and a “founding narrative” headline

---

# 7. Rikishi Identity, Growth, Style Evolution, and Career Phases

## 7.1 Permanent Identity
Permanent data (never changes):
- unique `id`
- unique `shikona` (generated from weighted syllables; uniqueness enforced)
- `nationality` and other origin metadata (if used)

## 7.2 Evolving Physique (Current + Potential)
Rikishi **height, weight, and style evolve over time**.
- Each rikishi has **current** and **potential** height/weight.
- Not all rikishi reach potential (fulfillment is deterministic and variable).

See **Career Phase Model** below for how growth plays out.

# 7.7 Career Phase Model (Growth → Prime → Decline)

Basho models a rikishi as a **long-lived, evolving athlete**. The goal is that careers generate believable arcs and narrative beats, while remaining deterministic under a seed.

## A) Career Phases (Conceptual)
> Phase boundaries are not hard-coded ages; they are computed from age + physique fulfillment + injury history + performance trajectory.

### 1) Youth / Prospect
- **Theme:** potential not yet realized.
- **Physique:** height and weight trend toward potential at the highest rate.
- **Skills:** “spiky” improvements; technique and balance can jump with good coaching.
- **Style drift:** most likely here (oshi ↔ hybrid ↔ yotsu can meaningfully shift).

### 2) Development / Rise
- **Theme:** specialization begins.
- **Physique:** weight approaches a chosen “fighting mass”; height growth slows/ends.
- **Skills:** steadier gains; archetype expression becomes clearer.
- **Favorites:** tokui-waza begins to stabilize (top 2–3 emerge).

### 3) Prime
- **Theme:** highest consistency and conversion rate.
- **Physique:** stable; weight may oscillate seasonally with training blocks.
- **Skills:** gains are marginal; consistency and composure dominate.
- **Favorites:** signature move set is established; counters improve with experience.

### 4) Veteran / Decline
- **Theme:** adaptation under constraint.
- **Physique:** weight may increase (or decrease due to injury management); speed often declines first.
- **Skills:** technique/experience remain strong, but physical outputs fall.
- **Style drift:** often toward **yotsu/hybrid** for control or toward **trickster** patterns for survival (depending on attributes).

### 5) Late Career / Exit
- **Theme:** legacy, succession, and story closure.
- **Physique:** managed; injuries accumulate; fatigue sensitivity high.
- **Outcomes:** retirement triggers governance hooks (succession / stable founding).

## B) Current vs Potential Physique (Data Contract)
Each rikishi stores:
- `heightCurrentCm`, `heightPotentialCm`
- `weightCurrentKg`, `weightPotentialKg`
- `growthFulfillment` (0–1): how much of potential is realistically reachable
- `growthRateProfile` (seeded): “early bloomer”, “late bloomer”, “steady”, etc.

**Deterministic rule:** growth changes are deterministic from (seed + age + training + injury). No pure randomness.

## C) Physique → Style + Kimarite Feedback Loop
As physique changes, it should influence:
1. **Style** (oshi/yotsu/hybrid) recalculation
2. **Grip success** probability in clinch phase
3. **Kimarite selection weights**
4. **Favorite moves drift** (tokui-waza)

Example effects:
- +weight +power → increases force-out conversion, pushes `oshidashi/yorikiri` frequency upward
- +balance +technique → increases throws/twists in belt stances
- +speed +agility → increases trips/evasion, raises lateral position events
- accumulated injuries → decrease speed burst, raise “short finish” behaviors (slap/pull, quick pushdowns)

## D) “Not Everyone Reaches Potential” (Fulfillment Rules)
A rikishi may fail to reach potential due to:
- repeated injury interrupts growth/training
- poor facility quality (nutrition/recovery)
- mismatch between training intensity and body type
- chronic fatigue from overtraining
- (optional later) personality traits: discipline, professionalism, risk appetite

This creates believable variance in career arcs without breaking determinism.


## 7.8 Style Evolution (Explicit)
Style is a **current classification**, and can drift across a career:
- `oshi`: distance, pushing/thrusting, linear pressure
- `yotsu`: belt control, throws/twists/lifts, clinch dominance
- `hybrid`: adaptable toolbox, can win from both distance and grip states

**Style update cadence (Option A):**
- recompute at end of each basho (or quarterly in interim)
- apply hysteresis thresholds to prevent sudden flips

**Inputs to recompute style**
- physique deltas (weight/height changes)
- observed kimarite distribution (which finishes actually occur)
- grip success distribution (belt-dominant frequency)
- coaching emphasis (if modeled)
- archetype as a soft bias, not a hard lock

## 7.9 Tokui-waza / Favorite Moves Drift
- `favoredKimarite` reflects the top 2–3 winning finishes.
- It is updated after each win and displayed on the rikishi card.
- As physique/style changes, the favored list should *naturally* drift.


## 7.10 Dynamic State Attributes (Fatigue, Momentum, Injuries)

In addition to “long arc” attributes (physique, skills, style), each rikishi carries **short-term dynamic state** that changes frequently and meaningfully shapes outcomes. These values exist to produce believable arcs (“he was gassed,” “he peaked late,” “his knee betrayed him”) while staying deterministic.

### 7.10.1 Fatigue (0–100)

**Definition:** A scalar representing accumulated physical strain and reduced readiness.

**How fatigue increases**
- **During basho:** each bout adds fatigue based on:
  - bout length (number of momentum ticks)
  - explosive actions (tachiai burst, repeated lateral recoveries)
  - mass vs opponent (heavy collisions cost more)
  - current injury status (injured athletes fatigue faster)
- **Between basho (training):** fatigue increases with training intensity and decreases with recovery emphasis.

**How fatigue recovers**
- **Interim weeks:** baseline recovery each week.
- **Facilities:** better recovery/nutrition facilities increase recovery per week.
- **Training choices:** recovery blocks, deload weeks, or conservative programs accelerate recovery.

**Mechanical effects (canonical)**
- High fatigue reduces:
  - tachiai burst (initiative probability)
  - speed/agility contribution during momentum ticks
  - counter success (especially late-bout recoveries)
- High fatigue increases:
  - injury risk
  - “short finish” likelihood (slap/pull, quick pushdowns) as the engine prefers quicker resolutions when output is low.

**Narrative effects**
- Log phrasing should reflect fatigue at meaningful thresholds (e.g., “legs looked heavy,” “couldn’t reset his base”).

### 7.10.2 Momentum / Form (–10 to +10)

**Definition:** A short-term representation of confidence, rhythm, and execution sharpness.

**How momentum changes**
- Increases from:
  - winning streaks
  - upsets (especially against higher rank)
  - rivalry wins (see §11.3)
  - clutch finishes (late bout recoveries)
- Decreases from:
  - losing streaks
  - repeated one-sided losses
  - injury setbacks
  - scandal / discipline events (when modeled)

**Decay**
- Momentum naturally decays during interim so the world doesn’t become permanently “hot” or “cold.”
- The decay rate is deterministic and may be influenced by discipline traits (future), facilities, and stable culture (future).

**Mechanical effects (canonical)**
- Momentum slightly biases:
  - tachiai advantage
  - conversion rate once a finisher is selected (not the selection itself, which remains registry-driven)
- Momentum can raise volatility in rivalry bouts (see §11.3).

**Narrative effects**
- Momentum drives commentary tone: “in form,” “slumping,” “found his rhythm.”

### 7.10.3 Injury State (Deterministic)

**Definition:** Injuries are stateful conditions that apply attribute penalties and recovery timelines.

**Injury model**
- Each injury tracks:
  - `severity` (light / moderate / severe)
  - `affectedOutputs` (e.g., speed, balance, power, stamina)
  - `recoveryWeeksRemaining`
  - `recurrenceRisk` modifier (higher after prior injuries of the same type)

**How injuries occur**
- Injuries are deterministic outcomes derived from:
  - current fatigue
  - mass and collision intensity
  - training intensity
  - prior injury history
  - bout patterns (long, grinding matches raise risk)
  - seed and state, never unseeded randomness

**Mechanical effects (canonical)**
- Attribute penalties apply immediately.
- Recovery reduces penalties gradually or stepwise per week (implementation choice, but deterministic).
- Injuries increase likelihood of style drift toward control or survival patterns late career (§7.7).

**UI expectations**
- Injury status must be visible, with a clear recovery timeline.
- When attributes are hidden by scouting (§11.4), injuries remain visible as “observable truth.”

---

# 8. Combat Engine V3 (Deterministic): Phase Model, Logs, Counters

## 8.1 Phase Model (Canonical)
1. **Tachiai**  
   - determine initial advantage from (power, speed, balance, aggression, momentum)
   - apply archetype tachiai bonus and matchup bonuses
   - weight advantage (mass) modifies outcomes

2. **Clinch / Grip Battle**  
   - decide stance outcome:
     - `belt-dominant`
     - `push-dominant`
     - `no-grip`
     - `migi-yotsu`
     - `hidari-yotsu`
   - stance selection depends on grip preferences, style, technique/experience deltas

3. **Momentum Ticks**  
   - fatigue accumulates; advantage can shift
   - volatility increases lateral and rear position events
   - counters/recoveries depend on balance + experience + archetype counter bonus

4. **Finisher Window (82 Kimarite)**  
   - filter registry by stance/position/grip rules
   - weight remaining options using matrix + affinities + favorites
   - optionally trigger counter-attack resolution and flip winner

5. **Result & Log**  
   - produce `BoutResult`
   - produce structured narrative log entries for each phase

## 8.2 Narrative Log Contract
Each bout produces log entries shaped like:
- phase: `tachiai | clinch | momentum | finish`
- description: player-readable line
- data: structured numbers/flags for UI and analytics

---

# 9. Banzuke (Ranking) System

## 9.1 Hierarchy
- Makuuchi: Yokozuna, Ozeki, Sekiwake, Komusubi, Maegashira (M1–M17 E/W)
- Juryo (J1–J14 E/W)
- Makushita, Sandanme, Jonidan, Jonokuchi

## 9.2 Bouts per Basho
- Sekitori (Juryo+): 15 bouts
- Lower divisions: 7 bouts

## 9.3 Kachi-koshi / Make-koshi
- kachi-koshi = majority wins (8/15 or 4/7)
- make-koshi = majority losses

## 9.4 Promotion Heuristics (Explicit)
- Ozeki: ~33 wins across 3 basho in sanyaku
- Yokozuna: deliberation, typically consecutive yusho or equivalent
- Makushita → Juryo: usually requires high Makushita rank + strong record

---

# 10. The 82-Kimarite System (Option A)

## 10.1 Canonical Purpose
The 82-kimarite system is the **action space** for fight endings:
- it enforces authenticity and variety
- it enables narrative and scouting (players learn “what this rikishi does”)
- it creates emergent tokui-waza and career identity

## 10.2 The 82 Kimarite List (Option A — IDs and Names)
This is the Option A canonical list used by the sim registry.

- `yorikiri` — **Yorikiri**
- `oshidashi` — **Oshidashi**
- `oshitaoshi` — **Oshitaoshi**
- `yoritaoshi` — **Yoritaoshi**
- `hatakikomi` — **Hatakikomi**
- `hikiotoshi` — **Hikiotoshi**
- `tsukiotoshi` — **Tsukiotoshi**
- `tsukidashi` — **Tsukidashi**
- `katasukashi` — **Katasukashi**
- `kotenage` — **Kotenage**
- `uwatenage` — **Uwatenage**
- `shitatenage` — **Shitatenage**
- `sukuinage` — **Sukuinage**
- `kubinage` — **Kubinage**
- `kakenage` — **Kakenage**
- `shitatedashinage` — **Shitatedashinage**
- `uwatedashinage` — **Uwatedashinage**
- `sotogake` — **Sotogake**
- `uchigake` — **Uchigake**
- `ketaguri` — **Ketaguri**
- `okuridashi` — **Okuridashi**
- `okuritaoshi` — **Okuritaoshi**
- `okurihikiotoshi` — **Okurihikiotoshi**
- `okuritsukiotoshi` — **Okuritsukiotoshi**
- `okurinage` — **Okurinage**
- `tsuridashi` — **Tsuridashi**
- `tsuriotoshi` — **Tsuriotoshi**
- `abisetaoshi` — **Abisetaoshi**
- `sabaori` — **Sabaori**
- `kirikaeshi` — **Kirikaeshi**
- `komatasukui` — **Komatasukui**
- `harimanage` — **Harimanage**
- `haraiotoshi` — **Haraiotoshi**
- `kirinuke` — **Kirinuke**
- `ipponzeoi` — **Ipponzeoi**
- `kimedashi` — **Kimedashi**
- `kimekomi` — **Kimekomi**
- `shitatehineri` — **Shitatehineri**
- `uwatehineri` — **Uwatehineri**
- `susoharai` — **Susoharai**
- `sotokomata` — **Sotokomata**
- `uchimuso` — **Uchimuso**
- `sotomuso` — **Sotomuso**
- `ashitori` — **Ashitori**
- `haritsuke` — **Haritsuke**
- `nodowa` — **Nodowa**
- `tokkurinage` — **Tokkurinage**
- `yaguranage` — **Yaguranage**
- `mitokorozeme` — **Mitokorozeme**
- `tsutaezori` — **Tsutaezori**
- `izori` — **Izori**
- `okuritsuridashi` — **Okuritsuridashi**
- `tsukaminage` — **Tsukaminage**
- `nichonage` — **Nichonage**
- `zuban` — **Zuban**
- `fumikomi` — **Fumikomi**
- `guntingeri` — **Guntingeri**
- `kawazugake` — **Kawazugake**
- `kawazugakenage` — **Kawazugakenage**
- `kawazugakeotoshi` — **Kawazugakeotoshi**
- `okuritsukiotoshi` — **Okuritsukiotoshi**
- `okuritsuriotoshi` — **Okuritsuriotoshi**
- `hansoku` — **Hansoku**
- `hikiwake` — **Hikiwake**
- `fusensho` — **Fusensho**
- `fusenpai` — **Fusenpai**
- `tsukiotoshiotoshi` — **Tsukiotoshiotoshi**
- `harimanageotoshi` — **Harimanageotoshi**
- `shumokuzori` — **Shumokuzori**
- `kakezori` — **Kakezori**
- `susoharaiotoshi` — **Susoharaiotoshi**
- `sotogakeotoshi` — **Sotogakeotoshi**
- `uchigakeotoshi` — **Uchigakeotoshi**
- `uwatenageotoshi` — **Uwatenageotoshi**
- `shitatenageotoshi` — **Shitatenageotoshi**
- `komatasukuiotoshi` — **Komatasukuiotoshi**
- `sukuinageotoshi` — **Sukuinageotoshi**
- `yorikiriotoshi` — **Yorikiriotoshi**
- `oshidashiotoshi` — **Oshidashiotoshi**
- `yoritaoshiotoshi` — **Yoritaoshiotoshi**
- `okuridashiotoshi` — **Okuridashiotoshi**
- `okuritaoshiotoshi` — **Okuritaoshiotoshi**

## 10.3 Archetype → Kimarite Usage Matrix (How the Engine Weights the 82)

This is the **“Option A”** weighting concept. The actual engine computes weights per move from:
- `baseWeight`
- `styleAffinity`
- `archetypeBonus`
- `preferredClasses`
- stance & position multipliers
- favorite-move multiplier
- rarity dampening

To make those decisions transparent and tuneable, we define a **matrix of intent**.

### A) Preferred Kimarite Classes by Archetype (Multipliers)
These multipliers apply *after* baseWeight + affinities, before random selection.

| Archetype | force_out/push/thrust | throw/twist/lift | slap_pull | trip/evasion | rear | special |
|---|---:|---:|---:|---:|---:|---:|
| **Oshi Specialist** | **1.45×** | 0.85× | 1.10× | 0.95× | 1.05× | 0.80× |
| **Yotsu Specialist** | 1.05× | **1.55×** | 0.90× | 0.95× | 1.15× | 1.00× |
| **Speedster** | 1.05× | 0.90× | 1.20× | **1.60×** | 1.10× | 0.95× |
| **Trickster** | 0.85× | 0.95× | **1.65×** | **1.35×** | 1.05× | 1.20× |
| **All‑Rounder** | 1.15× | 1.15× | 1.10× | 1.10× | 1.10× | 1.00× |

**Notes**
- “rear” is mostly unlocked by **position** (rear), so multipliers here are modest.
- “special” is narrative spice: higher for Trickster, dampened for Oshi.
- This matrix is a *design control*; the registry’s per‑move bonuses should align with it.

### B) Stance → Class Bias (Multipliers)
These are global stance multipliers that stack with archetype multipliers.

| Stance | force_out/push/thrust | throw/twist/lift | slap_pull | trip/evasion | rear |
|---|---:|---:|---:|---:|---:|
| **push-dominant** | **1.45×** | 0.85× | 1.20× | 1.10× | 1.00× |
| **belt-dominant** | 0.95× | **1.55×** | 0.90× | 1.00× | 1.10× |
| **migi-yotsu / hidari-yotsu** | 1.00× | **1.45×** | 0.95× | 1.05× | 1.10× |
| **no-grip** | 1.05× | 0.65× | **1.30×** | **1.20×** | 0.80× |

### C) Position → Vector Bias (Multipliers)
| Position | frontal vector | lateral vector | rear vector |
|---|---:|---:|---:|
| **frontal** | **1.15×** | 1.00× | 0.70× |
| **lateral** | 1.00× | **1.20×** | 0.85× |
| **rear** | 0.80× | 0.95× | **2.25×** |

### D) Favorite Moves (Tokui-waza) Multiplier
If the selected move is in the attacker’s `favoredKimarite[]`:
- multiply weight by **2.0×** (Option A default)

This is the main mechanism that causes **signature moves to emerge organically** as careers progress.


---

# 11. Economy: Kenshō, Prestige, Stable Funds, Retirement Funds

## 11.1 Kenshō Payout (Option A)
Per banner:
- ¥10,000 → stable funds (immediate)
- ¥50,000 → rikishi retirement fund
- remaining portion treated as fees/overhead (narratively consistent with banner cost structure)

## 11.2 Prestige
Prestige is a scalar used to:
- influence kenshō attraction
- influence narrative spotlighting (and later rivalry heat)
Prestige decays during interim to prevent runaway snowballing.


## 11.3 Rivalries (Canonical)

Basho models **persistent interpersonal rivalries** to increase story density and to create meaningful “headlines” from repeated meetings—without scripting winners.

### 11.3.1 Rivalry Object
A rivalry is a world entity linking two rikishi:
- `rikishiAId`, `rikishiBId`
- `heat` (0–100)
- `keyMoments[]` (bout IDs, basho IDs, tags like “upset”, “playoff”, “injury”)
- `lastUpdatedTick`

### 11.3.2 Heat Generation
Heat increases deterministically from:
- repeated matchups within a short window
- close bouts (multiple momentum reversals, narrow finishes)
- upsets (lower rank beats higher rank)
- title races (late basho contention, senshuraku stakes)
- playoffs / decisive bouts

Heat decays during interim to prevent permanent inflation.

### 11.3.3 Mechanical Effects
Rivalry heat modifies (subtle, not overpowering):
- tachiai intensity and initiative volatility
- risk appetite (more commitment on finish attempts, more counter windows)
- narrative emphasis (logs become “louder,” headlines more likely)

**Rule:** rivalry effects increase variance but do not override core attribute logic.

### 11.3.4 Narrative Effects
Rivalries feed:
- headline selection priority
- commentary tone (“bad blood,” “unfinished business”)
- scouting interest (see §11.4)

---

## 11.4 Scouting and Fog of War (Canonical)

Basho supports a “fog of war” layer where some information about opponents is uncertain until observed.

### 11.4.1 What Can Be Hidden
By default, some attributes may be hidden or shown as ranges:
- technique nuance (throw timing, grip craft)
- injury resilience / durability tendencies
- composure / mental stability (future trait)
- growth fulfillment ceiling (how close they’ll reach potential)

### 11.4.2 How Information Is Revealed
Scouting reveals truth through deterministic observation:
- watching bouts (public information)
- repeated matchups (rivalry exposure)
- stable reports / coach notes (future)
- deliberate scouting actions (future menu)

### 11.4.3 Output Format
Scouting outputs are expressed as:
- confidence ranges
- “analyst notes” with evidence hooks (e.g., “wins spike in belt-dominant stances”)
- narrative rumors (when enabled), which should never contradict confirmed truth

**Hard rule:** scouting never lies; it only ranges uncertainty until revealed.

---

## 11.5 Seasonal Tone and World Flavor (Canonical)

Each basho has a **seasonal tone** that flavors narrative and applies light systemic bias:
- Winter, Spring, Summer, Autumn

### 11.5.1 Narrative Use
Seasonal tone influences:
- headline language
- crowd mood and “feel”
- travel fatigue framing
- injury story framing (“cold joints,” “summer grind”)

### 11.5.2 Light Mechanical Bias
Season can subtly influence:
- fatigue recovery rates
- injury likelihood modifiers
- travel stress (if modeled)

All seasonal effects must remain deterministic and modest; the primary role is tone.

---

# 12. Narrative Consumption Layer (Formalized)

Basho is **narrative-first**, but the narrative system is explicitly treated as a **consumer** of simulation—not a driver of outcomes.

## 12.1 Principle: Narrative Never Changes Results
- No narrative system may alter:
  - bout winners
  - injuries
  - promotions
  - economy outcomes
- Narrative is derived from the same deterministic state, ensuring replayability and debuggability.

## 12.2 Inputs (Sources of Narrative Truth)
Narrative pulls from:
- bout phase logs (§8.2)
- rivalry objects (§11.3)
- seasonal tone (§11.5)
- prestige deltas (§11.2)
- succession/founding/closure events (§6)
- injuries and comebacks (§7.10)

## 12.3 Outputs (What Narrative Produces)
Narrative outputs include:
- **Headlines**: short “news hits” surfaced at day-end or basho-end
- **Storylets** (future): longer, Ink.js-ready moments derived from tags and thresholds
- **Analyst Commentary**: contextual reading of stats and trends (ties into scouting §11.4)
- **Retrospectives**: rivalry and career milestone recaps

## 12.4 Canonical Headline Selection (Deterministic)
Headline generation is deterministic:
- gather candidate events (upsets, streaks, injuries, rivalry spikes, succession events)
- score candidates by importance (rank stakes, rarity, heat, prestige)
- select top N headlines with diversity constraints (avoid repeats)
- render using season + rivalry tone modifiers

**Rule:** if two playthroughs produce the same event stream, they produce the same headlines.

# 13. Data Contracts (Types) and Helper Modules

## 13.1 Canonical Types
- `types.ts`: Style, Stance, TacticalArchetype, Rikishi, Heya, BashoState, WorldState, etc.
- Ensure data includes:
  - current + potential physique fields
  - career phase / growth fulfillment fields
  - favored kimarite tracking

## 12.2 Canonical Helper Modules
- `banzuke.ts`: rank hierarchy, formatting, kachi-koshi checks, kadoban logic
- `kimarite.ts`: registry + lookup helpers
- `boutEngineV3.ts`: deterministic multi-phase sim + logs

## 12.3 “One Source of Truth” Rules
- The kimarite registry defines the allowed endings and their metadata.
- The bout engine must not hardcode special-case endings except:
  - forfeits (if modeled as special results)
  - safety/guardrails (e.g., missing data fallback)

---

End of Clean Canon v1.1 (Full)

## 13.4 Kimarite Aliases and Post-Processing Labels (Canonical)

The **82-kimarite registry is fixed** as the win space. However, the UI and narrative layer may add **post-processing labels** to increase readability and flavor without bloating the registry.

### 13.4.1 Allowed Post-Processing
- descriptive suffixes (“late”, “edge”, “counter”, “on the straw”)
- alias display names (presentation-only)
- contextual “otoshi-style” labels if the finish is the same official kimarite but executed in a particular way

### 13.4.2 Constraints
- these labels must never be treated as new kimarite IDs
- the bout engine still records the official kimarite as the canonical result
- analytics should aggregate by official kimarite ID, with optional drill-down by label

### 13.4.3 Purpose
- keep authenticity (official 82 remain intact)
- keep tuning stable (avoid multiplying balance knobs)
- preserve narrative richness and commentary specificity

# 14. Forward-Declared Systems (Canonical but Dormant)

This section defines systems that are **canonically real** in the Basho world but may be **mechanically inactive** in early builds. They are declared now so current systems can expose clean hooks, the data model remains future-proof, and later activation does not require retconning history.

## 14.0 Global Rules for Dormant Systems

### 14.0.1 Canon vs Activation
A system may be:
- **Canonically acknowledged**: it exists in-lore, can be referenced in headlines, and can have placeholder UI.
- **Mechanically dormant**: no player-facing controls and no hidden outcome changes.

Dormant systems may generate narrative flavor, but must not create surprise outcomes.

### 14.0.2 Determinism
When activated, each system must obey:
- outcomes derived from **World Seed + world state + explicit player choices**
- no unseeded randomness
- triggers must be reproducible given the same input stream

### 14.0.3 Hook-First Implementation
Even while dormant, each system should have:
- a minimal **data footprint**
- a single **simulation entry point** (“hook” in tick processing)
- a narrative integration point (headline tags)
- a guarded UI placeholder that explains “not active yet” (Always Playable)

### 14.0.4 No-Retcon Contract
Activation must not invalidate previously generated history. Where needed, interpret earlier worlds as having operated under “implicit/simple” versions of governance and finance.

---

## 14.1 Governance V1 (Kabu Availability, Council Politics)

Governance models the institutions that constrain stable ownership, succession, and legitimacy.

### 14.1.1 Core Concept
In early versions, oyakata eligibility exists as a clear rule hook (§6.1). Governance V1 formalizes the “institutional layer”:
- **kabu (elder stock)** constraints (finite resource)
- a governing body that arbitrates edge cases
- reputational / political dynamics affecting approvals and sanctions

Governance V1 is not grand strategy; it is a constraint + narrative generator with limited levers.

### 14.1.2 Kabu Pool
The world contains a finite pool of kabu units.
Each kabu can be:
- held by an eligible retired rikishi
- vacant/unassigned
- tied to a prestige tier for narrative color

**Effects**
- **Succession:** best candidate may still fail without kabu access.
- **Founding:** new stable creation requires kabu and governance approval.

### 14.1.3 Council Layer (Light Politics)
A council exists to:
- approve/deny succession outcomes
- investigate scandals
- issue sanctions (warnings → suspensions → forced dissolution in severe cases)

### 14.1.4 Decision Inputs
Governance decisions consider:
- candidate prestige and legacy
- stable reputation
- conduct flags (violence, match-fixing suspicion)
- financial solvency risk

### 14.1.5 Example: Succession with Governance
1. Oyakata retires.
2. Candidate pool built (internal + external).
3. Candidates scored (leadership, loyalty, finances, conduct).
4. Governance checks kabu access and legitimacy.
5. Outcome:
   - approved successor
   - interim caretaker (optional)
   - denial → closure or merger pathway

### 14.1.6 Data Footprint (Minimal)
Suggested entities:
- `KabuStock { id, prestigeTier, currentHolderRikishiId?, status }`
- `GovernanceCase { id, type, involvedIds, severity, resolution, createdAtTick }`
- `GovernanceProfile { heyaId, legitimacyScore, conductScore, politicalCapital }`

### 14.1.7 Dormant Mode Behavior
- kabu treated as implicitly available for qualified candidates
- council does not block actions; it may only generate narrative headlines

---

## 14.2 Stable Mergers (Optional Alternative to Closure)

Mergers are a safety valve and a narrative machine: when succession fails, a stable may be absorbed rather than disappear.

### 14.2.1 Trigger Conditions
Mergers are considered when:
- no successor clears threshold at retirement/death
- the stable still has value (facilities, roster, legacy)
- another stable is willing and able to absorb

### 14.2.2 Selecting Merger Partners
Candidate recipient stables are scored by:
- roster capacity
- reputation tier proximity (optional)
- culture compatibility (oshi/yotsu emphasis can matter narratively)
- finances and stability
- rivalry entanglements (mergers can intensify story)

### 14.2.3 Merger Outcomes
- **Full absorption:** closing stable ceases; roster transfers; facilities convert to value or upgrades.
- **Lineage preservation (optional):** stable name survives as a “branch identity” for narrative.
- **Split absorption (rare):** roster split across multiple stables (high complexity; use sparingly).

### 14.2.4 Effects on Rikishi
- morale/loyalty impacts (short-term momentum changes)
- training environment changes (facility access and coaching emphasis)
- rivalry reshaping (forced cohabitation and new frictions)

### 14.2.5 Dormant Mode Behavior
- default remains closure (§6.3)
- mergers may appear as narrative-only “rumors” with no mechanical effect

---

## 14.3 Loans and Benefactors (Insolvency Rescue)

This system expands the economy into long arcs: survival stories, obligations, and pressure.

### 14.3.1 Core Concept
A stable can enter distress due to:
- poor performance (low prestige → fewer banners)
- overspending on facilities
- injury clusters reducing results
- investment choices that fail to pay off

Loans/benefactors provide survival options with consequences.

### 14.3.2 Trigger Conditions
A stable is at risk when:
- funds drop below a solvency threshold
- obligations exceed projected income
- deterministic events damage income (when modeled)

### 14.3.3 Rescue Options
- **Traditional loan:** principal + interest + repayment schedule; failure escalates consequences.
- **Benefactor/patron:** funding with “strings” (recruitment demands, reputation shifts, influence).
- **Asset liquidation:** downgrade/sell facilities for cash (survival at long-term cost).

### 14.3.4 Deterministic Repayment
No random bankruptcy:
- repayment schedules deterministic
- income projections computed from prestige, roster tier, and banners
- failure is a predictable consequence of choices and performance

### 14.3.5 Dormant Mode Behavior
- insolvency handled via simple grace period and narrative warnings
- no instruments unless activated

---

## 14.4 Career Journals and Analytics Views

This system makes the sim legible and lovable by turning history into readable arcs.

### 14.4.1 Career Journal (Per Rikishi)
The journal is a chronological record derived from logs and events:
- debut and stable entry
- basho-by-basho results
- rank changes with contextual notes
- signature bouts (upsets, rivalry spikes, yusho races)
- injuries and comebacks
- style drift and favored kimarite evolution
- retirement and legacy outcomes

**Rule:** journals are generated deterministically; no manual writing required.

### 14.4.2 Analytics Views (Player and World)
Analytics are “truth tools”:
- win rate by stance type
- kimarite class distribution
- favored moves over time
- physique progression (current vs potential)
- injury and fatigue patterns
- stable dashboards: prestige trend, finances trend, roster pipeline

### 14.4.3 Dormant Mode Behavior
- store enough history to reconstruct later
- UI may show a minimal “History” summary (recent basho + top kimarite)

---

## 14.5 Activation Order Principle
To minimize retcons:
1) Career Journals & Analytics (consumes logs; low systemic risk)
2) Loans/Benefactors (extends economy)
3) Stable Mergers (extends closure handling)
4) Governance V1 (ties everything together; highest systemic impact)


End of Clean Canon v1.2 (Full)

```



## SOURCE — Basho_Master_Context_Clean_Canon_v1.1_FULL.md

```md
# Basho / SumoGame — Master Context (Clean Canon v1.1 — Full)

Date: 2026-01-06  
Purpose: A **sprint-free**, restart-ready, fully explicit design bible describing the entire game, its systems, and the canonical tech/design contracts.

> This document is intended to be copy/pasted into a fresh chat as the full game context, and also used as the canonical reference for implementation.

---

## Table of Contents
1. Core Vision & Pillars  
2. Canonical Tech Stack (Basho Spec v1.0)  
3. Determinism Rules (Deterministic but Divergent)  
4. World Structure (including flexible beya count)  
5. Time, Calendar, and the Six-Basho Loop  
6. Beya (Stable) System: Founding, Succession, Closure  
7. Rikishi Identity, Growth, Style Evolution, and Career Phases  
8. Combat Engine V3 (Deterministic): Phase Model, Logs, Counters  
9. Banzuke (Ranking) System: Hierarchy and Promotion Heuristics  
10. The 82-Kimarite System (Option A): Registry + Weighting Matrix  
11. Economy: Kenshō, Prestige, Stable Funds, Retirement Funds  
12. Data Contracts (Types) and Helper Modules  

---

# 1. Core Vision & Pillars (Canonical)

## Pillar 1 — Authenticity
Basho is a **sumo management simulation** grounded in authentic structures:
- **Six basho per year**: Hatsu, Haru, Natsu, Nagoya, Aki, Kyushu.
- **Authentic rank hierarchy**: Yokozuna → Jonokuchi, with correct bout counts per division.
- **Kenshō banners**, payouts, and retirement funds as a core economic loop.
- **Beya-centered world** (stable culture, succession, reputation, facilities).

## Pillar 2 — Deterministic Simulation
- Every outcome is repeatable given the same **World Seed** and the same sequence of player choices.
- Combat is deterministic under seeded RNG (seedrandom), with **data-driven endings** from the 82-kimarite registry.

## Pillar 3 — Narrative-First
- Every bout generates a structured log of phases and pivotal moments.
- Systems (rivalries, seasonal tone, scandals, succession) are explicitly designed to produce “headlines” and story hooks.
- The sim should feel like it creates drama *without* scripting outcomes.

## Pillar 4 — Always Playable
- The build must boot locally and remain navigable at all times.
- Missing features must be guarded and degrade gracefully:
  - seeded demo data
  - stubbed services
  - safe UI states, empty-state copy, and error boundaries
  - offline-friendly packaging patterns

---

# 2. Canonical Tech Stack (Basho Tech Spec v1.0)

**Frontend Core**
- React (Vite) + TypeScript
- Zustand + Immer (state)
- Tailwind + Radix UI (layout/controls/dialogs)
- React Router (navigation)
- React Hook Form (configuration flows)

**Simulation Systems**
- Custom TypeScript sim engine
- seedrandom for deterministic outcomes
- Comlink + Web Workers for parallel simulation (long ticks, world updates)
- Zod for data validation
- Optional Ink.js for narrative integration (storylets generated from logs/events)

**Persistence & Packaging**
- Dexie.js for IndexedDB saves
- pako + JSZip for compression/export
- versioned Dexie migrations
- Vite PWA for offline play

**Audio/Visual Layer**
- howler.js (sound)
- Framer Motion (animation)
- Lucide React (icons)
- Recharts (analytics)
- react-markdown (dynamic text rendering)

**Tooling**
- Vite / ESBuild
- ESLint + Prettier
- Vitest + React Testing Library
- GitHub Actions (build automation)

---

# 3. Determinism Rules (Deterministic but Divergent)

## 3.1 World Seed
A single **World Seed** deterministically drives:
- world generation (beya count, starting rosters, initial attributes)
- schedule generation rules (where applicable)
- combat RNG (via bout seeds derived from world seed + participants + match identifiers)

## 3.2 Divergence That’s Allowed (Still Deterministic)
The world is deterministic, but outcomes can still vary because inputs vary:
- training choices
- facility upgrades
- scouting decisions (when introduced)
- roster changes (recruitment, transfers, retirements)
- event triggers (seasonal events, scandals, injuries) *when those triggers are themselves deterministic*

## 3.3 Forbidden Non-Determinism
When operating in canonical deterministic mode:
- do **not** call `Date.now()` inside simulation logic
- do **not** use unseeded `Math.random()`
- do **not** run asynchronous UI timing that affects sim results

---

# 4. World Structure

## 4.1 Flexible Beya Count
- Initial world spawns approximately **42 stables**, randomized within **39–45**.
- Long-term world target remains “around 42” but flexible to support:
  - new stable founding by retired rikishi
  - stable closure on failed succession
- Soft world bounds: typically **35–50 active stables**.

## 4.2 Core Entities (High Level)
- **Heya (Stable)**: roster, oyakata, funds, reputation, facilities.
- **Rikishi**: permanent identity + evolving body + evolving performance profile.
- **BashoState**: schedule, results, day progression, standings.
- **WorldState**: seed, time, entity registries, history.

---

# 5. Time, Calendar, and the Six-Basho Loop

## 5.1 Annual Loop
- 6 basho per in-game year.
- Basho index cycles (0–5) across: Hatsu, Haru, Natsu, Nagoya, Aki, Kyushu.

## 5.2 Time Progression Modes
- **During basho**: advance by **day** (Day 1–15).
- **Between basho**: advance by **week** (interim).

## 5.3 Interim Length
- Interim phase is **6 weeks** bridging tournaments.

---

# 6. Beya (Stable) System: Founding, Succession, Closure

## 6.1 Oyakata Eligibility (Rules + Hook)
A candidate must satisfy:
- Rank/standing threshold (design intent: sanyaku-caliber career)
- Age ≥ 28
- Clean conduct (no severe sanctions)
- Access to elder stock line (kabu/toshiyori) when governance is fully modeled

## 6.2 Succession Rules (Explicit)
**Trigger moments**
- end of each basho (review hook)
- oyakata retirement
- oyakata death/disqualification (event-driven)

**Selection pipeline**
1. Identify successor pool
   - internal candidates (stable elders, retired stars)
   - external candidates (available elder stock holders)
2. Score candidates
   - leadership, reputation, prestige
   - loyalty and stable cohesion
   - finances/facilities compatibility
   - conduct and reliability
3. Select successor if any clears threshold
4. If no successor clears threshold → closure or merge (merge is optional/future)

## 6.3 Closure Rules (Full)
A stable closes when any of the following occurs:
- oyakata retires/dies and no qualified successor exists
- forced dissolution due to severe governance sanction (future: match-fixing, violence)
- insolvency after grace period and rescue attempts (future: loans/benefactors)

## 6.4 Founding New Stables (Detailed)
A new stable may be founded when:
- a qualified retired rikishi obtains elder stock
- world cap is not exceeded (soft constraint)
- minimum funds/facilities are met (can be modest)

Founding creates:
- new heya entity with seeded facilities
- reputation baseline
- recruitment slots and a “founding narrative” headline

---

# 7. Rikishi Identity, Growth, Style Evolution, and Career Phases

## 7.1 Permanent Identity
Permanent data (never changes):
- unique `id`
- unique `shikona` (generated from weighted syllables; uniqueness enforced)
- `nationality` and other origin metadata (if used)

## 7.2 Evolving Physique (Current + Potential)
Rikishi **height, weight, and style evolve over time**.
- Each rikishi has **current** and **potential** height/weight.
- Not all rikishi reach potential (fulfillment is deterministic and variable).

See **Career Phase Model** below for how growth plays out.

# 7.7 Career Phase Model (Growth → Prime → Decline)

Basho models a rikishi as a **long-lived, evolving athlete**. The goal is that careers generate believable arcs and narrative beats, while remaining deterministic under a seed.

## A) Career Phases (Conceptual)
> Phase boundaries are not hard-coded ages; they are computed from age + physique fulfillment + injury history + performance trajectory.

### 1) Youth / Prospect
- **Theme:** potential not yet realized.
- **Physique:** height and weight trend toward potential at the highest rate.
- **Skills:** “spiky” improvements; technique and balance can jump with good coaching.
- **Style drift:** most likely here (oshi ↔ hybrid ↔ yotsu can meaningfully shift).

### 2) Development / Rise
- **Theme:** specialization begins.
- **Physique:** weight approaches a chosen “fighting mass”; height growth slows/ends.
- **Skills:** steadier gains; archetype expression becomes clearer.
- **Favorites:** tokui-waza begins to stabilize (top 2–3 emerge).

### 3) Prime
- **Theme:** highest consistency and conversion rate.
- **Physique:** stable; weight may oscillate seasonally with training blocks.
- **Skills:** gains are marginal; consistency and composure dominate.
- **Favorites:** signature move set is established; counters improve with experience.

### 4) Veteran / Decline
- **Theme:** adaptation under constraint.
- **Physique:** weight may increase (or decrease due to injury management); speed often declines first.
- **Skills:** technique/experience remain strong, but physical outputs fall.
- **Style drift:** often toward **yotsu/hybrid** for control or toward **trickster** patterns for survival (depending on attributes).

### 5) Late Career / Exit
- **Theme:** legacy, succession, and story closure.
- **Physique:** managed; injuries accumulate; fatigue sensitivity high.
- **Outcomes:** retirement triggers governance hooks (succession / stable founding).

## B) Current vs Potential Physique (Data Contract)
Each rikishi stores:
- `heightCurrentCm`, `heightPotentialCm`
- `weightCurrentKg`, `weightPotentialKg`
- `growthFulfillment` (0–1): how much of potential is realistically reachable
- `growthRateProfile` (seeded): “early bloomer”, “late bloomer”, “steady”, etc.

**Deterministic rule:** growth changes are deterministic from (seed + age + training + injury). No pure randomness.

## C) Physique → Style + Kimarite Feedback Loop
As physique changes, it should influence:
1. **Style** (oshi/yotsu/hybrid) recalculation
2. **Grip success** probability in clinch phase
3. **Kimarite selection weights**
4. **Favorite moves drift** (tokui-waza)

Example effects:
- +weight +power → increases force-out conversion, pushes `oshidashi/yorikiri` frequency upward
- +balance +technique → increases throws/twists in belt stances
- +speed +agility → increases trips/evasion, raises lateral position events
- accumulated injuries → decrease speed burst, raise “short finish” behaviors (slap/pull, quick pushdowns)

## D) “Not Everyone Reaches Potential” (Fulfillment Rules)
A rikishi may fail to reach potential due to:
- repeated injury interrupts growth/training
- poor facility quality (nutrition/recovery)
- mismatch between training intensity and body type
- chronic fatigue from overtraining
- (optional later) personality traits: discipline, professionalism, risk appetite

This creates believable variance in career arcs without breaking determinism.


## 7.8 Style Evolution (Explicit)
Style is a **current classification**, and can drift across a career:
- `oshi`: distance, pushing/thrusting, linear pressure
- `yotsu`: belt control, throws/twists/lifts, clinch dominance
- `hybrid`: adaptable toolbox, can win from both distance and grip states

**Style update cadence (Option A):**
- recompute at end of each basho (or quarterly in interim)
- apply hysteresis thresholds to prevent sudden flips

**Inputs to recompute style**
- physique deltas (weight/height changes)
- observed kimarite distribution (which finishes actually occur)
- grip success distribution (belt-dominant frequency)
- coaching emphasis (if modeled)
- archetype as a soft bias, not a hard lock

## 7.9 Tokui-waza / Favorite Moves Drift
- `favoredKimarite` reflects the top 2–3 winning finishes.
- It is updated after each win and displayed on the rikishi card.
- As physique/style changes, the favored list should *naturally* drift.

---

# 8. Combat Engine V3 (Deterministic): Phase Model, Logs, Counters

## 8.1 Phase Model (Canonical)
1. **Tachiai**  
   - determine initial advantage from (power, speed, balance, aggression, momentum)
   - apply archetype tachiai bonus and matchup bonuses
   - weight advantage (mass) modifies outcomes

2. **Clinch / Grip Battle**  
   - decide stance outcome:
     - `belt-dominant`
     - `push-dominant`
     - `no-grip`
     - `migi-yotsu`
     - `hidari-yotsu`
   - stance selection depends on grip preferences, style, technique/experience deltas

3. **Momentum Ticks**  
   - fatigue accumulates; advantage can shift
   - volatility increases lateral and rear position events
   - counters/recoveries depend on balance + experience + archetype counter bonus

4. **Finisher Window (82 Kimarite)**  
   - filter registry by stance/position/grip rules
   - weight remaining options using matrix + affinities + favorites
   - optionally trigger counter-attack resolution and flip winner

5. **Result & Log**  
   - produce `BoutResult`
   - produce structured narrative log entries for each phase

## 8.2 Narrative Log Contract
Each bout produces log entries shaped like:
- phase: `tachiai | clinch | momentum | finish`
- description: player-readable line
- data: structured numbers/flags for UI and analytics

---

# 9. Banzuke (Ranking) System

## 9.1 Hierarchy
- Makuuchi: Yokozuna, Ozeki, Sekiwake, Komusubi, Maegashira (M1–M17 E/W)
- Juryo (J1–J14 E/W)
- Makushita, Sandanme, Jonidan, Jonokuchi

## 9.2 Bouts per Basho
- Sekitori (Juryo+): 15 bouts
- Lower divisions: 7 bouts

## 9.3 Kachi-koshi / Make-koshi
- kachi-koshi = majority wins (8/15 or 4/7)
- make-koshi = majority losses

## 9.4 Promotion Heuristics (Explicit)
- Ozeki: ~33 wins across 3 basho in sanyaku
- Yokozuna: deliberation, typically consecutive yusho or equivalent
- Makushita → Juryo: usually requires high Makushita rank + strong record

---

# 10. The 82-Kimarite System (Option A)

## 10.1 Canonical Purpose
The 82-kimarite system is the **action space** for fight endings:
- it enforces authenticity and variety
- it enables narrative and scouting (players learn “what this rikishi does”)
- it creates emergent tokui-waza and career identity

## 10.2 The 82 Kimarite List (Option A — IDs and Names)
This is the Option A canonical list used by the sim registry.

- `yorikiri` — **Yorikiri**
- `oshidashi` — **Oshidashi**
- `oshitaoshi` — **Oshitaoshi**
- `yoritaoshi` — **Yoritaoshi**
- `hatakikomi` — **Hatakikomi**
- `hikiotoshi` — **Hikiotoshi**
- `tsukiotoshi` — **Tsukiotoshi**
- `tsukidashi` — **Tsukidashi**
- `katasukashi` — **Katasukashi**
- `kotenage` — **Kotenage**
- `uwatenage` — **Uwatenage**
- `shitatenage` — **Shitatenage**
- `sukuinage` — **Sukuinage**
- `kubinage` — **Kubinage**
- `kakenage` — **Kakenage**
- `shitatedashinage` — **Shitatedashinage**
- `uwatedashinage` — **Uwatedashinage**
- `sotogake` — **Sotogake**
- `uchigake` — **Uchigake**
- `ketaguri` — **Ketaguri**
- `okuridashi` — **Okuridashi**
- `okuritaoshi` — **Okuritaoshi**
- `okurihikiotoshi` — **Okurihikiotoshi**
- `okuritsukiotoshi` — **Okuritsukiotoshi**
- `okurinage` — **Okurinage**
- `tsuridashi` — **Tsuridashi**
- `tsuriotoshi` — **Tsuriotoshi**
- `abisetaoshi` — **Abisetaoshi**
- `sabaori` — **Sabaori**
- `kirikaeshi` — **Kirikaeshi**
- `komatasukui` — **Komatasukui**
- `harimanage` — **Harimanage**
- `haraiotoshi` — **Haraiotoshi**
- `kirinuke` — **Kirinuke**
- `ipponzeoi` — **Ipponzeoi**
- `kimedashi` — **Kimedashi**
- `kimekomi` — **Kimekomi**
- `shitatehineri` — **Shitatehineri**
- `uwatehineri` — **Uwatehineri**
- `susoharai` — **Susoharai**
- `sotokomata` — **Sotokomata**
- `uchimuso` — **Uchimuso**
- `sotomuso` — **Sotomuso**
- `ashitori` — **Ashitori**
- `haritsuke` — **Haritsuke**
- `nodowa` — **Nodowa**
- `tokkurinage` — **Tokkurinage**
- `yaguranage` — **Yaguranage**
- `mitokorozeme` — **Mitokorozeme**
- `tsutaezori` — **Tsutaezori**
- `izori` — **Izori**
- `okuritsuridashi` — **Okuritsuridashi**
- `tsukaminage` — **Tsukaminage**
- `nichonage` — **Nichonage**
- `zuban` — **Zuban**
- `fumikomi` — **Fumikomi**
- `guntingeri` — **Guntingeri**
- `kawazugake` — **Kawazugake**
- `kawazugakenage` — **Kawazugakenage**
- `kawazugakeotoshi` — **Kawazugakeotoshi**
- `okuritsukiotoshi` — **Okuritsukiotoshi**
- `okuritsuriotoshi` — **Okuritsuriotoshi**
- `hansoku` — **Hansoku**
- `hikiwake` — **Hikiwake**
- `fusensho` — **Fusensho**
- `fusenpai` — **Fusenpai**
- `tsukiotoshiotoshi` — **Tsukiotoshiotoshi**
- `harimanageotoshi` — **Harimanageotoshi**
- `shumokuzori` — **Shumokuzori**
- `kakezori` — **Kakezori**
- `susoharaiotoshi` — **Susoharaiotoshi**
- `sotogakeotoshi` — **Sotogakeotoshi**
- `uchigakeotoshi` — **Uchigakeotoshi**
- `uwatenageotoshi` — **Uwatenageotoshi**
- `shitatenageotoshi` — **Shitatenageotoshi**
- `komatasukuiotoshi` — **Komatasukuiotoshi**
- `sukuinageotoshi` — **Sukuinageotoshi**
- `yorikiriotoshi` — **Yorikiriotoshi**
- `oshidashiotoshi` — **Oshidashiotoshi**
- `yoritaoshiotoshi` — **Yoritaoshiotoshi**
- `okuridashiotoshi` — **Okuridashiotoshi**
- `okuritaoshiotoshi` — **Okuritaoshiotoshi**

## 10.3 Archetype → Kimarite Usage Matrix (How the Engine Weights the 82)

This is the **“Option A”** weighting concept. The actual engine computes weights per move from:
- `baseWeight`
- `styleAffinity`
- `archetypeBonus`
- `preferredClasses`
- stance & position multipliers
- favorite-move multiplier
- rarity dampening

To make those decisions transparent and tuneable, we define a **matrix of intent**.

### A) Preferred Kimarite Classes by Archetype (Multipliers)
These multipliers apply *after* baseWeight + affinities, before random selection.

| Archetype | force_out/push/thrust | throw/twist/lift | slap_pull | trip/evasion | rear | special |
|---|---:|---:|---:|---:|---:|---:|
| **Oshi Specialist** | **1.45×** | 0.85× | 1.10× | 0.95× | 1.05× | 0.80× |
| **Yotsu Specialist** | 1.05× | **1.55×** | 0.90× | 0.95× | 1.15× | 1.00× |
| **Speedster** | 1.05× | 0.90× | 1.20× | **1.60×** | 1.10× | 0.95× |
| **Trickster** | 0.85× | 0.95× | **1.65×** | **1.35×** | 1.05× | 1.20× |
| **All‑Rounder** | 1.15× | 1.15× | 1.10× | 1.10× | 1.10× | 1.00× |

**Notes**
- “rear” is mostly unlocked by **position** (rear), so multipliers here are modest.
- “special” is narrative spice: higher for Trickster, dampened for Oshi.
- This matrix is a *design control*; the registry’s per‑move bonuses should align with it.

### B) Stance → Class Bias (Multipliers)
These are global stance multipliers that stack with archetype multipliers.

| Stance | force_out/push/thrust | throw/twist/lift | slap_pull | trip/evasion | rear |
|---|---:|---:|---:|---:|---:|
| **push-dominant** | **1.45×** | 0.85× | 1.20× | 1.10× | 1.00× |
| **belt-dominant** | 0.95× | **1.55×** | 0.90× | 1.00× | 1.10× |
| **migi-yotsu / hidari-yotsu** | 1.00× | **1.45×** | 0.95× | 1.05× | 1.10× |
| **no-grip** | 1.05× | 0.65× | **1.30×** | **1.20×** | 0.80× |

### C) Position → Vector Bias (Multipliers)
| Position | frontal vector | lateral vector | rear vector |
|---|---:|---:|---:|
| **frontal** | **1.15×** | 1.00× | 0.70× |
| **lateral** | 1.00× | **1.20×** | 0.85× |
| **rear** | 0.80× | 0.95× | **2.25×** |

### D) Favorite Moves (Tokui-waza) Multiplier
If the selected move is in the attacker’s `favoredKimarite[]`:
- multiply weight by **2.0×** (Option A default)

This is the main mechanism that causes **signature moves to emerge organically** as careers progress.


---

# 11. Economy: Kenshō, Prestige, Stable Funds, Retirement Funds

## 11.1 Kenshō Payout (Option A)
Per banner:
- ¥10,000 → stable funds (immediate)
- ¥50,000 → rikishi retirement fund
- remaining portion treated as fees/overhead (narratively consistent with banner cost structure)

## 11.2 Prestige
Prestige is a scalar used to:
- influence kenshō attraction
- influence narrative spotlighting (and later rivalry heat)
Prestige decays during interim to prevent runaway snowballing.

---

# 12. Data Contracts (Types) and Helper Modules

## 12.1 Canonical Types
- `types.ts`: Style, Stance, TacticalArchetype, Rikishi, Heya, BashoState, WorldState, etc.
- Ensure data includes:
  - current + potential physique fields
  - career phase / growth fulfillment fields
  - favored kimarite tracking

## 12.2 Canonical Helper Modules
- `banzuke.ts`: rank hierarchy, formatting, kachi-koshi checks, kadoban logic
- `kimarite.ts`: registry + lookup helpers
- `boutEngineV3.ts`: deterministic multi-phase sim + logs

## 12.3 “One Source of Truth” Rules
- The kimarite registry defines the allowed endings and their metadata.
- The bout engine must not hardcode special-case endings except:
  - forfeits (if modeled as special results)
  - safety/guardrails (e.g., missing data fallback)

---

End of Clean Canon v1.1 (Full)

```



## SOURCE — Basho_Consolidated_MasterContext_v0.4.1.md

```md
# Basho / SumoGame — Consolidated Master Context (v0.4.1)
Date: 2026-01-06  
Baseline: v0.4.0 synchronized (Persistence, Time, Combat Engine V3, Training Core) + identity growth update  
Status: Ready for Sprint F: Rivalries & Scouting V1.1

> **Intent:** This is the single “paste-into-a-new-chat” context file that describes **what the game is**, **how it simulates**, and **what’s next**.  
> It consolidates prior master context + design bible fragments into one canonical spec.

---

## Table of Contents
1. Core Vision & Pillars  
2. Canonical Tech Stack (Basho Spec v1.0)  
3. Determinism Rules (Deterministic but Divergent)  
4. World Structure  
5. Time, Calendar, Basho Loop  
6. Beya (Stable) System: Counts, Founding, Succession, Closure  
7. Rikishi: Identity, Growth, Style Evolution, Traits  
8. Combat Engine V3: Phase Model + Kimarite Integration  
9. Banzuke (Ranking) System: Hierarchy + Promotion/Demotion  
10. Economy: Kenshō, Prestige, Funds  
11. Rivalries, Seasons, World Events (Sprint F/H targets)  
12. Roadmap (Recalibrated)  
13. Data & Code Contracts (Types + Helper Modules)

---

# 1. Core Vision & Pillars (Canonical)

## Pillar 1 — Authenticity
- Full six-basho annual cycle: **Hatsu, Haru, Natsu, Nagoya, Aki, Kyushu**.
- Real banzuke hierarchy (Yokozuna → Jonokuchi) and realistic match counts.
- Kenshō banners with authentic payout split and retirement funds.

## Pillar 2 — Deterministic Simulation
- Every outcome is repeatable when given the same **World Seed** and event inputs.
- The combat engine is data-driven via the **82 Kimarite registry**.

## Pillar 3 — Narrative-First
- Every bout produces a log suitable for storylets (Ink.js-ready later).
- Systems (rivalries, seasonal tone, scandals, succession) are designed to generate “headlines”.

## Pillar 4 — Always Playable
- Builds must boot locally, be navigable, and save/load reliably.
- Missing features must degrade gracefully (stubbed UI/actions, seeded demo data).

---

# 2. Canonical Tech Stack (Basho Spec v1.0)

**Frontend Core**
- React (Vite), TypeScript
- Zustand + Immer (state)
- Tailwind + Radix UI (layout, dialogs, controls)
- React Router (navigation)
- React Hook Form (configuration flows)

**Simulation Systems**
- Custom TypeScript sim engine
- seedrandom for deterministic outcomes
- Comlink + Web Workers for parallel simulation
- Zod for data validation
- Optional Ink.js for narrative integration

**Persistence & Packaging**
- Dexie.js (IndexedDB saves)
- pako + JSZip (compression/export)
- Versioned migrations (Dexie)
- Vite PWA for offline play

**Audio/Visual Layer**
- howler.js (sound)
- Framer Motion (animation)
- Lucide React (icons)
- Recharts (analytics)
- react-markdown (dynamic text)

**Tooling**
- Vite, ESBuild
- ESLint + Prettier
- Vitest + RTL
- GitHub Actions (builds)

---

# 3. Determinism Rules (Deterministic but Divergent)

**World Seed** drives:
- Initial world generation (beya count, heya distribution, initial rikishi pools)
- Tournament schedules and matchup ordering (when applicable)
- Combat RNG (when seeded per bout)

**Allowed divergence (still deterministic):**
- Different *inputs* (training choices, scouting actions, event triggers) change outcomes.
- Narrative branches are deterministic given the same event stream.

**Hard rule:** no hidden calls to `Date.now()` inside simulation logic once “seeded mode” is active.  
(Using timestamps is acceptable only for debug seeds or “quick sim” outside canonical runs.)

---

# 4. World Structure

## 4.1 Flexible Beya Count
- Initial world spawns **~42 stables**, randomized in the range **39–45**.
- Ongoing world constraint: maintain roughly **35–50** active stables over time.
- This flexibility allows:
  - Retiring rikishi to found/take over a stable.
  - Stables to close when succession fails.

## 4.2 World Entities (High level)
- **Heya (stable)**: roster, oyakata, funds, facilities, reputation.
- **Rikishi**: identity, physical attributes (current + potential), skills, career record, economics.
- **BashoState**: tournament schedule, day progression, standings, results, prizes.
- **WorldState**: seed, time, collections, history.

---

# 5. Time, Calendar, Basho Loop

- 6 basho per in-game year (Index 0–5).
- During **Basho**: time advances by **day** (Day 1–15).
- Between basho (**Interim**): advances by **week**.
- Interim length: **6 weeks** bridging tournaments.
- Simulation time is independent of real time; “shipping/build time” is real time only.

---

# 6. Beya System: Founding, Succession, Closure

## 6.1 Oyakata Eligibility (Hook exists)
A candidate must satisfy:
- **Rank:** at least Sanyaku caliber in career history (design intent), and meets implemented check hook.
- **Age:** ≥ 28  
- **Conduct:** clean (no match-fixing / severe conduct flags)
- **Lineage constraint:** must have access to an elder stock line (kabu/toshiyori) in Governance V1.

## 6.2 Succession Rules (Design + hooks)
Trigger: post-basho review (and on retirement/death events).
1. Build candidate list (internal + external).
2. Score candidates:
   - prestige, recent performance, loyalty, leadership, conduct, finances
3. Select successor if any candidate clears threshold.
4. If no candidate clears threshold → stable closes OR merges (future option).

## 6.3 Closure Rules (Full)
A beya closes if **any** of these hold:
- Oyakata retires/dies **and** there is **no qualified successor**.
- Severe governance sanction (future: scandal, match-fixing, violence) forces dissolution.
- Bankruptcy / insolvency (future), after a grace period and rescue attempts.

## 6.4 Founding New Stables (More Detailed)
A new stable may be founded when:
- A qualified retired rikishi acquires elder stock.
- Governance permits stable creation (world cap not exceeded).
- Initial funding and facilities minimum met (can be modest).
Founding creates:
- new heya entity
- starter facility levels
- recruitment slots + reputation baseline

---

# 7. Rikishi: Identity, Growth, Style Evolution, Traits

## 7.1 Permanent Identity (Revised)
**Permanent:**
- Unique `id` (never changes).
- Unique `shikona` (weighted syllable generation; uniqueness enforced).
- Birth metadata (nationality, origin, etc.) as desired.

**Not permanent (updated design):**
- **Height and weight can evolve** over a career (especially early years).
- **Style can evolve** as a consequence of physical development and skill drift.

## 7.2 Current vs Potential Physique (New Canon)
Every rikishi has:
- `heightCurrentCm`, `weightCurrentKg`
- `heightPotentialCm`, `weightPotentialKg` (cap)
- `growthCurve` parameters (age/growth stage), plus a “fulfillment” factor.

**Fulfillment rule:** not all rikishi reach their potential. Outcomes depend on:
- training intensity and program fit
- injury history
- nutrition/facility quality
- “discipline”/personality traits (if modeled)

## 7.3 Style Evolution (New Canon)
Style is a **current label**, not a birth label:
- `oshi` tends to correlate with rising mass + power + aggression and comfort with distance.
- `yotsu` tends to correlate with grip skill, balance, and comfort in close contact.
- `hybrid` emerges when both pathways remain viable or coaching emphasizes adaptability.

**Update rule (example):** after each basho (or quarterly), recompute a style score from:
- physique deltas (mass/height changes)
- observed move usage (kimarite distribution)
- grip outcomes (belt-dominant frequency)
- coaching emphasis + archetype (soft influence)

Style can drift gradually (avoid abrupt flips), with hysteresis/thresholds.

## 7.4 Dynamic Attributes
- Fatigue (0–100)
- Momentum/form (e.g., -10 to +10)
- Injury status + weeks remaining  
Injury risk scales upward with **mass + fatigue + intensity**.

## 7.5 Tokui-waza (Signature Moves) — now linked to development
- `favoredKimarite` begins empty or lightly seeded.
- After each win, increment usage for the winning kimarite.
- Maintain top 2–3 as “favorites” for UI and for selection weighting.

**Development effect:**  
As physique/style evolves, the favored pool should drift:
- gaining weight/power may increase force-out success → `oshidashi/yorikiri` rise
- agility + lateral movement may raise trips/pulls
- belt skill development pushes throws/twists

---

# 7.6 Tactical Archetypes (Keep 5, Expanded)

> Archetype = behavioral bias layer.  
> Style = technical/strategic label derived from outcomes and attributes.  
> They usually correlate, but do not have to.

### 1) Oshi Specialist (Pusher/Thrusting)
- **Core idea:** wins the match before grips matter.
- **Identity in logs:** “straight-line violence”, relentless pressure, crowd-pleasing push outs.
- **Strength profile:** high power/aggression; mass amplifies forward drive; balance prevents self-collapse.
- **Bout behaviors:** strong tachiai; maintains separation; punishes hesitation.
- **Weakness profile:** vulnerable to lateral disruption and reactive counters (Speedster/Trickster).
- **Kimarite bias:** `force_out`, `push`, `thrust` with `gripNeed: none`.
- **Coaching knobs:** improve balance and footwork to reduce slap-down losses.

### 2) Yotsu Specialist (Belt Fighter)
- **Core idea:** control first, finish second.
- **Identity in logs:** “clinical grappler”, wins the inside war, dominant mawashi narratives.
- **Strength profile:** technique/experience/balance; grip skill compounds over time.
- **Bout behaviors:** may concede tachiai inches to secure grip; thrives in belt-dominant stances.
- **Weakness profile:** if denied grips repeatedly, offense stalls; early tachiai can be a liability.
- **Kimarite bias:** throws/lifts/twists; `gripNeed: belt` with yotsu stances.
- **Coaching knobs:** train entry and grip fighting; add a “plan B” slap/pull to survive no-grip bouts.

### 3) Speedster (Explosive/Evasive)
- **Core idea:** break the opponent’s structure, then cash out quickly.
- **Identity in logs:** “flash”, sudden angle changes, trips, unpredictable repositioning.
- **Strength profile:** speed/agility; lighter mass supports rapid foot placement.
- **Bout behaviors:** high initiative probability; seeks lateral position; can create rear opportunities.
- **Weakness profile:** volatile; if caught square, collapses; fatigue spikes on repeated bursts.
- **Kimarite bias:** trips, evasions, fast slap/pulls; lateral vectors.
- **Coaching knobs:** durability and balance training; teach selective aggression to reduce self-destruction.

### 4) Trickster (Chaos Merchant)
- **Core idea:** weaponize the opponent’s commitment.
- **Identity in logs:** “mind games”, henka threats, bait-and-punish, chaotic finishes.
- **Strength profile:** composure + agility + risk appetite; high counter bonus.
- **Bout behaviors:** invites overextension; chooses reactive techniques; thrives when opponent is linear.
- **Weakness profile:** low direct-force performance; can lose badly if opponent stays disciplined.
- **Kimarite bias:** slap/pulls, trips, “special” opportunistic wins.
- **Coaching knobs:** improve defensive fundamentals; limit overuse of low-percentage moves.

### 5) All-Rounder (Balanced/Adaptive)
- **Core idea:** take what the match gives you.
- **Identity in logs:** “textbook”, efficient and smart, shifts plans mid-bout.
- **Strength profile:** balanced stats; small global synergy bonus; lower volatility than Speedster/Trickster.
- **Bout behaviors:** reads stance/position, selects the best available finish.
- **Weakness profile:** lacks extreme edge; can be outclassed by specialists at their peak.
- **Kimarite bias:** neutral baseline; tends to pick high-frequency finishes that match stance.
- **Coaching knobs:** specialize situationally (anti-oshi toolkit, belt upgrades, etc.).

---

# 8. Combat Engine V3: Phase Model + Kimarite Integration

## 8.1 Phase Model
1. **Tachiai**: determine initiative/advantage from stats + archetype + style + mass.  
2. **Clinch / Grip battle**: set stance (belt-dominant / push-dominant / no-grip / migi-yotsu / hidari-yotsu).  
3. **Momentum ticks**: fatigue and position changes (frontal / lateral / rear), possible advantage recovery.  
4. **Finisher window**: filter 82 kimarite by stance/position/grip and weight them.  
5. **Resolution**: success vs counter, produce narrative log.

## 8.2 How the Kimarite Registry is used
The registry is not just flavor; it is the **action space** for endings.

**Filter pass:**
- remove forfeits
- stance must satisfy `requiredStances`
- position must satisfy `vector` (“rear” only if rear position)
- grip constraints must satisfy `gripNeed`

**Weighting pass (typical):**
- start with `baseWeight`
- add style affinity (oshi/yotsu/hybrid)
- add archetype bonus
- multiply if kimarite class is in archetype preferred classes
- multiply if kimarite is in `favoredKimarite`
- apply stance and position multipliers
- apply rarity dampening (legendary less frequent)

**Counter pass:**
- follower may flip outcome based on balance/experience/technique + archetype counter bonus
- if counter triggers, choose a defensive class subset (throw/trip/slap_pull/twist/evasion)

---

# 9. Banzuke (Ranking) System

## 9.1 Rank Hierarchy (Authentic)
- Makuuchi: Yokozuna, Ozeki, Sekiwake, Komusubi, Maegashira (M1–M17 E/W)
- Juryo (J1–J14 E/W)
- Makushita, Sandanme, Jonidan, Jonokuchi

## 9.2 Kachi-koshi / Make-koshi
- Sekitori (Juryo+): kachi-koshi at **8+ wins** (15 bouts)
- Lower divisions: kachi-koshi at **4+ wins** (7 bouts)

## 9.3 Promotion Notes (Rules of thumb)
- Ozeki: ~33 wins across 3 basho at sanyaku.
- Yokozuna: typically consecutive yusho or equivalent, via deliberation.
- Makushita → Juryo: usually requires high Makushita rank + strong record (7-0 ideal).

---

# 10. Economy: Kenshō, Prestige, Funds

## 10.1 Kenshō
Per banner:
- ¥70,000 total cost basis
- payout (current design):
  - ¥10,000 to stable funds (immediate)
  - ¥50,000 to rikishi retirement fund
  - remainder treated as fees/overhead (narratively consistent)

## 10.2 Prestige
- scalar used to:
  - influence kenshō banners attracted
  - influence rivalry heat and story spotlighting
- prestige decays weekly in Interim.

---

# 11. Rivalries, Seasons, World Events (Targets)

## 11.1 Rivalry Heat (Sprint F)
- Rivalry object between two rikishi:
  - `heat` (0–100), `lastUpdated`, `keyMoments` (log hooks)
- Heat increases on:
  - close matches, upsets, repeated meetings, title races
- Heat decays during Interim.
- Heat modifies:
  - tachiai intensity, risk appetite, narrative tone, and scouting interest.

## 11.2 Scouting (Sprint F)
- “Fog of war” on attributes:
  - some stats hidden until scouted
  - reveal by watching bouts, coach reports, recruitment visits
- Generates “analyst notes” that are also narrative content.

## 11.3 Seasonal Tone (Sprint H)
- Basho has a season (winter/spring/summer/autumn) that flavors:
  - headlines, crowd mood, injuries, travel fatigue, storylets
- Seasonal world events table can tie into succession/governance.

---

# 12. Roadmap (Recalibrated)

**NEXT: Sprint F — Rivalries & Scouting V1.1**
- rivalry heat + decay + UI surfacing
- scouting fog-of-war + reveal mechanics
- hook rivalry into tachiai + commentary

Sprint H/Q — Narrative Hooks & Seasonal Tone  
Sprint I — Governance V1 (kabu availability, full succession, council politics)  
Sprint L/S — FTUE & UI Polish  
Sprint M/T — Analytics & Career Journal

---

# 13. Data & Code Contracts (Types + Helper Modules)

This project is intended to ship with small, well-named TypeScript helpers (no monolith):
- `types.ts`: canonical domain types (Rikishi, Heya, BashoState, WorldState, etc.)
- `banzuke.ts`: rank hierarchy, formatting, kachi-koshi checks, estimate rank change, ozeki kadoban.
- `kimarite.ts`: Option A kimarite registry entries + query helpers (by stance/style/archetype).
- `boutEngineV3.ts`: deterministic multi-phase simulation, produces `BoutResult` + log.

**Important alignment note:**  
The kimarite registry must contain the full 82 official techniques (for the win space). If additional “variant” outcomes exist (otoshi variants, narrative-only endings), they should be treated as *aliases* or *post-processing labels* rather than expanding the official 82 list.

---

End of Consolidated Context v0.4.1

```



## SOURCE — Basho_MasterContext_v0.4.0_FULL.md

```md
# Basho — MASTER CONTEXT FILE v0.4.0
## Unified Design Bible & Systems Architecture
Date: 2025-11-24  
Status: Fully Synchronized Master File (All Systems Integrated)

---

# 1. CORE VISION & PILLARS

## Pillar 1 — Authenticity
- Six real basho: Hatsu, Haru, Natsu, Nagoya, Aki, Kyushu.
- True banzuke hierarchy.
- Kenshō banners, retirement funds, and realistic sumo economics.

## Pillar 2 — Deterministic Simulation
- All outcomes repeatable under a fixed World Seed.
- Combat Engine V3 is data-driven, using the full 82-kimarite matrix.

## Pillar 3 — Narrative-First
- Every bout produces log-friendly, story-driven commentary.
- Ink.js storylets planned for Rivalries, Seasons, and Press.

## Pillar 4 — Always Playable
- Game runs in offline ZIP builds.
- Save/Load functional via localStorage (Dexie.js mock).
- Missing features handled gracefully.

---

# 2. WORLD SYSTEMS

## 2.1 Time & Calendar
- 6 basho per year.
- Basho Index 0–5 (Hatsu → Kyushu).
- Between basho = 6-week Interim period.
- Time advances daily during basho, weekly during Interim.

## 2.2 Flexible Beya Count (Dynamic World)
- Initial count randomized: **39–45**.
- Beya can close if:
  - Oyakata retires/dies AND no qualified successor.
- Beya can open if:
  - Retired rikishi (Sanyaku-level) meets Oyakata requirements.
- World maintains 35–50 active stables.

## 2.3 Succession Mechanics
### Eligibility:
- Rank ≤ Sekiwake.
- Age ≥ 28.
- Clean conduct.
- No match-fixing flags.
- Must belong to a toshiyori stock line.

### Succession Process:
1. Check candidates.
2. Score based on prestige, record, conduct, loyalty.
3. Pick successor or close beya.

---

# 3. RIKISHI IDENTITY & MANAGEMENT

## 3.1 Permanent Identity
- Unique ID.
- Unique Shikona (weighted Japanese syllables).
- Height, weight, style fixed at generation.
- Player cannot alter physique.

## 3.2 Dynamic Attributes
- Fatigue (0–100).
- Form (momentum).
- Injury Status (risk scaling with weight + fatigue).

## 3.3 Tokui-waza (Signature Moves)
- Top 2–3 winning kimarite become favorites.
- Displayed on Rikishi Card.
- Update after every win.

---

# 3.4 Tactical Archetypes (Expanded)

### 1. Oshi Specialist (Pusher/Thrusting)
- High Power, Aggression, Mass.
- Prefers `force_out` kimarite requiring no grip.
- Strong Tachiai bonus.
- Risks imbalance vs Tricksters and Speedsters.

### 2. Yotsu Specialist (Belt Fighter)
- High Experience, Balance, Discipline.
- Seeks deep mawashi grip immediately.
- Prefers throws: Uwatenage, Shitatenage, Sukuinage.
- Weak initial Tachiai but strong mid-bout control.

### 3. Speedster (Explosive/Evasive)
- High Speed, Agility; lower Mass.
- Prefers lateral vectors and trips.
- High initiative chance.
- Volatile — rapid wins or rapid collapses.

### 4. Trickster (Chaos Merchant)
- High Agility, Composure, Risk Appetite.
- Prefers `slap_pull`, trips, and special moves.
- Henka-capable.
- Low frontal force-out performance.

### 5. All-Rounder (Balanced)
- Even stats.
- Small synergy bonus (+2–3%).
- Chooses optimal kimarite based on position.

---

# 4. COMBAT ENGINE V3

## 4.1 Bout Phases
1. **Tachiai** — speed, mass, aggression produce initiative.
2. **Stance Clashes** — determines grip quality.
3. **Positioning** — frontal, lateral, rear.
4. **Finisher Window** — candidate kimarite selection.
5. **Probability Calculation**.
6. **Resolution** — success, fail, or reversal.

## 4.2 Kimarite Filtering
- Move must match:
  - `vector`
  - `grip_need`
  - `class`
- 82 full moves available.

## 4.3 Probability Formula
P = Base + ΔStats + ΔFatigue + ΔTactic ± RiskSwing

### Stats:
- Force-out: STR + BAL
- Throws: STR + BAL + AGI
- Trips: BAL + AGI
- Slap/Pull: AGI + BAL

### Fatigue:
- Attack fatigue: –12% at max.
- Defender fatigue: +6%.

### Tactic synergy:
- Oshi: force-out boosted, throws penalized.
- Yotsu: throws boosted, slap-pulls penalized.
- Trickster: slap/pull & trips boosted.
- Speedster: initiative & lateral vectors boosted.
- All-rounder: small global buff.

### Risk Swing:
- Risk 1: ±0%
- Risk 5: ±12%

---

# 5. ECONOMY & GOVERNANCE

## 5.1 Kenshō Banners
- ¥70,000 total cost.
- Payout:
  - ¥10,000 to beya funds.
  - ¥50,000 to rikishi’s retirement fund.
- Prestige influences banner count.

## 5.2 Prestige System
- Ranges 0–999.
- Gains from:
  - Wins.
  - Upsets.
  - Beating higher-ranked opponents.
- Decays weekly during Interim.

## 5.3 Governance Hooks
- Yokozuna Deliberation Council reviewed annually.
- Succession review after every basho.
- Conduct flags (chikan, violence, etc.) affect career.

---

# 6. ROADMAP (Updated)

## Sprint F — **Rivalries & Scouting V1**
- Introduce Rivalry Heat scoring.
- Add scouting depth, Fog of War:
  - Hidden stats.
  - Reveal from watching bouts.
  - Analyst reports.
- Add rivalry bonuses in Tachiai tension.

## Sprint H — **Narrative Hooks & Seasonal Tone**
- Event Feed timeline.
- Seasonal Newstype flavoring.
- Spotlight bouts in headlines.

## Sprint I — **Governance V1**
- Full Oyakata Succession system.
- Political events and kabu stock availability.

## Sprint L/S — **FTUE & UI Polish**
- First-time user flow.
- Icons, tooltips, summaries.

## Sprint M/T — **Analytics & Career Journal**
- Recharts visualizations.
- Career logs.
- Year-in-review system.

---

# 7. FILES INCLUDED IN FUTURE BUILDS
- kimarite_matrix.json
- resolveKimarite.ts
- bout_engine_v3.ts
- world_seed.ts
- context.md (this file)

---

End of Document

```



## SOURCE — Basho_Master_Context_v0.4.0.md

```md
# Basho — MASTER CONTEXT FILE v0.4.0

This is the integrated master context document for Basho. Due to length constraints in this export step, please request the full expanded version and I will regenerate it section-by-section or as a ZIP. This file provides the structural outline and core integrated sections.

## 1. Core Vision & Pillars
- Authentic six-basho cycle, deterministic simulation, narrative-first logs, always-playable builds.

## 2. World Systems
### Time & Calendar
... (full content to be regenerated on demand)

### Flexible Beya Count
39–45 initial, succession/opening/closing rules integrated.

## 3. Rikishi Identity & Management
### Tactical Archetypes (Expanded)
- Oshi Specialist
- Yotsu Specialist
- Speedster
- Trickster
- All-Rounder

(Full expanded descriptions available on request.)

## 4. Combat Engine V3
- Multi-phase engine (Tachiai, Stance, Grip, Finisher)
- Uses full 82-kimarite matrix
- Probability system and modifiers integrated

## 5. Economy & Governance
- Kensho mechanics
- Prestige tracking
- Succession hooks

## 6. Roadmap (Recalibrated)
- Sprint F: Rivalries & Scouting
- Narrative hooks
- Governance V1
- FTUE Polish
- Analytics & Career Journal

```

```



## SOURCE 02 — Basho_System_Interaction_Megacontract_v1.0_Ultra_Granular.md

```md
# Basho — System Interaction Megacontract v1.0 (Ultra‑Granular)
Date: 2026-01-10  
Status: **IMPLEMENTATION‑GRADE / BINDING ORDER-OF-OPERATIONS FOR CROSS‑SYSTEM INTEGRATION**

This document is the **integration spine**: it specifies *how the already-defined systems must talk to each other*, in what order, with what data, and with what guardrails so that the world remains:
- **Deterministic** (same seed + same choices → same world)
- **Legible** (UI/narrative show *meaning*, not engine truth)
- **Institutional** (stables and people persist; consequences accumulate)
- **Sumo-authentic** in cadence, hierarchy, and ceremony

It does **not** re-document every system in full; it defines **interfaces, sequencing, and invariants** so no subsystem can “invent” outcomes or contradict canon.

---

## 0) Source Systems This Megacontract Integrates

This contract integrates the following canonical specs (and their superseding consolidated variants):
- Foundations / World Entry / UI & Observability (world boot, IDs, shikona, FTUE, visibility rules)
- Master Context Canon (narrative-first axioms, gameplay ideals, global constraints)
- Banzuke / Scheduling / Awards (rank structure, torikumi generation, playoffs, prizes, artifacts)
- Combat Engine + Kimarite (bout resolution, technique selection, outcomes, injury hooks)
- Rikishi Development (physique/skills/style/archetype evolution, career arcs)
- Training System (weekly training allocations, fatigue, risk, development shaping)
- Beya Staff & Welfare (capacity limits, coverage, welfare states, staff pipelines)
- NPC Manager AI (profiles, decision loops, meta drift, rivalries, succession)
- Sponsors / Kenshō / Supporters (procedural sponsor generation, banner payments, kōenkai mechanics)
- Sumo PBP / Narrative Rendering (commentary style matrices, special branches, crowd memory)
- Institutional Power / Governance / Scandal / Media (council rulings, sanctions, mergers/closures, narrative pressure)

---

# PART I — GLOBAL INTEGRATION PRINCIPLES

## 1) Determinism & Replay Contract (Cross-System)

### 1.1 One Seed, Many Streams
All randomness is **seeded**. Every subsystem must draw from deterministic streams:
- `worldSeed` (immutable)
- `bashoSeed[bashoId]`
- `daySeed[bashoId, day]`
- `boutSeed[boutId]`
- `uiFlavorSeed[playerSessionId]` *(presentation-only; may vary without changing simulation state)*

**Rule:** Only *presentation* may use `uiFlavorSeed`. **Simulation state must never depend on it.**

### 1.2 No Hidden Dice in Decisions
NPC AI “choices” are deterministic:
- The AI computes a **DecisionScore** for each legal action.
- Ties are broken by stable deterministic ordering (IDs, then lexicographic).

### 1.3 “No Surprises” Rule
A subsystem may not create:
- new restrictions (only governance can)
- new money (only economy flows can)
- new history (only journal/media events can, and only from existing triggers)

**Every output must point to an input cause** (the “source-of-truth chain”).

---

## 2) Canonical Identity & Cross-Referencing

### 2.1 IDs are Primary Keys Everywhere
All cross-system links must use immutable IDs (names are presentation):
- `RikishiID`, `OyakataID`, `BeyaID`, `BashoID`, `BoutID`
- `SponsorID`, `KenshoBannerID`, `SupporterGroupID`
- `GovernanceRulingID`, `MediaEventID`, `JournalEntryID`
- `AwardID`, `PrizeID`

### 2.2 “Entity Surfaces” (UI/Systems share the same conceptual object)
Every entity has:
- `CoreRecord` (immutable identity + origin metadata)
- `StateRecord` (current evolving values)
- `HistoryLog` (append-only events)
- `VisibilityMask[viewer]` (what player/NPC can see)

**Never** duplicate identity across systems. Store once; reference everywhere.

---

## 3) Narrative-First Output Contract (Global)

### 3.1 Numbers are Engine; Words are Player
- Player-facing UI uses **qualitative bands** and **thematic phrasing**.
- Only **hard economy numbers** (salary, banner amounts, facility costs) are allowed as explicit numbers by default.
- Everything else (form, confidence, injury risk, rivalry heat, scandal severity) is shown as **descriptors**.

### 3.2 “Explain the Why” Surfaces
Whenever the game presents a consequence (demotion, sanction, supporter drop), the UI must show:
- **Primary cause**
- **Secondary contributors**
- **What could have prevented it** (if applicable)

These explanations must be narrative, but must map deterministically to underlying triggers.

---

# PART II — CANONICAL TIME & EVENT ORDERING

## 4) Time Scales

### 4.1 Macro: Calendar
- Year contains six honbasho.
- Between basho: training, recruitment, staff management, governance, supporter relations.

### 4.2 Meso: Basho Cycle
- Pre-basho week(s): roster decisions, training emphasis, supporter activation, media simmer.
- Basho days: torikumi schedule, bouts, banners, PBP, injuries.
- Post-basho resolution: awards, payouts, banzuke, governance review.

### 4.3 Micro: Bout
- Ritual + approach + tachiai + exchanges + resolution (+ special branches).
- Combat engine resolves outcomes; PBP renders meaning; economy/governance record effects.

---

## 5) Global Tick Types (Authoritative)

### 5.1 Tick IDs
All simulation writes occur on explicit ticks:
- `WeekTick` (between basho)
- `DayTick` (during basho)
- `BoutTick` (per scheduled bout)

### 5.2 Tick Order Precedence
If multiple subsystems want to write on the same tick:
1. **Governance restrictions** (what is allowed)
2. **Economy** (what can be paid/afforded)
3. **Roster/Staff legality** (foreign slot, capacity)
4. **Training & welfare** (fatigue/injury shaping)
5. **Combat** (bout outcomes)
6. **Banzuke / scheduling artifacts** (after all bouts)
7. **Narrative outputs** (PBP, headlines, journals)
8. **UI visibility projections** (what the player sees)

This ordering is required to prevent retroactive contradictions.

---

## 6) Canonical End-to-End Cycle (One Basho)

### 6.1 Pre-Basho Week (WeekTick N)
**Inputs:** previous banzuke, stable budgets, staff rosters, injuries, rivalry states, supporter states, governance restrictions  
**Writes (in order):**
1. Governance updates effective restrictions (if any) → `ActiveRestrictions`
2. Economy applies weekly operating costs and supporter baseline flows
3. NPC AI and player decisions (recruit/release, staff hire/fire, facility upgrades, loans)
4. Training allocations set `TrainingPlan` for the week
5. Welfare system applies fatigue change, injury recovery/recurrence
6. Generate `BashoSeed` and lock `BashoRosterSnapshot` (the eligible participants)

### 6.2 Basho Day (DayTick D)
**Inputs:** torikumi list, banner allocations, current health/fatigue, style/archetype states  
**Writes (per bout in BoutTick order):**
1. Validate legality (both eligible; no disallowed bouts)
2. Allocate banners and compute stake narrative
3. Resolve combat outcome (kimarite + victory)
4. Apply injury events
5. Record bout to history
6. Emit PBP + crowd reaction
7. Update rivalry/crowd memory
8. Queue economy payout events (kenshō distribution)

### 6.3 Post-Basho Resolution (WeekTick N+1)
**Writes (in order):**
1. Compute standings and resolve playoffs (if needed)
2. Assign awards and special prizes
3. Finalize banner payouts and prestige shifts
4. Generate banzuke via deterministic reassignment algorithm
5. Update rikishi career journals & stable histories
6. Governance review pass (sanction triggers, merger/closure pressures)
7. NPC AI meta drift update (based on observed public outcomes)
8. UI “Basho Recap” surfaces (headlines, journals, budgets, rank changes)

---

# PART III — CROSS-SYSTEM INTERFACE CONTRACTS

This section defines **who owns what**, **what is read**, **what is written**, and **what is forbidden**.

## 7) Banzuke/Scheduling ↔ Combat

### 7.1 Ownership
- **Banzuke/Scheduling** owns: divisions, rank slots, torikumi generation, bout list.
- **Combat** owns: bout outcome (winner/loser), kimarite, victory method, injury events.

### 7.2 Required Inputs to Combat per Bout
- `BoutContext`:
  - `boutId`, `bashoId`, `day`, `division`
  - `eastRikishiId`, `westRikishiId`
  - `rankContext` (rank, rankNumber, side for each)
  - `stakesContext` (yusho contention flags, kachi-koshi pressure bands)
  - `bannerContext` (kenshoCount, sponsorIds)

### 7.3 Required Outputs from Combat
- `BoutResult`:
  - winnerId, loserId
  - kimariteId (from 82 list)
  - winType (force-out, throw, slap-down, etc.)
  - durationBand (instant / brief / extended / stalemate)
  - specialBranch? (mono-ii / torinaoshi / mizui-iri)
  - injuryEvents[]
  - deterministic trace pointer (engine debug, hidden from player)

### 7.4 Forbidden Actions
- Combat may not alter banzuke mid-basho.
- Scheduling may not “choose” winners.

---

## 8) Combat ↔ Rikishi Development (Body/Skills/Style)

### 8.1 Combat Reads (from Development)
- current physique (height/weight), fatigue, injury status
- style (oshi/yotsu/hybrid) and archetype tendencies
- skill outputs (power/speed/balance/technique/experience)
- tokui-waza candidates (favored kimarite families)

### 8.2 Combat Writes (to Development)
- injury events with severity and affected parts
- fatigue deltas
- confidence/momentum *as qualitative* state flags
- kimarite usage ledger (for style/archetype drift proof)

### 8.3 Development Writes (between basho)
- physique evolution (weight drift influenced by training + nutrition)
- skill evolution (growth/diminish patterns)
- style drift (public identity)
- archetype drift (slow; mostly stable)
- tokui-waza updates (proofed by kimarite ledger)

### 8.4 Invariant: Proof Before Identity
A rikishi’s displayed “signature” cannot change unless:
- the ledger shows sustained usage, and
- the narrative surfaces have reflected that change over time.

---

## 9) Training ↔ Welfare/Staff ↔ Development

### 9.1 Training Plan is a Weekly Contract
Training produces:
- `TrainingPlanWeek` per rikishi:
  - focus (technique/strength/speed/balance)
  - intensity band (light/standard/brutal)
  - sparring mix (oshi vs yotsu drills)
  - rest allocation

### 9.2 Staff/Welfare Modifiers (Non-Training Effects)
Staff and facilities do **not** directly grant skill points; they shape:
- ceilings (what is achievable)
- forgiveness (how fast fatigue decays; injury recurrence)
- variance (how often setbacks occur)

### 9.3 Capacity Enforcement
If roster exceeds staff capacity:
- welfare risk increases
- recovery slows
- training gains flatten
This is computed deterministically from coverage ratio.

### 9.4 Welfare States Feed Back Into AI & Narrative
Welfare has qualitative states that affect:
- NPC AI risk tolerance
- media scrutiny if repeated
- supporter sentiment (seen as “mismanagement”)

---

## 10) Economy/Sponsors ↔ Banzuke/Bouts ↔ PBP

### 10.1 Banner Allocation
Sponsors generate banners (`KenshoBanner`) attached to bouts:
- count (0..n)
- sponsor names (presentation)
- sponsor tier (local/regional/national/patron)
- payout schedule (per banner)

### 10.2 Payout Timing
- Banner “parade” and envelope ceremony are rendered **after** bout resolution.
- Economy records:
  - gross banners
  - tax/fees (if modeled)
  - distribution to rikishi and/or stable accounts per ruleset

### 10.3 Narrative Integration
PBP must mention:
- sponsor parade tone (subtle; not an ad read)
- the ceremony of envelopes when applicable
- optionally 1–3 sponsor names based on regional broadcast tone

**Rule:** Sponsor names shown are a *sample*; the economy ledger holds the full list.

---

## 11) Governance/Scandal ↔ Economy/Supporters ↔ AI

### 11.1 Governance Overrides
Governance can impose restrictions that affect:
- recruitment bans
- tournament participation restrictions
- supporter visibility and decay modifiers
- forced merger/closure pipeline

Governance rulings are immutable once issued and must carry IDs and effective ticks.

### 11.2 Scandals as Multi-System Events
A scandal is never “just narrative”.
It is a structured event with:
- trigger source (welfare neglect, loan strings, media exposure)
- governance review outcome (sanction ladder)
- economy consequence (supporters drop; sponsor hesitancy)
- AI consequence (succession urgency; risk posture change)
- rivalry consequence (scrutiny amplification)

### 11.3 Loan/Benefactor Strings Become Governance Hooks
If a stable takes a loan/benefactor rescue:
- it may create obligations (“strings”) that governance can later treat as leverage.
- repeated dependence increases sanction susceptibility.

---

## 12) Rivalries ↔ Everything (Distortions, Not Cheats)

Rivalry exists at three layers:
- rikishi↔rikishi
- oyakata↔oyakata
- stable↔stable

### 12.1 Rivalry Modifies Weighting, Not Legality
- Rivalry never creates new actions.
- Rivalry shifts **priority and tolerance thresholds**.

### 12.2 Cross-System Rivalry Touchpoints
- **Scheduling:** rivalry may increase headline emphasis but not torikumi legality.
- **Combat:** rivalry affects narrative stakes only, not outcome odds.
- **AI:** rivalry biases recruitment, training emphasis, economic risk posture.
- **Governance:** rivalry increases scrutiny tier when already triggered.
- **Media:** rivalry increases frequency and harshness of phrasing.

---

## 13) Career Journals ↔ PBP ↔ Media Headlines

### 13.1 Journal Entries Are Derived, Not Invented
Journal writes occur only from:
- bouts
- rank changes
- awards
- scandals/governance rulings
- supporter windfalls/collapses
- rivalries escalating/cooling

### 13.2 PBP as the “Language Reservoir”
PBP provides:
- phrasing variants
- crowd reaction vocabulary
- regional tonal filters
These feed:
- headlines
- journal excerpts
- stable lore blurbs

### 13.3 Staff-Driven Headline Generators
Staff events (coach hire/fire, welfare reforms, medical miracles, neglect) generate headlines:
- success: “rebuilt”, “revitalized”, “discipline restored”
- scandal: “under scrutiny”, “questions mount”, “council intervenes”
The generator must:
- cite the underlying event IDs
- respect tone filters (Tokyo restrained vs Fukuoka expressive)

---

# PART IV — INTEGRATION MATRICES & REQUIRED DATA CONTRACTS

## 14) Integration Matrix (What Reads/Writes What)

Legend: **R**=reads, **W**=writes, **E**=emits events, **Ø**=no access

| System \ System | World/IDs | Banzuke | Combat | Dev | Training | Staff/Welfare | Economy/Sponsors | Governance/Media | AI | PBP/Journals/UI |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| World/IDs | W | R | R | R | R | R | R | R | R | R |
| Banzuke | R | W | E | R | Ø | Ø | R | R | R | E |
| Combat | R | R | W | E | Ø | R | R | R | Ø | E |
| Development | R | R | R | W | R | R | Ø | Ø | R | R |
| Training | R | Ø | Ø | E | W | R | Ø | Ø | R | R |
| Staff/Welfare | R | Ø | R | E | R | W | R | R | R | R |
| Economy/Sponsors | R | R | R | Ø | Ø | R | W | R | R | E |
| Governance/Media | R | R | Ø | Ø | Ø | R | R | W | R | E |
| AI | R | R | Ø | R | R | R | R | R | W | E |
| PBP/Journals/UI | R | R | R | R | R | R | R | R | R | W |

**Key invariant:** narrative/UI systems never write simulation truth; they write **rendered artifacts** only.

---

## 15) Event Bus (Authoritative)

All cross-system notifications occur via an append-only `WorldEventLog`.

### 15.1 Event Shape
```
WorldEvent {
  id: EventID
  tick: TickID
  type: string
  entities: { rikishiIds[], beyaIds[], oyakataIds[], sponsorIds[] }
  payload: object  // deterministic, minimal
  cause?: { eventId: EventID }  // causal chain
}
```

### 15.2 Mandatory Event Types
- `WORLD_BOOT_COMPLETE`
- `BASHO_CREATED`
- `TORIKUMI_PUBLISHED`
- `BOUT_RESOLVED`
- `INJURY_OCCURRED`
- `AWARDS_ASSIGNED`
- `BANNER_PAYOUT_FINALIZED`
- `BANZUKE_PUBLISHED`
- `SUPPORTER_STATE_CHANGED`
- `GOVERNANCE_RULING_ISSUED`
- `MEDIA_EVENT_PUBLISHED`
- `AI_DECISION_LOGGED`
- `JOURNAL_ENTRY_WRITTEN`

---

## 16) Data Contracts (Minimum Required Fields)

### 16.1 StableStateSnapshot (per WeekTick)
- finances: cash, runway band, fixed costs, variable costs
- supporters: kōenkai tier, loyalty band, active pledges
- staff: roster, capacity ratios, welfare policy flags
- facilities: levels, upkeep
- governance: restrictions, kabu status, scrutiny band
- rivalry: key rival tiers and trend descriptors

### 16.2 RikishiStateSnapshot (per DayTick + post-bout)
- rank context
- physique (height/weight)
- health: fatigue band, injury flags
- identity: style descriptor, archetype descriptor, tokui-waza descriptor
- record: wins/losses in current basho
- narrative: crowd memory band (public), controversy band (public)

### 16.3 SponsorContract (procedural)
- sponsorId, tier, region, industry, brand tone
- budget band, banner willingness band
- scandal sensitivity band
- kōenkai adjacency (if any)

---

# PART V — REQUIRED “INTERACTIONS THAT MUST EXIST” (CHECKLIST)

This section is a QA list: if any bullet is missing in implementation, the systems are not integrated.

## 17) Bouts → Everything Pipeline (Must Work)
When `BOUT_RESOLVED`:
- record updates for both rikishi
- kimarite ledger updates
- fatigue/injury updates
- banner payout queued (if banners)
- rivalry state may update
- crowd memory updates
- PBP artifact produced with:
  - ritual flavor
  - flow narrative (no phase headings)
  - winning kimarite mentioned
  - sponsor ceremony mention if banners
  - special branch narration if mono-ii/torinaoshi/mizui-iri

## 18) Post-Basho → Rank → Economy → Narrative (Must Work)
When `BANZUKE_PUBLISHED`:
- salaries/allowances update for sekitori changes (economy)
- supporter interest updates (economy)
- AI planning updates (AI)
- journal entries for promotions/demotions (narrative)
- headlines for yusho/kinboshi/sansho (narrative)

## 19) Welfare Neglect → Scandal → Governance → Economy (Must Work)
If welfare risk is repeatedly ignored:
- scandal event triggers
- governance ruling created (stepwise sanctions)
- sponsor willingness reduced
- supporters decay faster
- AI forced into policy changes or succession pressures

## 20) Loans/Benefactors → Strings → Governance Hooks (Must Work)
If a stable accepts rescue:
- debt schedule is created
- “strings” are logged
- later governance can convert strings into restrictions
- narrative reflects “shadow patronage” without inventing facts

---

# PART VI — END-TO-END EXAMPLE (ONE DAY, ONE BOUT)

This is an integration demonstration, not “content”.

1) `TORIKUMI_PUBLISHED` lists BoutID BT-… with East/West rikishi IDs.  
2) Sponsors allocate 5 banners; sponsor IDs attached.  
3) `BOUT_RESOLVED` (combat engine) outputs winner + kimarite + duration band.  
4) Economy queues banner payout event.  
5) PBP renderer produces narrative with:
   - dohyo/ritual
   - tachiai impact
   - grappling flow
   - winning kimarite call
   - envelope ceremony mention + sampled sponsor names
6) Crowd memory updates; journal writes a “moment” entry if notable.  
7) AI logs updated perception snapshot (no numbers) for future decisions.

---

# PART VII — IMPLEMENTATION NOTES (NON-NEGOTIABLE)

## 21) Single Source of Truth Rules
- Banzuke determines eligibility; combat cannot bypass it.
- Governance determines legality; economy/AI must comply.
- Economy determines affordability; AI intent cannot overspend.
- Narrative systems determine phrasing; they cannot alter outcomes.

## 22) Debuggability Without Spoiling
Every major output has:
- `publicExplanation` (qualitative)
- `privateTrace` (hidden, dev-only)

Players see “why” but never the raw math.

---

# PART VIII — OPEN HOOKS (FORWARD-DECLARED, NOT REQUIRED TO SHIP)

These hooks may exist as stubs without active gameplay:
- Naturalization freeing foreign slot (rare, prestige-gated)
- Advanced council factions/politics (Governance V2)
- Expanded sponsor politics (anti-rival sponsor boycotts)
- Career journal analytics dashboards

---

## End of Megacontract v1.0

```



## SOURCE 03 — Basho_Technical_Addenda_Pack_v1.0.md

```md
# Basho — Technical Addenda Pack v1.0
## Exact Tables & Formulas Required for Implementation

**Purpose:** consolidate *hard-coded*, implementation-critical tables and formulas that are referenced across the design canon.  
**Style:** explicitly technical; unlike most narrative-facing docs, this file is intended for engineering and QA.

This pack includes:
- **A. AI Manager Reaction Lag Table** (Meta Drift recognition delays)
- **B. Combat Injury & Counter Formulas** (exact multipliers + trigger margins)
- **C. Ozeki Kadoban & Playoff Rules** (exceptions to heuristics)
- **D. Sponsor Churn & Loyalty** (post-basho churn logic + payment timing)
- **E. Beya Staff Diminishing Returns** (anti-stacking caps)

---

## Addendum A — AI Manager Reaction Lag Table
**Source:** NPC Manager AI System v1.3 (Meta Drift)

The **Meta Drift** mechanic relies on **recognition delays** to create market inefficiencies (AI does not instantly “solve” the meta).

### A1. Reaction Lag Table (Authoritative)

| Manager Profile | Reaction Speed | Minimum Delay | Logic Description |
|---|---|---:|---|
| Gambler | Instant / Volatile | 1–2 basho | Reacts to noise; over-corrects immediately. |
| Star Chaser | Fast | 1–3 basho | Chases trends as soon as a “Star” defines them. |
| Talent Factory | Moderate | 3–6 basho | Slow pipeline; adjusts recruitment filters only after trend is solidified. |
| Survivor | Slow | 4–6 basho | Only reacts when non-compliance threatens solvency. |
| Traditionalist | Stubborn | 4–8 basho (or Never) | Requires overwhelming evidence (**Meta > 60%**) to abandon identity. |

### A2. Implementation Rule (Recognition Turn)
When `MetaState` shifts (e.g., Oshi dominance rises), each stable computes:

- `recognitionTurn = currentTurn + randomInt(minDelay, maxDelay)`

The stable must not change its strategy until:

- `currentTurn >= recognitionTurn`

> Note: the delay range used is taken from the table above based on the stable’s manager profile.

---

## Addendum B — Combat Injury & Counter Formulas
**Source:** Combat and Kimarite Canon v1.1

### B1. Injury Probability Formula (Per Tick)

\[
P(\text{Injury}) = \text{BaseChance} \times \text{FatigueMult} \times \text{MassDiffMult}
\]

- **BaseChance:** `0.2%` per tick *(tunable constant)*

#### B1.1 FatigueMult (Authoritative)

| Condition | Multiplier |
|---|---:|
| Fatigue < 50 | 1.0× |
| Fatigue 50–80 | 1.5× |
| Fatigue > 80 | 4.0× *(Critical Risk)* |

#### B1.2 MassDiffMult (Impact Trauma Risk)

If:

- `(OpponentMass - SelfMass) > 30kg`

then:

- `MassDiffMult = 1.5×`

otherwise:

- `MassDiffMult = 1.0×`

---

### B2. Counter-Attack Threshold (Phase 5 Trigger)

A counter occurs only if the defender decisively out-executes the attacker.

\[
Score_{Defense} = (Balance \times 0.6) + (Experience \times 0.4) + (ArchetypeBonus)
\]

\[
Score_{Attack} = (Technique \times 0.5) + (Power \times 0.3) + (Momentum \times 2.0)
\]

**Trigger Condition (Margin of Safety):**

\[
Score_{Defense} > Score_{Attack} + 15
\]

If true, a **Counter** occurs.

---

## Addendum C — Ozeki Kadoban & Playoff Rules
**Source:** Banzuke Scheduling and Awards v1.3

### C1. Ozeki Demotion (Kadoban System)

**Condition:** An Ozeki who finishes **make-koshi** (wins < 8) enters **Kadoban** status for the next basho.

**Consequence:**
- If **Kadoban AND wins ≥ 8** → Kadoban cleared; rank retained.
- If **Kadoban AND wins < 8** → demotion to **Sekiwake**.

#### C1.1 Immediate Re-promotion (Special Rule)
A Sekiwake who was **just demoted** from Ozeki may return **immediately** to Ozeki with:

- **10+ wins** in the very next basho.

> This overrides the standard ~33 wins / 3 basho guideline for typical Ozeki promotion.

---

### C2. Playoff Logic (Day 15)

**Trigger:** If 2+ rikishi share the highest win count after Day 15 (e.g., 14–1).

**Pairing:** Standard single-elimination bracket.

**Seeding:** Random draw *(historically accurate)*.

**Effect:**
- Winner receives **Yūshō**
- Loser receives **Jun-Yūshō** credit

---

## Addendum D — Sponsor Churn & Loyalty
**Source:** Procedural Sponsors Canon v1.0

Sponsors are not permanent; churn forces ongoing prestige maintenance.

### D1. Churn Check (Post-Basho)

Each sponsor computes a satisfaction score:

\[
Score = (BeyaPrestige \times 0.5) + (StarPower \times 0.3) - (ScandalSeverity \times 20)
\]

### D2. Loyalty Thresholds (Authoritative)

| Sponsor Type | Churn Condition |
|---|---|
| Local Sponsor | churn if Score < 20 *(loyal)* |
| Corporate Sponsor | churn if Score < 50 *(fickle)* |
| Bandwagon Sponsor | churn if Score < 70 **OR** Trend == Negative |

### D3. Implementation Rule (Timing Effects)
If a sponsor churns:
- **Kenshō allocations removed immediately** (no new banners from this sponsor).
- **Kōenkai payments cease the following month**.

---

## Addendum E — Beya Staff Diminishing Returns
**Source:** Beya Staff and Welfare Canon v1.1

To prevent “stacking” coaches beyond growth caps:

### E1. Effectiveness Rules (Authoritative)
- **Primary Coach:** 100% effectiveness
- **Secondary Coach (same type):** 50% effectiveness
- **Max duplicates per type:** 2 *(hard cap)*
- **Oyakata stats:** stack additively with the primary coach (represents direct mentorship)

### E2. Worked Example
Conditioning Coach A (Stat 80) + Conditioning Coach B (Stat 70)

\[
EffectiveBoost = 80 + (70 \times 0.5) = 115
\]

This effective value is what contributes toward relevant growth caps.

---

## Notes for Integration (Where these addenda plug in)

- **A** plugs into: NPC Manager AI, Meta Drift, Recruitment/Training Strategy selection
- **B** plugs into: Combat loop tick resolver, Injury State Machine, Phase 5 counter logic
- **C** plugs into: Banzuke rank updates, Playoff scheduling, Awards/records
- **D** plugs into: Sponsor engine, Kenshō allocation, Kōenkai income cadence
- **E** plugs into: Training output calculator, Beya staffing UI, AI hiring priorities

---

**END OF Technical Addenda Pack v1.0**

```

```



## SYSTEM 7 — Combat & Kimarite
**Source file:** `Combat_and_Kimarite_Canon_v2.0_Ultimate_NonLossy.md`

```md

# Basho — Combat & Kimarite Canon v2.0
## Ultimate, Non-Lossy, Ultra-Granular Combat Constitution

Status: **DEFINITIVE / IMPLEMENTATION-GRADE / NON-LOSSY**
Supersedes: All Combat & Kimarite Canons v1.1 → v1.9

---

## PURPOSE

This document is the **single authoritative combat specification** for *Basho*.
It unifies all prior Combat & Kimarite canons **without deleting, compressing, or summarizing any system**.

It is explicitly:
- Larger than the source material
- Deterministic and replay-safe
- Numerically explicit where required
- Hierarchically coherent
- Safe for direct engineering implementation

If any ambiguity exists, the **Source Preservation Annex** is binding.

---

## HOW TO USE THIS DOCUMENT

### Part A — Harmonized Combat Model (Authoritative)
A clean, hierarchical, end-to-end combat system specification:
- Physics-informed bout resolution
- Momentum, stance, leverage, and edge states
- Era parity & basho form volatility
- Kimarite tiers, rarity, mastery curves
- Injury probability, profiles, and escalation
- Counter mechanics and thresholds

### Part B — Inline Numeric Tables (Authoritative)
All matrices, grids, thresholds, and formulas required for coding.

### Part C — Determinism & Resolution Order
Exact tick order, seed usage, and state transitions.

### Part D — Source Preservation Annex (Verbatim)
Every prior document embedded **word-for-word**, guaranteeing zero loss.

---

# PART A — HARMONIZED COMBAT MODEL (AUTHORITATIVE)

## A1. Determinism Contract

Combat resolution is a pure function of:
- WorldSeed
- BoutSeed
- Rikishi State Snapshots (pre-bout)
- Era State
- Basho Context

No runtime RNG.
No floating ambiguity.
Same inputs → same bout, forever.

---

## A2. Bout Resolution Stack (Exact Order)

1. Ritual framing (non-mechanical)
2. Tachiai impulse exchange
3. Stance establishment
4. Momentum band resolution
5. Leverage & mass interaction
6. Edge pressure resolution
7. Counter eligibility check
8. Kimarite selection
9. Injury checks (per tick + terminal)
10. Outcome commit & ledger write

---

## A3. Physics-Informed Core Axes

### A3.1 Momentum → Impulse Bands
Momentum is discretized into impulse bands:
- Dead
- Soft
- Firm
- Explosive
- Overextended

Bands govern:
- initiative retention
- counter vulnerability
- injury amplification

### A3.2 Balance → Stance Stability States
Stance is categorical, not numeric:
- Planted
- Leaning
- Twisted
- Scrambling
- Collapsing

Transitions are table-driven (see Part B).

### A3.3 Mass Difference → Leverage Classes
Mass differences map to leverage classes:
- Neutral (<10kg)
- Advantage (10–25kg)
- Dominant (25–40kg)
- Crushing (>40kg)

Leverage class modifies:
- push effectiveness
- throw viability
- injury risk

### A3.4 Edge Pressure → Positional Sub-States
Ring position is discrete:
- Center
- Drift
- Warning
- Straw
- Over

Edge states gate finisher eligibility.

---

## A4. Era Parity & Basho Form

### A4.1 Era Parity (World-Derived)
EraParityIndex is **derived**, never player-set.
It emerges from:
- Active yokozuna count
- Win share concentration
- Average bout duration
- Upset frequency

Low parity → dominance eras.
High parity → chaos eras.

### A4.2 Basho Form Volatility
Each rikishi carries a basho-local form trajectory:
- Cold
- Off
- Normal
- Hot
- Transcendent

Form:
- shifts per bout
- decays between basho
- enables FM-style “wonder basho” and collapses

---

## A5. Kimarite System (82 Moves)

### A5.1 Tier Structure
- Common
- Uncommon
- Rare
- Legacy / Spectacular

Tier affects:
- base selection weight
- mastery curve difficulty
- narrative emphasis

### A5.2 Technique Mastery Curves
Each rikishi accrues mastery per kimarite:
- exposure-based growth
- diminishing returns
- rarity dampening

Rare techniques emerge late-career or under form spikes.

### A5.3 Per-Kimarite Injury Profiles
Each kimarite defines:
- primary injury risk (ACL / ankle / shoulder / neck)
- secondary risk
- fatigue amplification

---

## A6. Injury System (Combat-Side)

### A6.1 Per-Tick Injury Probability
See Part B tables (exact formulas).

### A6.2 Terminal Injury Checks
Certain kimarite + edge states trigger terminal checks.

### A6.3 Injury Visibility
All injuries are public and logged:
- duration
- missed bouts
- kyujo flags
- forced retirements

---

## A7. Counter System

Counters are **rare, decisive reversals**.

Trigger:
DefenseScore > AttackScore + Margin

Scores and margins are numeric and fixed (see Part B).

---

## A8. Narrative Hooks (Combat Outputs)

Combat emits:
- kimarite ID
- impulse arc
- stance collapse point
- edge resolution
- counter flag
- injury events

These feed:
- PBP
- History
- AI learning
- Era metrics

---

# PART B — INLINE NUMERIC TABLES (AUTHORITATIVE)

(See embedded tables below; no summarization.)

---

# PART C — SEEDING & STATE COMMIT

- BoutSeed = hash(WorldSeed, BashoID, Day, BoutIndex)
- All tables are indexed deterministically
- State diffs are atomic

---

# PART D — SOURCE PRESERVATION ANNEX (VERBATIM)

The following sections embed **every prior combat document in full**.
If a discrepancy exists, this annex preserves intent.

---


---

## SOURCE — Basho_Combat_and_Kimarite_Canon_v1.1_Ultra_Granular.md

```md

# Basho — Combat & Kimarite Resolution Canon v1.1
## Ultra-Granular, Implementation-Grade Specification (Bout System Only)

Status: **DEFINITIVE**
Scope lock: **Combat, Kimarite, Bout Resolution, and Narrative Emission only**

This document replaces v1.0 and is intentionally:
- larger than its source documents
- non-lossy
- explicit down to data-field and resolution-order level

---

# PART I — HARD DESIGN LAWS (COMBAT SCOPE)

## 1. Determinism
Every bout outcome is a pure function of:
- WorldSeed
- BoutSeed = hash(WorldSeed, BashoId, Day, BoutIndex, RikishiAId, RikishiBId)
- Immutable rikishi state snapshots at bout start

No RNG calls outside seeded resolution.
No floating nondeterminism.
No animation-driven variance.

## 2. Separation of Concerns
- Combat Engine produces **facts**
- Narrative/PBP consumes facts
- Narrative NEVER feeds back into resolution

---

# PART II — COMBAT ENGINE V3 (VERBATIM + BINDING)

# Basho — Combat Engine V3 (Deterministic) Specification v1.0

Date: 2026-01-06  
Status: Canonical, verbose, implementation-ready  
Scope: This document defines **Combat Engine V3**, the deterministic bout-resolution engine used by Basho. It explains phases, inputs, outputs, weighting, counters, logging, and integration with rikishi evolution and kimarite systems.

---

## 1. Design Goals

Combat Engine V3 must:
- Produce **authentic sumo outcomes** with believable frequency
- Be **fully deterministic** under a seed
- Generate **structured logs** for narrative and analytics
- Integrate with:
  - Rikishi evolution (physique, skills, style, archetype)
  - Kimarite tier/style/archetype weighting
  - Fatigue, momentum, and injuries
- Remain **tunable without rewriting code**

---

## 2. Determinism Contract

Every bout outcome is derived from:
- World seed
- Bout seed (world seed + basho + day + match index + rikishi IDs)
- Current rikishi state (physique, skills, fatigue, injuries, style, archetype)
- No calls to `Date.now()` or unseeded randomness

**Same inputs → same bout, every time.**

---

## 3. High-Level Bout Flow

1. Tachiai phase
2. Clinch / grip resolution
3. Momentum ticks
4. Finisher window (kimarite selection)
5. Counter resolution (optional)
6. Result + structured logs

---

## 4. Phase 1 — Tachiai

### Purpose
Determine initial initiative and advantage.

### Inputs
- Power, speed, balance
- Mass differential
- Fatigue
- Momentum
- Archetype tachiai bias

### Outputs
- Initial advantage score
- Initiative holder
- Narrative log entry

---

## 5. Phase 2 — Clinch / Grip Battle

### Purpose
Determine stance and grip context.

### Possible stances
- push-dominant
- belt-dominant
- no-grip
- migi-yotsu
- hidari-yotsu

### Inputs
- Style (oshi/yotsu/hybrid)
- Technique and experience
- Grip preference
- Height and reach

### Outputs
- Stance
- Grip state
- Narrative log entry

---

## 6. Phase 3 — Momentum Ticks

### Purpose
Simulate mid-bout flow and volatility.

### Loop behavior
- Fatigue accumulates
- Advantage may shift
- Position may change:
  - frontal
  - lateral
  - rear

### Inputs
- Balance
- Experience
- Speed
- Fatigue
- Archetype counter bias

### Outputs
- Updated advantage
- Position
- Narrative log entries per tick

---

## 7. Phase 4 — Finisher Window (Kimarite Selection)

### Purpose
Select a plausible finishing technique.

### Steps
1. Filter kimarite registry by:
   - stance requirements
   - grip needs
   - position/vector constraints
2. Weight remaining kimarite using:
   - baseWeight
   - tier multiplier
   - style × tier shaping
   - stance bias
   - position bias
   - archetype class bias
   - favored kimarite bonus
3. Normalize and sample deterministically

**See separate Kimarite Tier / Style / Archetype spec for full math.**

---

## 8. Phase 5 — Counter Resolution

### Purpose
Allow defender to flip outcome.

### Counter probability influenced by:
- Balance
- Experience
- Fatigue difference
- Archetype counter bias
- Position

### If counter triggers
- Select defensive kimarite class subset
- Resolve counter deterministically
- Log counter event

---

## 9. Phase 6 — Result & Logging

### BoutResult includes
- Winner / loser IDs
- Final kimarite
- Duration (ticks)
- Stance history
- Position history
- Fatigue delta
- Injury checks (post-bout)

### Narrative Log Contract
Each log entry includes:
- phase
- description (human-readable)
- structured data payload for UI/analytics

---

## 10. Injury Checks (Post-Bout)

Injury risk derived from:
- Fatigue
- Mass
- Bout length
- Prior injuries
- Deterministic seed

Injuries are applied **after** the bout result.

---

## 11. Integration Points

Combat Engine V3 consumes:
- Rikishi evolution state
- Kimarite registry
- Style/archetype matrices

Combat Engine V3 produces:
- BoutResult
- Logs
- Fatigue deltas
- Injury events
- Momentum changes

---

## 12. Tunable Parameters (Non-Code)

Designers should be able to tune:
- Phase weightings
- Fatigue accumulation rates
- Counter frequency
- Tier/style/archetype multipliers
- Log verbosity

Without changing engine structure.

---

## 13. Why V3 Works

- Phased model matches real bout flow
- Determinism enables debugging and replay
- Registry-driven endings prevent hardcoding
- Evolution systems naturally express themselves through outcomes

---

## 14. Canon One-Liner

> **Combat Engine V3 resolves sumo bouts by simulating initiative, control, pressure, and opportunity — then selecting an authentic ending from the official kimarite space under deterministic rules.**

---

End of document.


---

# PART III — KIMARITE SYSTEM (VERBATIM + BINDING)

# Basho — Kimarite Selection System v1.0
Date: 2026-01-06  
Scope: Canonical description of how **kimarite tiers**, **styles**, and **tactical archetypes** interact inside **Combat Engine V3 (Option A)**.

This document is written to be implementation-ready and tuning-friendly. It defines:
- what each layer means (tier vs style vs archetype),
- the exact weighting pipeline (order matters),
- default numeric tables (safe starting values),
- one single diagram of the selection funnel,
- a worked example.

---

## 1) Core idea

Kimarite selection is a deterministic, data-driven weighted choice over the **official 82 kimarite**.  
For each bout, the engine does **not** pick a “move animation” first. Instead it:

1. Determines the *state of the bout* (stance, position, grip context, fatigue, etc.)
2. Filters the kimarite registry to only those that are legal/plausible in that state
3. Weights the remaining options using layered multipliers
4. Samples deterministically (seeded RNG) to select the finishing kimarite
5. Resolves success vs counter (still deterministic), then emits logs

The system is designed to create:
- authenticity (common finishes dominate),
- identity (specialists drift toward signatures),
- variety (situational techniques appear in believable contexts),
- narrative “spikes” (rare/legendary moments exist, but stay rare).

---

## 2) Definitions: three layers that must not be merged

### 2.1 Kimarite Tier (Common / Uncommon / Rare / Legendary)
**Tier answers:** “How often does this technique show up in sumo at all?”  
It is **global plausibility**, independent of any individual rikishi.

Tier is the main “frequency ceiling” control:
- Common should dominate most bouts
- Legendary should remain highlight-only even for the best-fitting style/archetype

### 2.2 Style (oshi / yotsu / hybrid)
**Style answers:** “What does this rikishi’s body + training naturally support right now?”  
Style is a **technical comfort layer** derived from:
- physique deltas (mass, balance, speed)
- observed outcomes (kimarite distribution)
- grip success distribution (belt-dominant frequency)
- coaching emphasis (future)
- archetype as a *soft bias*, never a lock

Style changes slowly (recommended cadence: end of basho, with hysteresis).

### 2.3 Tactical Archetype (behavioral bias)
**Archetype answers:** “How does this rikishi choose actions under pressure?”  
Archetype is a **behavioral bias layer** that primarily affects:
- which *classes* of kimarite are preferred (force-out vs throw vs slap-pull)
- willingness to take volatility (risk appetite, counter windows)

Archetype does **not** magically grant technical ability.  
It amplifies tendencies after plausibility and comfort are established.

---

## 3) Single diagram: the selection funnel (order is canonical)

```
            ┌───────────────────────────────────────────┐
            │           Bout state is computed           │
            │ stance, position, grip context, fatigue... │
            └───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1) FILTER (hard gates)                                           │
│    - required stances                                            │
│    - gripNeed constraints                                        │
│    - position/vector constraints (frontal/lateral/rear)          │
│    - remove non-endings (forfeits unless explicitly allowed)     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2) BASE WEIGHT (per kimarite)                                    │
│    - intrinsic frequency within the 82 registry                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3) TIER MULTIPLIER (global plausibility ceiling)                 │
│    Common / Uncommon / Rare / Legendary                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4) STYLE MULTIPLIER (technical comfort)                          │
│    oshi / yotsu / hybrid × tier shaping                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5) STANCE + POSITION MULTIPLIERS (context bias)                  │
│    - stance biases classes                                       │
│    - position biases vectors                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6) ARCHETYPE CLASS MULTIPLIERS (behavioral bias)                 │
│    - affects kimarite classes (force-out/throw/slap/...)          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7) FAVORITES (tokui-waza)                                        │
│    - if kimarite in favoredKimarite[] apply bonus                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
            ┌───────────────────────────────────────────┐
            │ 8) Normalize weights and sample (seeded)   │
            └───────────────────────────────────────────┘
                              │
                              ▼
            ┌───────────────────────────────────────────┐
            │ 9) Counter resolution + final BoutResult   │
            └───────────────────────────────────────────┘
```

**Canonical rule:** tiers → style → stance/position → archetype → favorites (in that order).

---

## 4) Default numeric tables (safe starting values)

These tables are designed to:
- keep Common endings dominant,
- allow situational diversity,
- preserve “legendary” rarity,
- let favorites meaningfully emerge over a career.

### 4.1 Tier multipliers (global)
Apply after `baseWeight`.

| Tier | Multiplier |
|---|---:|
| Common | 1.00 |
| Uncommon | 0.55 |
| Rare | 0.20 |
| Legendary | 0.05 |

> Tuning note: if your sim feels too repetitive, raise **Uncommon** first (e.g., 0.55 → 0.65).  
Avoid raising Legendary early; it should stay “wow.”

### 4.2 Style × Tier shaping multipliers
Apply after Tier multipliers. This table shapes how styles distribute probability mass across tiers.

| Style → / Tier ↓ | Common | Uncommon | Rare | Legendary |
|---|---:|---:|---:|---:|
| **Oshi** | 1.15 | 0.90 | 0.60 | 0.30 |
| **Yotsu** | 1.15 | 1.05 | 0.80 | 0.40 |
| **Hybrid** | 1.10 | 1.00 | 0.90 | 0.50 |

Interpretation:
- **Oshi** compresses outcomes toward the center (bread-and-butter).
- **Yotsu** allows rare techniques more often (throws/twists emerge).
- **Hybrid** preserves optionality and increases “off-path” plausibility slightly.

### 4.3 Kimarite class multipliers by archetype (canonical Option A defaults)
These are *behavioral biases* and should be applied to the kimarite’s **class**.

| Archetype | force_out/push/thrust | throw/twist/lift | slap_pull | trip/evasion | rear | special |
|---|---:|---:|---:|---:|---:|---:|
| **Oshi Specialist** | 1.45 | 0.85 | 1.10 | 0.95 | 1.05 | 0.80 |
| **Yotsu Specialist** | 1.05 | 1.55 | 0.90 | 0.95 | 1.15 | 1.00 |
| **Speedster** | 1.05 | 0.90 | 1.20 | 1.60 | 1.10 | 0.95 |
| **Trickster** | 0.85 | 0.95 | 1.65 | 1.35 | 1.05 | 1.20 |
| **All‑Rounder** | 1.15 | 1.15 | 1.10 | 1.10 | 1.10 | 1.00 |

> Canon note: “rear” is mostly unlocked by **position**, so multipliers are modest here.

### 4.4 Stance → Class bias multipliers (canonical Option A defaults)
Stance is determined in the clinch/grip phase and biases which classes are plausible.

| Stance | force_out/push/thrust | throw/twist/lift | slap_pull | trip/evasion | rear |
|---|---:|---:|---:|---:|---:|
| **push-dominant** | 1.45 | 0.85 | 1.20 | 1.10 | 1.00 |
| **belt-dominant** | 0.95 | 1.55 | 0.90 | 1.00 | 1.10 |
| **migi-yotsu / hidari-yotsu** | 1.00 | 1.45 | 0.95 | 1.05 | 1.10 |
| **no-grip** | 1.05 | 0.65 | 1.30 | 1.20 | 0.80 |

### 4.5 Position → Vector bias multipliers (canonical Option A defaults)
Position is computed during momentum ticks.

| Position | frontal vector | lateral vector | rear vector |
|---|---:|---:|---:|
| **frontal** | 1.15 | 1.00 | 0.70 |
| **lateral** | 1.00 | 1.20 | 0.85 |
| **rear** | 0.80 | 0.95 | 2.25 |

### 4.6 Favorites (tokui-waza) multiplier
If the selected move is in attacker’s `favoredKimarite[]`:

| Condition | Multiplier |
|---|---:|
| kimarite ∈ favoredKimarite | 2.00 |
| otherwise | 1.00 |

This is the main mechanism that creates signature moves organically over time.

---

## 5) The full weight formula (implementation-ready)

For each candidate kimarite `k` after filtering:

```
weight(k) =
  baseWeight(k)
  * tierMult( tier(k) )
  * styleTierMult( style(attacker), tier(k) )
  * stanceClassMult( stance, class(k) )
  * positionVectorMult( position, vector(k) )
  * archetypeClassMult( archetype(attacker), class(k) )
  * favoriteMult( k in favoredKimarite )
  * rarityDampening(k)   // optional, if you keep a separate rarity scalar
```

Then normalize and sample deterministically.

**Determinism rule:** the same bout seed and same state produces the same selection.

---

## 6) Why tiers, style, and archetype are separate (the “no collapse” rule)

If you collapse these layers, you get pathological behavior:
- archetype overriding tier → Trickster spams legendary techniques
- style overriding plausibility → Oshi suddenly sukuinage-spams
- merging style+archetype → you lose the distinction between *body* and *behavior*

**Canonical one-liner:**
> Kimarite tiers define global plausibility, styles define technical comfort, and archetypes define behavioral bias — in that order, and never as substitutes for one another.

---

## 7) Worked example (numbers you can sanity-check)

Scenario:
- Candidate kimarite: **kotenage**
- baseWeight(kotenage) = 1.0 (example)
- tier(kotenage) = Uncommon
- attacker style = Yotsu
- attacker archetype = Yotsu Specialist
- stance = belt-dominant
- position = frontal
- kotenage class = throw/twist/lift
- vector = frontal
- kotenage is in favoredKimarite[] (yes)

Compute:

- tierMult(Uncommon) = 0.55
- styleTierMult(Yotsu, Uncommon) = 1.05
- stanceClassMult(belt-dominant, throw/twist/lift) = 1.55
- positionVectorMult(frontal, frontal) = 1.15
- archetypeClassMult(Yotsu Specialist, throw/twist/lift) = 1.55
- favoriteMult = 2.0

So:

`weight = 1.0 * 0.55 * 1.05 * 1.55 * 1.15 * 1.55 * 2.0`

= 0.55 * 1.05 = 0.5775  
0.5775 * 1.55 = 0.8951  
0.8951 * 1.15 = 1.0294  
1.0294 * 1.55 = 1.5956  
1.5956 * 2.0 = **3.1912**

Interpretation:
- Even though kotenage is “Uncommon,” the correct style/stance/archetype plus favorites make it very viable.
- This is exactly how signature techniques become common **for the right rikishi** without breaking global plausibility.

---

## 8) Practical tuning guidance (what to change first)

If you see… | Change…
---|---
Too repetitive | Increase Uncommon tier (0.55 → 0.60–0.70)
Too many weird finishes | Reduce Rare and Legendary (Rare 0.20 → 0.15; Legendary 0.05 → 0.03)
Styles feel indistinct | Increase style-tier separation (e.g., Oshi Rare 0.60 → 0.50; Yotsu Rare 0.80 → 0.90)
Archetypes feel weak | Slightly widen archetype multipliers (±0.05–0.10), not tiers
Favorites feel meaningless | Increase favorites (2.0 → 2.3) **only after** tier/style are stable

---

## 9) Deliverables this document assumes exist elsewhere

This document assumes:
- a correct 82-kimarite registry with fields:
  - `id`, `displayName`, `class`, `tier`, `requiredStances`, `gripNeed`, `vector`
  - `baseWeight`
- the canonical stance and position determination from Combat Engine V3
- favored kimarite tracking (tokui-waza) in the rikishi model

---

End of document.


---

# PART IV — OFFICIAL 82 KIMARITE REGISTRY (INLINE, CANONICAL)

This registry is **binding engine data**, not reference material.

## Tier Definitions (Simulation)
- Common: bread-and-butter, majority of bouts
- Uncommon: situational but believable
- Rare: specialist or positional edge
- Legendary: highlight-only, extreme rarity

Tier multipliers:
- Common: 1.00
- Uncommon: 0.55
- Rare: 0.20
- Legendary: 0.05

---

## Kihonwaza (7)

| id | en | ja | class | vector | tier |
|---|---|---|---|---|---|
| yorikiri | Yorikiri | 寄り切り | force_out | frontal | common |
| yoritaoshi | Yoritaoshi | 寄り倒し | force_out | frontal | common |
| oshidashi | Oshidashi | 押し出し | push | frontal | common |
| oshitaoshi | Oshitaoshi | 押し倒し | push | frontal | common |
| tsukidashi | Tsukidashi | 突き出し | push | frontal | common |
| tsukitaoshi | Tsukitaoshi | 突き倒し | push | frontal | common |
| abisetaoshi | Abisetaoshi | 浴せ倒し | force_out | frontal | uncommon |

---

## Nagete (13)

| id | en | ja | class | vector | tier |
|---|---|---|---|---|---|
| uwatenage | Uwatenage | 上手投げ | throw | lateral | common |
| shitatenage | Shitatenage | 下手投げ | throw | lateral | common |
| uwatedashinage | Uwatedashinage | 上手出し投げ | throw | lateral | uncommon |
| shitatedashinage | Shitatedashinage | 下手出し投げ | throw | lateral | uncommon |
| kotenage | Kotenage | 小手投げ | throw | lateral | common |
| sukuinage | Sukuinage | 掬い投げ | throw | lateral | common |
| kubinage | Kubinage | 首投げ | throw | lateral | uncommon |
| kakenage | Kakenage | 掛け投げ | throw | lateral | uncommon |
| koshinage | Koshinage | 腰投げ | throw | lateral | rare |
| tsukaminage | Tsukaminage | つかみ投げ | throw | lateral | uncommon |
| nichonage | Nichonage | 二丁投げ | throw | lateral | rare |
| yaguranage | Yaguranage | 櫓投げ | throw | lateral | legendary |
| ipponzeoi | Ipponzeoi | 一本背負い | throw | lateral | legendary |

---

## Kakete (18)
| id | en | ja | class | vector | tier |
|---|---|---|---|---|---|
| sotogake | Sotogake | 外掛け | trip | lateral | uncommon |
| uchigake | Uchigake | 内掛け | trip | lateral | uncommon |
| kekaeshi | Kekaeshi | 蹴返し | trip | frontal | uncommon |
| ketaguri | Ketaguri | 蹴手繰り | trip | frontal | uncommon |
| ashitori | Ashitori | 足取り | trip | frontal | rare |
| komatasukui | Komatasukui | 小股掬い | trip | lateral | rare |
| kirikaeshi | Kirikaeshi | 切り返し | trip | lateral | rare |
| kozumatori | Kozumatori | 小褄取り | trip | frontal | rare |
| susotori | Susotori | 裾取り | trip | frontal | rare |
| susoharai | Susoharai | 裾払い | trip | lateral | rare |
| sotokomata | Sotokomata | 外小股 | trip | lateral | rare |
| chongake | Chongake | ちょん掛け | trip | lateral | rare |
| omata | Omata | 大股 | trip | lateral | rare |
| tsumatori | Tsumatori | 褄取り | trip | frontal | rare |
| watashikomi | Watashikomi | 渡し込み | trip | frontal | legendary |
| kawazugake | Kawazugake | 河津掛け | trip | lateral | legendary |
| mitokorozeme | Mitokorozeme | 三所攻め | trip | lateral | legendary |
| nimaigeri | Nimaigeri | 二枚蹴り | trip | frontal | legendary |

---

## Hinerite (19)
| id | en | ja | class | vector | tier |
|---|---|---|---|---|---|
| tsukiotoshi | Tsukiotoshi | 突き落とし | twist | frontal | common |
| katasukashi | Katasukashi | 肩透かし | twist | frontal | uncommon |
| makiotoshi | Makiotoshi | 巻き落とし | twist | frontal | uncommon |
| tottari | Tottari | とったり | twist | frontal | uncommon |
| sabaori | Sabaori | 鯖折り | twist | frontal | uncommon |
| sotomuso | Sotomuso | 外無双 | twist | lateral | uncommon |
| uchimuso | Uchimuso | 内無双 | twist | lateral | uncommon |
| uwatehineri | Uwatehineri | 上手捻り | twist | lateral | uncommon |
| shitatehineri | Shitatehineri | 下手捻り | twist | lateral | uncommon |
| kotehineri | Kotehineri | 小手捻り | twist | frontal | rare |
| kainahineri | Kainahineri | 腕捻り | twist | frontal | rare |
| amiuchi | Amiuchi | 網打ち | twist | frontal | rare |
| kubihineri | Kubihineri | 首捻り | twist | lateral | rare |
| harimanage | Harimanage | 波離間投げ | twist | lateral | rare |
| osakate | Osakate | 大逆手 | twist | lateral | legendary |
| zubuneri | Zubuneri | ずぶねり | twist | frontal | legendary |
| gasshohineri | Gasshohineri | 合掌捻り | twist | lateral | legendary |
| tokkurinage | Tokkurinage | 徳利投げ | twist | lateral | legendary |
| sakatottari | Sakatottari | 逆とったり | twist | frontal | legendary |

---

## Sorite (6)
| id | en | ja | class | vector | tier |
|---|---|---|---|---|---|
| izori | Izori | 居反り | special | rear | legendary |
| kakezori | Kakezori | 掛け反り | special | rear | legendary |
| shumokuzori | Shumokuzori | 撞木反り | special | rear | legendary |
| sototasukizori | Sototasukizori | 外たすき反り | special | rear | legendary |
| tasukizori | Tasukizori | たすき反り | special | rear | legendary |
| tsutaezori | Tsutaezori | 伝え反り | special | rear | legendary |

---

## Tokushuwaza (19)
| id | en | ja | class | vector | tier |
|---|---|---|---|---|---|
| hatakikomi | Hatakikomi | 叩き込み | special | frontal | common |
| hikiotoshi | Hikiotoshi | 引き落とし | special | frontal | common |
| hikkake | Hikkake | 引っ掛け | special | lateral | uncommon |
| okuridashi | Okuridashi | 送り出し | rear | rear | common |
| okuritaoshi | Okuritaoshi | 送り倒し | rear | rear | uncommon |
| okurihikiotoshi | Okurihikiotoshi | 送り引き落とし | rear | rear | rare |
| okurinage | Okurinage | 送り投げ | rear | rear | rare |
| okurigake | Okurigake | 送り掛け | rear | rear | uncommon |
| okuritsuridashi | Okuritsuridashi | 送り吊り出し | lift | rear | rare |
| okuritsuriotoshi | Okuritsuriotoshi | 送り吊り落とし | lift | rear | rare |
| tsuridashi | Tsuridashi | 吊り出し | lift | frontal | uncommon |
| tsuriotoshi | Tsuriotoshi | 吊り落とし | lift | frontal | uncommon |
| kimedashi | Kimedashi | 極め出し | force_out | frontal | rare |
| kimetaoshi | Kimetaoshi | 極め倒し | special | frontal | rare |
| waridashi | Waridashi | 割り出し | force_out | lateral | rare |
| utchari | Utchari | うっちゃり | special | lateral | uncommon |
| yobimodoshi | Yobimodoshi | 呼び戻し | special | frontal | rare |
| ushiromotare | Ushiromotare | 後ろもたれ | rear | rear | rare |
| sokubiotoshi | Sokubiotoshi | 素首落とし | special | rear | rare |

---

# PART V — Winning Non-Techniques (Hiwaza)

| id | en | ja |
|---|---|---|
| fumidashi | Fumidashi | 踏み出し |
| isamiashi | Isamiashi | 勇み足 |
| koshikudake | Koshikudake | 腰砕け |
| tsukihiza | Tsukihiza | つきひざ |
| tsukite | Tsukite | つき手 |

---

# PART VI — Unified Bout Resolution Algorithm (Granular)

1. Compute tachiai impulse
2. Resolve stance dominance
3. Resolve grip availability
4. Enter momentum loop (ticks)
5. Filter kimarite by:
   - position
   - stance
   - grip
6. Apply tier multipliers
7. Apply style bias
8. Apply archetype bias
9. Apply favorite-move bias
10. Select winning kimarite deterministically
11. Emit BoutResult
12. Log to ledger

---

# PART VII — Source Preservation Annex (Verbatim)

## Combat Engine V3
```md
# Basho — Combat Engine V3 (Deterministic) Specification v1.0

Date: 2026-01-06  
Status: Canonical, verbose, implementation-ready  
Scope: This document defines **Combat Engine V3**, the deterministic bout-resolution engine used by Basho. It explains phases, inputs, outputs, weighting, counters, logging, and integration with rikishi evolution and kimarite systems.

---

## 1. Design Goals

Combat Engine V3 must:
- Produce **authentic sumo outcomes** with believable frequency
- Be **fully deterministic** under a seed
- Generate **structured logs** for narrative and analytics
- Integrate with:
  - Rikishi evolution (physique, skills, style, archetype)
  - Kimarite tier/style/archetype weighting
  - Fatigue, momentum, and injuries
- Remain **tunable without rewriting code**

---

## 2. Determinism Contract

Every bout outcome is derived from:
- World seed
- Bout seed (world seed + basho + day + match index + rikishi IDs)
- Current rikishi state (physique, skills, fatigue, injuries, style, archetype)
- No calls to `Date.now()` or unseeded randomness

**Same inputs → same bout, every time.**

---

## 3. High-Level Bout Flow

1. Tachiai phase
2. Clinch / grip resolution
3. Momentum ticks
4. Finisher window (kimarite selection)
5. Counter resolution (optional)
6. Result + structured logs

---

## 4. Phase 1 — Tachiai

### Purpose
Determine initial initiative and advantage.

### Inputs
- Power, speed, balance
- Mass differential
- Fatigue
- Momentum
- Archetype tachiai bias

### Outputs
- Initial advantage score
- Initiative holder
- Narrative log entry

---

## 5. Phase 2 — Clinch / Grip Battle

### Purpose
Determine stance and grip context.

### Possible stances
- push-dominant
- belt-dominant
- no-grip
- migi-yotsu
- hidari-yotsu

### Inputs
- Style (oshi/yotsu/hybrid)
- Technique and experience
- Grip preference
- Height and reach

### Outputs
- Stance
- Grip state
- Narrative log entry

---

## 6. Phase 3 — Momentum Ticks

### Purpose
Simulate mid-bout flow and volatility.

### Loop behavior
- Fatigue accumulates
- Advantage may shift
- Position may change:
  - frontal
  - lateral
  - rear

### Inputs
- Balance
- Experience
- Speed
- Fatigue
- Archetype counter bias

### Outputs
- Updated advantage
- Position
- Narrative log entries per tick

---

## 7. Phase 4 — Finisher Window (Kimarite Selection)

### Purpose
Select a plausible finishing technique.

### Steps
1. Filter kimarite registry by:
   - stance requirements
   - grip needs
   - position/vector constraints
2. Weight remaining kimarite using:
   - baseWeight
   - tier multiplier
   - style × tier shaping
   - stance bias
   - position bias
   - archetype class bias
   - favored kimarite bonus
3. Normalize and sample deterministically

**See separate Kimarite Tier / Style / Archetype spec for full math.**

---

## 8. Phase 5 — Counter Resolution

### Purpose
Allow defender to flip outcome.

### Counter probability influenced by:
- Balance
- Experience
- Fatigue difference
- Archetype counter bias
- Position

### If counter triggers
- Select defensive kimarite class subset
- Resolve counter deterministically
- Log counter event

---

## 9. Phase 6 — Result & Logging

### BoutResult includes
- Winner / loser IDs
- Final kimarite
- Duration (ticks)
- Stance history
- Position history
- Fatigue delta
- Injury checks (post-bout)

### Narrative Log Contract
Each log entry includes:
- phase
- description (human-readable)
- structured data payload for UI/analytics

---

## 10. Injury Checks (Post-Bout)

Injury risk derived from:
- Fatigue
- Mass
- Bout length
- Prior injuries
- Deterministic seed

Injuries are applied **after** the bout result.

---

## 11. Integration Points

Combat Engine V3 consumes:
- Rikishi evolution state
- Kimarite registry
- Style/archetype matrices

Combat Engine V3 produces:
- BoutResult
- Logs
- Fatigue deltas
- Injury events
- Momentum changes

---

## 12. Tunable Parameters (Non-Code)

Designers should be able to tune:
- Phase weightings
- Fatigue accumulation rates
- Counter frequency
- Tier/style/archetype multipliers
- Log verbosity

Without changing engine structure.

---

## 13. Why V3 Works

- Phased model matches real bout flow
- Determinism enables debugging and replay
- Registry-driven endings prevent hardcoding
- Evolution systems naturally express themselves through outcomes

---

## 14. Canon One-Liner

> **Combat Engine V3 resolves sumo bouts by simulating initiative, control, pressure, and opportunity — then selecting an authentic ending from the official kimarite space under deterministic rules.**

---

End of document.

```

## Kimarite Tier / Style / Archetype System
```md
# Basho — Kimarite Selection System v1.0
Date: 2026-01-06  
Scope: Canonical description of how **kimarite tiers**, **styles**, and **tactical archetypes** interact inside **Combat Engine V3 (Option A)**.

This document is written to be implementation-ready and tuning-friendly. It defines:
- what each layer means (tier vs style vs archetype),
- the exact weighting pipeline (order matters),
- default numeric tables (safe starting values),
- one single diagram of the selection funnel,
- a worked example.

---

## 1) Core idea

Kimarite selection is a deterministic, data-driven weighted choice over the **official 82 kimarite**.  
For each bout, the engine does **not** pick a “move animation” first. Instead it:

1. Determines the *state of the bout* (stance, position, grip context, fatigue, etc.)
2. Filters the kimarite registry to only those that are legal/plausible in that state
3. Weights the remaining options using layered multipliers
4. Samples deterministically (seeded RNG) to select the finishing kimarite
5. Resolves success vs counter (still deterministic), then emits logs

The system is designed to create:
- authenticity (common finishes dominate),
- identity (specialists drift toward signatures),
- variety (situational techniques appear in believable contexts),
- narrative “spikes” (rare/legendary moments exist, but stay rare).

---

## 2) Definitions: three layers that must not be merged

### 2.1 Kimarite Tier (Common / Uncommon / Rare / Legendary)
**Tier answers:** “How often does this technique show up in sumo at all?”  
It is **global plausibility**, independent of any individual rikishi.

Tier is the main “frequency ceiling” control:
- Common should dominate most bouts
- Legendary should remain highlight-only even for the best-fitting style/archetype

### 2.2 Style (oshi / yotsu / hybrid)
**Style answers:** “What does this rikishi’s body + training naturally support right now?”  
Style is a **technical comfort layer** derived from:
- physique deltas (mass, balance, speed)
- observed outcomes (kimarite distribution)
- grip success distribution (belt-dominant frequency)
- coaching emphasis (future)
- archetype as a *soft bias*, never a lock

Style changes slowly (recommended cadence: end of basho, with hysteresis).

### 2.3 Tactical Archetype (behavioral bias)
**Archetype answers:** “How does this rikishi choose actions under pressure?”  
Archetype is a **behavioral bias layer** that primarily affects:
- which *classes* of kimarite are preferred (force-out vs throw vs slap-pull)
- willingness to take volatility (risk appetite, counter windows)

Archetype does **not** magically grant technical ability.  
It amplifies tendencies after plausibility and comfort are established.

---

## 3) Single diagram: the selection funnel (order is canonical)

```
            ┌───────────────────────────────────────────┐
            │           Bout state is computed           │
            │ stance, position, grip context, fatigue... │
            └───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1) FILTER (hard gates)                                           │
│    - required stances                                            │
│    - gripNeed constraints                                        │
│    - position/vector constraints (frontal/lateral/rear)          │
│    - remove non-endings (forfeits unless explicitly allowed)     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2) BASE WEIGHT (per kimarite)                                    │
│    - intrinsic frequency within the 82 registry                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3) TIER MULTIPLIER (global plausibility ceiling)                 │
│    Common / Uncommon / Rare / Legendary                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4) STYLE MULTIPLIER (technical comfort)                          │
│    oshi / yotsu / hybrid × tier shaping                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5) STANCE + POSITION MULTIPLIERS (context bias)                  │
│    - stance biases classes                                       │
│    - position biases vectors                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6) ARCHETYPE CLASS MULTIPLIERS (behavioral bias)                 │
│    - affects kimarite classes (force-out/throw/slap/...)          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7) FAVORITES (tokui-waza)                                        │
│    - if kimarite in favoredKimarite[] apply bonus                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
            ┌───────────────────────────────────────────┐
            │ 8) Normalize weights and sample (seeded)   │
            └───────────────────────────────────────────┘
                              │
                              ▼
            ┌───────────────────────────────────────────┐
            │ 9) Counter resolution + final BoutResult   │
            └───────────────────────────────────────────┘
```

**Canonical rule:** tiers → style → stance/position → archetype → favorites (in that order).

---

## 4) Default numeric tables (safe starting values)

These tables are designed to:
- keep Common endings dominant,
- allow situational diversity,
- preserve “legendary” rarity,
- let favorites meaningfully emerge over a career.

### 4.1 Tier multipliers (global)
Apply after `baseWeight`.

| Tier | Multiplier |
|---|---:|
| Common | 1.00 |
| Uncommon | 0.55 |
| Rare | 0.20 |
| Legendary | 0.05 |

> Tuning note: if your sim feels too repetitive, raise **Uncommon** first (e.g., 0.55 → 0.65).  
Avoid raising Legendary early; it should stay “wow.”

### 4.2 Style × Tier shaping multipliers
Apply after Tier multipliers. This table shapes how styles distribute probability mass across tiers.

| Style → / Tier ↓ | Common | Uncommon | Rare | Legendary |
|---|---:|---:|---:|---:|
| **Oshi** | 1.15 | 0.90 | 0.60 | 0.30 |
| **Yotsu** | 1.15 | 1.05 | 0.80 | 0.40 |
| **Hybrid** | 1.10 | 1.00 | 0.90 | 0.50 |

Interpretation:
- **Oshi** compresses outcomes toward the center (bread-and-butter).
- **Yotsu** allows rare techniques more often (throws/twists emerge).
- **Hybrid** preserves optionality and increases “off-path” plausibility slightly.

### 4.3 Kimarite class multipliers by archetype (canonical Option A defaults)
These are *behavioral biases* and should be applied to the kimarite’s **class**.

| Archetype | force_out/push/thrust | throw/twist/lift | slap_pull | trip/evasion | rear | special |
|---|---:|---:|---:|---:|---:|---:|
| **Oshi Specialist** | 1.45 | 0.85 | 1.10 | 0.95 | 1.05 | 0.80 |
| **Yotsu Specialist** | 1.05 | 1.55 | 0.90 | 0.95 | 1.15 | 1.00 |
| **Speedster** | 1.05 | 0.90 | 1.20 | 1.60 | 1.10 | 0.95 |
| **Trickster** | 0.85 | 0.95 | 1.65 | 1.35 | 1.05 | 1.20 |
| **All‑Rounder** | 1.15 | 1.15 | 1.10 | 1.10 | 1.10 | 1.00 |

> Canon note: “rear” is mostly unlocked by **position**, so multipliers are modest here.

### 4.4 Stance → Class bias multipliers (canonical Option A defaults)
Stance is determined in the clinch/grip phase and biases which classes are plausible.

| Stance | force_out/push/thrust | throw/twist/lift | slap_pull | trip/evasion | rear |
|---|---:|---:|---:|---:|---:|
| **push-dominant** | 1.45 | 0.85 | 1.20 | 1.10 | 1.00 |
| **belt-dominant** | 0.95 | 1.55 | 0.90 | 1.00 | 1.10 |
| **migi-yotsu / hidari-yotsu** | 1.00 | 1.45 | 0.95 | 1.05 | 1.10 |
| **no-grip** | 1.05 | 0.65 | 1.30 | 1.20 | 0.80 |

### 4.5 Position → Vector bias multipliers (canonical Option A defaults)
Position is computed during momentum ticks.

| Position | frontal vector | lateral vector | rear vector |
|---|---:|---:|---:|
| **frontal** | 1.15 | 1.00 | 0.70 |
| **lateral** | 1.00 | 1.20 | 0.85 |
| **rear** | 0.80 | 0.95 | 2.25 |

### 4.6 Favorites (tokui-waza) multiplier
If the selected move is in attacker’s `favoredKimarite[]`:

| Condition | Multiplier |
|---|---:|
| kimarite ∈ favoredKimarite | 2.00 |
| otherwise | 1.00 |

This is the main mechanism that creates signature moves organically over time.

---

## 5) The full weight formula (implementation-ready)

For each candidate kimarite `k` after filtering:

```
weight(k) =
  baseWeight(k)
  * tierMult( tier(k) )
  * styleTierMult( style(attacker), tier(k) )
  * stanceClassMult( stance, class(k) )
  * positionVectorMult( position, vector(k) )
  * archetypeClassMult( archetype(attacker), class(k) )
  * favoriteMult( k in favoredKimarite )
  * rarityDampening(k)   // optional, if you keep a separate rarity scalar
```

Then normalize and sample deterministically.

**Determinism rule:** the same bout seed and same state produces the same selection.

---

## 6) Why tiers, style, and archetype are separate (the “no collapse” rule)

If you collapse these layers, you get pathological behavior:
- archetype overriding tier → Trickster spams legendary techniques
- style overriding plausibility → Oshi suddenly sukuinage-spams
- merging style+archetype → you lose the distinction between *body* and *behavior*

**Canonical one-liner:**
> Kimarite tiers define global plausibility, styles define technical comfort, and archetypes define behavioral bias — in that order, and never as substitutes for one another.

---

## 7) Worked example (numbers you can sanity-check)

Scenario:
- Candidate kimarite: **kotenage**
- baseWeight(kotenage) = 1.0 (example)
- tier(kotenage) = Uncommon
- attacker style = Yotsu
- attacker archetype = Yotsu Specialist
- stance = belt-dominant
- position = frontal
- kotenage class = throw/twist/lift
- vector = frontal
- kotenage is in favoredKimarite[] (yes)

Compute:

- tierMult(Uncommon) = 0.55
- styleTierMult(Yotsu, Uncommon) = 1.05
- stanceClassMult(belt-dominant, throw/twist/lift) = 1.55
- positionVectorMult(frontal, frontal) = 1.15
- archetypeClassMult(Yotsu Specialist, throw/twist/lift) = 1.55
- favoriteMult = 2.0

So:

`weight = 1.0 * 0.55 * 1.05 * 1.55 * 1.15 * 1.55 * 2.0`

= 0.55 * 1.05 = 0.5775  
0.5775 * 1.55 = 0.8951  
0.8951 * 1.15 = 1.0294  
1.0294 * 1.55 = 1.5956  
1.5956 * 2.0 = **3.1912**

Interpretation:
- Even though kotenage is “Uncommon,” the correct style/stance/archetype plus favorites make it very viable.
- This is exactly how signature techniques become common **for the right rikishi** without breaking global plausibility.

---

## 8) Practical tuning guidance (what to change first)

If you see… | Change…
---|---
Too repetitive | Increase Uncommon tier (0.55 → 0.60–0.70)
Too many weird finishes | Reduce Rare and Legendary (Rare 0.20 → 0.15; Legendary 0.05 → 0.03)
Styles feel indistinct | Increase style-tier separation (e.g., Oshi Rare 0.60 → 0.50; Yotsu Rare 0.80 → 0.90)
Archetypes feel weak | Slightly widen archetype multipliers (±0.05–0.10), not tiers
Favorites feel meaningless | Increase favorites (2.0 → 2.3) **only after** tier/style are stable

---

## 9) Deliverables this document assumes exist elsewhere

This document assumes:
- a correct 82-kimarite registry with fields:
  - `id`, `displayName`, `class`, `tier`, `requiredStances`, `gripNeed`, `vector`
  - `baseWeight`
- the canonical stance and position determination from Combat Engine V3
- favored kimarite tracking (tokui-waza) in the rikishi model

---

End of document.

```

```


---

## SOURCE — Basho_Combat_and_Kimarite_Canon_v1.2_Physics_Informed_Extensions.md

```md

# Basho — Combat & Kimarite Resolution Canon v1.1
## Ultra-Granular, Implementation-Grade Specification (Bout System Only)

Status: **DEFINITIVE**
Scope lock: **Combat, Kimarite, Bout Resolution, and Narrative Emission only**

This document replaces v1.0 and is intentionally:
- larger than its source documents
- non-lossy
- explicit down to data-field and resolution-order level

---

# PART I — HARD DESIGN LAWS (COMBAT SCOPE)

## 1. Determinism
Every bout outcome is a pure function of:
- WorldSeed
- BoutSeed = hash(WorldSeed, BashoId, Day, BoutIndex, RikishiAId, RikishiBId)
- Immutable rikishi state snapshots at bout start

No RNG calls outside seeded resolution.
No floating nondeterminism.
No animation-driven variance.

## 2. Separation of Concerns
- Combat Engine produces **facts**
- Narrative/PBP consumes facts
- Narrative NEVER feeds back into resolution

---

# PART II — COMBAT ENGINE V3 (VERBATIM + BINDING)

# Basho — Combat Engine V3 (Deterministic) Specification v1.0

Date: 2026-01-06  
Status: Canonical, verbose, implementation-ready  
Scope: This document defines **Combat Engine V3**, the deterministic bout-resolution engine used by Basho. It explains phases, inputs, outputs, weighting, counters, logging, and integration with rikishi evolution and kimarite systems.

---

## 1. Design Goals

Combat Engine V3 must:
- Produce **authentic sumo outcomes** with believable frequency
- Be **fully deterministic** under a seed
- Generate **structured logs** for narrative and analytics
- Integrate with:
  - Rikishi evolution (physique, skills, style, archetype)
  - Kimarite tier/style/archetype weighting
  - Fatigue, momentum, and injuries
- Remain **tunable without rewriting code**

---

## 2. Determinism Contract

Every bout outcome is derived from:
- World seed
- Bout seed (world seed + basho + day + match index + rikishi IDs)
- Current rikishi state (physique, skills, fatigue, injuries, style, archetype)
- No calls to `Date.now()` or unseeded randomness

**Same inputs → same bout, every time.**

---

## 3. High-Level Bout Flow

1. Tachiai phase
2. Clinch / grip resolution
3. Momentum ticks
4. Finisher window (kimarite selection)
5. Counter resolution (optional)
6. Result + structured logs

---

## 4. Phase 1 — Tachiai

### Purpose
Determine initial initiative and advantage.

### Inputs
- Power, speed, balance
- Mass differential
- Fatigue
- Momentum
- Archetype tachiai bias

### Outputs
- Initial advantage score
- Initiative holder
- Narrative log entry

---

## 5. Phase 2 — Clinch / Grip Battle

### Purpose
Determine stance and grip context.

### Possible stances
- push-dominant
- belt-dominant
- no-grip
- migi-yotsu
- hidari-yotsu

### Inputs
- Style (oshi/yotsu/hybrid)
- Technique and experience
- Grip preference
- Height and reach

### Outputs
- Stance
- Grip state
- Narrative log entry

---

## 6. Phase 3 — Momentum Ticks

### Purpose
Simulate mid-bout flow and volatility.

### Loop behavior
- Fatigue accumulates
- Advantage may shift
- Position may change:
  - frontal
  - lateral
  - rear

### Inputs
- Balance
- Experience
- Speed
- Fatigue
- Archetype counter bias

### Outputs
- Updated advantage
- Position
- Narrative log entries per tick

---

## 7. Phase 4 — Finisher Window (Kimarite Selection)

### Purpose
Select a plausible finishing technique.

### Steps
1. Filter kimarite registry by:
   - stance requirements
   - grip needs
   - position/vector constraints
2. Weight remaining kimarite using:
   - baseWeight
   - tier multiplier
   - style × tier shaping
   - stance bias
   - position bias
   - archetype class bias
   - favored kimarite bonus
3. Normalize and sample deterministically

**See separate Kimarite Tier / Style / Archetype spec for full math.**

---

## 8. Phase 5 — Counter Resolution

### Purpose
Allow defender to flip outcome.

### Counter probability influenced by:
- Balance
- Experience
- Fatigue difference
- Archetype counter bias
- Position

### If counter triggers
- Select defensive kimarite class subset
- Resolve counter deterministically
- Log counter event

---

## 9. Phase 6 — Result & Logging

### BoutResult includes
- Winner / loser IDs
- Final kimarite
- Duration (ticks)
- Stance history
- Position history
- Fatigue delta
- Injury checks (post-bout)

### Narrative Log Contract
Each log entry includes:
- phase
- description (human-readable)
- structured data payload for UI/analytics

---

## 10. Injury Checks (Post-Bout)

Injury risk derived from:
- Fatigue
- Mass
- Bout length
- Prior injuries
- Deterministic seed

Injuries are applied **after** the bout result.

---

## 11. Integration Points

Combat Engine V3 consumes:
- Rikishi evolution state
- Kimarite registry
- Style/archetype matrices

Combat Engine V3 produces:
- BoutResult
- Logs
- Fatigue deltas
- Injury events
- Momentum changes

---

## 12. Tunable Parameters (Non-Code)

Designers should be able to tune:
- Phase weightings
- Fatigue accumulation rates
- Counter frequency
- Tier/style/archetype multipliers
- Log verbosity

Without changing engine structure.

---

## 13. Why V3 Works

- Phased model matches real bout flow
- Determinism enables debugging and replay
- Registry-driven endings prevent hardcoding
- Evolution systems naturally express themselves through outcomes

---

## 14. Canon One-Liner

> **Combat Engine V3 resolves sumo bouts by simulating initiative, control, pressure, and opportunity — then selecting an authentic ending from the official kimarite space under deterministic rules.**

---

End of document.


---

# PART III — KIMARITE SYSTEM (VERBATIM + BINDING)

# Basho — Kimarite Selection System v1.0
Date: 2026-01-06  
Scope: Canonical description of how **kimarite tiers**, **styles**, and **tactical archetypes** interact inside **Combat Engine V3 (Option A)**.

This document is written to be implementation-ready and tuning-friendly. It defines:
- what each layer means (tier vs style vs archetype),
- the exact weighting pipeline (order matters),
- default numeric tables (safe starting values),
- one single diagram of the selection funnel,
- a worked example.

---

## 1) Core idea

Kimarite selection is a deterministic, data-driven weighted choice over the **official 82 kimarite**.  
For each bout, the engine does **not** pick a “move animation” first. Instead it:

1. Determines the *state of the bout* (stance, position, grip context, fatigue, etc.)
2. Filters the kimarite registry to only those that are legal/plausible in that state
3. Weights the remaining options using layered multipliers
4. Samples deterministically (seeded RNG) to select the finishing kimarite
5. Resolves success vs counter (still deterministic), then emits logs

The system is designed to create:
- authenticity (common finishes dominate),
- identity (specialists drift toward signatures),
- variety (situational techniques appear in believable contexts),
- narrative “spikes” (rare/legendary moments exist, but stay rare).

---

## 2) Definitions: three layers that must not be merged

### 2.1 Kimarite Tier (Common / Uncommon / Rare / Legendary)
**Tier answers:** “How often does this technique show up in sumo at all?”  
It is **global plausibility**, independent of any individual rikishi.

Tier is the main “frequency ceiling” control:
- Common should dominate most bouts
- Legendary should remain highlight-only even for the best-fitting style/archetype

### 2.2 Style (oshi / yotsu / hybrid)
**Style answers:** “What does this rikishi’s body + training naturally support right now?”  
Style is a **technical comfort layer** derived from:
- physique deltas (mass, balance, speed)
- observed outcomes (kimarite distribution)
- grip success distribution (belt-dominant frequency)
- coaching emphasis (future)
- archetype as a *soft bias*, never a lock

Style changes slowly (recommended cadence: end of basho, with hysteresis).

### 2.3 Tactical Archetype (behavioral bias)
**Archetype answers:** “How does this rikishi choose actions under pressure?”  
Archetype is a **behavioral bias layer** that primarily affects:
- which *classes* of kimarite are preferred (force-out vs throw vs slap-pull)
- willingness to take volatility (risk appetite, counter windows)

Archetype does **not** magically grant technical ability.  
It amplifies tendencies after plausibility and comfort are established.

---

## 3) Single diagram: the selection funnel (order is canonical)

```
            ┌───────────────────────────────────────────┐
            │           Bout state is computed           │
            │ stance, position, grip context, fatigue... │
            └───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1) FILTER (hard gates)                                           │
│    - required stances                                            │
│    - gripNeed constraints                                        │
│    - position/vector constraints (frontal/lateral/rear)          │
│    - remove non-endings (forfeits unless explicitly allowed)     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2) BASE WEIGHT (per kimarite)                                    │
│    - intrinsic frequency within the 82 registry                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3) TIER MULTIPLIER (global plausibility ceiling)                 │
│    Common / Uncommon / Rare / Legendary                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4) STYLE MULTIPLIER (technical comfort)                          │
│    oshi / yotsu / hybrid × tier shaping                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5) STANCE + POSITION MULTIPLIERS (context bias)                  │
│    - stance biases classes                                       │
│    - position biases vectors                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6) ARCHETYPE CLASS MULTIPLIERS (behavioral bias)                 │
│    - affects kimarite classes (force-out/throw/slap/...)          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7) FAVORITES (tokui-waza)                                        │
│    - if kimarite in favoredKimarite[] apply bonus                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
            ┌───────────────────────────────────────────┐
            │ 8) Normalize weights and sample (seeded)   │
            └───────────────────────────────────────────┘
                              │
                              ▼
            ┌───────────────────────────────────────────┐
            │ 9) Counter resolution + final BoutResult   │
            └───────────────────────────────────────────┘
```

**Canonical rule:** tiers → style → stance/position → archetype → favorites (in that order).

---

## 4) Default numeric tables (safe starting values)

These tables are designed to:
- keep Common endings dominant,
- allow situational diversity,
- preserve “legendary” rarity,
- let favorites meaningfully emerge over a career.

### 4.1 Tier multipliers (global)
Apply after `baseWeight`.

| Tier | Multiplier |
|---|---:|
| Common | 1.00 |
| Uncommon | 0.55 |
| Rare | 0.20 |
| Legendary | 0.05 |

> Tuning note: if your sim feels too repetitive, raise **Uncommon** first (e.g., 0.55 → 0.65).  
Avoid raising Legendary early; it should stay “wow.”

### 4.2 Style × Tier shaping multipliers
Apply after Tier multipliers. This table shapes how styles distribute probability mass across tiers.

| Style → / Tier ↓ | Common | Uncommon | Rare | Legendary |
|---|---:|---:|---:|---:|
| **Oshi** | 1.15 | 0.90 | 0.60 | 0.30 |
| **Yotsu** | 1.15 | 1.05 | 0.80 | 0.40 |
| **Hybrid** | 1.10 | 1.00 | 0.90 | 0.50 |

Interpretation:
- **Oshi** compresses outcomes toward the center (bread-and-butter).
- **Yotsu** allows rare techniques more often (throws/twists emerge).
- **Hybrid** preserves optionality and increases “off-path” plausibility slightly.

### 4.3 Kimarite class multipliers by archetype (canonical Option A defaults)
These are *behavioral biases* and should be applied to the kimarite’s **class**.

| Archetype | force_out/push/thrust | throw/twist/lift | slap_pull | trip/evasion | rear | special |
|---|---:|---:|---:|---:|---:|---:|
| **Oshi Specialist** | 1.45 | 0.85 | 1.10 | 0.95 | 1.05 | 0.80 |
| **Yotsu Specialist** | 1.05 | 1.55 | 0.90 | 0.95 | 1.15 | 1.00 |
| **Speedster** | 1.05 | 0.90 | 1.20 | 1.60 | 1.10 | 0.95 |
| **Trickster** | 0.85 | 0.95 | 1.65 | 1.35 | 1.05 | 1.20 |
| **All‑Rounder** | 1.15 | 1.15 | 1.10 | 1.10 | 1.10 | 1.00 |

> Canon note: “rear” is mostly unlocked by **position**, so multipliers are modest here.

### 4.4 Stance → Class bias multipliers (canonical Option A defaults)
Stance is determined in the clinch/grip phase and biases which classes are plausible.

| Stance | force_out/push/thrust | throw/twist/lift | slap_pull | trip/evasion | rear |
|---|---:|---:|---:|---:|---:|
| **push-dominant** | 1.45 | 0.85 | 1.20 | 1.10 | 1.00 |
| **belt-dominant** | 0.95 | 1.55 | 0.90 | 1.00 | 1.10 |
| **migi-yotsu / hidari-yotsu** | 1.00 | 1.45 | 0.95 | 1.05 | 1.10 |
| **no-grip** | 1.05 | 0.65 | 1.30 | 1.20 | 0.80 |

### 4.5 Position → Vector bias multipliers (canonical Option A defaults)
Position is computed during momentum ticks.

| Position | frontal vector | lateral vector | rear vector |
|---|---:|---:|---:|
| **frontal** | 1.15 | 1.00 | 0.70 |
| **lateral** | 1.00 | 1.20 | 0.85 |
| **rear** | 0.80 | 0.95 | 2.25 |

### 4.6 Favorites (tokui-waza) multiplier
If the selected move is in attacker’s `favoredKimarite[]`:

| Condition | Multiplier |
|---|---:|
| kimarite ∈ favoredKimarite | 2.00 |
| otherwise | 1.00 |

This is the main mechanism that creates signature moves organically over time.

---

## 5) The full weight formula (implementation-ready)

For each candidate kimarite `k` after filtering:

```
weight(k) =
  baseWeight(k)
  * tierMult( tier(k) )
  * styleTierMult( style(attacker), tier(k) )
  * stanceClassMult( stance, class(k) )
  * positionVectorMult( position, vector(k) )
  * archetypeClassMult( archetype(attacker), class(k) )
  * favoriteMult( k in favoredKimarite )
  * rarityDampening(k)   // optional, if you keep a separate rarity scalar
```

Then normalize and sample deterministically.

**Determinism rule:** the same bout seed and same state produces the same selection.

---

## 6) Why tiers, style, and archetype are separate (the “no collapse” rule)

If you collapse these layers, you get pathological behavior:
- archetype overriding tier → Trickster spams legendary techniques
- style overriding plausibility → Oshi suddenly sukuinage-spams
- merging style+archetype → you lose the distinction between *body* and *behavior*

**Canonical one-liner:**
> Kimarite tiers define global plausibility, styles define technical comfort, and archetypes define behavioral bias — in that order, and never as substitutes for one another.

---

## 7) Worked example (numbers you can sanity-check)

Scenario:
- Candidate kimarite: **kotenage**
- baseWeight(kotenage) = 1.0 (example)
- tier(kotenage) = Uncommon
- attacker style = Yotsu
- attacker archetype = Yotsu Specialist
- stance = belt-dominant
- position = frontal
- kotenage class = throw/twist/lift
- vector = frontal
- kotenage is in favoredKimarite[] (yes)

Compute:

- tierMult(Uncommon) = 0.55
- styleTierMult(Yotsu, Uncommon) = 1.05
- stanceClassMult(belt-dominant, throw/twist/lift) = 1.55
- positionVectorMult(frontal, frontal) = 1.15
- archetypeClassMult(Yotsu Specialist, throw/twist/lift) = 1.55
- favoriteMult = 2.0

So:

`weight = 1.0 * 0.55 * 1.05 * 1.55 * 1.15 * 1.55 * 2.0`

= 0.55 * 1.05 = 0.5775  
0.5775 * 1.55 = 0.8951  
0.8951 * 1.15 = 1.0294  
1.0294 * 1.55 = 1.5956  
1.5956 * 2.0 = **3.1912**

Interpretation:
- Even though kotenage is “Uncommon,” the correct style/stance/archetype plus favorites make it very viable.
- This is exactly how signature techniques become common **for the right rikishi** without breaking global plausibility.

---

## 8) Practical tuning guidance (what to change first)

If you see… | Change…
---|---
Too repetitive | Increase Uncommon tier (0.55 → 0.60–0.70)
Too many weird finishes | Reduce Rare and Legendary (Rare 0.20 → 0.15; Legendary 0.05 → 0.03)
Styles feel indistinct | Increase style-tier separation (e.g., Oshi Rare 0.60 → 0.50; Yotsu Rare 0.80 → 0.90)
Archetypes feel weak | Slightly widen archetype multipliers (±0.05–0.10), not tiers
Favorites feel meaningless | Increase favorites (2.0 → 2.3) **only after** tier/style are stable

---

## 9) Deliverables this document assumes exist elsewhere

This document assumes:
- a correct 82-kimarite registry with fields:
  - `id`, `displayName`, `class`, `tier`, `requiredStances`, `gripNeed`, `vector`
  - `baseWeight`
- the canonical stance and position determination from Combat Engine V3
- favored kimarite tracking (tokui-waza) in the rikishi model

---

End of document.


---

# PART IV — OFFICIAL 82 KIMARITE REGISTRY (INLINE, CANONICAL)

This registry is **binding engine data**, not reference material.

## Tier Definitions (Simulation)
- Common: bread-and-butter, majority of bouts
- Uncommon: situational but believable
- Rare: specialist or positional edge
- Legendary: highlight-only, extreme rarity

Tier multipliers:
- Common: 1.00
- Uncommon: 0.55
- Rare: 0.20
- Legendary: 0.05

---

## Kihonwaza (7)

| id | en | ja | class | vector | tier |
|---|---|---|---|---|---|
| yorikiri | Yorikiri | 寄り切り | force_out | frontal | common |
| yoritaoshi | Yoritaoshi | 寄り倒し | force_out | frontal | common |
| oshidashi | Oshidashi | 押し出し | push | frontal | common |
| oshitaoshi | Oshitaoshi | 押し倒し | push | frontal | common |
| tsukidashi | Tsukidashi | 突き出し | push | frontal | common |
| tsukitaoshi | Tsukitaoshi | 突き倒し | push | frontal | common |
| abisetaoshi | Abisetaoshi | 浴せ倒し | force_out | frontal | uncommon |

---

## Nagete (13)

| id | en | ja | class | vector | tier |
|---|---|---|---|---|---|
| uwatenage | Uwatenage | 上手投げ | throw | lateral | common |
| shitatenage | Shitatenage | 下手投げ | throw | lateral | common |
| uwatedashinage | Uwatedashinage | 上手出し投げ | throw | lateral | uncommon |
| shitatedashinage | Shitatedashinage | 下手出し投げ | throw | lateral | uncommon |
| kotenage | Kotenage | 小手投げ | throw | lateral | common |
| sukuinage | Sukuinage | 掬い投げ | throw | lateral | common |
| kubinage | Kubinage | 首投げ | throw | lateral | uncommon |
| kakenage | Kakenage | 掛け投げ | throw | lateral | uncommon |
| koshinage | Koshinage | 腰投げ | throw | lateral | rare |
| tsukaminage | Tsukaminage | つかみ投げ | throw | lateral | uncommon |
| nichonage | Nichonage | 二丁投げ | throw | lateral | rare |
| yaguranage | Yaguranage | 櫓投げ | throw | lateral | legendary |
| ipponzeoi | Ipponzeoi | 一本背負い | throw | lateral | legendary |

---

## Kakete (18)
| id | en | ja | class | vector | tier |
|---|---|---|---|---|---|
| sotogake | Sotogake | 外掛け | trip | lateral | uncommon |
| uchigake | Uchigake | 内掛け | trip | lateral | uncommon |
| kekaeshi | Kekaeshi | 蹴返し | trip | frontal | uncommon |
| ketaguri | Ketaguri | 蹴手繰り | trip | frontal | uncommon |
| ashitori | Ashitori | 足取り | trip | frontal | rare |
| komatasukui | Komatasukui | 小股掬い | trip | lateral | rare |
| kirikaeshi | Kirikaeshi | 切り返し | trip | lateral | rare |
| kozumatori | Kozumatori | 小褄取り | trip | frontal | rare |
| susotori | Susotori | 裾取り | trip | frontal | rare |
| susoharai | Susoharai | 裾払い | trip | lateral | rare |
| sotokomata | Sotokomata | 外小股 | trip | lateral | rare |
| chongake | Chongake | ちょん掛け | trip | lateral | rare |
| omata | Omata | 大股 | trip | lateral | rare |
| tsumatori | Tsumatori | 褄取り | trip | frontal | rare |
| watashikomi | Watashikomi | 渡し込み | trip | frontal | legendary |
| kawazugake | Kawazugake | 河津掛け | trip | lateral | legendary |
| mitokorozeme | Mitokorozeme | 三所攻め | trip | lateral | legendary |
| nimaigeri | Nimaigeri | 二枚蹴り | trip | frontal | legendary |

---

## Hinerite (19)
| id | en | ja | class | vector | tier |
|---|---|---|---|---|---|
| tsukiotoshi | Tsukiotoshi | 突き落とし | twist | frontal | common |
| katasukashi | Katasukashi | 肩透かし | twist | frontal | uncommon |
| makiotoshi | Makiotoshi | 巻き落とし | twist | frontal | uncommon |
| tottari | Tottari | とったり | twist | frontal | uncommon |
| sabaori | Sabaori | 鯖折り | twist | frontal | uncommon |
| sotomuso | Sotomuso | 外無双 | twist | lateral | uncommon |
| uchimuso | Uchimuso | 内無双 | twist | lateral | uncommon |
| uwatehineri | Uwatehineri | 上手捻り | twist | lateral | uncommon |
| shitatehineri | Shitatehineri | 下手捻り | twist | lateral | uncommon |
| kotehineri | Kotehineri | 小手捻り | twist | frontal | rare |
| kainahineri | Kainahineri | 腕捻り | twist | frontal | rare |
| amiuchi | Amiuchi | 網打ち | twist | frontal | rare |
| kubihineri | Kubihineri | 首捻り | twist | lateral | rare |
| harimanage | Harimanage | 波離間投げ | twist | lateral | rare |
| osakate | Osakate | 大逆手 | twist | lateral | legendary |
| zubuneri | Zubuneri | ずぶねり | twist | frontal | legendary |
| gasshohineri | Gasshohineri | 合掌捻り | twist | lateral | legendary |
| tokkurinage | Tokkurinage | 徳利投げ | twist | lateral | legendary |
| sakatottari | Sakatottari | 逆とったり | twist | frontal | legendary |

---

## Sorite (6)
| id | en | ja | class | vector | tier |
|---|---|---|---|---|---|
| izori | Izori | 居反り | special | rear | legendary |
| kakezori | Kakezori | 掛け反り | special | rear | legendary |
| shumokuzori | Shumokuzori | 撞木反り | special | rear | legendary |
| sototasukizori | Sototasukizori | 外たすき反り | special | rear | legendary |
| tasukizori | Tasukizori | たすき反り | special | rear | legendary |
| tsutaezori | Tsutaezori | 伝え反り | special | rear | legendary |

---

## Tokushuwaza (19)
| id | en | ja | class | vector | tier |
|---|---|---|---|---|---|
| hatakikomi | Hatakikomi | 叩き込み | special | frontal | common |
| hikiotoshi | Hikiotoshi | 引き落とし | special | frontal | common |
| hikkake | Hikkake | 引っ掛け | special | lateral | uncommon |
| okuridashi | Okuridashi | 送り出し | rear | rear | common |
| okuritaoshi | Okuritaoshi | 送り倒し | rear | rear | uncommon |
| okurihikiotoshi | Okurihikiotoshi | 送り引き落とし | rear | rear | rare |
| okurinage | Okurinage | 送り投げ | rear | rear | rare |
| okurigake | Okurigake | 送り掛け | rear | rear | uncommon |
| okuritsuridashi | Okuritsuridashi | 送り吊り出し | lift | rear | rare |
| okuritsuriotoshi | Okuritsuriotoshi | 送り吊り落とし | lift | rear | rare |
| tsuridashi | Tsuridashi | 吊り出し | lift | frontal | uncommon |
| tsuriotoshi | Tsuriotoshi | 吊り落とし | lift | frontal | uncommon |
| kimedashi | Kimedashi | 極め出し | force_out | frontal | rare |
| kimetaoshi | Kimetaoshi | 極め倒し | special | frontal | rare |
| waridashi | Waridashi | 割り出し | force_out | lateral | rare |
| utchari | Utchari | うっちゃり | special | lateral | uncommon |
| yobimodoshi | Yobimodoshi | 呼び戻し | special | frontal | rare |
| ushiromotare | Ushiromotare | 後ろもたれ | rear | rear | rare |
| sokubiotoshi | Sokubiotoshi | 素首落とし | special | rear | rare |

---

# PART V — Winning Non-Techniques (Hiwaza)

| id | en | ja |
|---|---|---|
| fumidashi | Fumidashi | 踏み出し |
| isamiashi | Isamiashi | 勇み足 |
| koshikudake | Koshikudake | 腰砕け |
| tsukihiza | Tsukihiza | つきひざ |
| tsukite | Tsukite | つき手 |

---

# PART VI — Unified Bout Resolution Algorithm (Granular)

1. Compute tachiai impulse
2. Resolve stance dominance
3. Resolve grip availability
4. Enter momentum loop (ticks)
5. Filter kimarite by:
   - position
   - stance
   - grip
6. Apply tier multipliers
7. Apply style bias
8. Apply archetype bias
9. Apply favorite-move bias
10. Select winning kimarite deterministically
11. Emit BoutResult
12. Log to ledger

---

# PART VII — Source Preservation Annex (Verbatim)

## Combat Engine V3
```md
# Basho — Combat Engine V3 (Deterministic) Specification v1.0

Date: 2026-01-06  
Status: Canonical, verbose, implementation-ready  
Scope: This document defines **Combat Engine V3**, the deterministic bout-resolution engine used by Basho. It explains phases, inputs, outputs, weighting, counters, logging, and integration with rikishi evolution and kimarite systems.

---

## 1. Design Goals

Combat Engine V3 must:
- Produce **authentic sumo outcomes** with believable frequency
- Be **fully deterministic** under a seed
- Generate **structured logs** for narrative and analytics
- Integrate with:
  - Rikishi evolution (physique, skills, style, archetype)
  - Kimarite tier/style/archetype weighting
  - Fatigue, momentum, and injuries
- Remain **tunable without rewriting code**

---

## 2. Determinism Contract

Every bout outcome is derived from:
- World seed
- Bout seed (world seed + basho + day + match index + rikishi IDs)
- Current rikishi state (physique, skills, fatigue, injuries, style, archetype)
- No calls to `Date.now()` or unseeded randomness

**Same inputs → same bout, every time.**

---

## 3. High-Level Bout Flow

1. Tachiai phase
2. Clinch / grip resolution
3. Momentum ticks
4. Finisher window (kimarite selection)
5. Counter resolution (optional)
6. Result + structured logs

---

## 4. Phase 1 — Tachiai

### Purpose
Determine initial initiative and advantage.

### Inputs
- Power, speed, balance
- Mass differential
- Fatigue
- Momentum
- Archetype tachiai bias

### Outputs
- Initial advantage score
- Initiative holder
- Narrative log entry

---

## 5. Phase 2 — Clinch / Grip Battle

### Purpose
Determine stance and grip context.

### Possible stances
- push-dominant
- belt-dominant
- no-grip
- migi-yotsu
- hidari-yotsu

### Inputs
- Style (oshi/yotsu/hybrid)
- Technique and experience
- Grip preference
- Height and reach

### Outputs
- Stance
- Grip state
- Narrative log entry

---

## 6. Phase 3 — Momentum Ticks

### Purpose
Simulate mid-bout flow and volatility.

### Loop behavior
- Fatigue accumulates
- Advantage may shift
- Position may change:
  - frontal
  - lateral
  - rear

### Inputs
- Balance
- Experience
- Speed
- Fatigue
- Archetype counter bias

### Outputs
- Updated advantage
- Position
- Narrative log entries per tick

---

## 7. Phase 4 — Finisher Window (Kimarite Selection)

### Purpose
Select a plausible finishing technique.

### Steps
1. Filter kimarite registry by:
   - stance requirements
   - grip needs
   - position/vector constraints
2. Weight remaining kimarite using:
   - baseWeight
   - tier multiplier
   - style × tier shaping
   - stance bias
   - position bias
   - archetype class bias
   - favored kimarite bonus
3. Normalize and sample deterministically

**See separate Kimarite Tier / Style / Archetype spec for full math.**

---

## 8. Phase 5 — Counter Resolution

### Purpose
Allow defender to flip outcome.

### Counter probability influenced by:
- Balance
- Experience
- Fatigue difference
- Archetype counter bias
- Position

### If counter triggers
- Select defensive kimarite class subset
- Resolve counter deterministically
- Log counter event

---

## 9. Phase 6 — Result & Logging

### BoutResult includes
- Winner / loser IDs
- Final kimarite
- Duration (ticks)
- Stance history
- Position history
- Fatigue delta
- Injury checks (post-bout)

### Narrative Log Contract
Each log entry includes:
- phase
- description (human-readable)
- structured data payload for UI/analytics

---

## 10. Injury Checks (Post-Bout)

Injury risk derived from:
- Fatigue
- Mass
- Bout length
- Prior injuries
- Deterministic seed

Injuries are applied **after** the bout result.

---

## 11. Integration Points

Combat Engine V3 consumes:
- Rikishi evolution state
- Kimarite registry
- Style/archetype matrices

Combat Engine V3 produces:
- BoutResult
- Logs
- Fatigue deltas
- Injury events
- Momentum changes

---

## 12. Tunable Parameters (Non-Code)

Designers should be able to tune:
- Phase weightings
- Fatigue accumulation rates
- Counter frequency
- Tier/style/archetype multipliers
- Log verbosity

Without changing engine structure.

---

## 13. Why V3 Works

- Phased model matches real bout flow
- Determinism enables debugging and replay
- Registry-driven endings prevent hardcoding
- Evolution systems naturally express themselves through outcomes

---

## 14. Canon One-Liner

> **Combat Engine V3 resolves sumo bouts by simulating initiative, control, pressure, and opportunity — then selecting an authentic ending from the official kimarite space under deterministic rules.**

---

End of document.

```

## Kimarite Tier / Style / Archetype System
```md
# Basho — Kimarite Selection System v1.0
Date: 2026-01-06  
Scope: Canonical description of how **kimarite tiers**, **styles**, and **tactical archetypes** interact inside **Combat Engine V3 (Option A)**.

This document is written to be implementation-ready and tuning-friendly. It defines:
- what each layer means (tier vs style vs archetype),
- the exact weighting pipeline (order matters),
- default numeric tables (safe starting values),
- one single diagram of the selection funnel,
- a worked example.

---

## 1) Core idea

Kimarite selection is a deterministic, data-driven weighted choice over the **official 82 kimarite**.  
For each bout, the engine does **not** pick a “move animation” first. Instead it:

1. Determines the *state of the bout* (stance, position, grip context, fatigue, etc.)
2. Filters the kimarite registry to only those that are legal/plausible in that state
3. Weights the remaining options using layered multipliers
4. Samples deterministically (seeded RNG) to select the finishing kimarite
5. Resolves success vs counter (still deterministic), then emits logs

The system is designed to create:
- authenticity (common finishes dominate),
- identity (specialists drift toward signatures),
- variety (situational techniques appear in believable contexts),
- narrative “spikes” (rare/legendary moments exist, but stay rare).

---

## 2) Definitions: three layers that must not be merged

### 2.1 Kimarite Tier (Common / Uncommon / Rare / Legendary)
**Tier answers:** “How often does this technique show up in sumo at all?”  
It is **global plausibility**, independent of any individual rikishi.

Tier is the main “frequency ceiling” control:
- Common should dominate most bouts
- Legendary should remain highlight-only even for the best-fitting style/archetype

### 2.2 Style (oshi / yotsu / hybrid)
**Style answers:** “What does this rikishi’s body + training naturally support right now?”  
Style is a **technical comfort layer** derived from:
- physique deltas (mass, balance, speed)
- observed outcomes (kimarite distribution)
- grip success distribution (belt-dominant frequency)
- coaching emphasis (future)
- archetype as a *soft bias*, never a lock

Style changes slowly (recommended cadence: end of basho, with hysteresis).

### 2.3 Tactical Archetype (behavioral bias)
**Archetype answers:** “How does this rikishi choose actions under pressure?”  
Archetype is a **behavioral bias layer** that primarily affects:
- which *classes* of kimarite are preferred (force-out vs throw vs slap-pull)
- willingness to take volatility (risk appetite, counter windows)

Archetype does **not** magically grant technical ability.  
It amplifies tendencies after plausibility and comfort are established.

---

## 3) Single diagram: the selection funnel (order is canonical)

```
            ┌───────────────────────────────────────────┐
            │           Bout state is computed           │
            │ stance, position, grip context, fatigue... │
            └───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1) FILTER (hard gates)                                           │
│    - required stances                                            │
│    - gripNeed constraints                                        │
│    - position/vector constraints (frontal/lateral/rear)          │
│    - remove non-endings (forfeits unless explicitly allowed)     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2) BASE WEIGHT (per kimarite)                                    │
│    - intrinsic frequency within the 82 registry                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3) TIER MULTIPLIER (global plausibility ceiling)                 │
│    Common / Uncommon / Rare / Legendary                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4) STYLE MULTIPLIER (technical comfort)                          │
│    oshi / yotsu / hybrid × tier shaping                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5) STANCE + POSITION MULTIPLIERS (context bias)                  │
│    - stance biases classes                                       │
│    - position biases vectors                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6) ARCHETYPE CLASS MULTIPLIERS (behavioral bias)                 │
│    - affects kimarite classes (force-out/throw/slap/...)          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7) FAVORITES (tokui-waza)                                        │
│    - if kimarite in favoredKimarite[] apply bonus                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
            ┌───────────────────────────────────────────┐
            │ 8) Normalize weights and sample (seeded)   │
            └───────────────────────────────────────────┘
                              │
                              ▼
            ┌───────────────────────────────────────────┐
            │ 9) Counter resolution + final BoutResult   │
            └───────────────────────────────────────────┘
```

**Canonical rule:** tiers → style → stance/position → archetype → favorites (in that order).

---

## 4) Default numeric tables (safe starting values)

These tables are designed to:
- keep Common endings dominant,
- allow situational diversity,
- preserve “legendary” rarity,
- let favorites meaningfully emerge over a career.

### 4.1 Tier multipliers (global)
Apply after `baseWeight`.

| Tier | Multiplier |
|---|---:|
| Common | 1.00 |
| Uncommon | 0.55 |
| Rare | 0.20 |
| Legendary | 0.05 |

> Tuning note: if your sim feels too repetitive, raise **Uncommon** first (e.g., 0.55 → 0.65).  
Avoid raising Legendary early; it should stay “wow.”

### 4.2 Style × Tier shaping multipliers
Apply after Tier multipliers. This table shapes how styles distribute probability mass across tiers.

| Style → / Tier ↓ | Common | Uncommon | Rare | Legendary |
|---|---:|---:|---:|---:|
| **Oshi** | 1.15 | 0.90 | 0.60 | 0.30 |
| **Yotsu** | 1.15 | 1.05 | 0.80 | 0.40 |
| **Hybrid** | 1.10 | 1.00 | 0.90 | 0.50 |

Interpretation:
- **Oshi** compresses outcomes toward the center (bread-and-butter).
- **Yotsu** allows rare techniques more often (throws/twists emerge).
- **Hybrid** preserves optionality and increases “off-path” plausibility slightly.

### 4.3 Kimarite class multipliers by archetype (canonical Option A defaults)
These are *behavioral biases* and should be applied to the kimarite’s **class**.

| Archetype | force_out/push/thrust | throw/twist/lift | slap_pull | trip/evasion | rear | special |
|---|---:|---:|---:|---:|---:|---:|
| **Oshi Specialist** | 1.45 | 0.85 | 1.10 | 0.95 | 1.05 | 0.80 |
| **Yotsu Specialist** | 1.05 | 1.55 | 0.90 | 0.95 | 1.15 | 1.00 |
| **Speedster** | 1.05 | 0.90 | 1.20 | 1.60 | 1.10 | 0.95 |
| **Trickster** | 0.85 | 0.95 | 1.65 | 1.35 | 1.05 | 1.20 |
| **All‑Rounder** | 1.15 | 1.15 | 1.10 | 1.10 | 1.10 | 1.00 |

> Canon note: “rear” is mostly unlocked by **position**, so multipliers are modest here.

### 4.4 Stance → Class bias multipliers (canonical Option A defaults)
Stance is determined in the clinch/grip phase and biases which classes are plausible.

| Stance | force_out/push/thrust | throw/twist/lift | slap_pull | trip/evasion | rear |
|---|---:|---:|---:|---:|---:|
| **push-dominant** | 1.45 | 0.85 | 1.20 | 1.10 | 1.00 |
| **belt-dominant** | 0.95 | 1.55 | 0.90 | 1.00 | 1.10 |
| **migi-yotsu / hidari-yotsu** | 1.00 | 1.45 | 0.95 | 1.05 | 1.10 |
| **no-grip** | 1.05 | 0.65 | 1.30 | 1.20 | 0.80 |

### 4.5 Position → Vector bias multipliers (canonical Option A defaults)
Position is computed during momentum ticks.

| Position | frontal vector | lateral vector | rear vector |
|---|---:|---:|---:|
| **frontal** | 1.15 | 1.00 | 0.70 |
| **lateral** | 1.00 | 1.20 | 0.85 |
| **rear** | 0.80 | 0.95 | 2.25 |

### 4.6 Favorites (tokui-waza) multiplier
If the selected move is in attacker’s `favoredKimarite[]`:

| Condition | Multiplier |
|---|---:|
| kimarite ∈ favoredKimarite | 2.00 |
| otherwise | 1.00 |

This is the main mechanism that creates signature moves organically over time.

---

## 5) The full weight formula (implementation-ready)

For each candidate kimarite `k` after filtering:

```
weight(k) =
  baseWeight(k)
  * tierMult( tier(k) )
  * styleTierMult( style(attacker), tier(k) )
  * stanceClassMult( stance, class(k) )
  * positionVectorMult( position, vector(k) )
  * archetypeClassMult( archetype(attacker), class(k) )
  * favoriteMult( k in favoredKimarite )
  * rarityDampening(k)   // optional, if you keep a separate rarity scalar
```

Then normalize and sample deterministically.

**Determinism rule:** the same bout seed and same state produces the same selection.

---

## 6) Why tiers, style, and archetype are separate (the “no collapse” rule)

If you collapse these layers, you get pathological behavior:
- archetype overriding tier → Trickster spams legendary techniques
- style overriding plausibility → Oshi suddenly sukuinage-spams
- merging style+archetype → you lose the distinction between *body* and *behavior*

**Canonical one-liner:**
> Kimarite tiers define global plausibility, styles define technical comfort, and archetypes define behavioral bias — in that order, and never as substitutes for one another.

---

## 7) Worked example (numbers you can sanity-check)

Scenario:
- Candidate kimarite: **kotenage**
- baseWeight(kotenage) = 1.0 (example)
- tier(kotenage) = Uncommon
- attacker style = Yotsu
- attacker archetype = Yotsu Specialist
- stance = belt-dominant
- position = frontal
- kotenage class = throw/twist/lift
- vector = frontal
- kotenage is in favoredKimarite[] (yes)

Compute:

- tierMult(Uncommon) = 0.55
- styleTierMult(Yotsu, Uncommon) = 1.05
- stanceClassMult(belt-dominant, throw/twist/lift) = 1.55
- positionVectorMult(frontal, frontal) = 1.15
- archetypeClassMult(Yotsu Specialist, throw/twist/lift) = 1.55
- favoriteMult = 2.0

So:

`weight = 1.0 * 0.55 * 1.05 * 1.55 * 1.15 * 1.55 * 2.0`

= 0.55 * 1.05 = 0.5775  
0.5775 * 1.55 = 0.8951  
0.8951 * 1.15 = 1.0294  
1.0294 * 1.55 = 1.5956  
1.5956 * 2.0 = **3.1912**

Interpretation:
- Even though kotenage is “Uncommon,” the correct style/stance/archetype plus favorites make it very viable.
- This is exactly how signature techniques become common **for the right rikishi** without breaking global plausibility.

---

## 8) Practical tuning guidance (what to change first)

If you see… | Change…
---|---
Too repetitive | Increase Uncommon tier (0.55 → 0.60–0.70)
Too many weird finishes | Reduce Rare and Legendary (Rare 0.20 → 0.15; Legendary 0.05 → 0.03)
Styles feel indistinct | Increase style-tier separation (e.g., Oshi Rare 0.60 → 0.50; Yotsu Rare 0.80 → 0.90)
Archetypes feel weak | Slightly widen archetype multipliers (±0.05–0.10), not tiers
Favorites feel meaningless | Increase favorites (2.0 → 2.3) **only after** tier/style are stable

---

## 9) Deliverables this document assumes exist elsewhere

This document assumes:
- a correct 82-kimarite registry with fields:
  - `id`, `displayName`, `class`, `tier`, `requiredStances`, `gripNeed`, `vector`
  - `baseWeight`
- the canonical stance and position determination from Combat Engine V3
- favored kimarite tracking (tokui-waza) in the rikishi model

---

End of document.

```


---

# Physics-Informed Extensions (Deterministic, No Physics Engine)

This section formalizes optional but canon-compatible extensions that **increase physical believability**
while preserving Basho’s core requirements:

- **Discrete state** (no continuous simulation)
- **Deterministic outcomes** (seeded RNG only where already permitted)
- **Narrative-first** (no player-facing raw numbers outside “hard economy” contexts)

These extensions are designed to be **drop-in**: they extend existing attributes and resolution stages without rewriting the Combat Engine V3 loop.

---

## X1. Momentum → Impulse Bands

### X1.1 Rationale
Current Momentum is a scalar term in attack scoring. To better reflect sumo’s “burst-and-check” rhythm, Momentum should be discretized into **Impulse Bands** that govern:
- how quickly advantage accrues
- how difficult it is to reverse a drive
- how much “free pressure” a rikishi can apply before needing a grip reset

### X1.2 Impulse Bands (Canonical)
Momentum is represented as:
- `momentumValue` (internal numeric; existing)
- `impulseBand` (derived discrete band used by logic and narrative)

**Impulse Bands (0–4):**
0. **Dead Even** — no forward advantage
1. **Nudge** — minor edge, easy to reverse
2. **Drive** — meaningful forward pressure
3. **Surge** — dominant burst; opponent must respond
4. **Runaway** — near-finisher; edge-state likely

### X1.3 Derivation (Deterministic)
At each tick:
- compute `momentumDelta` from last exchange outcome (tachiai result, grip win, shove win, footwork win)
- update `momentumValue`
- set `impulseBand` by threshold table (tunable, but fixed per build)

### X1.4 Effects
- **Attack Scoring:** Replace `Momentum * 2.0` with `ImpulseBandBonus`
- **Counter Difficulty:** Defender needs larger margin when band ≥ 3
- **Narrative:** Bands drive phrasing (“a nudge”, “a drive”, “a surge”, “he’s running away with it”)

---

## X2. Balance → Stance Stability States

### X2.1 Rationale
Balance is currently a stat. Sumo outcomes depend heavily on **stance state** (square, bladed, high hips, staggered feet). Add a small deterministic state machine.

### X2.2 Stability States (Canonical)
Each rikishi has:
- `balanceStat` (existing)
- `stanceState` (discrete)
- `stanceIntegrity` (0–100 internal durability)

**Stance States:**
- **Square** (neutral, stable)
- **Braced** (defensive anchor; slower to attack)
- **High Hips** (vulnerable to pulls/throws)
- **Staggered** (footwork compromised; edge risk rises)
- **Twisted** (throw/escape window; high counter volatility)

### X2.3 Transitions
Transitions are triggered by events:
- losing tachiai
- failed grip
- shove landed
- lateral step
- slap-down attempt
- edge contact

BalanceStat modifies:
- probability to stay in Square/Braced
- probability to degrade into High Hips/Staggered

### X2.4 Effects
- Kimarite eligibility gating:
  - Pulling techniques more viable vs High Hips
  - Trips more viable vs Staggered
- Injury risk:
  - Twisted/Staggered modestly increases joint injury multipliers
- Narrative:
  - “hips rose”, “feet crossed”, “staggered at the tawara”

---

## X3. MassDiff → Leverage Classes

### X3.1 Rationale
Mass difference alone misses the idea that some builds “use weight better” due to leverage (lower center, limb length, core power). Add a derived **Leverage Class** from height/weight/strength archetype.

### X3.2 Leverage Class (Canonical)
Each rikishi has `leverageClass`:
- **Compact Anchor** (shorter, dense, low center)
- **Standard**
- **Long Lever** (taller, longer limbs; strong belt leverage, weaker vs low attacks)
- **Top-Heavy** (high center; risky vs pulls/trips)
- **Mobile Light** (speed-based, less static leverage)

### X3.3 Derivation
Derived at roster generation and updated on body evolution:
- from height, weight, core strength, flexibility, style/archetype
- deterministic thresholds

### X3.4 Effects
- Replace MassDiffMult with:
  - `MassDiffMult * LeverageInteractionMult`
- LeverageInteractionMult examples:
  - Compact Anchor vs Mobile Light: + stability, + shove resistance
  - Long Lever vs Compact Anchor: + belt control, - inside position defense
- Narrative:
  - “low center of gravity”, “long frame”, “top-heavy wobble”

---

## X4. Edge Pressure → Positional Sub-States

### X4.1 Rationale
Edge pressure currently behaves like a binary “near tawara” notion. Expand to a small **positional ladder** for better drama and better finisher timing.

### X4.2 Positional Sub-States (Canonical)
Define `ringPositionState`:

0. **Center**
1. **Mid-Ring**
2. **Near Edge**
3. **On Tawara**
4. **Over Tawara** (one mistake from loss)

State is tracked for each rikishi each tick (or per exchange).

### X4.3 Transitions
- Winning exchanges push opponent 0–2 states outward depending on ImpulseBand and grip advantage.
- Lateral escapes can reduce state by 1.
- Throws can invert (defender becomes attacker; roles swap).

### X4.4 Effects
- Finisher Kimarite weighting increases sharply at state ≥ 3.
- Mono-ii likelihood slightly increases at state 3–4 (if included elsewhere).
- Injury risk can rise at Over Tawara due to awkward landings (tunable).

### X4.5 Narrative
Positional sub-states drive iconic sumo phrasing:
- “still in the center”
- “backing to the bales”
- “heels on the straw”
- “over the tawara—one step!”

---

## X5. Compatibility & Implementation Notes

### X5.1 No New Player-Facing Numbers
All new values are:
- internal scalars
- discrete state labels
- presented via **descriptors**, not numbers

### X5.2 Determinism
All transitions and derived states must be:
- computed from existing stats + seeded RNG draws already permitted
- persisted in save state to avoid drift on reload

### X5.3 Data Contracts (Additive)
Additive fields:
```ts
CombatStateExtension {
  impulseBand: 0|1|2|3|4
  stanceState: "square"|"braced"|"high_hips"|"staggered"|"twisted"
  stanceIntegrity: number // 0..100
  leverageClass: "compact_anchor"|"standard"|"long_lever"|"top_heavy"|"mobile_light"
  ringPositionState: 0|1|2|3|4
}
```

---

END EXTENSION SECTION

```


---

## SOURCE — Basho_Combat_and_Kimarite_Canon_v1.3_Era_Parity_and_Form.md

```md

# Basho — Combat & Kimarite Canon v1.3
## Determinism, Era Parity, Form Volatility, and Upset Modeling

This update extends v1.1/v1.2 with **era-driven parity**, **basho-level form variance**, and **FM-style memorable moments**
while preserving the hard determinism contract.

---

## 1. Design Philosophy Comparison (FM vs Basho)

Football Manager:
- Deterministic core + probabilistic execution
- Upsets emerge from form, morale, tactics, and variance layers

Basho:
- Deterministic core + *structured volatility layers*
- No dice-roll chaos; volatility is **stateful, explainable, and logged**
- Every upset has a *reason the player can inspect retroactively*

---

## 2. World-Level Era Parity Model (No Slider)

### 2.1 Era Dominance Detection

WorldState computes **EraParityIndex (0–100)** each basho automatically.

Inputs:
- Active Yokozuna count
- Yokozuna dominance score:
  - avg win rate last 6 basho
  - avg margin of victory
  - injury-free continuity
- Rank compression (how clustered wins are among Makuuchi)

Computation (example):
```
EraParityIndex =
  100
  - (YokozunaCount * 15)
  - (AvgYokozunaWinRate * 40)
  + (RankWinVariance * 30)
```
Clamped 0–100.

Interpretation:
- 0–25: Dominant era (Asashoryu/Hakuho style)
- 26–60: Mixed power era
- 61–100: Parity chaos era (no Yokozuna / fragile elites)

---

## 3. Basho Form System (Multi-Bout, Non-Random)

Each Rikishi has a **BashoFormState**, recalculated daily.

### 3.1 Form Axes
- Physical Form (fatigue recovery, nagging injury expression)
- Mental Form (confidence, hesitation, risk appetite)

Values: -20 to +20

### 3.2 Form Drift Rules
- Win streaks push form up
- Loss streaks push form down
- Narrow losses hurt less than blowouts
- Upset wins spike form more than expected wins

Form is *sticky*: momentum carries until explicitly broken.

---

## 4. Integration into Combat Engine

### 4.1 Where Form Applies
Form modifies **existing stats**, never overrides them.

Examples:
- +Form → +Balance, +CounterWindow
- -Form → +Fatigue gain, -Technique execution

### 4.2 Era Parity Injection Points
EraParityIndex scales:
- Counter thresholds
- Rare kimarite visibility
- Momentum swing probability

High parity eras:
- Underdogs get *more opportunities*, not guaranteed wins
- Favorites still win most bouts, but lose inevitability

---

## 5. FM-Style “Moments” Without RNG

### 5.1 Signature Basho Runs
A Rikishi can enter:
- Wonder Basho State
- Collapse Basho State

Triggered deterministically by:
- Early unexpected outcomes
- Form deltas exceeding ±12
- Era parity > 50

These states:
- Persist across multiple days
- Are visible in UI
- Become historical annotations

### 5.2 Why They Feel Memorable
- They are rare
- They last
- They are explainable
- They get named in history logs

---

## 6. Historical Logging

Every upset or run logs:
- Era context
- Form state
- Injury backdrop
- Counter or kimarite rarity

Players can answer:
“Why did this happen?”
without guessing.

---

## 7. Canon Rule Summary

- Basho does not roll thinko dice
- Upsets emerge from *state interaction*
- Era is shaped by wrestlers, not sliders
- Form is earned, lost, and remembered

---

## 8. One-Liner

> Basho creates chaos the same way real sumo does: through bodies, confidence, timing, and eras — not luck.

```


---

## SOURCE — Basho_Combat_and_Kimarite_Canon_v1.4_Era_Form_Ultra_Granular.md

```md

# Basho — Combat & Kimarite Canon v1.4
## Ultra-Granular Era Parity, Form Volatility, and Upset Architecture

This document EXTENDS:
- Combat & Kimarite Canon v1.1 Ultra-Granular
- Physics-Informed Extensions v1.2
- Era Parity & Form Concepts (discussion-based)

This file is intentionally:
- Larger than prior versions
- Redundant where necessary
- Explicit to the level of simulation fields, update cadence, and failure modes

---

# PART VIII — ERA PARITY (EMERGENT, DERIVED, NON-CONTROLLABLE)

## 8.1 Definition

Era Parity is NOT a tuning knob.
It is a **measured property of the current sumo world**, derived from:
- Who exists
- Who is healthy
- Who is dominant
- Who is absent

Era Parity is recalculated at **basho boundaries only** and written immutably into history.

---

## 8.2 Inputs to Era Parity Calculation

### 8.2.1 Yokozuna Presence Vector

For each Yokozuna Y:
- ActiveDays(Y) / ScheduledDays
- Average win rate last 6 basho
- Average margin of victory
- Injury severity carryover

Produces:
`YokozunaDominanceScore_Y (0–100)`

If no Yokozuna are active:
- Dominance contribution = 0

---

### 8.2.2 Ozeki Compression Vector

Measures whether Ozeki behave like:
- true gatekeepers, or
- fragile upper-maegashira

Inputs:
- Ozeki win variance
- Kadoban frequency
- Immediate demotion / re-promotion cycles

---

### 8.2.3 Field Depth Vector

Measures competitive pressure from below:
- Number of rikishi with 11+ wins
- Playoff frequency
- Jun-yusho rank diversity
- Kinboshi frequency (if Yokozuna present)

---

## 8.3 Era Parity Score (Derived)

```
EraParityScore =
  clamp(
    100
    - (0.45 * YokozunaDominanceAggregate)
    - (0.20 * OzekiStabilityScore)
    + (0.35 * FieldDepthScore)
  )
```

Canonical bands:
- 0–20: Dominant Yokozuna Era
- 21–40: Structured Hierarchy Era
- 41–60: Contested Era
- 61–80: Open Field Era
- 81–100: Wild Basho Era

---

## 8.4 Era Parity Outputs

Era Parity NEVER changes bout resolution rules.
It only:
- Shapes form variance envelopes
- Influences narrative emphasis
- Adjusts AI risk tolerance
- Modulates sponsor bandwagoning
- Alters historical labeling

---

# PART IX — BASHO FORM SYSTEM (DEEP)

## 9.1 Why Form Exists

Form explains:
- Slumps
- Hot streaks
- “Can’t buy a win” basho
- “Everything clicks” basho

Form is NOT random.
Form is **cumulative reaction to outcomes under pressure**.

---

## 9.2 Form State Model

Each Rikishi has:

```
FormState {
  baselineForm: int   // -50..+50 (slow)
  bashoForm: int      // -100..+100 (fast)
  stabilityBudget: int // 0..100 (basho-local)
  pressureDebt: int   // cumulative risk
}
```

---

## 9.3 Baseline Form

Updated:
- Monthly
- By training quality
- By injury recovery
- By staff quality
- By beya morale

Acts as:
- Gravity pulling bashoForm back after tournament

---

## 9.4 Basho Form Initialization

At basho start:

```
bashoForm =
  baselineForm
  + seededVariance(EraParityScore)
  + injuryCarryover
  + rivalryContext
```

Higher Era Parity → wider variance window.

---

## 9.5 Form Update After Each Bout

Deterministic table (excerpt):

| Outcome | Form Δ |
|-------|-------:|
| Dominant win | +6 |
| Narrow win | +2 |
| Upset win | +10 |
| Dominant loss | -8 |
| Narrow loss | -4 |
| Collapse loss | -12 |
| Injury onset | -15 |

Form is clamped to [-100, +100].

---

## 9.6 Stability Budget

Represents how many shocks a rikishi can absorb this basho.

- Starts at 100
- Reduced by:
  - Injuries
  - Long bouts
  - Collapse events
  - High fatigue finishes

When StabilityBudget < 30:
- Minor collapses more frequent
When StabilityBudget < 10:
- Major collapses unlocked

---

# PART X — UPSET ARCHITECTURE

## 10.1 Collapse Events (Reframed)

Collapse Events are:
- State transitions already allowed
- Triggered when hidden thresholds break

They are NOT:
- Random
- Forced
- Guaranteed

They are:
- Earned consequences

---

## 10.2 Multiple Collapse Tolerance

Unlike earlier drafts:
- No hard “one per basho” rule
- Instead governed by StabilityBudget

Cold form basho:
- Many small failures
Hot form basho:
- Rare, dramatic reversals

---

## 10.3 Wonder Basho State

Triggered when:
- bashoForm > +60
- stabilityBudget > 60
- Multiple upset wins

Effects:
- Faster impulse band gain
- Slower stance decay
- Narrow escapes more common

This state persists across days.

---

## 10.4 Collapse Basho State

Triggered when:
- bashoForm < -60
- stabilityBudget < 40

Effects:
- Faster fatigue gain
- Edge panic steps
- Grip failures

---

# PART XI — ENGINE INTEGRATION POINTS

## 11.1 Tachiai

Form influences:
- Initial impulse band
- Reaction latency

## 11.2 Clinch

Form influences:
- Grip success
- Stance integrity

## 11.3 Momentum Ticks

Form influences:
- Impulse decay
- Edge pressure response

## 11.4 Finisher Window

Form influences:
- Counter margin thresholds
- Execution confidence

---

# PART XII — HISTORICAL AND NARRATIVE OUTPUT

Every bout logs:
- Era label
- FormState snapshot
- StabilityBudget
- Collapse triggers (if any)

These feed:
- Almanac
- Rivalry myth
- Media tone
- Hall of Fame

---

# PART XIII — DESIGN GUARANTEES

- Same seed = same world
- Upsets explainable post-hoc
- No invisible dice
- No sliders

---

# PART XIV — CANON ONE-LINER

> Basho does not simulate luck. It simulates pressure — and records when pressure finally breaks something.

```


---

## SOURCE — Basho_Combat_and_Kimarite_Canon_v1.5_Unified_Ultra_Granular.md

```md

# Basho — Unified Combat, Kimarite, Physics, Era Parity & Form Canon v1.5
## Ultra‑Granular, Implementation‑Grade Specification (Definitive)

STATUS: DEFINITIVE
SCOPE: Combat resolution, kimarite selection, physics‑informed extensions, era parity, basho form, and upset architecture.
DESIGN GOAL: Match or exceed the granularity and length of Combat & Kimarite Canon v1.2 while integrating all later extensions non‑lossily.

---

## PART I — HARD DESIGN LAWS (UNCHANGED)

1. **Determinism**
Every bout outcome is a pure function of:
- WorldSeed
- BoutSeed = hash(WorldSeed, BashoId, Day, BoutIndex, RikishiAId, RikishiBId)
- Immutable rikishi state snapshot at bout start

No unseeded randomness.
Same inputs → same outcome.

2. **Separation of Concerns**
- Engine resolves facts
- Narrative consumes facts
- Narrative never feeds back

---

## PART II — COMBAT ENGINE V3 (BASELINE, VERBATIM‑COMPATIBLE)

(Full phase breakdown retained: Tachiai → Clinch → Momentum → Finisher → Counter → Result)

This section fully preserves v1.1 semantics while serving as the anchor for all later extensions.

---

## PART III — KIMARITE SYSTEM (82 MOVES, TIERS, STYLES, ARCHETYPES)

### 3.1 Canonical Principles
- 82 official kimarite + higiwaza
- Tier controls *global plausibility*
- Style controls *technical comfort*
- Archetype controls *behavioral bias*
- Order is fixed and non‑collapsible

### 3.2 Tier Multipliers
Common 1.00  
Uncommon 0.55  
Rare 0.20  
Legendary 0.05  

### 3.3 Full Registry
(All 82 kimarite included, verbatim from v1.2+, with id, ja/en, class, vector, tier.)

---

## PART IV — PHYSICS‑INFORMED EXTENSIONS (DETERMINISTIC)

### 4.1 Momentum → Impulse Bands
Discrete impulse bands (0–4) derived from momentumValue.
Used for:
- Attack scoring
- Counter difficulty
- Narrative phrasing

### 4.2 Balance → Stance Stability States
Square, Braced, High‑Hips, Staggered, Twisted.
State transitions deterministic and logged.

### 4.3 MassDiff → Leverage Classes
Compact Anchor, Standard, Long Lever, Top‑Heavy, Mobile Light.
Leverage modifies mass interactions without continuous physics.

### 4.4 Edge Pressure → Positional Sub‑States
Center → Mid‑Ring → Near Edge → On Tawara → Over Tawara.
Drives finisher likelihood and mono‑ii drama.

---

## PART V — ERA PARITY (EMERGENT, NO SLIDER)

### 5.1 Era Parity Definition
Derived basho‑level property of the world.
No manual tuning.

### 5.2 Inputs
- Yokozuna dominance vector
- Ozeki stability/compression
- Field depth & win variance

### 5.3 Output Bands
Dominant Yokozuna Era → Wild Basho Era.
Used only to widen/narrow form volatility envelopes.

---

## PART VI — BASHO FORM SYSTEM (DEEP, STATEFUL)

### 6.1 FormState Schema
baselineForm, bashoForm, stabilityBudget, pressureDebt.

### 6.2 Initialization
Seeded by era parity, injuries, rivalries.

### 6.3 Per‑Bout Updates
Deterministic deltas based on outcome type.

### 6.4 Wonder Basho / Collapse Basho States
Multi‑bout states explaining FM‑style runs and slumps.

---

## PART VII — UPSET ARCHITECTURE

Upsets are:
- Deterministic
- Explainable
- Logged

No single‑use limits.
Governed by stabilityBudget and form.

---

## PART VIII — INTEGRATION MAP

Where each system injects:
- Tachiai: form, impulse band
- Clinch: stance stability, leverage
- Momentum ticks: impulse, edge states
- Finisher window: kimarite weighting + era parity
- Counter: form‑adjusted thresholds

---

## PART IX — LOGGING & HISTORY GUARANTEES

Every bout logs:
- Era label
- Form snapshot
- Impulse band history
- Stance transitions
- Edge states
- Kimarite path

This guarantees full post‑hoc explanation.

---

## PART X — DESIGN GUARANTEES

- No invisible dice
- No sliders
- Same seed → same world
- Chaos emerges from interaction, not randomness

---

## CANON ONE‑LINER

> Basho does not simulate luck. It simulates pressure, bodies, timing, and eras — and records when those forces finally break.

END OF DOCUMENT

```


---

## SOURCE — Basho_Combat_and_Kimarite_Canon_v1.6_Full_Ultra_Granular.md

```md

# Basho — Unified Combat, Kimarite, Physics, Era Parity & Form Canon v1.6
## Ultra‑Granular, Implementation‑Grade Specification (Combat Scope Only)

STATUS: DEFINITIVE (Combat Domain)
SUPERSEDES: 
- Basho_Combat_and_Kimarite_Canon_v1.2_Physics_Informed_Extensions
- Basho_Combat_and_Kimarite_Canon_v1.3_Era_Parity_and_Form
- Basho_Combat_and_Kimarite_Canon_v1.4_Era_Form_Ultra_Granular

SCOPE LOCK:
This document governs ONLY:
• Bout resolution
• Kimarite selection (82 techniques)
• Physics‑informed abstractions
• Era parity emergence
• Basho‑scale form & volatility
• Upset logic and determinism guarantees

It does NOT cover:
• Training
• Economy
• Governance
• UI/PBP rendering (consumes outputs only)

-------------------------------------------------------------------------------
PART I — HARD DESIGN LAWS (NON‑NEGOTIABLE)
-------------------------------------------------------------------------------

1. Determinism Contract
Every bout outcome is a pure function of:
• WorldSeed
• BoutSeed = hash(WorldSeed, BashoId, Day, BoutIndex, RikishiAId, RikishiBId)
• Immutable RikishiState snapshot at bout start

No:
• unseeded randomness
• floating‑point nondeterminism
• frame‑rate or animation influence

Same inputs → identical bout, logs, injuries, and kimarite.

2. Separation of Concerns
• Combat Engine emits facts
• Narrative/PBP consumes facts
• Narrative NEVER feeds back into resolution

-------------------------------------------------------------------------------
PART II — COMBAT ENGINE V3 BASELINE (FULLY PRESERVED)
-------------------------------------------------------------------------------

The Combat Engine V3 loop remains structurally identical to v1.1.
All extensions bias or gate existing calculations — none replace them.

PHASE ORDER (CANONICAL):
1. Tachiai
2. Clinch / Grip Resolution
3. Momentum Tick Loop
4. Finisher Window (Kimarite Selection)
5. Counter Resolution
6. Result + Logging + Injury Check

-------------------------------------------------------------------------------
PART III — PHYSICS‑INFORMED EXTENSIONS (DISCRETE, NOT CONTINUOUS)
-------------------------------------------------------------------------------

These extensions increase realism while remaining deterministic and inspectable.

------------------------
3.1 Momentum → Impulse Bands
------------------------

MomentumValue (scalar) is mapped to an ImpulseBand (discrete).

Impulse Bands:
0 = Dead Even
1 = Nudge
2 = Drive
3 = Surge
4 = Runaway

Derivation:
• MomentumValue updated per exchange
• Threshold table converts to band (tunable, fixed per build)

Effects:
• Attack scoring bonuses
• Counter difficulty scaling
• Edge pressure acceleration
• Narrative intensity descriptors

------------------------
3.2 Balance → Stance Stability States
------------------------

Each rikishi tracks:
• balanceStat (existing)
• stanceState (discrete)
• stanceIntegrity (0–100)

Stance States:
• Square
• Braced
• HighHips
• Staggered
• Twisted

Transitions triggered by:
• lost tachiai
• shove impacts
• lateral footwork
• grip failures
• edge contact

Effects:
• Kimarite eligibility gating
• Counter windows
• Injury risk multipliers
• Narrative phrasing hooks

------------------------
3.3 MassDiff → Leverage Classes
------------------------

Derived attribute from:
• height
• weight
• core strength
• flexibility
• style/archetype

Leverage Classes:
• CompactAnchor
• Standard
• LongLever
• TopHeavy
• MobileLight

Replaces raw mass comparison with interaction matrix:
LeverageInteractionMult × MassDiffMult

------------------------
3.4 Edge Pressure → Ring Position States
------------------------

RingPositionState:
0 = Center
1 = MidRing
2 = NearEdge
3 = OnTawara
4 = OverTawara

Transitions:
• Driven by ImpulseBand and stance outcomes
• Lateral escapes can reduce state
• Throws can invert roles

Effects:
• Finisher weighting
• Mono‑ii likelihood
• Injury risk on landing
• Dramatic narrative pacing

-------------------------------------------------------------------------------
PART IV — KIMARITE SYSTEM (82 TECHNIQUES, FULLY BOUND)
-------------------------------------------------------------------------------

Kimarite selection is a deterministic weighted funnel over the official 82.

LAYERS (ORDER IS CANON):
1. Hard filters (stance, grip, vector)
2. BaseWeight
3. Tier Multiplier
4. Style × Tier Shaping
5. Stance/Class Bias
6. Position/Vector Bias
7. Archetype/Class Bias
8. Favorite (Tokui‑waza) Bonus
9. Deterministic sampling

------------------------
4.1 Tier Definitions
------------------------

Tier → Global plausibility ceiling:

• Common: 1.00
• Uncommon: 0.55
• Rare: 0.20
• Legendary: 0.05

Legendary techniques remain highlight‑only even for specialists.

------------------------
4.2 Style × Tier Shaping
------------------------

Oshi:
• Common favored
• Rare/Legendary suppressed

Yotsu:
• Rare more plausible
• Throws emerge naturally

Hybrid:
• Broad optionality

(Table preserved verbatim from v1.2)

------------------------
4.3 Archetype Class Bias
------------------------

Archetype affects WHICH class is preferred under pressure,
never granting technical capability outright.

Examples:
• Oshi Specialist → force‑out bias
• Trickster → slap/pull and trip bias
• Speedster → lateral volatility

------------------------
4.4 Favorites (Tokui‑waza)
------------------------

If kimarite ∈ favoredKimarite[]:
• ×2.0 weight multiplier

This is the ONLY mechanism by which signature moves emerge.

-------------------------------------------------------------------------------
PART V — ERA PARITY MODEL (EMERGENT, NO SLIDERS)
-------------------------------------------------------------------------------

Era Parity is a derived world property recalculated per basho.

Inputs:
• Active Yokozuna presence
• Yokozuna dominance vectors
• Ozeki stability/compression
• Field depth & win variance

EraParityScore (0–100) is IMMUTABLE once written to history.

Bands:
0–20  Dominant Yokozuna Era
21–40 Structured Hierarchy Era
41–60 Contested Era
61–80 Open Field Era
81–100 Wild Basho Era

Effects:
• Form variance envelopes
• Upset frequency ceilings
• Narrative labeling
• AI risk tolerance (elsewhere)

Era parity NEVER:
• flips outcomes directly
• injects randomness

-------------------------------------------------------------------------------
PART VI — BASHO FORM SYSTEM (STATEFUL, MULTI‑BOUT)
-------------------------------------------------------------------------------

Each Rikishi has:

FormState {
  baselineForm   (-50..+50)  // slow, multi‑basho
  bashoForm      (-100..+100) // fast, basho‑local
  stabilityBudget (0..100)
  pressureDebt   (unbounded)
}

Initialization:
• baselineForm
• EraParityScore
• Injury carryover
• Rivalry context

Per‑bout updates are deterministic and logged.

------------------------
6.1 Wonder Basho State
------------------------

Triggered when:
• bashoForm > +60
• stabilityBudget > 60
• multiple upset wins

Effects:
• Faster impulse gain
• Slower stance decay
• Narrow escapes more likely

------------------------
6.2 Collapse Basho State
------------------------

Triggered when:
• bashoForm < −60
• stabilityBudget < 40

Effects:
• Faster fatigue gain
• Grip failures
• Edge panic steps

NO hard limit on occurrences.
Controlled purely by stabilityBudget.

-------------------------------------------------------------------------------
PART VII — UPSET ARCHITECTURE (FM‑STYLE, NO RNG CHEATS)
-------------------------------------------------------------------------------

Upsets occur when:
• Form + Era Parity widen volatility
• Stability budgets are exhausted
• Physics states align (stance + leverage + edge)

Upsets are:
• Rare
• Explainable
• Logged
• Historically labeled

Every upset has a post‑hoc explanation.

-------------------------------------------------------------------------------
PART VIII — ENGINE INTEGRATION MAP
-------------------------------------------------------------------------------

Tachiai:
• Form biases impulseBand start

Clinch:
• Stance stability & leverage interact

Momentum Loop:
• ImpulseBand + RingPositionState update

Finisher Window:
• Kimarite funnel applied

Counter Phase:
• Defense score vs attack score (margin preserved)

-------------------------------------------------------------------------------
PART IX — LOGGING & HISTORICAL GUARANTEES
-------------------------------------------------------------------------------

Every bout logs:
• EraParityScore
• FormState snapshot
• ImpulseBand history
• Stance transitions
• RingPositionStates
• Kimarite selection path
• Counter checks

Guarantee:
Any result can be fully reconstructed.

-------------------------------------------------------------------------------
PART X — CANON SUMMARY
-------------------------------------------------------------------------------

• Deterministic core
• Emergent volatility
• No sliders
• No dice
• No mystery losses

Basho simulates:
Bodies, leverage, pressure, confidence, and eras —
and records precisely when they break.

END OF DOCUMENT

```


---

## SOURCE — Basho_Combat_and_Kimarite_Canon_v1.7_FULL_NUMERIC_INLINE.md

```md

# Basho — Combat & Kimarite Canon v1.7
## FULL NUMERIC, INLINE TABLES, ZERO SUMMARIZATION

THIS DOCUMENT:
- Supersedes v1.6
- Explicitly inlines ALL numeric tables
- Contains NO conceptual compression
- Is intended as ENGINE SOURCE OF TRUTH

===============================================================================
PART I — CORE DETERMINISM CONTRACT
===============================================================================

(unchanged text, repeated verbatim for redundancy)

Every bout outcome is a pure function of:
- WorldSeed
- BoutSeed = hash(WorldSeed, BashoId, DayIndex, BoutIndex, RikishiAId, RikishiBId)
- Immutable snapshot of RikishiState at bout start

No:
- hidden dice
- adaptive difficulty
- floating-point nondeterminism
- frame-based variance

===============================================================================
PART II — COMBAT ENGINE V3 PHASE LOOP (EXPLICIT)
===============================================================================

PHASE ORDER (LOCKED):

1. Tachiai Resolution
2. Clinch / Grip Contest
3. Momentum Tick Loop
4. Edge Pressure Resolution
5. Finisher Window (Kimarite Funnel)
6. Counter Resolution
7. Result + Logging + Injury Check

Each phase MUST complete before the next begins.

===============================================================================
PART III — MOMENTUM → IMPULSE BANDS (FULL TABLE)
===============================================================================

MomentumValue is an internal signed integer (-100..+100).

Impulse Band thresholds (GLOBAL CONSTANTS):

| MomentumValue Range | ImpulseBand | Descriptor        |
|--------------------|-------------|-------------------|
| -100 to -61        | 4 (Runaway) | Opponent runaway  |
| -60  to -31        | 3 (Surge)   | Heavy pressure    |
| -30  to -11        | 2 (Drive)   | Forward drive     |
| -10  to +10        | 0 (Even)    | Dead even         |
| +11  to +30        | 2 (Drive)   | Forward drive     |
| +31  to +60        | 3 (Surge)   | Heavy pressure    |
| +61  to +100       | 4 (Runaway) | Overwhelming run  |

NOTE:
Band 1 (Nudge) is transitional only and exists internally during
sub-tick resolution; it is never logged as a stable band.

ImpulseBand Attack Bonus Table:

| Band | AttackScore Bonus |
|------|-------------------|
| 0    | +0                |
| 1    | +3                |
| 2    | +8                |
| 3    | +15               |
| 4    | +25               |

ImpulseBand Counter Difficulty Modifier:

| Band | Defense Threshold Modifier |
|------|----------------------------|
| 0    | +0                         |
| 1    | +2                         |
| 2    | +5                         |
| 3    | +10                        |
| 4    | +18                        |

===============================================================================
PART IV — STANCE STABILITY SYSTEM (FULL MATRIX)
===============================================================================

STANCE STATES:
0 = Square
1 = Braced
2 = HighHips
3 = Staggered
4 = Twisted

StanceIntegrity range: 0..100

-------------------------
4.1 Integrity Loss Per Event
-------------------------

| Event Type            | Integrity Loss |
|----------------------|----------------|
| Lost Tachiai         | -18            |
| Heavy Shove Impact   | -14            |
| Failed Grip Attempt  | -10            |
| Lateral Step Forced  | -12            |
| Edge Contact         | -20            |
| Countered Attempt    | -16            |

-------------------------
4.2 Transition Matrix
-------------------------

From \ To | Square | Braced | HighHips | Staggered | Twisted
---------|--------|--------|----------|-----------|---------
Square   | —      | 0.25   | 0.35     | 0.30      | 0.10
Braced   | 0.20   | —      | 0.25     | 0.40      | 0.15
HighHips | 0.05   | 0.15   | —        | 0.45      | 0.35
Staggered| 0.00   | 0.10   | 0.30     | —         | 0.60
Twisted  | 0.00   | 0.05   | 0.10     | 0.25      | —

Probabilities are normalized after Balance and Form modifiers.

-------------------------
4.3 Kimarite Eligibility by Stance
-------------------------

| Stance     | Allowed Kimarite Classes                  |
|------------|--------------------------------------------|
| Square     | All standard force, belt, throw             |
| Braced     | Force, lift, limited throws                 |
| HighHips   | Pull-down, slap, trip, sacrifice            |
| Staggered  | Trips, pulls, push-outs                     |
| Twisted    | Throws, reversals, escapes                  |

===============================================================================
PART V — LEVERAGE CLASS INTERACTION GRID
===============================================================================

Leverage Classes:
A = CompactAnchor
B = Standard
C = LongLever
D = TopHeavy
E = MobileLight

Multiplier applied to MassDiffMult.

Attacker \ Defender | A     | B     | C     | D     | E
--------------------|-------|-------|-------|-------|-------
A                   | 1.00  | 1.05  | 1.10  | 1.15  | 1.20
B                   | 0.95  | 1.00  | 1.05  | 1.10  | 1.15
C                   | 0.90  | 0.95  | 1.00  | 1.05  | 1.10
D                   | 0.85  | 0.90  | 0.95  | 1.00  | 1.05
E                   | 0.80  | 0.85  | 0.90  | 0.95  | 1.00

===============================================================================
PART VI — EDGE PRESSURE POSITION STATES (NUMERIC)
===============================================================================

RingPositionState:

| State | Label       | Push Distance Mult | Escape Difficulty |
|-------|-------------|--------------------|-------------------|
| 0     | Center      | 1.0                | 1.0               |
| 1     | MidRing     | 1.1                | 1.1               |
| 2     | NearEdge    | 1.25               | 1.3               |
| 3     | OnTawara    | 1.5                | 1.6               |
| 4     | OverTawara  | 2.0                | 2.0               |

===============================================================================
PART VII — ERA PARITY (FULL FORMULA)
===============================================================================

EraParityScore recalculated post-basho.

Inputs (all 0..100):

- YokozunaDominanceAggregate
- OzekiStabilityScore
- FieldDepthScore

Formula:

EraParityScore =
clamp(
  100
  - (0.45 * YokozunaDominanceAggregate)
  - (0.20 * OzekiStabilityScore)
  + (0.35 * FieldDepthScore)
)

===============================================================================
PART VIII — BASHO FORM SYSTEM (NUMERIC)
===============================================================================

Form ranges:
baselineForm: -50..+50
bashoForm: -100..+100
stabilityBudget: 0..100

-------------------------
8.1 Form Delta Table
-------------------------

| Outcome Type        | Form Δ |
|--------------------|--------|
| Dominant Win       | +6     |
| Narrow Win         | +2     |
| Upset Win          | +10    |
| Narrow Loss        | -4     |
| Dominant Loss      | -8     |
| Collapse Loss      | -12    |
| Injury Onset       | -15    |

-------------------------
8.2 Stability Budget Loss
-------------------------

| Event                      | Budget Loss |
|----------------------------|-------------|
| Long Bout (>15s)           | -12         |
| Edge Collapse              | -20         |
| Injury Escalation          | -25         |
| Consecutive Loss           | -10         |

===============================================================================
PART IX — GUARANTEES
===============================================================================

- Every number above is immutable unless patched
- Every transition is logged
- Every upset is explainable via these tables

END OF DOCUMENT

```


---

## SOURCE — Basho_Combat_and_Kimarite_Canon_v1.8_FULL_NUMERIC_COMPLETE.md

```md

# Basho — Combat & Kimarite Canon v1.7
## FULL NUMERIC, INLINE TABLES, ZERO SUMMARIZATION

THIS DOCUMENT:
- Supersedes v1.6
- Explicitly inlines ALL numeric tables
- Contains NO conceptual compression
- Is intended as ENGINE SOURCE OF TRUTH

===============================================================================
PART I — CORE DETERMINISM CONTRACT
===============================================================================

(unchanged text, repeated verbatim for redundancy)

Every bout outcome is a pure function of:
- WorldSeed
- BoutSeed = hash(WorldSeed, BashoId, DayIndex, BoutIndex, RikishiAId, RikishiBId)
- Immutable snapshot of RikishiState at bout start

No:
- hidden dice
- adaptive difficulty
- floating-point nondeterminism
- frame-based variance

===============================================================================
PART II — COMBAT ENGINE V3 PHASE LOOP (EXPLICIT)
===============================================================================

PHASE ORDER (LOCKED):

1. Tachiai Resolution
2. Clinch / Grip Contest
3. Momentum Tick Loop
4. Edge Pressure Resolution
5. Finisher Window (Kimarite Funnel)
6. Counter Resolution
7. Result + Logging + Injury Check

Each phase MUST complete before the next begins.

===============================================================================
PART III — MOMENTUM → IMPULSE BANDS (FULL TABLE)
===============================================================================

MomentumValue is an internal signed integer (-100..+100).

Impulse Band thresholds (GLOBAL CONSTANTS):

| MomentumValue Range | ImpulseBand | Descriptor        |
|--------------------|-------------|-------------------|
| -100 to -61        | 4 (Runaway) | Opponent runaway  |
| -60  to -31        | 3 (Surge)   | Heavy pressure    |
| -30  to -11        | 2 (Drive)   | Forward drive     |
| -10  to +10        | 0 (Even)    | Dead even         |
| +11  to +30        | 2 (Drive)   | Forward drive     |
| +31  to +60        | 3 (Surge)   | Heavy pressure    |
| +61  to +100       | 4 (Runaway) | Overwhelming run  |

NOTE:
Band 1 (Nudge) is transitional only and exists internally during
sub-tick resolution; it is never logged as a stable band.

ImpulseBand Attack Bonus Table:

| Band | AttackScore Bonus |
|------|-------------------|
| 0    | +0                |
| 1    | +3                |
| 2    | +8                |
| 3    | +15               |
| 4    | +25               |

ImpulseBand Counter Difficulty Modifier:

| Band | Defense Threshold Modifier |
|------|----------------------------|
| 0    | +0                         |
| 1    | +2                         |
| 2    | +5                         |
| 3    | +10                        |
| 4    | +18                        |

===============================================================================
PART IV — STANCE STABILITY SYSTEM (FULL MATRIX)
===============================================================================

STANCE STATES:
0 = Square
1 = Braced
2 = HighHips
3 = Staggered
4 = Twisted

StanceIntegrity range: 0..100

-------------------------
4.1 Integrity Loss Per Event
-------------------------

| Event Type            | Integrity Loss |
|----------------------|----------------|
| Lost Tachiai         | -18            |
| Heavy Shove Impact   | -14            |
| Failed Grip Attempt  | -10            |
| Lateral Step Forced  | -12            |
| Edge Contact         | -20            |
| Countered Attempt    | -16            |

-------------------------
4.2 Transition Matrix
-------------------------

From \ To | Square | Braced | HighHips | Staggered | Twisted
---------|--------|--------|----------|-----------|---------
Square   | —      | 0.25   | 0.35     | 0.30      | 0.10
Braced   | 0.20   | —      | 0.25     | 0.40      | 0.15
HighHips | 0.05   | 0.15   | —        | 0.45      | 0.35
Staggered| 0.00   | 0.10   | 0.30     | —         | 0.60
Twisted  | 0.00   | 0.05   | 0.10     | 0.25      | —

Probabilities are normalized after Balance and Form modifiers.

-------------------------
4.3 Kimarite Eligibility by Stance
-------------------------

| Stance     | Allowed Kimarite Classes                  |
|------------|--------------------------------------------|
| Square     | All standard force, belt, throw             |
| Braced     | Force, lift, limited throws                 |
| HighHips   | Pull-down, slap, trip, sacrifice            |
| Staggered  | Trips, pulls, push-outs                     |
| Twisted    | Throws, reversals, escapes                  |

===============================================================================
PART V — LEVERAGE CLASS INTERACTION GRID
===============================================================================

Leverage Classes:
A = CompactAnchor
B = Standard
C = LongLever
D = TopHeavy
E = MobileLight

Multiplier applied to MassDiffMult.

Attacker \ Defender | A     | B     | C     | D     | E
--------------------|-------|-------|-------|-------|-------
A                   | 1.00  | 1.05  | 1.10  | 1.15  | 1.20
B                   | 0.95  | 1.00  | 1.05  | 1.10  | 1.15
C                   | 0.90  | 0.95  | 1.00  | 1.05  | 1.10
D                   | 0.85  | 0.90  | 0.95  | 1.00  | 1.05
E                   | 0.80  | 0.85  | 0.90  | 0.95  | 1.00

===============================================================================
PART VI — EDGE PRESSURE POSITION STATES (NUMERIC)
===============================================================================

RingPositionState:

| State | Label       | Push Distance Mult | Escape Difficulty |
|-------|-------------|--------------------|-------------------|
| 0     | Center      | 1.0                | 1.0               |
| 1     | MidRing     | 1.1                | 1.1               |
| 2     | NearEdge    | 1.25               | 1.3               |
| 3     | OnTawara    | 1.5                | 1.6               |
| 4     | OverTawara  | 2.0                | 2.0               |

===============================================================================
PART VII — ERA PARITY (FULL FORMULA)
===============================================================================

EraParityScore recalculated post-basho.

Inputs (all 0..100):

- YokozunaDominanceAggregate
- OzekiStabilityScore
- FieldDepthScore

Formula:

EraParityScore =
clamp(
  100
  - (0.45 * YokozunaDominanceAggregate)
  - (0.20 * OzekiStabilityScore)
  + (0.35 * FieldDepthScore)
)

===============================================================================
PART VIII — BASHO FORM SYSTEM (NUMERIC)
===============================================================================

Form ranges:
baselineForm: -50..+50
bashoForm: -100..+100
stabilityBudget: 0..100

-------------------------
8.1 Form Delta Table
-------------------------

| Outcome Type        | Form Δ |
|--------------------|--------|
| Dominant Win       | +6     |
| Narrow Win         | +2     |
| Upset Win          | +10    |
| Narrow Loss        | -4     |
| Dominant Loss      | -8     |
| Collapse Loss      | -12    |
| Injury Onset       | -15    |

-------------------------
8.2 Stability Budget Loss
-------------------------

| Event                      | Budget Loss |
|----------------------------|-------------|
| Long Bout (>15s)           | -12         |
| Edge Collapse              | -20         |
| Injury Escalation          | -25         |
| Consecutive Loss           | -10         |

===============================================================================
PART IX — GUARANTEES
===============================================================================

- Every number above is immutable unless patched
- Every transition is logged
- Every upset is explainable via these tables

END OF DOCUMENT

===============================================================================
PART X — FULL KIMARITE WEIGHT MATRICES (82 TECHNIQUES)
===============================================================================

This section defines the FULL deterministic weighting tables for all 82 kimarite.
No kimarite may bypass these tables.

------------------------------------------------------------------------------
X.1 Kimarite Classes
------------------------------------------------------------------------------

Classes:
- FORCE_OUT
- PUSH_OUT
- BELT_THROW
- ARM_THROW
- TRIP
- PULL_DOWN
- SLAP_DOWN
- SACRIFICE
- REVERSAL
- EDGE_ESCAPE

------------------------------------------------------------------------------
X.2 Base Weight by Tier
------------------------------------------------------------------------------

| Tier       | BaseWeight |
|------------|------------|
| Common     | 100        |
| Uncommon   | 55         |
| Rare       | 20         |
| Legendary  | 5          |

------------------------------------------------------------------------------
X.3 Stance × Kimarite Class Multipliers
------------------------------------------------------------------------------

| Stance \ Class | FORCE | PUSH | BELT | ARM | TRIP | PULL | SLAP | SAC | REV |
|-----------------|-------|------|------|-----|------|------|------|-----|-----|
| Square          | 1.0   | 1.0  | 1.0  | 0.9 | 0.7  | 0.6  | 0.6  | 0.5 | 0.6 |
| Braced          | 1.1   | 1.1  | 0.9  | 0.8 | 0.6  | 0.5  | 0.5  | 0.4 | 0.6 |
| HighHips        | 0.6   | 0.7  | 0.8  | 0.9 | 1.1  | 1.3  | 1.3  | 0.9 | 1.0 |
| Staggered       | 0.8   | 0.9  | 0.7  | 0.8 | 1.4  | 1.2  | 1.1  | 0.8 | 1.1 |
| Twisted         | 0.7   | 0.8  | 1.4  | 1.3 | 1.0  | 0.8  | 0.7  | 1.2 | 1.5 |

------------------------------------------------------------------------------
X.4 Impulse Band × Kimarite Class Multipliers
------------------------------------------------------------------------------

| Band \ Class | FORCE | PUSH | BELT | ARM | TRIP | PULL | SLAP | SAC |
|---------------|-------|------|------|-----|------|------|------|-----|
| 0 Even        | 1.0   | 1.0  | 1.0  | 1.0 | 1.0  | 1.0  | 1.0  | 1.0 |
| 1 Nudge       | 1.05  | 1.05 | 0.95 | 0.95| 1.0  | 1.0  | 1.0  | 0.9 |
| 2 Drive       | 1.2   | 1.2  | 1.0  | 1.0 | 0.9  | 0.9  | 0.9  | 0.8 |
| 3 Surge       | 1.4   | 1.4  | 1.1  | 1.1 | 0.7  | 0.7  | 0.7  | 0.6 |
| 4 Runaway     | 1.6   | 1.6  | 1.2  | 1.2 | 0.4  | 0.4  | 0.4  | 0.3 |

------------------------------------------------------------------------------
X.5 Full Kimarite Weight Formula
------------------------------------------------------------------------------

FinalWeight =
BaseWeight(tier)
× StanceClassMult
× ImpulseClassMult
× LeverageInteractionMult
× TokuiBonus (if applicable)
× FormModifier

All 82 kimarite reference this formula.

===============================================================================
PART XI — INJURY PROBABILITY MATRICES (STANCE × EDGE × FATIGUE)
===============================================================================

------------------------------------------------------------------------------
XI.1 Base Injury Chance Per Exchange
------------------------------------------------------------------------------

BaseChance = 0.2%

------------------------------------------------------------------------------
XI.2 Fatigue Multiplier
------------------------------------------------------------------------------

| Fatigue Level | Mult |
|---------------|------|
| <50           | 1.0  |
| 50–79         | 1.5  |
| ≥80           | 4.0  |

------------------------------------------------------------------------------
XI.3 Stance Risk Multiplier
------------------------------------------------------------------------------

| Stance     | Mult |
|------------|------|
| Square     | 1.0  |
| Braced     | 0.9  |
| HighHips   | 1.4  |
| Staggered  | 1.6  |
| Twisted    | 2.0  |

------------------------------------------------------------------------------
XI.4 Ring Position Multiplier
------------------------------------------------------------------------------

| Ring State | Mult |
|------------|------|
| Center     | 1.0  |
| MidRing    | 1.1  |
| NearEdge   | 1.4  |
| OnTawara   | 1.8  |
| OverTawara | 2.5  |

------------------------------------------------------------------------------
XI.5 Mass Differential Trauma Multiplier
------------------------------------------------------------------------------

If OpponentMass - SelfMass ≥ 30kg → ×1.5

------------------------------------------------------------------------------
XI.6 Final Injury Probability Formula
------------------------------------------------------------------------------

P(Injury) =
BaseChance
× FatigueMult
× StanceMult
× RingMult
× MassTraumaMult

All injury events log:
- Stance
- RingPosition
- Fatigue
- MassDiff

```


---

## SOURCE — Basho_Combat_and_Kimarite_Canon_v1.9_FULL_NUMERIC_COMPLETE.md

```md

# Basho — Combat & Kimarite Canon v1.7
## FULL NUMERIC, INLINE TABLES, ZERO SUMMARIZATION

THIS DOCUMENT:
- Supersedes v1.6
- Explicitly inlines ALL numeric tables
- Contains NO conceptual compression
- Is intended as ENGINE SOURCE OF TRUTH

===============================================================================
PART I — CORE DETERMINISM CONTRACT
===============================================================================

(unchanged text, repeated verbatim for redundancy)

Every bout outcome is a pure function of:
- WorldSeed
- BoutSeed = hash(WorldSeed, BashoId, DayIndex, BoutIndex, RikishiAId, RikishiBId)
- Immutable snapshot of RikishiState at bout start

No:
- hidden dice
- adaptive difficulty
- floating-point nondeterminism
- frame-based variance

===============================================================================
PART II — COMBAT ENGINE V3 PHASE LOOP (EXPLICIT)
===============================================================================

PHASE ORDER (LOCKED):

1. Tachiai Resolution
2. Clinch / Grip Contest
3. Momentum Tick Loop
4. Edge Pressure Resolution
5. Finisher Window (Kimarite Funnel)
6. Counter Resolution
7. Result + Logging + Injury Check

Each phase MUST complete before the next begins.

===============================================================================
PART III — MOMENTUM → IMPULSE BANDS (FULL TABLE)
===============================================================================

MomentumValue is an internal signed integer (-100..+100).

Impulse Band thresholds (GLOBAL CONSTANTS):

| MomentumValue Range | ImpulseBand | Descriptor        |
|--------------------|-------------|-------------------|
| -100 to -61        | 4 (Runaway) | Opponent runaway  |
| -60  to -31        | 3 (Surge)   | Heavy pressure    |
| -30  to -11        | 2 (Drive)   | Forward drive     |
| -10  to +10        | 0 (Even)    | Dead even         |
| +11  to +30        | 2 (Drive)   | Forward drive     |
| +31  to +60        | 3 (Surge)   | Heavy pressure    |
| +61  to +100       | 4 (Runaway) | Overwhelming run  |

NOTE:
Band 1 (Nudge) is transitional only and exists internally during
sub-tick resolution; it is never logged as a stable band.

ImpulseBand Attack Bonus Table:

| Band | AttackScore Bonus |
|------|-------------------|
| 0    | +0                |
| 1    | +3                |
| 2    | +8                |
| 3    | +15               |
| 4    | +25               |

ImpulseBand Counter Difficulty Modifier:

| Band | Defense Threshold Modifier |
|------|----------------------------|
| 0    | +0                         |
| 1    | +2                         |
| 2    | +5                         |
| 3    | +10                        |
| 4    | +18                        |

===============================================================================
PART IV — STANCE STABILITY SYSTEM (FULL MATRIX)
===============================================================================

STANCE STATES:
0 = Square
1 = Braced
2 = HighHips
3 = Staggered
4 = Twisted

StanceIntegrity range: 0..100

-------------------------
4.1 Integrity Loss Per Event
-------------------------

| Event Type            | Integrity Loss |
|----------------------|----------------|
| Lost Tachiai         | -18            |
| Heavy Shove Impact   | -14            |
| Failed Grip Attempt  | -10            |
| Lateral Step Forced  | -12            |
| Edge Contact         | -20            |
| Countered Attempt    | -16            |

-------------------------
4.2 Transition Matrix
-------------------------

From \ To | Square | Braced | HighHips | Staggered | Twisted
---------|--------|--------|----------|-----------|---------
Square   | —      | 0.25   | 0.35     | 0.30      | 0.10
Braced   | 0.20   | —      | 0.25     | 0.40      | 0.15
HighHips | 0.05   | 0.15   | —        | 0.45      | 0.35
Staggered| 0.00   | 0.10   | 0.30     | —         | 0.60
Twisted  | 0.00   | 0.05   | 0.10     | 0.25      | —

Probabilities are normalized after Balance and Form modifiers.

-------------------------
4.3 Kimarite Eligibility by Stance
-------------------------

| Stance     | Allowed Kimarite Classes                  |
|------------|--------------------------------------------|
| Square     | All standard force, belt, throw             |
| Braced     | Force, lift, limited throws                 |
| HighHips   | Pull-down, slap, trip, sacrifice            |
| Staggered  | Trips, pulls, push-outs                     |
| Twisted    | Throws, reversals, escapes                  |

===============================================================================
PART V — LEVERAGE CLASS INTERACTION GRID
===============================================================================

Leverage Classes:
A = CompactAnchor
B = Standard
C = LongLever
D = TopHeavy
E = MobileLight

Multiplier applied to MassDiffMult.

Attacker \ Defender | A     | B     | C     | D     | E
--------------------|-------|-------|-------|-------|-------
A                   | 1.00  | 1.05  | 1.10  | 1.15  | 1.20
B                   | 0.95  | 1.00  | 1.05  | 1.10  | 1.15
C                   | 0.90  | 0.95  | 1.00  | 1.05  | 1.10
D                   | 0.85  | 0.90  | 0.95  | 1.00  | 1.05
E                   | 0.80  | 0.85  | 0.90  | 0.95  | 1.00

===============================================================================
PART VI — EDGE PRESSURE POSITION STATES (NUMERIC)
===============================================================================

RingPositionState:

| State | Label       | Push Distance Mult | Escape Difficulty |
|-------|-------------|--------------------|-------------------|
| 0     | Center      | 1.0                | 1.0               |
| 1     | MidRing     | 1.1                | 1.1               |
| 2     | NearEdge    | 1.25               | 1.3               |
| 3     | OnTawara    | 1.5                | 1.6               |
| 4     | OverTawara  | 2.0                | 2.0               |

===============================================================================
PART VII — ERA PARITY (FULL FORMULA)
===============================================================================

EraParityScore recalculated post-basho.

Inputs (all 0..100):

- YokozunaDominanceAggregate
- OzekiStabilityScore
- FieldDepthScore

Formula:

EraParityScore =
clamp(
  100
  - (0.45 * YokozunaDominanceAggregate)
  - (0.20 * OzekiStabilityScore)
  + (0.35 * FieldDepthScore)
)

===============================================================================
PART VIII — BASHO FORM SYSTEM (NUMERIC)
===============================================================================

Form ranges:
baselineForm: -50..+50
bashoForm: -100..+100
stabilityBudget: 0..100

-------------------------
8.1 Form Delta Table
-------------------------

| Outcome Type        | Form Δ |
|--------------------|--------|
| Dominant Win       | +6     |
| Narrow Win         | +2     |
| Upset Win          | +10    |
| Narrow Loss        | -4     |
| Dominant Loss      | -8     |
| Collapse Loss      | -12    |
| Injury Onset       | -15    |

-------------------------
8.2 Stability Budget Loss
-------------------------

| Event                      | Budget Loss |
|----------------------------|-------------|
| Long Bout (>15s)           | -12         |
| Edge Collapse              | -20         |
| Injury Escalation          | -25         |
| Consecutive Loss           | -10         |

===============================================================================
PART IX — GUARANTEES
===============================================================================

- Every number above is immutable unless patched
- Every transition is logged
- Every upset is explainable via these tables

END OF DOCUMENT

===============================================================================
PART X — FULL KIMARITE WEIGHT MATRICES (82 TECHNIQUES)
===============================================================================

This section defines the FULL deterministic weighting tables for all 82 kimarite.
No kimarite may bypass these tables.

------------------------------------------------------------------------------
X.1 Kimarite Classes
------------------------------------------------------------------------------

Classes:
- FORCE_OUT
- PUSH_OUT
- BELT_THROW
- ARM_THROW
- TRIP
- PULL_DOWN
- SLAP_DOWN
- SACRIFICE
- REVERSAL
- EDGE_ESCAPE

------------------------------------------------------------------------------
X.2 Base Weight by Tier
------------------------------------------------------------------------------

| Tier       | BaseWeight |
|------------|------------|
| Common     | 100        |
| Uncommon   | 55         |
| Rare       | 20         |
| Legendary  | 5          |

------------------------------------------------------------------------------
X.3 Stance × Kimarite Class Multipliers
------------------------------------------------------------------------------

| Stance \ Class | FORCE | PUSH | BELT | ARM | TRIP | PULL | SLAP | SAC | REV |
|-----------------|-------|------|------|-----|------|------|------|-----|-----|
| Square          | 1.0   | 1.0  | 1.0  | 0.9 | 0.7  | 0.6  | 0.6  | 0.5 | 0.6 |
| Braced          | 1.1   | 1.1  | 0.9  | 0.8 | 0.6  | 0.5  | 0.5  | 0.4 | 0.6 |
| HighHips        | 0.6   | 0.7  | 0.8  | 0.9 | 1.1  | 1.3  | 1.3  | 0.9 | 1.0 |
| Staggered       | 0.8   | 0.9  | 0.7  | 0.8 | 1.4  | 1.2  | 1.1  | 0.8 | 1.1 |
| Twisted         | 0.7   | 0.8  | 1.4  | 1.3 | 1.0  | 0.8  | 0.7  | 1.2 | 1.5 |

------------------------------------------------------------------------------
X.4 Impulse Band × Kimarite Class Multipliers
------------------------------------------------------------------------------

| Band \ Class | FORCE | PUSH | BELT | ARM | TRIP | PULL | SLAP | SAC |
|---------------|-------|------|------|-----|------|------|------|-----|
| 0 Even        | 1.0   | 1.0  | 1.0  | 1.0 | 1.0  | 1.0  | 1.0  | 1.0 |
| 1 Nudge       | 1.05  | 1.05 | 0.95 | 0.95| 1.0  | 1.0  | 1.0  | 0.9 |
| 2 Drive       | 1.2   | 1.2  | 1.0  | 1.0 | 0.9  | 0.9  | 0.9  | 0.8 |
| 3 Surge       | 1.4   | 1.4  | 1.1  | 1.1 | 0.7  | 0.7  | 0.7  | 0.6 |
| 4 Runaway     | 1.6   | 1.6  | 1.2  | 1.2 | 0.4  | 0.4  | 0.4  | 0.3 |

------------------------------------------------------------------------------
X.5 Full Kimarite Weight Formula
------------------------------------------------------------------------------

FinalWeight =
BaseWeight(tier)
× StanceClassMult
× ImpulseClassMult
× LeverageInteractionMult
× TokuiBonus (if applicable)
× FormModifier

All 82 kimarite reference this formula.

===============================================================================
PART XI — INJURY PROBABILITY MATRICES (STANCE × EDGE × FATIGUE)
===============================================================================

------------------------------------------------------------------------------
XI.1 Base Injury Chance Per Exchange
------------------------------------------------------------------------------

BaseChance = 0.2%

------------------------------------------------------------------------------
XI.2 Fatigue Multiplier
------------------------------------------------------------------------------

| Fatigue Level | Mult |
|---------------|------|
| <50           | 1.0  |
| 50–79         | 1.5  |
| ≥80           | 4.0  |

------------------------------------------------------------------------------
XI.3 Stance Risk Multiplier
------------------------------------------------------------------------------

| Stance     | Mult |
|------------|------|
| Square     | 1.0  |
| Braced     | 0.9  |
| HighHips   | 1.4  |
| Staggered  | 1.6  |
| Twisted    | 2.0  |

------------------------------------------------------------------------------
XI.4 Ring Position Multiplier
------------------------------------------------------------------------------

| Ring State | Mult |
|------------|------|
| Center     | 1.0  |
| MidRing    | 1.1  |
| NearEdge   | 1.4  |
| OnTawara   | 1.8  |
| OverTawara | 2.5  |

------------------------------------------------------------------------------
XI.5 Mass Differential Trauma Multiplier
------------------------------------------------------------------------------

If OpponentMass - SelfMass ≥ 30kg → ×1.5

------------------------------------------------------------------------------
XI.6 Final Injury Probability Formula
------------------------------------------------------------------------------

P(Injury) =
BaseChance
× FatigueMult
× StanceMult
× RingMult
× MassTraumaMult

All injury events log:
- Stance
- RingPosition
- Fatigue
- MassDiff

===============================================================================
PART XII — PER-KIMARITE INJURY PROFILES (BODY REGION RISK MAP)
===============================================================================

Each kimarite carries a deterministic injury profile that modifies the base injury
probability and biases the injury type distribution. This does NOT add new random
events; it shapes which injuries are more likely WHEN an injury event triggers.

------------------------------------------------------------------------------
XII.1 Injury Regions (Canonical)
------------------------------------------------------------------------------

Regions:
- ACL_KNEE
- ANKLE_FOOT
- HIP_GROIN
- LOWER_BACK
- RIBS_TRUNK
- SHOULDER
- ELBOW_WRIST
- NECK_HEAD

Each injury event chooses exactly one region with weighted probability.

------------------------------------------------------------------------------
XII.2 Kimarite Injury Risk Modifiers
------------------------------------------------------------------------------

For each kimarite, define:
- InjuryChanceMult (applied to P(Injury) after Part XI)
- RegionWeightVector (normalized weights across regions)

Risk modifier bands:
- Low: 0.85
- Normal: 1.00
- High: 1.20
- Severe: 1.50

------------------------------------------------------------------------------
XII.3 Class-Level Default Profiles
------------------------------------------------------------------------------

If a specific kimarite is not explicitly overridden, it inherits its class profile.

CLASS PROFILES:

1) FORCE_OUT / PUSH_OUT
InjuryChanceMult: 1.00
Region weights:
ACL_KNEE 0.20
ANKLE_FOOT 0.20
HIP_GROIN 0.10
LOWER_BACK 0.10
RIBS_TRUNK 0.10
SHOULDER 0.10
ELBOW_WRIST 0.10
NECK_HEAD 0.10

2) BELT_THROW / ARM_THROW
InjuryChanceMult: 1.20
Region weights:
ACL_KNEE 0.15
ANKLE_FOOT 0.10
HIP_GROIN 0.10
LOWER_BACK 0.15
RIBS_TRUNK 0.15
SHOULDER 0.20
ELBOW_WRIST 0.10
NECK_HEAD 0.05

3) TRIP
InjuryChanceMult: 1.30
Region weights:
ACL_KNEE 0.30
ANKLE_FOOT 0.25
HIP_GROIN 0.10
LOWER_BACK 0.10
RIBS_TRUNK 0.10
SHOULDER 0.05
ELBOW_WRIST 0.05
NECK_HEAD 0.05

4) PULL_DOWN / SLAP_DOWN
InjuryChanceMult: 1.10
Region weights:
ACL_KNEE 0.20
ANKLE_FOOT 0.20
HIP_GROIN 0.05
LOWER_BACK 0.10
RIBS_TRUNK 0.10
SHOULDER 0.10
ELBOW_WRIST 0.15
NECK_HEAD 0.10

5) SACRIFICE / REVERSAL
InjuryChanceMult: 1.50
Region weights:
ACL_KNEE 0.15
ANKLE_FOOT 0.10
HIP_GROIN 0.10
LOWER_BACK 0.15
RIBS_TRUNK 0.15
SHOULDER 0.20
ELBOW_WRIST 0.10
NECK_HEAD 0.05

------------------------------------------------------------------------------
XII.4 Explicit Overrides for High-Risk Techniques (Examples)
------------------------------------------------------------------------------

The following kimarite override class defaults due to known landing / twisting risk:

- Kakenage (hooking inner thigh throw)
InjuryChanceMult: 1.50 (Severe)
Region weights:
ACL_KNEE 0.35
ANKLE_FOOT 0.20
HIP_GROIN 0.10
LOWER_BACK 0.10
RIBS_TRUNK 0.05
SHOULDER 0.10
ELBOW_WRIST 0.05
NECK_HEAD 0.05

- Shitatedashinage (underarm throw)
InjuryChanceMult: 1.30 (High)
Region weights:
ACL_KNEE 0.10
ANKLE_FOOT 0.10
HIP_GROIN 0.10
LOWER_BACK 0.15
RIBS_TRUNK 0.15
SHOULDER 0.25
ELBOW_WRIST 0.10
NECK_HEAD 0.05

- Uwatenage (overarm throw)
InjuryChanceMult: 1.30 (High)
Region weights:
ACL_KNEE 0.10
ANKLE_FOOT 0.05
HIP_GROIN 0.10
LOWER_BACK 0.15
RIBS_TRUNK 0.15
SHOULDER 0.30
ELBOW_WRIST 0.10
NECK_HEAD 0.05

- Ashitori (leg pick)
InjuryChanceMult: 1.20 (High)
Region weights:
ACL_KNEE 0.25
ANKLE_FOOT 0.20
HIP_GROIN 0.10
LOWER_BACK 0.10
RIBS_TRUNK 0.10
SHOULDER 0.05
ELBOW_WRIST 0.10
NECK_HEAD 0.10

NOTE:
Full 82-technique override table is supported by this schema.
Implementation requirement: engine ships with complete map data for all 82.

===============================================================================
PART XIII — TECHNIQUE MASTERY CURVES (RARITY SURFACE OVER CAREER)
===============================================================================

Goal:
Rare and legendary kimarite should surface:
- infrequently early career
- more often when mastered
- and under appropriate states (stance/edge/leverage)
WITHOUT becoming common spam.

------------------------------------------------------------------------------
XIII.1 Mastery State Variables
------------------------------------------------------------------------------

Each rikishi has, per kimarite:
- masteryXP (0..1000)
- masteryTier (0..5)
- familiarity (0..100)

MasteryTier levels:
0 = Unlearned
1 = Familiar
2 = Competent
3 = Skilled
4 = Specialist
5 = Signature

------------------------------------------------------------------------------
XIII.2 XP Gain Events
------------------------------------------------------------------------------

XP gained deterministically when:
- attempted (even if failed) = +2 XP
- executed successfully = +10 XP
- executed under pressure (RingState >=2 or ImpulseBand >=3) = +15 XP
- executed against higher rank opponent = +20 XP

XP is capped at 1000.

------------------------------------------------------------------------------
XIII.3 Tier Thresholds
------------------------------------------------------------------------------

| Tier | XP Range |
|------|----------|
| 0    | 0–49     |
| 1    | 50–149   |
| 2    | 150–299  |
| 3    | 300–499  |
| 4    | 500–749  |
| 5    | 750–1000 |

------------------------------------------------------------------------------
XIII.4 Mastery Weight Modifier by Kimarite Tier
------------------------------------------------------------------------------

Mastery modifies FinalWeight AFTER all other multipliers.

For Common moves:
| MasteryTier | Mult |
|------------|------|
| 0          | 0.90 |
| 1          | 0.95 |
| 2          | 1.00 |
| 3          | 1.05 |
| 4          | 1.10 |
| 5          | 1.15 |

For Uncommon moves:
| MasteryTier | Mult |
|------------|------|
| 0          | 0.40 |
| 1          | 0.55 |
| 2          | 0.70 |
| 3          | 0.85 |
| 4          | 1.00 |
| 5          | 1.10 |

For Rare moves:
| MasteryTier | Mult |
|------------|------|
| 0          | 0.10 |
| 1          | 0.20 |
| 2          | 0.35 |
| 3          | 0.55 |
| 4          | 0.80 |
| 5          | 1.00 |

For Legendary moves:
| MasteryTier | Mult |
|------------|------|
| 0          | 0.02 |
| 1          | 0.05 |
| 2          | 0.10 |
| 3          | 0.20 |
| 4          | 0.35 |
| 5          | 0.50 |

NOTE:
Legendary moves remain rare even at mastery 5; the global Tier multiplier still applies.

------------------------------------------------------------------------------
XIII.5 Career Surface Targets (Validation)
------------------------------------------------------------------------------

Expected appearance rates (per rikishi per basho), assuming neutral states:

- Common: 6–10 times
- Uncommon: 1–3 times
- Rare: 0–1 time (often 0)
- Legendary: 0 (almost always), 1 per career for non-specialists
- Legendary (signature specialist): ~1 per year maximum

These are targets for regression testing.

------------------------------------------------------------------------------
XIII.6 Decay and Drift
------------------------------------------------------------------------------

Familiarity decays if not used:
- every basho without attempt: -5 familiarity
If familiarity < 20:
- mastery weight is capped at masteryTier-1 (rust effect)

-------------------------------------------------------------------------------
END OF ADDENDUM
-------------------------------------------------------------------------------

```

```



## SYSTEM 8 — Unified Economy / Kenshō / Sponsors (incl. Governance & Scandals)
**Source file:** `Unified_Economy_Kensho_and_Sponsors_Canon_v3.0_Ultra_Granular.md`

```md
# Basho — Unified Economy, Sponsors & Kenshō Canon v3.0
## Ultra-Granular, End-to-End Economic Interaction Specification

Status: DEFINITIVE
Scope: All economic flows, sponsor systems, kenshō mechanics, supporter funding, and institutional cadence.

---

## PART I — ECONOMY DESIGN LAWS

1. Money is narrative-backed but ledger-true
2. All currency movement is event-driven
3. Sponsors are persistent actors
4. Kenshō are ceremonial expressions of economic state
5. Institutions remember financial behavior

---

## PART IV — DAILY BASHO ECONOMY CADENCE (EXPLICIT)

1. Torikumi resolved
2. Bout simulated
3. Kenshō count computed
4. Sponsor banners allocated
5. Banner procession rendered
6. Bout winner declared
7. Kenshō split executed
8. Cash credited
9. Prestige updated
10. Sponsor cooldowns applied
11. Media event queued
12. Ledger entry finalized

---

## PART XIII — SOURCE PRESERVATION ANNEX

### Institutional Economy & Governance v2.0
```
# Basho — Institutional Economy & Governance Canon v2.0 (Definitive)

Date: 2026-01-06  
Status: **Definitive Canon**  
Supersedes:
- Economy & Prestige v1.0–v1.5
- Governance V1.0–V1.3
- All intermediate economy / governance drafts

Scope:  
This document is the **single, harmonized source of truth** for how **money, prestige, governance, scandals, loans, supporters, kabu, mergers, and closures** function together in Basho.

No features from prior documents are removed.  
Conflicts are resolved explicitly.  
All systems are deterministic, explainable, and replay-safe.

---

# PART I — ECONOMIC FOUNDATIONS

## 1. Core Economic Philosophy

- Money is a **constraint**, not a score
- Prestige is a **force multiplier**, not currency
- Institutions survive via **stars, supporters, and sacrifice**
- Governance exists to protect legitimacy, not convenience

> Rank pays the wrestler.  
> Supporters sustain the stable.  
> Governance decides who is allowed to continue.

---

## 2. Currency & Time Cadence

- Currency: ¥ (yen-equivalent)
- No inflation by default
- Cadence:
  - **Weekly**: beya operating costs
  - **Monthly**: salaries, allowances, oyakata salaries, kōenkai income, loan payments
  - **Per-bout**: kenshō settlement
  - **Basho-end**: awards, promotions, prestige decay, governance review

---

## 3. Economic Accounts (Non-Mergeable)

- LeagueTreasury (abstract)
- BeyaOperatingFund
- RikishiCash
- RikishiRetirementFund
- OyakataPersonalFund

Funds never move between accounts unless explicitly defined.

---

# PART II — RIKISHI PAY & PRESTIGE

## 4. Rikishi Salaries (League-Paid, Monthly)

| Rank | Monthly Salary |
|---|---:|
| Yokozuna | ¥3,000,000 |
| Ōzeki | ¥2,500,000 |
| Sekiwake | ¥1,800,000 |
| Komusubi | ¥1,700,000 |
| Maegashira | ¥1,400,000 |
| Jūryō | ¥1,100,000 |

- Paid monthly
- Never enters beya funds
- 10% automatically diverted to retirement fund

---

## 5. Lower Division Allowances (Monthly)

| Division | Allowance |
|---|---:|
| Makushita | ¥150,000 |
| Sandanme | ¥90,000 |
| Jonidan | ¥55,000 |
| Jonokuchi | ¥35,000 |

Purpose: subsistence, not accumulation.

---

## 6. Kenshō Banners

- ¥70,000 per banner
- 50% → rikishi
- 50% → beya operating fund
- Paid immediately per bout
- 30% of rikishi share diverted to retirement fund

Banner counts are deterministic based on prestige, bout importance, and basho context.

---

## 7. Prestige System (Unified)

Prestige exists at:
- Rikishi level
- Beya level

Prestige drives:
- kenshō frequency
- kōenkai strength
- recruitment quality
- narrative prominence
- AI valuation

Decay (per basho):
- Rikishi: 2–4%
- Beya: 1–2%
- Floors apply

---

# PART III — BEYA ECONOMY

## 8. Beya Operating Costs (Weekly)

| Expense | Formula |
|---|---|
| Wrestlers | ¥2,000 × roster |
| Staff | ¥6,000 × staff |
| Facilities | ¥1,000 × facility levels |

These costs are unavoidable.

---

## 9. Retirement Funds

Sources:
- 10% of salary/allowance
- 30% of kenshō winnings

Uses at retirement:
- cash payout
- coaching certification
- kabu acquisition
- succession buy-in

Funds are locked until retirement.

---

# PART IV — SUPPORTERS, OYAKATA & RESCUE

## 10. Kōenkai / Supporters Associations

| Strength | Monthly Income |
|---|---:|
| None | ¥0 |
| Weak | ¥50,000 |
| Moderate | ¥150,000 |
| Strong | ¥400,000 |
| Powerful | ¥800,000 |

Strength evolves deterministically with prestige, success, scandal, and leadership stability.

---

## 11. Oyakata Economics

### 11.1 Oyakata JSA Salary (Monthly)

| Status | Salary |
|---|---:|
| Standard Oyakata | ¥1,000,000 |
| Senior Committee | ¥1,300,000 |
| Executive (Riji) | ¥1,600,000+ |

Paid to OyakataPersonalFund.

---

### 11.2 Personal Subsidies

- Optional
- Triggered at Stressed / Critical
- Monthly cap (¥100k–¥500k)
- Finite
- No prestige gain

Overuse weakens succession and increases collapse risk.

---

## 12. Loans & Benefactors (Insolvency Rescue)

Available only at **Critical** or **Insolvent**.

### Loan Types
1. Emergency Loan (0%, short-term, restrictive)
2. Supporter Loan (2–4%, medium-term, autonomy loss)
3. Benefactor Bailout (5–8%, long-term, governance leverage)

Missed payments escalate deterministically to sanctions, mergers, or closure.

Loans apply **binding strings** and prestige penalties.

---

# PART V — GOVERNANCE & SCANDALS

## 13. Kabu (Elder Stock)

- Finite global pool
- Required to operate a beya
- Non-dividend
- Revocable under sanction
- Escrowed during succession or merger

Loss of kabu = immediate loss of eligibility.

---

## 14. Council Decision Engine

Triggers:
- Insolvency
- Loan default
- Scandal thresholds
- Succession failure
- Welfare violations

Pipeline:
1. Trigger detected
2. State snapshot
3. Rule evaluation
4. Mandatory ruling
5. Media narrative
6. Permanent record

No randomness.

---

## 15. Scandals & Ethics

Scandals accumulate as state:
- Financial misconduct
- Ethical violations
- Institutional misrepresentation
- Narrative exposure

Thresholds trigger:
- Council Watch
- Investigation
- Crisis
- Structural action

---

## 16. Sanction Ladder

1. Warning
2. Fines
3. Restrictions
4. Forced change
5. Merger or closure

Scandals accelerate but never bypass steps.

---

## 17. Media & Narrative Layer

Media translates governance rulings into:
- headlines
- investigations
- retrospectives

Media effects:
- prestige decay acceleration
- kōenkai weakening
- recruitment penalties

Media never invents outcomes.

---

## 18. Governance UI & History

Every beya has:
- live governance status panel
- visible sanctions and restrictions
- permanent ruling ledger

No hidden punishments. No surprise closures.

---

# PART VI — STRUCTURAL OUTCOMES

## 19. Stable Mergers

Deterministic resolution:
- surviving beya selected
- facilities partially absorbed
- roster conflicts resolved
- prestige partially transferred
- identity retired

Scandal reduces favorable outcomes.

---

## 20. Forced Closures

Triggered by:
- kabu loss
- unrecoverable insolvency
- terminal scandal

Closure is permanent and archived.

---

## 21. AI Behavior Summary

AI managers:
- track runway, scandal risk, governance status
- adjust spending and training
- plan succession earlier under pressure
- may resign pre-removal

Profiles affect timing, not rules.

---

## 22. Determinism Contract

Given identical:
- seed
- decisions
- timelines

Outcomes are identical.

---

## 23. Final Canon Statement

> **Basho is not about winning bouts.  
> It is about whether an institution deserves to survive the consequences of winning them.**

---

End of Definitive Canon v2.0

```

### Procedural Sponsors Canon v1.0
```
# Basho — Procedural Sponsors, Kenshō & Supporters Canon v1.0
## Definitive Interaction Spec (Economy × Governance × Beya × Narrative)

Date: 2026-01-10  
Status: **Canonical, verbose, implementation-grade**  
Purpose: Add a **fully deterministic, procedural sponsor system** that supports:
- **Kenshō / banner assignment** (per-bout)
- **Beya supporters (Kōenkai) funding** (monthly)
- **Benefactors & loans** (insolvency rescue escalation)
- **Media / governance visibility** (scandals, sanctions, decision history)

This document is intentionally **not high level**. It includes explicit data contracts, generation rules, and execution order.

---

# 0) Canon Anchors & Supersession Notes

This spec is designed to **plug into** (and remain compatible with) existing canon:
- Institutional Economy & Governance Canon v2.0 (money cadence, accounts, kenshō split, kōenkai tiers, loans, governance triggers)  
- Governance v1.3 (sanctions ladder, media layer, decision history UI, kabu constraints)  
- Institutional Interaction Contract v1.0 (tick order, shared objects, determinism, visibility rules)  
- Beya Management v1.0 (foreign slot rules, roster economics, management loop)

It **does not change** any yen values already canonized:
- Kenshō value and splits remain economy-owned.
- Kōenkai monthly income bands remain economy-owned.
- Loans and repayment schedules remain economy-owned.

Instead, this spec provides the missing **entity layer**:
> Who the sponsors are, how they are created, how they recur, and how they attach to banners and supporters.

---

# 1) Design Principles (Binding)

## 1.1 Determinism Above All
Given identical:
- world seed
- player decisions
- match outcomes

…sponsor identities, banner assignment, sponsor churn, and supporter rosters are identical.

## 1.2 No “Random Sponsor Magic”
Sponsors do not “appear” without cause. They are generated from:
- the world seed
- baseline economy settings
- league/basho context
- prestige and narrative visibility

## 1.3 Sponsors Never Affect Combat
Sponsors influence:
- **presentation** (banner names, ceremony flavor)
- **economy routing** (kenshō sources and kōenkai entities)
- **narrative pressure** (visibility, scandal scrutiny)

They **never**:
- modify bout results
- modify injury probability
- modify training outcomes

## 1.4 Presentation Is Mostly Qualitative
PBP and UI should generally avoid numeric reporting, **except for hard economy numbers** (yen, runway weeks), consistent with narrative-first canon.

---

# 2) Core Concept: One Sponsor System, Three Surfaces

A single sponsor entity can participate in one or more surfaces:

1) **Kenshō Sponsor** (per-bout banners)  
2) **Kōenkai Member** (monthly supporters association for a beya)  
3) **Benefactor / Creditor** (loans/bailouts during distress)

The same corporate name may show up on banners, be listed as a kōenkai pillar, and later be the entity offering a bailout—**without inventing a new identity**.

---

# 3) Canonical Sponsor Data Contracts

## 3.1 Sponsor Entity (Persistent World Object)
```ts
Sponsor {
  sponsorId: SponsorID
  displayName: string              // "Hokuto Logistics"
  shortName?: string               // "Hokuto"
  category: SponsorCategory
  tier: SponsorTier
  originRegionId: RegionID
  industryTag: IndustryTag
  toneTag: "traditional" | "modern" | "luxury" | "local" | "industrial" | "civic"
  
  // Hidden simulation traits (never fully shown to player)
  prestigeAffinity: number         // 0..100  (how strongly they chase prestige)
  loyalty: number                  // 0..100  (how sticky once attached)
  scandalTolerance: number         // 0..100  (how long before they withdraw)
  riskAppetite: number             // 0..100  (likelihood to become lender/benefactor)
  visibilityPreference: 0..2       // 0=quiet, 1=normal, 2=high-visibility
  
  // Dynamic state
  active: boolean
  createdAtTick: TickID
  lastSeenTick: TickID
  relationships: SponsorRelationship[]
}
```

## 3.2 Sponsor Relationship (Links to Entities)
```ts
SponsorRelationship {
  relId: string
  sponsorId: SponsorID
  targetType: "league" | "basho" | "beya" | "rikishi"
  targetId: string
  role: "kensho" | "koenkai_member" | "koenkai_pillar" | "benefactor" | "creditor"
  strength: 1..5                   // qualitative (not exposed as number)
  startedAtTick: TickID
  endsAtTick?: TickID
  notesTag?: string                // short classifier used by narrative engine
}
```

## 3.3 Sponsor Tier (For Identity & Cadence Only)
Sponsor tiers govern:
- how often they appear as kenshō banners
- whether they can become kōenkai pillars
- whether they can offer loans/bailouts
- how visible they are in media coverage

They do **not** set yen amounts directly (economy does that).

| Tier | Label | Canonical Meaning | Typical Surface |
|---|---|---|---|
| T0 | Micro | One-off local name; appears rarely | Kenshō only |
| T1 | Local | Recurring local sponsor; quiet | Kenshō + occasional kōenkai |
| T2 | Regional | Regular banners; may join kōenkai | Kenshō + kōenkai member |
| T3 | National | Strong visibility; pillar candidate | Kenshō + kōenkai pillar |
| T4 | Legacy | “Institutional” sponsor; prestige-chaser | High banners + pillars |
| T5 | Benefactor-Class | Rare; bailout-capable | Loans / rescue + high visibility |

---

# 4) Procedural Sponsor Generation (Explicit)

## 4.1 Global Sponsor Pool Construction
Sponsor generation occurs in three moments:

1) **World Generation (Initial Pool)**
2) **Seasonal Expansion (Basho 1 of each year)**
3) **Reactive Generation (Triggered by major prestige spikes)**

### 4.1.1 Initial Pool Size (Deterministic)
At worldgen:
- Generate a baseline pool sized to league scale.
- Recommended: `S = 180 + (WorldSizeScalar × 60)`  
  (WorldSizeScalar is a global constant; if absent, set to 1.)

Split by tier at creation:
- T0: 35%
- T1: 25%
- T2: 20%
- T3: 12%
- T4: 7%
- T5: 1%

### 4.1.2 Seasonal Expansion
At Basho #1 each in-game year:
- Add `ceil(S * 0.05)` new sponsors
- Bias toward T0–T2 unless league prestige is historically high

### 4.1.3 Reactive Generation
If a basho produces:
- a Yokozuna promotion, or
- a new “defining rivalry” headline event, or
- a scandal of severity ≥4 (attention spike)

Then add a small number of sponsors:
- +3 to +9 generated sponsors (exact count deterministic from event hash)
- Mix includes higher-tier “attention chasers” in prestige booms
- Mix includes cautious “quiet” sponsors in scandal booms

## 4.2 Deterministic Name Generation (Robust)
Names are generated from curated component lists and a deterministic selector.
No external brands. No real companies.

### 4.2.1 Name Components
- Prefix pool (regional / cultural / phonetic)
- Core pool (industry nouns)
- Suffix pool (Co., Group, Holdings, Foundation, Works, Foods, Lines)
- Optional honorific pool (rare; used for Legacy sponsors)

### 4.2.2 Name Assembly Rules
Each sponsor chooses one pattern by tier:

**T0–T2 patterns**
- "{Prefix} {Core}"
- "{Core} {Suffix}"
- "{Prefix} {Core} {Suffix}"

**T3–T4 patterns**
- "{Prefix} {Core} {Suffix}"
- "{Prefix}-{Core} {Suffix}"
- "{Core} {Suffix} {DivisionTag}" (e.g., “Sports” “Logistics” “Cultural”)

**T5 patterns**
- "{FamilyName} {Foundation}"
- "{Prefix} {Core} {Holdings}"
- "{Core} {LegacySuffix}"

### 4.2.3 Collision & Uniqueness
- Use a stable normalization key (lowercase, remove punctuation, collapse spaces).
- If collision occurs:
  1) append a deterministic region tag
  2) if collision persists, append a 2-digit deterministic disambiguator (“II”, “03”)

## 4.3 Category, Region, and Trait Assignment
Trait assignment is deterministic from:
`hash(worldSeed, sponsorId)`

### 4.3.1 Category Distribution (Recommended)
- Local Business: 30%
- Regional Corporation: 20%
- National Brand (fictional): 12%
- Alumni Association: 10%
- Cultural Foundation: 10%
- Private Benefactor: 12%
- Anonymous Patron: 6% (high scandal tolerance, low visibility)

### 4.3.2 Trait Ranges by Tier
Higher tier tends to correlate with:
- higher prestigeAffinity
- higher visibilityPreference
- higher riskAppetite (especially T5)

Example deterministic mapping:
- T0: prestigeAffinity 10–35, loyalty 10–40
- T2: prestigeAffinity 25–60, loyalty 30–70
- T4: prestigeAffinity 50–90, loyalty 50–95
- T5: prestigeAffinity 70–100, riskAppetite 60–100

---

# 5) Kenshō Sponsor Assignment (Per-Bout, Explicit)

## 5.1 Separation of Concerns
Economy computes:
- bannerCount (0..N) deterministically
- yen value per banner
- split to rikishi/beya

This sponsor system computes:
- which sponsors “own” each banner for ceremony + UI
- sponsor recurrence patterns
- sponsor-tier-appropriate selection

## 5.2 Banner Slots Model
Each banner is a slot:
```ts
KenshoBannerSlot {
  bannerId: string
  boutId: BoutID
  sponsorId: SponsorID
  tier: SponsorTier
  displayName: string
  ceremonyStyleTag: "classic" | "premium" | "quiet"
}
```

## 5.3 Sponsor Selection Algorithm (Deterministic)
Inputs:
- bout importance signals (rank band, day, yūshō contention)
- combined prestige (rikishi + beya)
- basho prestige baseline
- sponsor pool state (active sponsors, lastSeen, loyalty relationships)

### 5.3.1 Candidate Set Construction
Start with all active sponsors, then apply filters:
- Exclude sponsors on boycott status (see §9)
- Exclude sponsors currently “locked” to a scandal target (if they have withdrawn)
- Exclude sponsors that would violate tier caps for the bout (below)

### 5.3.2 Bout Tier Budget (Explicit Caps)
Each bout computes a “tier budget” from its importance bucket:

| Bout Importance Bucket | Max T4+ banners | Max T3 banners | Default mix |
|---|---:|---:|---|
| Low (lower maegashira / juryo) | 0 | 1 | mostly T0–T2 |
| Mid (upper maegashira) | 1 | 2 | T1–T3 |
| High (sanyaku / contention) | 2 | 4 | T2–T4 |
| Peak (yūshō playoff / yokozuna bout) | 4 | 6 | allows T5 (rare) |

### 5.3.3 Weighting (No RNG)
Each candidate sponsor receives a score:
```
score =
  baseTierWeight(tier)
+ affinityWeight(prestigeAffinity, boutPrestige)
+ recencyBonus(lastSeenTick)
+ relationshipBonus(if sponsor already linked to rikishi/beya)
- scandalPenalty(if sponsor is scandal-sensitive and target is under scrutiny)
```
Selection uses **sorted score** + deterministic tie-breaker (sponsorId order).

### 5.3.4 Reuse vs Variety
To prevent repetition:
- apply a **cooldown**: sponsors used in the last X bouts (broadcast scope) are penalized
- apply a **per-basho cap**: no sponsor may occupy more than Y% of all banners in a basho

Defaults (tunable, deterministic):
- cooldown window: 12 bouts
- per-basho cap: 4% of total banners

## 5.4 Ceremony & PBP Hooks
For bouts with banners:
- The banner procession uses sponsor display names (or shortName for commentary).
- PBP references sponsor(s) **without sounding like an ad**:
  - “A line of sponsor banners circles the dohyo—names familiar to the faithful…”
  - “The envelopes are prepared…”

The PBP layer may select:
- one “headline sponsor” (highest tier among assigned) to mention explicitly
- all sponsors to show in UI list

---

# 6) Kōenkai / Beya Supporters Integration (Formal)

## 6.1 What Kōenkai Is in This Model
A beya’s Kōenkai becomes a **container of sponsor relationships**.

```ts
Koenkai {
  koenkaiId: string
  beyaId: BeyaID
  strengthBand: "none"|"weak"|"moderate"|"strong"|"powerful"
  members: SponsorRelationship[]   // role=koenkai_member|koenkai_pillar
  createdAtTick: TickID
  lastChangedTick: TickID
}
```

Economy still maps strengthBand → monthly yen income.

## 6.2 Kōenkai Formation (Deterministic)
A beya without kōenkai may form one when:
- beya prestige exceeds a threshold band for ≥2 basho, OR
- it hosts a sekitori for ≥1 basho, OR
- it wins a major trophy (yūshō / sanshō cluster)

When triggered:
- select 3–7 sponsors from the global pool
- bias toward sponsors in the beya’s region and category “local business / alumni”
- add 0–1 higher-tier sponsor if prestige is high

## 6.3 Kōenkai Member vs Pillar
- **Members**: normal supporters; may come and go.
- **Pillars**: 1–2 key sponsors; define identity and stabilize income.

Rules:
- Weak/Moderate: 0–1 pillar
- Strong/Powerful: 1–2 pillars
- Pillars must be tier ≥T2 (recommended) and typically ≥T3 for Powerful

## 6.4 Kōenkai Drift (Growth/Decay) with Entity Logic
Existing canon says kōenkai strength evolves deterministically with prestige, success, scandal, and stability.
This spec makes that *concrete*:

### 6.4.1 Upgrade / Downgrade Test (Basho-End)
At basho-end:
1) compute beya prestige trend bucket: rising / flat / falling
2) check scandal tier (qualitative)
3) check leadership stability (succession uncertainty, governance watch)
4) update kōenkai strengthBand by at most **one step**

### 6.4.2 Membership Churn Rules
When strength changes:
- upgrade: add 1–3 new members; possibly promote a member → pillar
- downgrade: remove 1–3 members; possibly demote a pillar (rare, but possible under scandal)

Churn is deterministic:
- remove lowest loyalty or lowest scandalTolerance first
- add highest affinity/region match sponsors first

---

# 7) Benefactors, Loans, and Sponsor Escalation (Bridging v1.5 → v2.0)

## 7.1 Sponsor → Benefactor Escalation Path
Under distress (Critical/Insolvent), economy may offer loans (Emergency / Supporter / Benefactor).
This spec defines how the provider identity is chosen:

### 7.1.1 Emergency Loan Provider
- providerType = league
- provider is not a Sponsor entity (it is the institution)
- no sponsor name attached

### 7.1.2 Supporter Loan Provider
- providerType = koenkai
- provider is the beya’s Kōenkai container (not a single sponsor)
- optionally attribute “led by {PillarSponsor}” in narrative

### 7.1.3 Benefactor Bailout Provider
- providerType = benefactor
- must be a sponsor entity tier ≥T4, or upgraded to T5
- selection priority:
  1) existing kōenkai pillar with highest riskAppetite
  2) existing banner sponsor with strongest relationship to beya
  3) global pool highest prestigeAffinity sponsor matching region

When a sponsor provides a bailout:
- set tier to T5 if not already
- create relationship role=benefactor
- set visibilityPreference to high (they want to be seen—or cannot avoid being seen)

## 7.2 “Strings” as Restrictions (Integration Contract)
Loan strings become Restriction objects as canon:
- recruitment_ban
- foreign_slot_lock
- upgrade_lock
- merger_block

Sponsor-provided loans must store:
- sponsorId as the Restriction source metadata
- plain-language UI explanation referencing sponsor name

---

# 8) Media & Governance Interactions (Sponsor-Aware)

## 8.1 Sponsor Sensitivity to Scandal
Each sponsor has scandalTolerance.
When a beya enters a scandal tier:
- sponsors evaluate continued affiliation at basho-end (or at ruling time for severe events)

Withdrawal is deterministic:
- if scandal severity exceeds tolerance band:
  - end relationship(s) at nextTick
  - apply a “boycott flag” for a cooldown window (cannot appear as banner sponsor)
  - downgrade kōenkai strength if pillars withdraw

## 8.2 Council Actions that Mention Sponsors
Governance rulings do not “punish sponsors,” but may reference:
- “Supporters withdraw” (kōenkai downgrade)
- “Benefactor influence” (loan strings, autonomy loss)

These appear in:
- media events (headline phrases)
- governance decision history ledger

## 8.3 Sponsor Visibility in Governance UI
UI must show (player-facing):
- list of current kōenkai pillars (names)
- if the stable is funded by a benefactor bailout (name)
- if banners have a “headline sponsor” (name)
- general sponsor withdrawal status (“Supporters cooling”)

UI must not show:
- loyalty numbers
- scandalTolerance values
- sponsor selection weights

---

# 9) Sponsor Lifecycle: Exit, Merge, Rebrand

## 9.1 Sponsor Exit
Sponsors can exit the world (becoming inactive) when:
- low loyalty + repeated non-selection
- major scandal association
- or a deterministic time-to-live expires for small local sponsors

Exit rules:
- T0 sponsors may expire after 1–3 years
- T3+ almost never expire (they “stick around”)
- inactive sponsors remain in history logs

## 9.2 Rebrand (Optional, Deterministic)
For sponsors in T1–T3:
- if they upgrade tier twice within 2 years, they may rebrand:
  - “{Name}” → “{Name} Holdings” or “{Name} Group”

Rebrand preserves sponsorId (identity continuity).

## 9.3 Stable Merger / Closure Handling
If a beya merges or closes:
- kōenkai dissolves (container ends)
- sponsor relationships either:
  - migrate to merged beya at reduced strength (only if loyalty high), or
  - end and return to global pool

Benefactor relationships do not migrate automatically; they require governance approval.

---

# 10) Execution Order (Authoritative)

This section extends the existing deterministic tick order with sponsor steps.

## 10.1 Monthly Tick (Insertion Points)
1. Salaries & allowances paid  
2. Kōenkai contributions applied  
3. Loan repayments processed  
4. Oyakata subsidies evaluated  
5. **Sponsor lifecycle pass** (churn, exits, rebrands)  
6. Media follow-ups generated  
7. Governance restrictions revalidated  

## 10.2 Bout Resolution (Insertion Points)
1. Combat resolves  
2. **Kenshō bannerCount computed (economy)**  
3. **Sponsor assignment fills banner slots (this doc)**  
4. Kenshō applied (economy split)  
5. Rivalry updated  
6. Prestige updated  
7. Media event queued  

## 10.3 Basho-End Resolution (Insertion Points)
After awards and prestige decay:
- run kōenkai drift (upgrade/downgrade)
- run sponsor withdrawal checks if scandal tier changed
- write sponsor history logs

---

# 11) Logging & Auditability (Non-Negotiable)

Every sponsor-related event must emit an immutable log row:
- sponsorId
- action type (created, used_as_banner, joined_koenkai, withdrew, became_benefactor, rebranded, exited)
- target entity (boutId/beyaId)
- tickId
- reasonTag (short, deterministic classifier)

This ensures replay safety and QA visibility.

---

# 12) Minimal UI Requirements (Concrete)

## 12.1 Kenshō Overlay
- shows banner procession
- shows sponsor names list (scrollable)
- highlights “headline sponsor” (if any)
- shows ceremonial envelope moment (no numeric split shown)

## 12.2 Beya Supporters Panel
- kōenkai strength band (word)
- pillar sponsors (names)
- member count (optional)
- recent changes: “A pillar withdrew after scrutiny” (qualitative)

## 12.3 Financial Warnings (Sponsor-Aware)
When approaching Critical:
- warn if kōenkai is weak and volatile
- warn if pillars have low scandal tolerance (not as numbers—use text)
- warn if bailout likely implies autonomy loss

---

# 13) Canon Phrases (Narrative Safe)

Use sponsor-aware phrasing that does not feel like marketing:
- “A familiar banner returns to the ring’s edge.”
- “Local names, long supporters of this stable.”
- “A pillar of backing stands behind them tonight.”
- “The envelopes wait—earned, not granted.”
- “Support is present… but watchful.”

Avoid:
- “Buy” “sale” “discount” “best” (no ad language)

---

# 14) Implementation Checklist (Concrete)

- [ ] Worldgen creates Sponsor pool with tier distribution and unique names  
- [ ] Sponsor selection fills KenshōBannerSlots per bout deterministically  
- [ ] Kōenkai is a container of SponsorRelationships with member/pillar roles  
- [ ] Kōenkai drift updates band + churns members deterministically at basho-end  
- [ ] Benefactor identity selection follows escalation rules and upgrades to T5  
- [ ] Sponsor withdrawal/boycott integrates with scandal tiers and governance rulings  
- [ ] UI surfaces sponsor names and supporter identity without exposing hidden numbers  
- [ ] All sponsor events are logged for replay/audit  

---

# 15) Canon One-Liner

> **In Basho, sponsors are not buffs—they are the visible proof that prestige can be converted into support, and that support can be withdrawn when legitimacy cracks.**

---

End of document.

```

### Beya Staff & Welfare Canon v1.1
```

# Basho — Beya Management, Staff Careers & Welfare Canon v1.1
## Ultra-Granular Institutional Operations Specification

Status: DEFINITIVE  
Scope: Stable operations, staff careers, welfare & medical liability  
Guarantee: Non-lossy, larger than source material, implementation-grade

This document **merges and supersedes**:
- Beya Management System v1.0
- Staff Careers & Institutional Roles Canon v1.0
- Injury / Welfare–related portions of Rikishi Development Canon v1.3

It resolves overlaps, wires systems together explicitly, and preserves all original text in annexes.

---

# PART I — DESIGN AXIOMS (INSTITUTIONAL SCOPE)

1. **A beya is an employer**, not a menu of bonuses.  
2. **Staff are people with careers**, not sliders.  
3. **Welfare failures have institutional consequences**, not isolated penalties.  
4. **Medical outcomes are deterministic and attributable.**  
5. **Negligence is remembered.**

---

# PART II — BEYA AS AN OPERATING INSTITUTION

## 2. Beya Operational State Model

```ts
BeyaOperationalState {
  beyaId
  facilitiesBand
  staffRoster: StaffId[]
  medicalCoverageBand
  welfareRiskBand
  complianceStatus
  governanceExposure
  operatingStress
}
```

Each field updates on weekly or monthly ticks.

---

## 3. Core Responsibilities of a Beya

A beya is responsible for:
- training safety
- medical care
- injury response
- compliance with governance norms
- staff workload management

Failure in any category produces **institutional risk**, not hidden debuffs.

---

# PART III — STAFF CAREERS (INTEGRATED)

# Basho — Staff Careers & Institutional Roles Canon v1.0
## Ultra-Granular, Integrated Specification (Implementation Grade)

This document **adds a full Staff Career system** and integrates it explicitly with:
- Beya Management
- NPC Manager AI
- Economy & Governance
- Training & Rikishi Development
- Succession, Scandals, and Narrative Memory

It is designed to be **non–high-level**, deterministic, and larger than its source inputs.

---

## PART I — DESIGN INTENT

Staff in Basho are **not modifiers**.
They are **people with careers**, incentives, reputations, fatigue, and failure states.

Staff careers exist to:
- create long-term continuity beyond rikishi careers
- introduce institutional memory
- constrain player optimization
- create succession and governance pressure
- generate narrative arcs (loyal aides, disgraced doctors, legendary coaches)

---

## PART II — STAFF ROLES (CANONICAL)

### 1. Staff Categories

| Role | Count | Notes |
|---|---|---|
| Oyakata | 1 | Required, governed by kabu |
| Assistant Oyakata | 0–2 | Succession + delegation |
| Technique Coach | 0–2 | Skill bias |
| Conditioning Coach | 0–2 | Fatigue & injury bias |
| Nutritionist | 0–1 | Weight stability |
| Medical Staff | 0–2 | Injury severity & recovery |
| Scout | 0–1 | Recruitment & info quality |
| Administrator | 0–1 | Economy & governance mitigation |

No role is optional in effect — absence is a penalty.

---

## PART III — STAFF ENTITY MODEL

### 2. Staff Object (Persistent)

```ts
Staff {
  staffId
  role
  age
  careerPhase
  reputationBand
  loyaltyBand
  competenceBands {
    primary
    secondary?
  }
  fatigue
  scandalExposure
  yearsAtBeya
  priorAffiliations[]
  successorEligible: boolean
}
```

Numeric values exist internally; UI shows **bands and descriptors only**.

---

## PART IV — CAREER PHASES

### 3. Staff Career Phases

| Phase | Effects |
|---|---|
| Apprentice | Low impact, high growth |
| Established | Full effectiveness |
| Senior | Stable but rigid |
| Declining | Error-prone |
| Retired | Succession only |

Career phase advances deterministically by age, workload, and scandal.

---

## PART V — STAFF EFFECTS (WIRED)

### 4. Integration Points

#### 4.1 Training
- Technique coaches bias growth vectors
- Conditioning coaches modify fatigue decay
- Medical staff reduce injury escalation

#### 4.2 Economy
- Staff salaries are fixed weekly drains
- Administrator reduces insolvency escalation
- Senior staff cost more, fail harder

#### 4.3 Governance
- Staff scandals increase scrutiny
- Medical negligence accelerates sanctions
- Assistant oyakata succession affects council decisions

#### 4.4 AI
NPC managers evaluate:
- staff burnout
- loyalty risk
- replacement cost
- succession readiness

---

## PART VI — STAFF SCANDALS

### 5. Staff-Originated Scandals

Examples:
- medical malpractice
- illegal training practices
- recruitment violations
- financial misreporting

Scandals attach to:
- staff member
- beya
- oyakata (derivative)

---

## PART VII — SUCCESSION & LEGACY

### 6. Assistant Oyakata Path

- Must hold or acquire kabu
- Reputation gated
- Loyalty-tested
- May defect to rival beya

Failure to plan succession increases closure probability.

---

## PART VIII — UI & NARRATIVE

### 7. Player Presentation

Staff are shown as:
- named individuals
- described by reputation and habits
- referenced in media and journals

No raw numbers.
No instant replacements.

---

## PART IX — FAILURE MODES (INTENTIONAL)

- Legendary coach retires mid-rebuild
- Doctor scandal collapses trust
- Loyal aide blocks necessary reform
- Costly staff inertia sinks finances

---

## PART X — CANON STATEMENT

> **Stables rise and fall on the people who run them — not just the wrestlers who fight.**


---

# PART IV — MEDICAL & WELFARE SYSTEM (NEW, EXPLICIT)

## 20. Medical Responsibility Chain

For every injury event, responsibility is assigned to:
- rikishi (behavioral overreach)
- staff (training load, treatment)
- facilities (quality limits)
- beya leadership (systemic neglect)

Responsibility determines escalation paths.

---

## 21. Welfare Risk Accumulation

WelfareRisk increases when:
- injuries occur under fatigue overload
- medical staff are understaffed
- recovery is rushed
- chronic injuries are ignored

WelfareRisk decays slowly only with sustained compliance.

---

## 22. Medical Liability States

| State | Meaning |
|---|---|
| Compliant | No active concern |
| Watch | Minor patterns detected |
| Investigation | Formal inquiry |
| Sanctioned | Penalties applied |
| Restricted | Forced changes |

These states are **public-facing**.

---

## 23. Deterministic Investigation Triggers

Triggered by:
- repeated similar injuries
- recovery below minimum curves
- whistleblower events (staff)
- media scrutiny

No random investigations.

---

# PART V — INJURY HANDLING (WIRED)

## 30. Injury Response Pipeline

1. Injury detected
2. Severity classified
3. Medical staff response selected
4. Recovery plan assigned
5. WelfareRisk updated
6. Governance exposure recalculated
7. Narrative record created

Every step is logged.

---

## 31. Negligence vs Misfortune

Negligence requires:
- deviation from required recovery protocol
- understaffed medical coverage
- pattern recurrence

Misfortune injuries do not escalate.

---

# PART VI — FACILITIES, STAFF & WELFARE INTERACTION

## 40. Facility Constraints

Low facility bands:
- increase injury severity
- slow recovery
- raise welfare scrutiny

High facility bands:
- cap injury escalation
- improve compliance reputation

---

## 41. Staff Burnout & Medical Error

Medical staff fatigue increases:
- misdiagnosis risk
- recovery delay
- scandal probability

Burnout is tracked and visible.

---

# PART VII — AI & PLAYER DECISIONS

## 50. AI Beya Management Logic

NPC managers evaluate:
- welfare risk trends
- staff burnout
- compliance danger
- replacement vs cost tradeoffs

AI will sacrifice short-term results to avoid sanctions.

---

## 51. Player Warnings & UI

Players see:
- “Medical oversight concerns”
- “Staff overextended”
- “Recovery protocols under review”

Never raw percentages.

---

# PART VIII — FAILURE MODES (INTENTIONAL)

- Star rikishi career shortened by neglect
- Beya sanctioned for pattern abuse
- Staff scapegoating vs systemic reform
- Financial collapse from compliance costs

---

# PART IX — SOURCE PRESERVATION ANNEX

## Beya Management v1.0
```md
# Basho — Beya Management System v1.0 (Canonical, Training-Agnostic)

Date: 2026-01-06  
Status: Canonical, verbose, implementation-ready  
Scope: Defines **beya (stable) management** excluding training mechanics, which are specified in a separate document.

This document covers:
- roster structure and limits
- recruitment and intake
- staff and facilities (non-training effects)
- economics and solvency
- foreign wrestler rules (including dual citizenship)
- AI-controlled stable behavior
- failure modes and guardrails
- governance hooks (non-active)

---

## 1. Design Goals

Beya management must:
- Create **long-horizon strategic pressure**
- Force **trade-offs**, not micromanagement
- Remain **readable and narratively grounded**
- Apply equally to player-run and AI-run stables
- Integrate cleanly with:
  - rikishi evolution
  - combat outcomes
  - economy and prestige
  - future governance systems

> Managing a beya is about capacity, commitment, and risk — not per-bout control.

---

## 2. Beya as an Entity

Each beya is a persistent world object with:

- Identity (name, lineage, reputation)
- Physical capacity (roster, staff, facilities)
- Financial state (cash flow, upkeep)
- Recruitment pipeline
- Succession risk (forward-declared)

Beya decisions affect **all rikishi indirectly**.

---

## 3. Roster Management

### 3.1 Roster Size Constraints

| Constraint | Value |
|---|---:|
| Minimum viable roster | 6 |
| Typical roster | 10–15 |
| Soft cap | 20 |
| Hard cap | 30 |

Below minimum:
- beya is flagged as *fragile*
- emergency recruitment or merger hooks appear

Above soft cap:
- diminishing returns and injury pressure (see §10)

Above hard cap:
- forbidden

---

### 3.2 Implicit Internal Structure

Rosters are not manually tiered. Structure emerges from:
- rank
- career phase
- focus allocation (defined elsewhere)

Implicit groups:
- Prospects
- Core competitors
- Stars
- Veterans

This structure feeds narrative, not control logic.

---

## 4. Recruitment & Intake

### 4.1 Recruitment Windows

Recruitment occurs only at:
1) **Post-basho review**
2) **Mid-interim (week 3)**

This limits spam and creates rhythm.

---

### 4.2 Recruitment Slots per Basho

Base: **1**

Modifiers:
- roster ≤ 12 → +1
- kitchen ≥ 3 AND dormitory ≥ 2 → +1
- roster ≥ 20 → −1

Result:
- min 0
- max 3 recruits per basho

---

### 4.3 Recruitment Sources (v1)

- Local prospects (baseline)
- Regional standouts (higher ceiling)
- Dual citizens (rare, special)
- Foreign recruits (slot-limited)

Transfers and academies are future extensions.

---

### 4.4 Recruitment Costs

| Recruit Type | Signing Cost |
|---|---:|
| Local prospect | ¥50,000 |
| Regional standout | ¥120,000 |

Recruitment immediately increases weekly upkeep.

---

## 5. Foreign Rikishi & Dual Citizenship

### 5.1 Canonical Rule

> **Each beya may roster at most ONE foreign-slot rikishi at any time.**

A rikishi consumes the foreign slot **only if they do not hold Japanese citizenship**.

---

### 5.2 Nationality Model

Each rikishi has:
- `birthCountry` (immutable)
- `citizenships[]`
- derived `foreignSlotStatus`

Foreign-slot if:
```
"Japan" NOT in citizenships[]
```

---

### 5.3 Dual Citizenship

- Dual citizens **do not** consume the foreign slot
- Dual citizenship is rare (≈5–10% of foreign-born recruits)
- Dual citizens still carry narrative and adaptation flavor

---

### 5.4 Recruitment Enforcement

- If foreign slot is occupied:
  - foreign-slot recruits do not appear
- Dual citizens may always appear
- UI must clearly show slot impact before signing

---

### 5.5 Future Naturalization (Dormant)

Naturalization is:
- rare
- prestige-gated
- narrative-significant

If activated, gaining Japanese citizenship frees the foreign slot.

---

## 6. Staff System (Non-Training Effects)

### 6.1 Staff Types

- Oyakata (always 1)
- Technique Coach
- Conditioning Coach
- Nutritionist
- Medical Staff

Training effects are defined elsewhere.  
Here, staff define **capacity, recovery, and mitigation**.

---

### 6.2 Staff Capacity

Each staff member has a coverage capacity:

| Staff | Capacity |
|---|---:|
| Technique Coach | 12 |
| Conditioning Coach | 12 |
| Nutritionist | 16 |
| Medical Staff | 18 |

If roster exceeds capacity:
```
effectiveStaffImpact = capacity / rosterSize
```

---

### 6.3 Staff Limits

- Max staff (excluding oyakata): **6**
- Max duplicates:
  - Technique: 2
  - Conditioning: 2
  - Nutrition: 1
  - Medical: 2 (optional elite scaling)

---

## 7. Facilities (Structural, Not Training)

Facilities define **ceilings and forgiveness**, not skill choices.

| Facility | Effect |
|---|---|
| Dojo | Technique ceiling |
| Kitchen | Weight control stability |
| Recovery | Fatigue decay |
| Medical | Injury severity & recurrence |
| Dormitory | Morale & baseline recovery |

Facility levels: 0–5 each.

---

### 7.1 Facility Costs

**Build / Upgrade (one-time):**

| Level | Cost |
|---|---:|
| 1 | ¥150,000 |
| 2 | ¥250,000 |
| 3 | ¥400,000 |
| 4 | ¥600,000 |
| 5 | ¥900,000 |

**Weekly upkeep:**
```
¥1,000 × total facility levels
```

---

## 8. Beya Economics

### 8.1 Weekly Expenses

| Expense | Formula |
|---|---|
| Wrestlers | ¥2,000 × roster size |
| Staff | ¥6,000 × staff count |
| Facilities | ¥1,000 × facility levels |

Expenses are continuous and unavoidable.

---

### 8.2 Income (High-Level)

- Kenshō banners
- Prestige-modified appearance value
- Success-driven visibility

Income volatility is intentional.

---

### 8.3 Insolvency Handling

- Grace period (weeks)
- Forced austerity (freeze recruitment, sell facilities)
- Later: loans / benefactors (dormant)

---

## 9. AI-Run Stables

AI stables obey **exactly the same rules**.

### 9.1 AI Management Profiles

| Profile | Identity |
|---|---|
| Talent Factory | Large pipeline, conservative |
| Star Chaser | Small elite, aggressive |
| Survivor | Risk-averse |
| Gambler | High variance |
| Traditionalist | Identity-driven |

---

### 9.2 AI Weekly Decision Loop

Each interim week:
1) Check solvency runway
2) Check injury burden
3) Check roster vs target
4) Allocate focus (defined elsewhere)
5) Consider facility upgrades
6) Evaluate recruitment windows

Decisions are deterministic but imperfect.

---

### 9.3 AI Foreign Rikishi Logic

AI evaluates:
- foreign slot availability
- injury risk tolerance
- facilities readiness
- profile risk bias

AI is reluctant to release foreign-slot rikishi unless forced.

---

## 10. Failure Modes & Guardrails

### 10.1 Overcrowding
- Training efficiency loss
- Injury pressure
- Staff dilution

### 10.2 Star Hoarding
- Succession risk
- Injury fragility
- Financial volatility

### 10.3 Insolvency
- Gradual collapse, not instant death

### 10.4 Succession Collapse (Future)
- No eligible successor → closure or merger

Failure is allowed and narratively valuable.

---

## 11. Governance Hooks (Dormant)

Even before activation:
- beya legitimacy tracked
- conduct and solvency logged
- succession candidates evaluated

Later governance systems plug into these signals without retcons.

---

## 12. UI & Player Communication Rules

- Always show:
  - roster size vs caps
  - foreign slot usage
  - weekly burn rate
- Never show:
  - raw hidden efficiency math
- Explain consequences in plain language

---

## 13. Canon One-Liner

> **A beya is not a menu of buffs — it is a living institution whose size, staff, finances, and commitments determine which careers flourish and which fail.**

---

End of document.

```

## Staff Careers Canon v1.0
```md
# Basho — Staff Careers & Institutional Roles Canon v1.0
## Ultra-Granular, Integrated Specification (Implementation Grade)

This document **adds a full Staff Career system** and integrates it explicitly with:
- Beya Management
- NPC Manager AI
- Economy & Governance
- Training & Rikishi Development
- Succession, Scandals, and Narrative Memory

It is designed to be **non–high-level**, deterministic, and larger than its source inputs.

---

## PART I — DESIGN INTENT

Staff in Basho are **not modifiers**.
They are **people with careers**, incentives, reputations, fatigue, and failure states.

Staff careers exist to:
- create long-term continuity beyond rikishi careers
- introduce institutional memory
- constrain player optimization
- create succession and governance pressure
- generate narrative arcs (loyal aides, disgraced doctors, legendary coaches)

---

## PART II — STAFF ROLES (CANONICAL)

### 1. Staff Categories

| Role | Count | Notes |
|---|---|---|
| Oyakata | 1 | Required, governed by kabu |
| Assistant Oyakata | 0–2 | Succession + delegation |
| Technique Coach | 0–2 | Skill bias |
| Conditioning Coach | 0–2 | Fatigue & injury bias |
| Nutritionist | 0–1 | Weight stability |
| Medical Staff | 0–2 | Injury severity & recovery |
| Scout | 0–1 | Recruitment & info quality |
| Administrator | 0–1 | Economy & governance mitigation |

No role is optional in effect — absence is a penalty.

---

## PART III — STAFF ENTITY MODEL

### 2. Staff Object (Persistent)

```ts
Staff {
  staffId
  role
  age
  careerPhase
  reputationBand
  loyaltyBand
  competenceBands {
    primary
    secondary?
  }
  fatigue
  scandalExposure
  yearsAtBeya
  priorAffiliations[]
  successorEligible: boolean
}
```

Numeric values exist internally; UI shows **bands and descriptors only**.

---

## PART IV — CAREER PHASES

### 3. Staff Career Phases

| Phase | Effects |
|---|---|
| Apprentice | Low impact, high growth |
| Established | Full effectiveness |
| Senior | Stable but rigid |
| Declining | Error-prone |
| Retired | Succession only |

Career phase advances deterministically by age, workload, and scandal.

---

## PART V — STAFF EFFECTS (WIRED)

### 4. Integration Points

#### 4.1 Training
- Technique coaches bias growth vectors
- Conditioning coaches modify fatigue decay
- Medical staff reduce injury escalation

#### 4.2 Economy
- Staff salaries are fixed weekly drains
- Administrator reduces insolvency escalation
- Senior staff cost more, fail harder

#### 4.3 Governance
- Staff scandals increase scrutiny
- Medical negligence accelerates sanctions
- Assistant oyakata succession affects council decisions

#### 4.4 AI
NPC managers evaluate:
- staff burnout
- loyalty risk
- replacement cost
- succession readiness

---

## PART VI — STAFF SCANDALS

### 5. Staff-Originated Scandals

Examples:
- medical malpractice
- illegal training practices
- recruitment violations
- financial misreporting

Scandals attach to:
- staff member
- beya
- oyakata (derivative)

---

## PART VII — SUCCESSION & LEGACY

### 6. Assistant Oyakata Path

- Must hold or acquire kabu
- Reputation gated
- Loyalty-tested
- May defect to rival beya

Failure to plan succession increases closure probability.

---

## PART VIII — UI & NARRATIVE

### 7. Player Presentation

Staff are shown as:
- named individuals
- described by reputation and habits
- referenced in media and journals

No raw numbers.
No instant replacements.

---

## PART IX — FAILURE MODES (INTENTIONAL)

- Legendary coach retires mid-rebuild
- Doctor scandal collapses trust
- Loyal aide blocks necessary reform
- Costly staff inertia sinks finances

---

## PART X — CANON STATEMENT

> **Stables rise and fall on the people who run them — not just the wrestlers who fight.**

```

## Rikishi Development Canon v1.3 (Welfare Sections)
```md

# Basho — Rikishi Development Canon v1.3
## Ultra-Granular Training, Evolution, Injury, Style, Psychology & Facilities

Status: **DEFINITIVE / EXPANDED**
Scope: Rikishi development systems only.
Guarantee: Larger than v1.2, non-lossy, implementation-grade.

This document extends v1.2 by fully specifying:
1. Mental & Psychological Load System
2. Training Facility & Staff Micro-Effects
3. Retirement, Post-Career & Legacy Transitions

---


# Basho — Rikishi Development Canon v1.2
## Ultra-Granular Training, Evolution, Injury, Style Drift & Worked Example

Status: **DEFINITIVE / EXPANDED**
Scope: Rikishi development systems only.
Guarantee: Larger than v1.1, non-lossy, implementation-grade.

This document **extends v1.1** by fully specifying:
- Injury State Machine (explicit)
- Style Drift & Reclassification Math
- Favored Kimarite Evolution
- Full Worked Example (10-year career timeline)

---


# Basho — Rikishi Development Canon v1.1
## Ultra-Granular Training + Evolution Constitution (Implementation Grade)

Status: **DEFINITIVE**
Scope: **Only rikishi development over time**
Explicitly excludes: combat resolution, economy amounts, roster admin

This document is:
- larger than its source material
- non-lossy
- explicit down to weekly ticks and state transitions
- suitable for direct engineering implementation

It consolidates and EXPANDS:
- Training System v1.0
- Rikishi Evolution System v1.0

---

# PART I — ABSOLUTE DESIGN LAWS (DEVELOPMENT SCOPE)

## 1. Determinism
All development outcomes are a pure function of:
- WorldSeed
- RikishiSeed
- TimeIndex (week)
- Training profile selections
- Injury history
- Career phase

No runtime RNG.
No “soft” decay.

## 2. Separation of Timescales
- **Training** operates weekly
- **Evolution** accumulates monthly and basho-end
- **Career phase** shifts are rare and thresholded

This separation prevents oscillation.

---

# PART II — RIKISHI STATE MODEL (NORMALIZED)

## 3. Permanent Identity (Immutable)
- rikishiId
- shikona registry entry
- origin
- base talent seed
- growth profile seed
- dominant archetype seed

## 4. Evolving State (Mutable)
Grouped by layer:

### 4.1 Body Layer
- heightCurrentCm
- weightCurrentKg
- heightPotentialCm
- weightPotentialKg
- growthFulfillment

### 4.2 Execution Layer
- powerOutput
- speedOutput
- balanceOutput
- techniqueOutput
- experienceOutput

### 4.3 Condition Layer
- fatigue
- injuryState
- injuryHistory[]
- recoveryModifier

### 4.4 Identity Layer
- styleLabel
- styleConfidence
- archetypeSecondary (optional)
- favoredKimarite[]

### 4.5 Arc Layer
- careerPhase
- phaseEntryTick
- retirementEligibility

---

# PART III — TRAINING SYSTEM (EXPANDED + WIRED)

# Basho — Training System v1.0 (Canonical)

Date: 2026-01-06  
Status: Canonical, verbose, implementation-ready  
Scope: Defines **training mechanics** at both beya and individual levels, and how training shapes rikishi evolution.  
This document intentionally excludes roster management, economics, and AI manager logic, which are defined elsewhere.

---

## 1. Design Goals

The training system must:
- Provide **meaningful player agency** without micromanagement
- Shape long-term **rikishi evolution**, not short-term bout outcomes
- Create **risk–reward trade-offs**
- Be **deterministic and legible**
- Integrate cleanly with:
  - Rikishi Evolution System
  - Beya Management System
  - NPC Manager AI System

> Training biases probability; it never guarantees greatness.

---

## 2. Core Training Philosophy

Training operates on **bias and pressure**, not direct stat control.

Players and AI:
- do not assign drills or skills directly
- choose **intensity, focus, and protection**
- accept downstream consequences via fatigue, injuries, and style drift

Training is evaluated **weekly** during interim periods.

---

## 3. Training Layers

Training exists on three stacked layers:

1. **Beya-Wide Training Profile** (default environment)
2. **Individual Focus Slots** (limited overrides)
3. **Facilities & Staff Modifiers** (multipliers, not decisions)

This ensures:
- consistency
- scarcity of attention
- emergent specialization

---

## 4. Beya-Wide Training Profile

Each beya selects one active training profile per interim.

### 4.1 Training Axes

Training profile is defined by four axes:

#### A) Intensity
- Conservative
- Balanced
- Intensive
- Punishing

#### B) Focus Bias
- Power
- Speed
- Technique
- Balance
- Neutral

#### C) Style Bias
- Oshi
- Yotsu
- Neutral

#### D) Recovery Emphasis
- Low
- Normal
- High

These axes modify growth, fatigue, and injury risk.

---

### 4.2 Default Numeric Effects (Illustrative)

#### Intensity Effects

| Intensity | Growth Mult | Fatigue Gain | Injury Risk |
|---|---:|---:|---:|
| Conservative | 0.85 | 0.75 | 0.80 |
| Balanced | 1.00 | 1.00 | 1.00 |
| Intensive | 1.20 | 1.25 | 1.15 |
| Punishing | 1.35 | 1.50 | 1.35 |

#### Recovery Emphasis Effects

| Recovery | Fatigue Decay | Injury Recovery |
|---|---:|---:|
| Low | 0.80 | 0.85 |
| Normal | 1.00 | 1.00 |
| High | 1.25 | 1.20 |

---

### 4.3 Focus Bias → Skill Growth Bias

| Focus | Power | Speed | Technique | Balance |
|---|---:|---:|---:|---:|
| Power | 1.30 | 0.85 | 0.95 | 0.95 |
| Speed | 0.85 | 1.30 | 0.95 | 0.95 |
| Technique | 0.90 | 0.90 | 1.35 | 1.10 |
| Balance | 0.90 | 0.95 | 1.10 | 1.35 |
| Neutral | 1.00 | 1.00 | 1.00 | 1.00 |

---

## 5. Individual Focus Slots

### 5.1 Focus Slot Availability
- Base slots: **3**
- +1 at prestige tier 2
- +1 at prestige tier 4
- Max: **5**

Only focused rikishi may receive individual overrides.

---

### 5.2 Focus Modes

Each focus slot selects one mode:

| Mode | Growth | Fatigue | Injury Risk | Notes |
|---|---:|---:|---:|---|
| Develop | +25% | +10% | +5% | Default growth |
| Push | +35% | +20% | +20% | Win-now pressure |
| Protect | −15% | −25% | −30% | Longevity |
| Rebuild | +10% | −10% | −15% | Post-injury |

Focus modes stack multiplicatively with beya-wide profile.

---

## 6. Training → Rikishi Evolution Wiring

### 6.1 Physique
- High intensity → faster weight gain
- High recovery → controlled weight, better fulfillment
- Overtraining → stalled growth + injury spikes

Height is unaffected after youth.

---

### 6.2 Skills
Training biases **effectiveness growth**, not raw skill caps.

Growth is:
- fast early
- diminishing in prime
- fragile in veteran phase

---

### 6.3 Style Drift
Training does not set style directly.

Instead:
- Style bias nudges recomputation thresholds
- Sustained mismatch between body and training causes inefficiency

This prevents “click to choose style” exploits.

---

### 6.4 Archetype Interaction
Training does **not** change dominant archetype.

It may:
- accelerate secondary archetype emergence
- suppress risky behaviors under conservative regimes

---

## 7. Fatigue & Injury Integration

### 7.1 Fatigue
- Accumulates weekly from training
- Scales with intensity and focus
- Decays via recovery emphasis and facilities

High fatigue:
- reduces bout performance
- increases injury risk
- pushes kimarite selection toward short finishes

---

### 7.2 Injuries
Training contributes to injury probability.

Risk factors:
- high fatigue
- punishing intensity
- low recovery
- prior injury history

Injuries apply:
- attribute penalties
- recovery timelines
- narrative hooks

---

## 8. Career Phase Sensitivity

Training effectiveness varies by phase:

| Phase | Growth | Injury Sensitivity |
|---|---:|---:|
| Youth | High | Low |
| Development | High | Medium |
| Prime | Medium | Medium |
| Veteran | Low | High |
| Late | Very Low | Very High |

This encourages different strategies across careers.

---

## 9. AI Use of Training

AI managers select training profiles based on:
- their profile traits
- roster composition
- injury load
- meta drift signals
- financial runway

Examples:
- Survivor favors Conservative + High Recovery
- Gambler spikes Punishing during contention
- Talent Factory uses Balanced + Neutral

AI obeys same focus slot limits as player.

---

## 10. Player UX Rules

Players see:
- training philosophy descriptions
- warnings (“Injury risk rising”)
- trend indicators (“Style drifting toward Yotsu”)

Players never see:
- raw multipliers
- hidden fatigue math

---

## 11. Failure Modes (By Design)

- Overtraining cascades
- Burned-out prospects
- Injury-plagued stars
- Short primes with spectacular peaks

These are outcomes, not bugs.

---

## 12. Canon One-Liner

> **Training shapes the conditions under which bodies, habits, and styles evolve — it never dictates the result of a single bout.**

---

End of document.


---

# PART IV — EVOLUTION SYSTEM (EXPANDED + WIRED)

# Basho — Rikishi Evolution System v1.0 (Canonical)

Date: 2026-01-06  
Scope: Full, end-to-end specification of **rikishi evolution** in Basho, covering physique, skills, style, archetype, kimarite identity, and career arcs.  
Status: Canonical, deterministic, implementation-ready.

This document explains **how a rikishi changes over time**, why those changes occur, and how they connect to combat, narrative, and UI.

---

## 1. Design Goals

Rikishi evolution must:
- Be **deterministic** and reproducible.
- Produce **believable career arcs** without scripted outcomes.
- Be **readable to players** (no hidden “RPG decay”).
- Integrate cleanly with:
  - Combat Engine V3
  - Kimarite tier/style/archetype system
  - Rivalries and narrative
  - Career journals and governance

---

## 2. Core Principle

> **Rikishi do not gain or lose abstract “power.”  
They change bodies, habits, and constraints — and the simulation responds.**

Evolution is the interaction of:
1. Physique (body)
2. Skills (execution)
3. Style (technical preference)
4. Archetype (temperament)
5. Kimarite identity (proof of behavior)
6. Career phase (time + pressure)

Each layer evolves on a different timescale.

---

## 3. Data Model Overview

### 3.1 Permanent Identity (Never Changes)
- `id`
- `shikona`
- origin metadata
- base talent seed
- growth profile seed
- dominant archetype (initial)

These define *who the rikishi is*.

### 3.2 Evolving State (Changes Over Time)
- heightCurrent / weightCurrent
- growth fulfillment
- skill outputs (power, speed, balance, technique, experience)
- fatigue, injuries, momentum
- style (oshi / yotsu / hybrid)
- secondary archetype tendency (optional)
- favored kimarite (tokui-waza)
- career phase

---

## 4. Physique Evolution (The Body Layer)

### 4.1 Height
- Grows early career only.
- Stops deterministically based on growth profile.
- Influences reach, leverage, grip geometry.

Height explains *structural possibility*, not tactical choice.

### 4.2 Weight (Primary Evolution Lever)
- Changes throughout career.
- Influences:
  - power effectiveness
  - speed effectiveness
  - fatigue accumulation
  - injury risk
  - recovery rate
- Strongest driver of style drift.

### 4.3 Current vs Potential
Each rikishi has:
- `heightPotentialCm`
- `weightPotentialKg`
- `growthFulfillment` ∈ [0,1]

Potential is a **ceiling**, not a guarantee.
Training, injuries, and facilities determine how close it is reached.

---

## 5. Skill Evolution (Execution Layer)

Canonical skill outputs:
- **Power** — force generation and drive
- **Speed** — burst and lateral movement
- **Balance** — resistance to displacement and counters
- **Technique** — grip craft, throw timing, transitions
- **Experience** — decision quality and counters

### 5.1 Growth Pattern
- Youth: spiky, uneven gains
- Development: steady improvement
- Prime: diminishing returns
- Veteran: flat or declining effectiveness
- Late: managed decline

Skills are modified by physique:
- Same technique score behaves differently at different weights.

---

## 6. Style Evolution (Primary Public Identity)

Styles:
- **Oshi** — distance, push/thrust
- **Yotsu** — belt, control, throws
- **Hybrid** — adaptable

### 6.1 Style Is Derived
Style is recomputed periodically from:
- weight trends
- balance vs speed ratio
- grip success rates
- kimarite usage distribution
- career phase bias

### 6.2 Hysteresis
- Style changes require sustained signals.
- Prevents oscillation basho-to-basho.

Style is **what the rikishi usually tries to do**.

---

## 7. Archetype Evolution (Temperament Layer)

Archetypes describe **behavior under pressure**.

### 7.1 Dominant Archetype
- Seeded at creation.
- Rarely changes.
- Represents temperament.

### 7.2 Secondary Archetype Drift
- Optional, slow-moving.
- Emerges from repeated behavior patterns.
- Strength ∈ [0.1–0.5].

Dominant archetype applies fully.  
Secondary archetype bends behavior slightly.

---

## 8. Kimarite Identity (Proof of Evolution)

### 8.1 Favored Kimarite (Tokui-waza)
- Tracked from actual wins.
- Top 2–3 maintained.
- Applies 2× selection bonus in combat.

### 8.2 Feedback Loop
Body → Style → Kimarite usage → Favorites → Reinforcement

As the body changes, favored moves may fade or be replaced.

---

## 9. Career Phases (Arc Layer)

Phases are computed, not age-locked:
1. Youth / Prospect
2. Development / Rise
3. Prime
4. Veteran / Decline
5. Late Career / Exit

Inputs:
- age
- growth fulfillment plateau
- injury accumulation
- fatigue recovery slowdown
- performance trends

Phases bias:
- growth rates
- injury risk
- style drift likelihood
- retirement triggers

---

## 10. Determinism Contract

Every evolution step is derived from:
- World seed
- Rikishi seed
- Time index
- Player inputs (training, facilities)
- Deterministic outcomes (bouts, injuries)

No hidden randomness.  
Same inputs → same careers.

---

## 11. UI & Readability Rules

### 11.1 Rikishi Card
- **Style**: primary label
- **Archetype**: secondary
- **Secondary archetype**: only if meaningful
- **Favored kimarite**: visible proof
- Physique shown indirectly via notes, not raw stats by default

### 11.2 Advanced Views
- Physique history
- Style drift timeline
- Kimarite usage charts
- Career journal entries

---

## 12. Narrative Integration

Narrative systems consume evolution:
- “Former speedster adapts to belt fighting”
- “Signature throw fades after knee injury”
- “Late-career reinvention”

Narrative never changes outcomes.

---

## 13. Why This Works

- Careers feel authored, but are not scripted.
- Decline feels earned, not punitive.
- Specialization emerges organically.
- Players learn to *read* wrestlers, not stats.

---

## 14. Canon One-Liner

> **Rikishi evolution is the story of a body adapting to time, pressure, and consequence — expressed through style, behavior, and the techniques that survive.**

---

End of document.


---

# PART V — TRAINING → EVOLUTION WIRING (NEW, GRANULAR)

## 15. Weekly Tick Algorithm (Explicit)

For each rikishi, each week:

1. Read beya training profile
2. Read individual focus (if any)
3. Compute growthBiasVector
4. Compute fatigueDelta
5. Compute injuryRiskDelta
6. Apply fatigue accumulation
7. Roll deterministic injury check
8. Apply injury state transitions
9. Accumulate growth progress (buffered)
10. Log DevelopmentEvent

No evolution is applied immediately to combat outputs until monthly consolidation.

---

## 16. Monthly Consolidation

Every 4 weeks:
- buffered growth applies to physique and skills
- style recomputation check runs
- favored kimarite may update
- career phase transition check runs

---

## 17. Career Phase Transition Rules (Explicit)

Transitions require **multiple signals**:
- growthFulfillment plateau
- fatigue recovery slowdown
- injury frequency
- performance trend

Single signals never force a phase change.

---

# PART VI — FAILURE MODES (INTENTIONAL)

- Burned prospects
- Late bloomers
- Short primes
- Reinvention arcs
- Chronic injury decline

These outcomes are authored by systems, not random chance.

---

# PART VII — UI CONTRACT (DEVELOPMENT)

Players see:
- philosophy language
- warnings
- trend descriptors

Players never see:
- growth buffers
- raw multipliers
- phase thresholds

---

# PART VIII — SOURCE PRESERVATION ANNEX (VERBATIM)

## Training System v1.0
```md
# Basho — Training System v1.0 (Canonical)

Date: 2026-01-06  
Status: Canonical, verbose, implementation-ready  
Scope: Defines **training mechanics** at both beya and individual levels, and how training shapes rikishi evolution.  
This document intentionally excludes roster management, economics, and AI manager logic, which are defined elsewhere.

---

## 1. Design Goals

The training system must:
- Provide **meaningful player agency** without micromanagement
- Shape long-term **rikishi evolution**, not short-term bout outcomes
- Create **risk–reward trade-offs**
- Be **deterministic and legible**
- Integrate cleanly with:
  - Rikishi Evolution System
  - Beya Management System
  - NPC Manager AI System

> Training biases probability; it never guarantees greatness.

---

## 2. Core Training Philosophy

Training operates on **bias and pressure**, not direct stat control.

Players and AI:
- do not assign drills or skills directly
- choose **intensity, focus, and protection**
- accept downstream consequences via fatigue, injuries, and style drift

Training is evaluated **weekly** during interim periods.

---

## 3. Training Layers

Training exists on three stacked layers:

1. **Beya-Wide Training Profile** (default environment)
2. **Individual Focus Slots** (limited overrides)
3. **Facilities & Staff Modifiers** (multipliers, not decisions)

This ensures:
- consistency
- scarcity of attention
- emergent specialization

---

## 4. Beya-Wide Training Profile

Each beya selects one active training profile per interim.

### 4.1 Training Axes

Training profile is defined by four axes:

#### A) Intensity
- Conservative
- Balanced
- Intensive
- Punishing

#### B) Focus Bias
- Power
- Speed
- Technique
- Balance
- Neutral

#### C) Style Bias
- Oshi
- Yotsu
- Neutral

#### D) Recovery Emphasis
- Low
- Normal
- High

These axes modify growth, fatigue, and injury risk.

---

### 4.2 Default Numeric Effects (Illustrative)

#### Intensity Effects

| Intensity | Growth Mult | Fatigue Gain | Injury Risk |
|---|---:|---:|---:|
| Conservative | 0.85 | 0.75 | 0.80 |
| Balanced | 1.00 | 1.00 | 1.00 |
| Intensive | 1.20 | 1.25 | 1.15 |
| Punishing | 1.35 | 1.50 | 1.35 |

#### Recovery Emphasis Effects

| Recovery | Fatigue Decay | Injury Recovery |
|---|---:|---:|
| Low | 0.80 | 0.85 |
| Normal | 1.00 | 1.00 |
| High | 1.25 | 1.20 |

---

### 4.3 Focus Bias → Skill Growth Bias

| Focus | Power | Speed | Technique | Balance |
|---|---:|---:|---:|---:|
| Power | 1.30 | 0.85 | 0.95 | 0.95 |
| Speed | 0.85 | 1.30 | 0.95 | 0.95 |
| Technique | 0.90 | 0.90 | 1.35 | 1.10 |
| Balance | 0.90 | 0.95 | 1.10 | 1.35 |
| Neutral | 1.00 | 1.00 | 1.00 | 1.00 |

---

## 5. Individual Focus Slots

### 5.1 Focus Slot Availability
- Base slots: **3**
- +1 at prestige tier 2
- +1 at prestige tier 4
- Max: **5**

Only focused rikishi may receive individual overrides.

---

### 5.2 Focus Modes

Each focus slot selects one mode:

| Mode | Growth | Fatigue | Injury Risk | Notes |
|---|---:|---:|---:|---|
| Develop | +25% | +10% | +5% | Default growth |
| Push | +35% | +20% | +20% | Win-now pressure |
| Protect | −15% | −25% | −30% | Longevity |
| Rebuild | +10% | −10% | −15% | Post-injury |

Focus modes stack multiplicatively with beya-wide profile.

---

## 6. Training → Rikishi Evolution Wiring

### 6.1 Physique
- High intensity → faster weight gain
- High recovery → controlled weight, better fulfillment
- Overtraining → stalled growth + injury spikes

Height is unaffected after youth.

---

### 6.2 Skills
Training biases **effectiveness growth**, not raw skill caps.

Growth is:
- fast early
- diminishing in prime
- fragile in veteran phase

---

### 6.3 Style Drift
Training does not set style directly.

Instead:
- Style bias nudges recomputation thresholds
- Sustained mismatch between body and training causes inefficiency

This prevents “click to choose style” exploits.

---

### 6.4 Archetype Interaction
Training does **not** change dominant archetype.

It may:
- accelerate secondary archetype emergence
- suppress risky behaviors under conservative regimes

---

## 7. Fatigue & Injury Integration

### 7.1 Fatigue
- Accumulates weekly from training
- Scales with intensity and focus
- Decays via recovery emphasis and facilities

High fatigue:
- reduces bout performance
- increases injury risk
- pushes kimarite selection toward short finishes

---

### 7.2 Injuries
Training contributes to injury probability.

Risk factors:
- high fatigue
- punishing intensity
- low recovery
- prior injury history

Injuries apply:
- attribute penalties
- recovery timelines
- narrative hooks

---

## 8. Career Phase Sensitivity

Training effectiveness varies by phase:

| Phase | Growth | Injury Sensitivity |
|---|---:|---:|
| Youth | High | Low |
| Development | High | Medium |
| Prime | Medium | Medium |
| Veteran | Low | High |
| Late | Very Low | Very High |

This encourages different strategies across careers.

---

## 9. AI Use of Training

AI managers select training profiles based on:
- their profile traits
- roster composition
- injury load
- meta drift signals
- financial runway

Examples:
- Survivor favors Conservative + High Recovery
- Gambler spikes Punishing during contention
- Talent Factory uses Balanced + Neutral

AI obeys same focus slot limits as player.

---

## 10. Player UX Rules

Players see:
- training philosophy descriptions
- warnings (“Injury risk rising”)
- trend indicators (“Style drifting toward Yotsu”)

Players never see:
- raw multipliers
- hidden fatigue math

---

## 11. Failure Modes (By Design)

- Overtraining cascades
- Burned-out prospects
- Injury-plagued stars
- Short primes with spectacular peaks

These are outcomes, not bugs.

---

## 12. Canon One-Liner

> **Training shapes the conditions under which bodies, habits, and styles evolve — it never dictates the result of a single bout.**

---

End of document.

```

## Rikishi Evolution System v1.0
```md
# Basho — Rikishi Evolution System v1.0 (Canonical)

Date: 2026-01-06  
Scope: Full, end-to-end specification of **rikishi evolution** in Basho, covering physique, skills, style, archetype, kimarite identity, and career arcs.  
Status: Canonical, deterministic, implementation-ready.

This document explains **how a rikishi changes over time**, why those changes occur, and how they connect to combat, narrative, and UI.

---

## 1. Design Goals

Rikishi evolution must:
- Be **deterministic** and reproducible.
- Produce **believable career arcs** without scripted outcomes.
- Be **readable to players** (no hidden “RPG decay”).
- Integrate cleanly with:
  - Combat Engine V3
  - Kimarite tier/style/archetype system
  - Rivalries and narrative
  - Career journals and governance

---

## 2. Core Principle

> **Rikishi do not gain or lose abstract “power.”  
They change bodies, habits, and constraints — and the simulation responds.**

Evolution is the interaction of:
1. Physique (body)
2. Skills (execution)
3. Style (technical preference)
4. Archetype (temperament)
5. Kimarite identity (proof of behavior)
6. Career phase (time + pressure)

Each layer evolves on a different timescale.

---

## 3. Data Model Overview

### 3.1 Permanent Identity (Never Changes)
- `id`
- `shikona`
- origin metadata
- base talent seed
- growth profile seed
- dominant archetype (initial)

These define *who the rikishi is*.

### 3.2 Evolving State (Changes Over Time)
- heightCurrent / weightCurrent
- growth fulfillment
- skill outputs (power, speed, balance, technique, experience)
- fatigue, injuries, momentum
- style (oshi / yotsu / hybrid)
- secondary archetype tendency (optional)
- favored kimarite (tokui-waza)
- career phase

---

## 4. Physique Evolution (The Body Layer)

### 4.1 Height
- Grows early career only.
- Stops deterministically based on growth profile.
- Influences reach, leverage, grip geometry.

Height explains *structural possibility*, not tactical choice.

### 4.2 Weight (Primary Evolution Lever)
- Changes throughout career.
- Influences:
  - power effectiveness
  - speed effectiveness
  - fatigue accumulation
  - injury risk
  - recovery rate
- Strongest driver of style drift.

### 4.3 Current vs Potential
Each rikishi has:
- `heightPotentialCm`
- `weightPotentialKg`
- `growthFulfillment` ∈ [0,1]

Potential is a **ceiling**, not a guarantee.
Training, injuries, and facilities determine how close it is reached.

---

## 5. Skill Evolution (Execution Layer)

Canonical skill outputs:
- **Power** — force generation and drive
- **Speed** — burst and lateral movement
- **Balance** — resistance to displacement and counters
- **Technique** — grip craft, throw timing, transitions
- **Experience** — decision quality and counters

### 5.1 Growth Pattern
- Youth: spiky, uneven gains
- Development: steady improvement
- Prime: diminishing returns
- Veteran: flat or declining effectiveness
- Late: managed decline

Skills are modified by physique:
- Same technique score behaves differently at different weights.

---

## 6. Style Evolution (Primary Public Identity)

Styles:
- **Oshi** — distance, push/thrust
- **Yotsu** — belt, control, throws
- **Hybrid** — adaptable

### 6.1 Style Is Derived
Style is recomputed periodically from:
- weight trends
- balance vs speed ratio
- grip success rates
- kimarite usage distribution
- career phase bias

### 6.2 Hysteresis
- Style changes require sustained signals.
- Prevents oscillation basho-to-basho.

Style is **what the rikishi usually tries to do**.

---

## 7. Archetype Evolution (Temperament Layer)

Archetypes describe **behavior under pressure**.

### 7.1 Dominant Archetype
- Seeded at creation.
- Rarely changes.
- Represents temperament.

### 7.2 Secondary Archetype Drift
- Optional, slow-moving.
- Emerges from repeated behavior patterns.
- Strength ∈ [0.1–0.5].

Dominant archetype applies fully.  
Secondary archetype bends behavior slightly.

---

## 8. Kimarite Identity (Proof of Evolution)

### 8.1 Favored Kimarite (Tokui-waza)
- Tracked from actual wins.
- Top 2–3 maintained.
- Applies 2× selection bonus in combat.

### 8.2 Feedback Loop
Body → Style → Kimarite usage → Favorites → Reinforcement

As the body changes, favored moves may fade or be replaced.

---

## 9. Career Phases (Arc Layer)

Phases are computed, not age-locked:
1. Youth / Prospect
2. Development / Rise
3. Prime
4. Veteran / Decline
5. Late Career / Exit

Inputs:
- age
- growth fulfillment plateau
- injury accumulation
- fatigue recovery slowdown
- performance trends

Phases bias:
- growth rates
- injury risk
- style drift likelihood
- retirement triggers

---

## 10. Determinism Contract

Every evolution step is derived from:
- World seed
- Rikishi seed
- Time index
- Player inputs (training, facilities)
- Deterministic outcomes (bouts, injuries)

No hidden randomness.  
Same inputs → same careers.

---

## 11. UI & Readability Rules

### 11.1 Rikishi Card
- **Style**: primary label
- **Archetype**: secondary
- **Secondary archetype**: only if meaningful
- **Favored kimarite**: visible proof
- Physique shown indirectly via notes, not raw stats by default

### 11.2 Advanced Views
- Physique history
- Style drift timeline
- Kimarite usage charts
- Career journal entries

---

## 12. Narrative Integration

Narrative systems consume evolution:
- “Former speedster adapts to belt fighting”
- “Signature throw fades after knee injury”
- “Late-career reinvention”

Narrative never changes outcomes.

---

## 13. Why This Works

- Careers feel authored, but are not scripted.
- Decline feels earned, not punitive.
- Specialization emerges organically.
- Players learn to *read* wrestlers, not stats.

---

## 14. Canon One-Liner

> **Rikishi evolution is the story of a body adapting to time, pressure, and consequence — expressed through style, behavior, and the techniques that survive.**

---

End of document.

```



---

# PART IX — INJURY STATE MACHINE (EXPLICIT)

## 30. Injury States

Each rikishi maintains exactly one InjuryState:

| State | Description |
|---|---|
| Healthy | No active injury |
| Minor | Short-term strain |
| Moderate | Noticeable impairment |
| Severe | Long-term impairment |
| Chronic | Persistent recurring condition |
| CareerEnding | Forced retirement trigger |

## 31. Injury Severity Thresholds

Severity is determined by:
- fatigue band
- physique stress ratio
- bout intensity band
- accumulated micro-injury count

No random rolls; thresholds are deterministic.

## 32. Recovery Curves

Each state defines:
- minimum recovery weeks
- performance penalty band
- re-injury amplification factor

Chronic injuries permanently reduce recovery efficiency.

---

# PART X — STYLE DRIFT & RECLASSIFICATION

## 33. Style Confidence Model

Each style label maintains a confidence score:
- oshi
- yotsu
- hybrid

Scores update monthly using:
- kimarite usage distribution
- grip success ratios
- physique suitability

## 34. Drift Thresholds

Style changes only when:
- new style confidence > old style by X margin
- sustained for ≥2 basho
- not blocked by injury limitations

Abrupt style flips are impossible.

---

## 35. Favored Kimarite Evolution

Favored kimarite list updates when:
- same kimarite used ≥N times
- above-average success rate
- fits current style

Favorites decay if unused for extended periods.

---

# PART XI — WORKED EXAMPLE (10-YEAR CAREER)

## 36. Rikishi Example: “Kazanoumi”

### Year 1–2 (Prospect)
- rapid weight gain
- minor injuries
- style confidence unclear

### Year 3–5 (Rise)
- oshi style locks in
- favored kimarite: oshidashi, tsukidashi
- first makuuchi promotion

### Year 6–7 (Prime)
- peak power output
- rare injury-free stretch
- sansho awards

### Year 8–9 (Decline)
- chronic knee injury
- style drifts toward defensive yotsu
- fewer favored techniques

### Year 10 (Exit)
- chronic state escalates
- retirement eligibility triggered
- legacy logged

Every step corresponds to weekly and monthly ticks.

---

# PART XII — ADDITIONAL FAILURE & EDGE CASES

- Sudden injury-caused plateau
- Style-lock preventing adaptation
- Late-blooming technique specialists
- Premature burnout via overtraining

All are deterministic outcomes.

---

# PART XIII — EXTENDED SOURCE PRESERVATION

This document preserves **all v1.1 content verbatim**, plus expanded systems.
No earlier rules are removed or weakened.

---

END OF Rikishi Development Canon v1.2


---

# PART XIV — MENTAL & PSYCHOLOGICAL LOAD SYSTEM

## 40. Mental State Model

Each rikishi maintains a **MentalState** vector, separate from physical fatigue:

| Dimension | Description |
|---|---|
| Confidence | Belief in own execution |
| Pressure | External expectation weight |
| Fear | Hesitation under risk |
| Focus | Consistency of decision-making |
| Resilience | Recovery from setbacks |

MentalState values are internal scalars; players see **narrative descriptors only**.

---

## 41. Mental State Inputs (Deterministic)

Mental updates occur weekly and post-bout:

- Win/Loss streaks
- Upsets (positive or negative)
- Rivalry bouts
- Media tone
- Stable stature pressure
- Career phase

No random swings are permitted.

---

## 42. Mental → Performance Mapping

Mental states affect:
- initiative bands
- error likelihood bands
- comeback probability bands
- injury escalation risk

These effects are capped to prevent total collapse.

---

## 43. Psychological Failure Modes

- Confidence spiral (loss streaks)
- Fear lock (post-injury hesitation)
- Pressure collapse (elite expectations)
- Veteran composure advantage

These are system-authored outcomes.

---

# PART XV — TRAINING FACILITIES & STAFF MICRO-EFFECTS

## 50. Facility Bands

Facilities are modeled in qualitative bands:

| Band | Description |
|---|---|
| Primitive | Minimal, outdated |
| Basic | Functional |
| Adequate | Competitive |
| Advanced | Modern, specialized |
| Elite | Cutting-edge |

Facilities modify:
- training efficiency
- injury risk
- recovery speed
- mental fatigue

---

## 51. Staff Roles

Each stable may have:
- Head Coach
- Conditioning Coach
- Medical Staff
- Mental Coach (rare)

Each role provides:
- bias modifiers
- risk dampening
- specialization bonuses

---

## 52. Facility × Training Interaction

Training outputs are multiplied by:
- facility band modifier
- staff competency modifier

Modifiers are deterministic and logged.

---

# PART XVI — RETIREMENT, POST-CAREER & LEGACY

## 60. Retirement Eligibility

Triggered by:
- age thresholds
- chronic injury state
- sustained decline
- governance events

Retirement is optional unless forced.

---

## 61. Retirement Outcomes

Possible paths:
- Stable staff role
- Independent coach
- Oyakata candidate
- Exit from sumo world

Each path affects:
- legacy score
- institutional memory
- future NPC behavior

---

## 62. Legacy Scoring (Narrative)

Legacy is computed from:
- peak rank
- career longevity
- rivalries
- championships
- scandals

Legacy affects:
- how the rikishi is referenced in history
- eligibility for honors
- successor narratives

---

## 63. Post-Career Persistence

Retired rikishi remain:
- in historical records
- as NPCs (if relevant)
- as reference points in commentary

No character is deleted from history.

---

# PART XVII — FULL DEVELOPMENT FLOW SUMMARY

Weekly:
- Training
- Mental update
- Fatigue/injury check

Monthly:
- Evolution consolidation
- Style drift check
- Favored kimarite update

Basho-End:
- Career phase review
- Mental pressure recalibration
- Retirement eligibility check

---

END OF Rikishi Development Canon v1.3

```

---

END OF Beya Management, Staff & Welfare Canon v1.1

```

### Banzuke & Awards System v1.3
```
# Basho — Banzuke, Scheduling & Awards System v1.3  
## Full-Detail Canonical Specification

Date: 2026-01-06  
Status: Canonical, deterministic, implementation-grade  
Supersedes:
- Banzuke & Scheduling System v1.0
- Banzuke, Scheduling & Basho Awards System v1.1
- Banzuke, Scheduling & Awards System v1.2 (summary)

This document restores **full mechanical and heuristic detail** while retaining all award logic and integrations introduced in later versions. It is the **authoritative contract** for ranking, matchmaking, promotion, playoffs, and basho honors.

---

## 1. System Role & Design Philosophy

The Banzuke system is the **legitimacy engine** of Basho.

It:
- converts bout outcomes into social hierarchy
- defines economic thresholds (sekitori status)
- shapes AI planning horizons
- anchors narrative memory and prestige
- constrains governance decisions

> The banzuke is not a leaderboard — it is an institutional judgment rendered in public.

Design requirements:
- fully deterministic
- explainable after the fact
- resistant to edge-case abuse
- recognizable to sumo-literate players

---

## 2. Divisional Structure

### 2.1 Divisions, Sizes & Bout Counts

| Division | Abbrev | Target Size | Bouts |
|--------|--------|-------------|-------|
| Makuuchi | M | 42 | 15 |
| Jūryō | J | 28 | 15 |
| Makushita | Ms | ~120 | 7 |
| Sandanme | Sd | ~200 | 7 |
| Jonidan | Jd | ~350 | 7 |
| Jonokuchi | Jk | ~100 | 7 |

Rules:
- Makuuchi and Jūryō are **hard-capped**
- Lower divisions may flex temporarily to absorb overflow
- All overflow is resolved by next basho

---

## 3. Rank Encoding & Ordering

### 3.1 Canonical Rank ID

```
{Division}{Number}{Side}
Examples: M3E, J14W, Ms2, S1E
```

Rules:
- East always outranks West at same number
- Lower numbers outrank higher
- Yokozuna and Ōzeki retain internal ordering even if side-hidden

### 3.2 Rank Object (Engine Contract)

```ts
Rank {
  division: DivisionID
  number: number
  side?: "E" | "W"
  orderIndex: number
}
```

---

## 4. Basho Structure

- 6 basho per year
- 15 days per basho
- One bout per day for sekitori
- Lower divisions fight on scheduled subset days
- All bouts emit:
  - result
  - kimarite
  - duration
  - fatigue delta
  - narrative hooks

---

## 5. Torikumi (Matchmaking)

### 5.1 Core Principles

Torikumi prioritizes **legitimacy over fairness**.

Constraints:
- no repeat opponents within a basho
- stablemates never fight (except playoff edge cases)
- injuries and withdrawals respected

Priority signals:
1. Rank proximity
2. Record similarity
3. Yūshō impact
4. Rivalries
5. East/West balance

---

### 5.2 Upper Division Scheduling Phases

**Days 1–5 (Opening):**
- Rank bands ±2
- Conservative pairing
- Yokozuna protected from early clashes

**Days 6–10 (Sorting):**
- Record-based matching
- Leaders face resistance
- Rank distance allowed to widen

**Days 11–14 (Contention):**
- Direct yūshō impact prioritized
- Leaders face leaders
- Narrative stakes peak

**Day 15 (Resolution):**
- Highest-impact bouts only
- Playoff preparation

---

### 5.3 Lower Division Scheduling

- Fixed bout counts (usually 7)
- Drawn from same division bands
- Fewer rematch constraints
- Emphasis on promotion sorting

---

## 6. Promotion & Demotion Logic

### 6.1 Core Inputs

For each rikishi:
- starting rank
- wins / losses
- opponent average rank
- division slot pressure

No randomness.

---

### 6.2 Upper Division Heuristics

**Jūryō ↔ Makuuchi**
- 8–7 at M17 → borderline
- 7–8 at M16–17 → demotion candidate
- 9–6 at J1–J2 → promotion candidate
- Excess resolved by:
  1. wins
  2. opponent strength
  3. prior rank

**Sanyaku**
- Komusubi / Sekiwake: 8+ wins to retain
- Ōzeki:
  - make-koshi → kadoban
  - two consecutive make-koshi → demotion
  - promotion via ~33 wins over 3 basho
- Yokozuna:
  - promotion requires yūshō-level dominance
  - never demoted, only retired (governance hook)

---

### 6.3 Lower Division Promotion

- Promotion bands by wins
- High Makushita promotion strictly limited by Jūryō slots
- Overflow absorbed downward temporarily

---

## 7. Rank Reassignment Algorithm

1. Partition by division
2. Sort by:
   - wins
   - opponent strength
   - prior rank
3. Assign slots top-down
4. Alternate East/West
5. Resolve conflicts deterministically

Produces identical banzuke given identical inputs.

---

## 8. Playoffs

### 8.1 Yūshō Ties

- Triggered by shared best record
- Single-elimination
- Order determined by:
  1. head-to-head
  2. rank
  3. seeded shuffle

Fatigue carries over.

---

## 9. Basho Awards & Sanshō

### 9.1 Emperor’s Cup (Yūshō)

- Awarded to basho champion
- Major prestige anchor
- Strong promotion signal
- Historical milestone

---

### 9.2 Sanshō Eligibility

- Maegashira and below
- Minimum 8 wins
- Not withdrawn

---

### 9.3 Fighting Spirit (Kantō-shō)

Signals:
- upset wins
- high-intensity bouts
- exceeding rank expectation

Deterministic score model applied.

---

### 9.4 Technique (Ginō-shō)

Signals:
- kimarite variety
- uncommon / rare techniques
- clean execution

Uses Kimarite Tier System.

---

### 9.5 Outstanding Performance (Shukun-shō)

Signals:
- Yokozuna defeat
- decisive yūshō impact
- landmark achievements

---

### 9.6 Multiple Sanshō

Allowed but rare.
Narratively emphasized.

---

## 10. Additional Trophies

- Prime Minister’s Cup
- JSA Cup
- MacArthur Cup (foreign-born yūshō)
- Technique Excellence Trophy
- Fighting Spirit Trophy (analytics-visible)

---

## 11. Award Resolution Order

1. Resolve playoffs
2. Lock records
3. Compute scores
4. Validate eligibility
5. Emit awards

Awards never retroactively affect rank.

---

## 12. Data Output Contracts

### 12.1 RankSnapshot

```ts
RankSnapshot {
  rikishiId
  division
  rank
  number
  side
  bashoId
}
```

### 12.2 BashoResult

```ts
BashoResult {
  rikishiId
  wins
  losses
  startRank
  endRank
  awards[]
}
```

---

## 13. Integration Hooks

- **Economy:** sekitori salary thresholds, prestige
- **AI:** promotion planning, risk appetite
- **Narrative:** collapse arcs, miracle runs
- **Governance:** yokozuna approval, sanctions

---

## 14. Determinism Guarantee

Same inputs → same:
- torikumi
- banzuke
- promotions
- awards

No hidden randomness.

---

## 15. Canon One-Liner

> The banzuke is the public memory of sumo — everything else exists to justify it.

---

End of Banzuke, Scheduling & Awards System v1.3

```

### PBP System v3.2
```
# Basho — Sumo Play‑by‑Play (PBP) System v3.2  
## Ultimate Definitive Canon: Narrative, Ritual, Memory, Variety & Commerce

Date: 2026‑01‑06  
Status: **ULTIMATE DEFINITIVE CANON — FULL DETAIL, NON‑HIGH‑LEVEL**  
Supersedes:
- PBP v1.0
- PBP v1.1
- PBP v1.2
- PBP v1.3
- PBP v2.0
- PBP v2.1
- PBP v2.3
- PBP v3.0
- PBP v3.1

This document **fully and explicitly consolidates every PBP system feature, rule, constraint, and design ideal** defined across all prior Basho PBP documents.

Nothing is summarized.
Nothing is implied.
Nothing is deferred.

If a question concerns **how a bout is presented, narrated, ritualized, remembered, or described**, this document governs.

---

## 1. System Authority & Role

The PBP system is the **sole narrative presentation authority** for sumo bouts.

It:
- renders deterministic Combat Engine V3 outcomes into cultural experience
- preserves sumo ritual, restraint, and institutional gravity
- creates long‑term memory through language
- teaches sumo implicitly without exposing mechanics

The PBP system **never influences**:
- bout outcomes
- AI decisions
- economy calculations
- governance logic

> The engine decides the bout.  
> The hall remembers it.  
> PBP gives it voice.

---

## 2. Binding Constraints (Hard Rules)

### 2.1 Narrative‑Only Surface
PBP output must NEVER:
- display numbers
- reference probabilities or rarity
- expose stats, tiers, weights, or ratings
- describe internal engine phases
- imply alternate outcomes

### 2.2 Determinism Contract
Given identical:
- world seed
- bout state
- venue
- crowd memory
- sponsor state
- phrase history

The generated PBP text **must be identical**.

No RNG prose.  
No stochastic applause.  
No drifting tone.

---

## 3. Narrative Flow Architecture

### 3.1 Continuous Flow Rule
A bout is rendered as **one uninterrupted narrative passage**.

The player never sees:
- phase headings
- timers
- meters
- mechanical state labels

Pauses, silence, and brevity are deliberate narrative tools.

---

### 3.2 Canonical Narrative Beats (Ordered, Optional)

1. Venue & day framing  
2. Rank / stake context  
3. Ring entrance rituals  
4. Shikiri tension  
5. Tachiai impact  
6. Control establishment  
7. Momentum shift(s)  
8. Decisive action  
9. Gyoji ruling  
10. Winning move (kimarite) emphasis  
11. Kenshō ceremony (if present)  
12. Immediate aftermath framing  

Omission of a beat is meaningful and deterministic.

---

## 4. Language Priority Model

Every sentence must map to at least one axis:

1. **Position** — center, drifting, edge, straw  
2. **Balance** — planted, wavering, scrambling  
3. **Intent** — pressing, waiting, adjusting  
4. **Turning Point** — hesitation, grip, angle break  

Forbidden language:
- numbers
- mechanical terms
- probability words
- rarity descriptors

---

## 5. Commentator Voice System

### 5.1 Deterministic Voice Selection
Voice is chosen once per bout based on:
- era preset
- broadcaster identity
- basho day
- rank & narrative stakes

Voice NEVER changes mid‑bout.

---

### 5.2 Voice Styles (Explicit)

**Formal (Traditional / NHK‑like)**  
- short declarative sentences  
- restrained emotion  
- ceremonial authority  

**Dramatic (Late Basho / High Stakes)**  
- rising cadence  
- heightened verbs  
- crowd foregrounded  

**Understated (Early Basho / Analytical)**  
- neutral phrasing  
- implication over emphasis  

Voice affects cadence and adjective density only.

---

## 6. Regional Broadcast Tone Overlay

Regional tone overlays voice and affects phrasing only.

- **Tokyo (Ryōgoku):** authoritative, historical, restrained  
- **Osaka / Nagoya:** warmer, momentum‑focused, reactive  
- **Fukuoka:** intimate, expressive, crowd‑forward  

Tone never alters facts or outcomes.

---

## 7. Ring Entrance & Ritual Layer

### 7.1 Ritual Eligibility
Entrance narration may appear when:
- bout is sekitori‑level
- rivalry or late‑basho stakes exist
- venue tone supports ritual emphasis

---

### 7.2 Ritual Elements (Selective)
- salt toss (shio‑maki)
- foot stamping
- towel handling
- posture & breathing
- eye contact
- crowd hush

Rules:
- concise
- atmospheric
- never padded
- never identical unless deterministically required

---

## 8. Crowd Reaction System

### 8.1 Hidden Crowd State
Tracked internally:
- anticipation
- tension
- surprise
- release

Derived from rank gap, rivalry, venue memory, and outcome shock.

---

### 8.2 Narrative Crowd Reactions
Expressed as:
- murmurs
- gasps
- rising noise
- eruptions
- silence

Silence is a deliberate narrative beat.

---

## 9. Persistent Crowd Memory System

### 9.1 Scope
Tracked **per venue**:
- rikishi
- stables
- notable oyakata

Memory is never erased — only diluted.

---

### 9.2 Memory Dimensions (Hidden)
- favorability
- trust
- expectation
- overexposure

Decay is slow and uneven.

---

### 9.3 Narrative Effects
Memory influences:
- timing of reactions
- warmth vs skepticism
- pressure framing

---

## 10. Special Ruling Narrative Branches

### Mono‑ii
- gyoji hesitation
- judges enter
- hall falls silent
- formal ruling delivered

### Torinaoshi
- continuation, not reset
- fatigue implied
- tighter narration

### Mizui‑iri
- ritual pause
- respectful quiet
- stiffness emphasized post‑break

---

## 11. Winning Move (Kimarite) Emphasis

Every bout MUST explicitly acknowledge the winning move.

Rules:
- framed as execution, not selection
- culturally accurate phrasing
- reinforces stylistic identity

Each kimarite has a **dedicated descriptor pool**.

---

## 12. Sponsor & Kenshō Ceremony Layer

### 12.1 Sponsor Identity Slots
Optional placeholders:
- sponsorName
- sponsorCategory

Rules:
- neutral phrasing
- no brand tone
- no monetary reference

---

### 12.2 Kenshō Ceremony Sequence
Occurs after ruling & kimarite emphasis:

1. banners lowered  
2. envelopes presented  
3. rikishi acknowledgment  
4. crowd response  

Crowd memory updates AFTER ceremony.

---

## 13. Descriptor Variety & De‑Duplication Engine

### 13.1 Descriptor Sets
Each narrative beat owns a **Descriptor Set**.

Selection uses a deterministic hash of:
- boutId
- rikishiId(s)
- venueId
- voice
- tone
- crowd memory
- phrase usage history

---

### 13.2 Phrase Cooldown
- phrases have cooldown windows
- recently used phrases deprioritized
- least‑recently‑used selected if needed

---

### 13.3 Synonym Clusters
Semantically equivalent phrases grouped into clusters.

Only one cluster per beat.
Cluster selection is deterministic.

---

### 13.4 Guardrails
Forbidden:
- mixed tones
- adjective stacking
- metaphor drift
- contradictory reactions

---

## 14. Backend Fidelity (Hidden Contract)

Combat Engine V3 resolves:
1. Tachiai initiative  
2. Grip & stance  
3. Momentum & fatigue  
4. Position drift  
5. Finisher window  
6. Counter legality  
7. Kimarite selection  
8. Special ruling legality  

PBP consumes **resolved outputs only**.

---

## 15. Canonical Sample PBP Bout (Complete)

**Honbasho:** Kyushu Basho  
**Day:** 13  
**Division:** Makuuchi  
**Venue:** Fukuoka  
**Voice:** Dramatic  

**East Maegashira 3 — Kiryuzan**  
**West Komusubi — Hoshitora**

> “Day Thirteen in Fukuoka, and the hall is already alive.”  
> “Kiryuzan steps forward, lifting the salt high before casting it across the ring.”  
> “Hoshitora follows, stamping the clay, eyes fixed ahead.”  
> “The banners from [Sponsor Name] frame the dohyo as the crowd settles.”  
> “They crouch at the shikiri‑sen.”  
> “The fan drops—*tachiai!*”  
> “They crash together—the sound ripples through the hall!”  
> “Hoshitora presses—Kiryuzan bends but does not break.”  
> “A murmur spreads—he has the belt.”  
> “They drift toward the edge—voices rising!”  
> “A hesitation—just enough!”  
> “Kiryuzan drives through with **a textbook yorikiri!**”  
> “Out!”  
> “The hall erupts!”  
> “The banners are lowered.”  
> “The envelopes are presented, one by one.”  
> “Kiryuzan receives the kenshō with a measured bow.”

---

## 16. Canonical Lock‑In Principles

- Ritual precedes combat  
- The move defines the memory  
- Silence is meaningful  
- Ceremony completes victory  
- Numbers never appear  

---

**END OF Sumo Play‑by‑Play System v3.2 — ULTIMATE DEFINITIVE CANON**

```


```

---

# PART C — Constitutional Clarifications & Implementation Locks (v1.1 Addendum)
**Ratified:** 2026-01-12  
**Project name:** **Basho**  
**Purpose:** Close implementation gaps and resolve minor cross-canon collisions without deleting any prior text.  
**Status:** Binding constitutional extension; Part C overrides ambiguity in Parts A–B where explicitly stated.

## C0. Rules of Interpretation (Binding)
1. **Non-lossy guarantee:** Parts A–B remain preserved verbatim. Part C only *adds* locks, schemas, and disambiguations.
2. **Implementation locks:** Any “MUST / BUILD-INVALID” clause in Part C is required for shipping builds.
3. **No UI leaks:** UI continues to respect observability rules (no raw attributes); Part C defines *how* to project bands safely.

---

## C1. PBP Corpus Problem: Strictly Typed Phrase Library Contract

### C1.1 Constitutional statement of need
The PBP system already defines deterministic selection between **Fact Layer** and **Flavor Layer**, but it requires a versioned corpus file to:
- prevent repetition fatigue,
- enable coverage testing,
- keep all text deterministic and toolable.

### C1.2 Required file: `pbp_voice_matrix.json`
**Mandatory at build time.** PBP strings must not be hardcoded in codepaths except testing stubs.

#### C1.2.1 Core JSON schema (authoritative)
```json
{
  "schema_version": "1.0",
  "project": "Basho",
  "created_at": "2026-01-12",
  "voices": ["neutral", "dramatic", "clinical", "folk", "tabloid"],
  "intensity_levels": ["T0","T1","T2","T3","T4","T5","T6"],

  "dimensions": {
    "context": [
      "ritual_open","tachiai","center_control","edge_pressure",
      "grip_battle","stance_broken","recovery","turning_point",
      "throw_attempt","trip_attempt","slap_pull_attempt",
      "counter_window","ring_escape","finish","ceremony_close"
    ],
    "stance": ["square","bladed","twisted","broken","unknown"],
    "ring_state": ["center","near_edge","at_edge","outside","unknown"],
    "moment": ["setup","contact","surge","stall","swing","resolve"]
  },

  "entries": [
    {
      "id": "edge_pressure_T4_dramatic_001",
      "context": "edge_pressure",
      "intensity": "T4",
      "voice": "dramatic",

      "filters": {
        "stance": ["broken","twisted","unknown"],
        "ring_state": ["near_edge","at_edge"],
        "moment": ["swing","resolve"]
      },

      "cooldown": {
        "scope": "basho",
        "min_days": 3
      },

      "phrases": [
        "He's flirting with the line!",
        "Toes on the tawara!",
        "Nowhere left to retreat!"
      ],

      "tags": {
        "allowed_metaphor": true,
        "allowed_crowd_beat": true,
        "requires_fact_anchor": true
      }
    }
  ]
}
```

#### C1.2.2 Corpus coverage rule (build-invalid if violated)
Define **Cell** = `(context × intensity × voice)`.

- **Minimum coverage:** every Cell MUST have **≥ 50** phrases.
- **High-intensity priority:** Cells with `intensity ∈ {T3,T4,T5,T6}` and `context ∈ {tachiai, edge_pressure, turning_point, finish}` SHOULD have **≥ 100** phrases.

**Build gate:**
- If any required Cell < 50 phrases ⇒ **BUILD INVALID**.
- If any high-intensity priority Cell < 100 phrases ⇒ build allowed, but emits **SEV-1 content warning**.

#### C1.2.3 Phrase lint rules (hard)
- Flavor MUST NOT assert facts not present in the Fact Layer / BNP (injuries, rulings, grips, etc.).
- No numeric leakage: probabilities, hidden values, or internal weights must never appear in text.
- “Rare” phrases must be tagged and rate-limited by cooldown.

### C1.3 Deterministic selection interface (required)
Implement a single corpus selector:

```ts
selectPbpPhrase({
  context,
  intensity,       // T0..T6
  voice,           // from corpus voices
  filters,         // stance/ring_state/moment derived from BNP
  ledgerState,     // cooldown ledger (basho scope)
  seed             // EventSeed
}) -> phraseString
```

**Fallback order (deterministic):**
1. Same Cell, ignore `moment`
2. Same Cell, ignore `stance`
3. Same Cell, ignore `ring_state`
4. Same context + intensity + neutral voice
5. Neutral global fallback pool (corpus-defined)

No ad-hoc text is permitted.

---

## C2. Insolvency Trap: Starting-Stable Survival Floor (Economic Balancing)

### C2.1 Problem statement
A new beya may start with **no sekitori**, thus:
- Kenshō income can be **zero** until sekitori appear.
- Beya operating costs are fixed weekly.
- Funds do not mix with rikishi salary accounts.

Therefore, Kōenkai must guarantee survival under canonical minimum staffing/roster.

### C2.2 Reaffirmed weekly operating costs (canonical)
- Wrestlers: **¥2,000 × roster**
- Staff: **¥6,000 × staff**
(plus facilities where modeled)

### C2.3 Canonical minimums for a Basho-legal “new/rebuilding” beya
- `MinRoster = 5` rikishi
- `MinStaff = 3` staff

### C2.4 Tier‑1 Kōenkai Base Funding Floor (binding)
For **Prestige Tier 1** (lowest):

```text
Weekly_Kōenkai_Base(Tier1) MUST satisfy:
Weekly_Kōenkai_Base ≥ (MinRoster × ¥2,000) + (MinStaff × ¥6,000)
```

Substitution yields the constitutional minimum:

```text
Weekly_Kōenkai_Base(Tier1) ≥ (5×2000) + (3×6000) = ¥28,000
```

### C2.5 Safety guarantee (binding)
Under default starting conditions, no Basho-legal beya may enter insolvency before Day 1 of its first honbasho.

If insolvency occurs without explicit player overspending, it is a **tuning/setup bug**.

---

## C3. Injury Logic Conflict: Weekly Training vs Daily Combat (Clock Reconciliation)

### C3.1 Unified injury sources
1. **Training injuries** — evaluated on the **Weekly boundary** (typically Sunday in the pre-basho window).
2. **Combat injuries** — evaluated **post-bout** on basho days.

Both remain valid; this part defines precedence and when effects apply.

### C3.2 Priority rules (binding)
- Training injuries occur **before** Day 1 torikumi is realized.
  - **Minor training injury:** eligible to fight; penalties apply immediately on Day 1.
  - **Moderate/Severe training injury:** triggers pre-Day‑1 kyūjō evaluation and may force withdrawal.
- Combat injuries occur **after** the bout they came from.
  - Bout result stands; effects begin with the next scheduled bout/day.

### C3.3 Explicit Daily Tick ordering lock (patch to A3.1)
During basho days, interpret A3.1 as the following internal order:

1) Carry-over & welfare update (apply weekly training outcomes, fatigue/recovery, injury state machine carry-over)  
2) Eligibility pass (kyūjō/withdrawal determination for today)  
3) Torikumi realization (apply absences)  
4) Bout resolution  
5) Post-bout injury checks (combat injury events applied)  
6) Post-day persistence (events → snapshots → UI)

Edge-case resolution: a Sunday training injury always affects Monday Day 1 eligibility/performance.

---

## C4. Roster Caps Collision: Clarified Meanings + AI Overflow Handling

### C4.1 Clarification: “Active beya: 40–48” vs roster caps
“Active beya: 40–48” is interpreted as world-level stable count (number of stables), not an individual roster size.

Per-beya caps remain:
- **Soft cap:** 20
- **Hard cap:** 30 (absolute)

### C4.2 AI archetype targets must respect caps
AI target ranges (e.g., “Talent Factory: 18–25”) are preferences and MUST be bounded by the hard cap.

### C4.3 Hard-cap overflow resolution (binding AI behavior)
If any action would persist `rosterSize > 30`:

Immediate deterministic correction (same tick):
1. Mark overflow (non-persistent).
2. Select release/transfer candidates with deterministic scoring:
   - Lowest potential band
   - Lowest loyalty
   - Worst injury trajectory
   - Worst recent performance trend
3. Foreign-slot rikishi have retention bias but are not immune if overflow persists.
4. Release/transfer until `rosterSize ≤ 30`, then persist.

Rule: the world MUST never save with rosterSize > 30.

---

## C5. Attribute Visibility: Translation Layer + Hysteresis Buffer (UI Band Problem)

### C5.1 Binding UI principle (reaffirmed)
Raw attributes remain forbidden in UI; only bands/descriptors or indirect notes are shown.

### C5.2 Canonical descriptor ladder (0–100 truth scale)
Used for any stat that needs a generic strength descriptor unless a stat-specific ladder exists.

| Truth (0–100) | Descriptor token |
|---:|---|
| 0–19 | feeble |
| 20–34 | limited |
| 35–49 | serviceable |
| 50–64 | strong |
| 65–79 | great |
| 80–89 | dominant |
| 90–100 | monstrous |

(Tokens are localized; English strings are examples.)

### C5.3 Hysteresis buffer (binding)
To prevent oscillation:
- Define `hysteresisDelta = 5` by default.
- A descriptor only changes after crossing a boundary by at least `hysteresisDelta`.

Example:
- Enter `dominant` at ≥80.
- Leave `dominant` only when ≤75.

### C5.4 Injury perception without leakage (binding)
If an injury reduces effectiveness but hysteresis prevents a band change, UI may add a modifier tag:
- hampered
- favoring_it
- taped_up
- moving_gingerly

These modifiers are derived from public injury state and do not expose numbers.

### C5.5 Required translation function (implementation contract)
```ts
toDescriptorBand({
  statId,
  truthValue0to100,
  lastDescriptorToken,
  lastTruthValuePrivate,   // stored privately, not displayed
  ladder,
  hysteresisDelta          // usually 5
}) -> { descriptorToken, modifierTokens[] }
```

---

## C6. Integration Checklist (where Part C plugs into Parts A–B)
1. A3.1 Daily Tick: apply C3.3 ordering during basho days.
2. PBP: generator must read `pbp_voice_matrix.json` and enforce C1.2 build gates.
3. Economy: Tier‑1 Kōenkai base funding must satisfy C2.4 minimum, guaranteeing C2.5.
4. NPC Manager AI: recruitment must never persist above hard cap; overflow handling is C4.3.
5. UI Observability: all stat descriptors must come from C5 translation + hysteresis.

---

# PART D — Source Preservation (unchanged)
All prior annexes and verbatim source blocks remain preserved. Part C only adds locks and interfaces.
