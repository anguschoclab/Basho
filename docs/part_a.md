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
