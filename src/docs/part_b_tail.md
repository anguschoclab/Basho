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
