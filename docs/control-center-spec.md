# Control Center — Design Spec & Application Guide
**Companion to `design-bible.md` · Kokugikan Noir v1.0**

The Control Center is the canonical page template for Sumo Manager Pro. Every primary page (Roster, Basho, Finances, Banzuke, Federation, Press, Rivals…) is a variation on its anatomy. This document captures what the Control Center *is*, and how to port its patterns to the rest of the game.

---

## 1. Purpose

The Control Center is the player's bridge. At a glance it answers four questions in priority order:

1. **What moment are we in?** (page header — basho/day, narrative line)
2. **What decision is pending?** (hero dossier card — one headline decision, never two)
3. **What is the state of my stable?** (stat panels — finances, basho progress, training, roster)
4. **What just happened?** (event log — right rail, chronological, filterable)

Every other page answers the same four questions scoped to its domain. The template does not change; the data does.

---

## 2. Anatomy

```
┌────────────┬─────────────────────────────────────┬─────────────┐
│ Sidebar    │ TopNavBar (date · funds · stable)   │             │
│ (logo,     ├─────────────────────────────────────┤ Event Log   │
│  grouped   │ ── SECTION EYEBROW ──               │ (tabs:      │
│  nav,      │ Page Title (Shippori)               │  ALL /      │
│  badges)   │ Narrative lede (Spectral)           │  BASHO /    │
│            │                                     │  NEWS)      │
│            │ OVERVIEW  BOUTS  STABLE  …  (subnav)│             │
│            │ ─── gold underline on active ───    │ Entries:    │
│            │                                     │  eyebrow +  │
│            │ ╔═══════ HERO DOSSIER ════════╗     │  title +    │
│            │ ║ 横  Headline decision       ║     │  summary    │
│            │ ║    Body · Council 4/5 · CTA ║     │             │
│            │ ╚═════════════════════════════╝     │             │
│            │                                     │             │
│            │ ┌─ Stat Card ─┐ ┌─ Stat Card ─┐     │             │
│            │ │ label·label │ │ label·label │     │             │
│            │ │ Title       │ │ Title       │     │             │
│            │ │ [mono nums] │ │ [mono nums] │     │             │
│            │ │ progress    │ │ progress    │     │             │
│            │ └─────────────┘ └─────────────┘     │             │
│            │                                     │             │
│            │ ┌─ List Card ─┐ ┌─ List Card ─┐     │             │
│            │ │ Today's…    │ │ Banzuke     │     │             │
│            │ └─────────────┘ └─────────────┘     │             │
│            │                                     │             │
│            │ ┌─ Progress ──┐ ┌─ Table ─────┐     │             │
│            │ │ Regimens    │ │ Leading     │     │             │
│            │ └─────────────┘ └─────────────┘     │             │
└────────────┴─────────────────────────────────────┴─────────────┘
```

Six structural zones. Every page uses the same six. What varies is the **content of the hero** and the **composition of the card grid**.

---

## 3. Zone-by-Zone Spec

### 3.1 TopNavBar (global, unchanged per page)
- `DATE` · `Year N · Wk M` in JetBrains Mono 10px uppercase label + mono numerals
- Phase pill: gold-bordered `● Aki Basho · Day 07` with color-matched glow dot (gold = tournament, blue = pre-basho, vermillion = crisis)
- `FUNDS` · `¥4,200,000` — mono tabular-nums, success green when positive-trending
- `STABLE` · stable name — Spectral
- Right cluster: search, notifications, theme, settings, Continue CTA (gold gradient + shimmer, shows day number during basho)
- Top accent: `box-shadow: inset 0 1px 0 hsl(var(--gold) / 0.15)`
- Bottom: basho progress rail (vermillion → gold gradient + glow)

### 3.2 Sidebar (global, unchanged per page)
Three groups, each with a 9px mono uppercase gold/0.6 label:
- **MY STABLE** — Control Center, Roster (with count badge), Training, Heya Facilities, Finances
- **TOURNAMENT** — Aki Basho (with D07 vermillion badge), Banzuke, History
- **SUMO WORLD** — Federation, Press, Rivals

Active item: gold left-inset rule + gold text + subtle gold tint background. Inactive: 13px Spectral muted-foreground. Badges: mono, 9px, gold outline for informational, vermillion for urgent.

### 3.3 Page Header
- **Eyebrow:** `── CONTROL CENTER ──` — 10px JetBrains Mono uppercase, muted-foreground, with 24px gold hairline prefix
- **Title:** `Aki Basho · Day Seven` — Shippori Mincho B1, 2rem, weight 700, never uppercase
- **Lede:** 1–2 sentence Spectral paragraph, muted-foreground, narrates the current moment. This is voice, not data — the Bard's summary

### 3.4 Sub-Navigation Tabs
- `OVERVIEW  BOUTS  STABLE  FINANCIALS  STORYLINES`
- 11px JetBrains Mono uppercase, tracking-wider
- Active: animated gold underline (2px, gradient with glow), foreground text
- Inactive: muted-foreground → foreground on hover
- No pills, no fills — the underline IS the indicator
- Bottom: standard 1px border separator

### 3.5 Hero Dossier Card
The ceremonial slot. **One per page, ever.** Reserved for the single most important pending decision.

Structure:
- Left: **Kanji tile** — 64–80px gold-lacquer box with single character (`横` yokozuna, `力` recruit, `銀` finance, `巡` jungyō, `破` scandal). Gold gradient fill, dark foreground kanji, subtle inset glow
- Eyebrow: `YOKOZUNA DELIBERATION · STANDING` — mono, gold, tracking-wider
- Headline: `Takanoumi approaches the final threshold` — Shippori 1.25rem, weight 600
- Body: 1–3 sentences Spectral, foreground/85
- Right: **CTA button** (`REVIEW DOSSIER`) — gold outlined, mono label + vote tally microcopy (`Council · 4 / 5 in favor`) underneath in muted mono

Treatment:
- Border: `1px solid hsl(var(--gold) / 0.25)` — stronger than standard cards
- Background: `hsl(var(--card))` + radial gold glow `radial-gradient(ellipse at left, hsl(var(--primary) / 0.08), transparent 60%)`
- Corner radius: `var(--radius)` (0.25rem), no more
- If no pending decision exists, **omit the hero entirely** — do not fill with filler

### 3.6 Stat Card (2-up or 3-up row)
The bread-and-butter card. Two fixed rules of anatomy:

```
┌─────────────────────────────────┐
│ EYEBROW · EYEBROW      [ icon ] │ ← 10px mono uppercase, gold/0.6
│ Card Title                      │ ← Shippori 1.125rem, weight 600
│                                 │
│ LABEL          LABEL            │ ← 10px mono uppercase muted
│ ¥4.2M          18 wk            │ ← JetBrains Mono, 2rem, gold
│ +¥320k this wk At current burn  │ ← 11px Spectral muted
│                                 │
│ BAR LABEL              64%      │ ← 9px mono + mono value right
│ ▓▓▓▓▓▓▓▓▓▓░░░░░░               │ ← colored progress rail
└─────────────────────────────────┘
```

- Two-up numeric layout: stat pair side-by-side, hero values in mono gold, sub-label in Spectral muted
- Progress rails at the bottom, each with its own semantic color (green = secure, gold = sponsor-backed, amber = tight, vermillion = critical)
- Card hover: `shadow-md` + border-opacity bump, no transform

### 3.7 List Card (bouts, banzuke, regimens)
- Eyebrow + title header (same as stat card)
- Row anatomy: `[★ marker?] [Name + micro-rank] [H2H mono] [Name + micro-rank] [result pill]`
- Player row: gold ring glow `box-shadow: 0 0 0 1px hsl(var(--primary) / 0.35)` + left star
- East names right-aligned with vermillion 3px right accent bar; west names left-aligned with indigo 3px left accent bar — the two meet at the H2H token
- Result pill: vermillion outlined mono for completed (`OSHIDASHI`), success outlined for player win (`UWATENAGE`), muted outlined for pending (`PENDING`), mono 18:42-style timestamp for scheduled
- No zebra striping — `border-b border-border/30` between rows

### 3.8 Progress-Row Card (regimens)
- Row: `Name / SUBTITLE · SUBTITLE / ─── progress ─── / XX%`
- Progress bar colors by semantic: gold (on-track mainline), indigo (technical/belt work), success (near completion), vermillion (rehab/at-risk)

### 3.9 Table Card (leading rikishi)
- Column headers: 10px mono uppercase muted, `RIKISHI · RANK · W–L · FORM`
- Cells: Shippori for names, rank badge chip, mono for W–L, mono signed form number (`+3` success, `−2` destructive, `—` em-dash for no data)
- Rank badges: colored by division tier (Makuuchi gold outline, Juryo indigo outline), never filled

### 3.10 Event Log (right rail)
Fixed-width 320px pane, togglable below `xl` breakpoint.
- Header: `Event Log` Shippori 1rem + filter chips `ALL · BASHO · NEWS` (11px mono, active = gold border+tint)
- Entries grouped by day, no dividers — rely on whitespace
- Entry anatomy: category icon (lucide, h-3.5) + eyebrow `DAY 7 · 08:40` (9px mono muted) / **Title** (14px Spectral foreground) / Summary (13px Spectral muted, max 2 lines)
- Category icons color-coded: trophy=gold, alert-triangle=warning, chart=success, swords=accent, scroll=muted, activity=indigo
- Never more than ~8 entries visible; scroll for older

---

## 4. Applying the Template Across the Game

Every primary page in `src/pages/` maps to the same six-zone template. The rules:

### 4.1 Mapping Table

| Page | Eyebrow | Hero Dossier Slot | Stat Cards | List Cards | Progress / Table |
|------|---------|-------------------|------------|------------|------------------|
| **Dashboard** (`/`) | CONTROL CENTER | Pending decision (promotion, scandal, sponsor expiry) | Finances · Basho · Welfare | Today's bouts · Leading rikishi | Active regimens · Rival form |
| **Roster** (`/stable/roster`) | MY STABLE · ROSTER | Recruit or retirement decision | Headcount · Payroll · Avg form | Rikishi list (virtualized) | Training load per rikishi |
| **Training** | MY STABLE · TRAINING | Regimen needing sign-off | Intensity · Injuries · Readiness | Active regimens list | Per-rikishi progress |
| **Heya Facilities** | MY STABLE · FACILITIES | Upgrade pending | Condition · Rent · Capacity | Building list | Maintenance timeline |
| **Finances** | MY STABLE · FINANCES | Loan/sponsor decision | Funds · Runway · Net weekly | Transactions | Sponsor rollover table |
| **Basho** (`/basho`) | TOURNAMENT · AKI BASHO | Strategic directive for tomorrow | Record · Standing · Kensho | Torikumi (today) · Standings | Day-by-day record |
| **Banzuke** | TOURNAMENT · BANZUKE | Promotion/demotion callout | Stable representation · Elevation | Full banzuke list | Division breakdown |
| **History** | TOURNAMENT · HISTORY | Era milestone | Total basho · Yusho · HoF | Past tournament list | Career arc chart |
| **Federation** | SUMO WORLD · FEDERATION | Governance action required | Standing · Political capital · Scandal | Ichimon · Compliance items | Faction influence |
| **Press** | SUMO WORLD · PRESS | Interview / statement pending | Marketability · Coverage · Sentiment | Recent articles | Coverage heatmap |
| **Rivals** | SUMO WORLD · RIVALS | Rivalry flashpoint | Top rival · Intensity · H2H | Rivalry list | Head-to-head tables |

### 4.2 The Five Invariants

These never change across pages:

1. **Eyebrow before title.** 10px mono uppercase, gold/0.6, with leading hairline. Never skip.
2. **Shippori for title, Spectral for lede, mono for numbers.** Zero exceptions.
3. **One hero dossier per page, or none.** Two heroes is a design failure — pick the more urgent, demote the other to a stat card.
4. **Stat cards come in rows of 2 or 3.** Never 4 across, never mixed widths within a row.
5. **The Event Log stays on every page.** It is the heartbeat — removing it breaks continuity.

### 4.3 The Decision Hierarchy (choosing the hero)

When multiple decisions compete for the hero slot, rank by:
1. **Irreversible + time-boxed** (yokozuna vote, loan default, retirement) — always wins
2. **Crisis** (scandal, injury cluster, welfare sanction) — vermillion-tinted hero
3. **Opportunity** (sponsor offer, recruitment window) — gold-tinted hero
4. **Milestone** (record, era transition) — ceremonial hero

If none of the above, **render no hero** and let the stat grid breathe. Empty is better than filler.

### 4.4 Kanji Tile Vocabulary

Reusable across domains:

| Kanji | Meaning | Use for |
|-------|---------|---------|
| 横 | yokozuna | Grand champion decisions |
| 大 | ōzeki | Ōzeki promotion/kadoban |
| 力 | rikishi / strength | Recruitment, retirement |
| 銀 | silver/money | Finance decisions |
| 巡 | jungyō | Tour scheduling |
| 破 | break | Scandal, rupture |
| 祭 | festival | Basho opening, ceremony |
| 稽 | practice | Training directive |
| 縁 | bond/relation | Rivalry, ichimon |
| 新 | new | Debut, era, recruit |

### 4.5 Data → UI Translation Rule

The presenter layer (`src/presenters/`) is responsible for every piece of data the Control Center consumes. **Pages never reach into `world` directly.** The flow is:

```
WorldState → selectors.ts → uiDigest.ts → projections/ → Page component
```

When building a new page to this template:
1. Add a projection in `src/presenters/projections/<domain>Projections.ts` that returns `{ hero?, stats[], lists[], progress[] }`
2. Wire selectors in `selectors.ts` for each underlying slice
3. The page component becomes almost pure layout — it arranges, it does not compute

---

## 5. Component Contracts

Build or reuse these shared components so every page composes from the same primitives. Put them in `src/components/layout/control-center/`:

| Component | Props | Notes |
|-----------|-------|-------|
| `<PageHeader eyebrow title lede />` | strings | Enforces eyebrow + Shippori title + Spectral lede |
| `<SubNavTabs tabs activeTab />` | `{label, to}[]` | Already exists in layout, keep |
| `<HeroDossier kanji eyebrow title body cta tallyLabel tone />` | `tone: "gold" \| "vermillion" \| "indigo"` | Renders full hero card |
| `<StatCard eyebrow title stats[] progress[] icon />` | stats: `{label, value, sub}[]` | 2-up numeric layout standard |
| `<ListCard eyebrow title rows[] />` | rows: typed per domain | Bouts, regimens, banzuke entries |
| `<ProgressRow name subtitle value tone />` | tone for color | Regimens and similar |
| `<DataTable columns rows />` | mono columns, Spectral name column | Leading Rikishi style |
| `<EventLogPanel filters />` | filters: `{key,label}[]` | Right rail — already exists |
| `<KanjiTile char tone size />` | tone drives gradient | Reused in hero + rank callouts |
| `<RankBadge rank />` | rank string | Division-aware coloring |
| `<SideIndicator side />` | `"east" \| "west"` | 3px accent bar |

None of these components compute state; all receive pre-projected props. That is how the template stays consistent: the components enforce it.

---

## 6. Implementation Checklist (per page)

When porting an existing page to the Control Center template:

- [ ] Move all state derivation into a `<domain>Projections.ts` file under `src/presenters/projections/`
- [ ] Replace bespoke page header with `<PageHeader>` — add the eyebrow
- [ ] Identify the single pending decision → route it through `<HeroDossier>`, or remove the slot
- [ ] Convert existing cards into `<StatCard>` / `<ListCard>` — enforce row-of-2/3 grid
- [ ] Swap all number rendering to JetBrains Mono with `tabular-nums`
- [ ] Swap all headings to `font-display` (Shippori), all body prose to `font-body` (Spectral)
- [ ] Replace any background-color side distinctions with `<SideIndicator>` bars
- [ ] Confirm the Event Log panel mounts on this route
- [ ] Run in dark mode first; verify light mode only after

---

## 7. What This Template Is Not

- Not a dashboard framework — resist adding widgets that don't map to the six zones
- Not a data-density competition — whitespace is load-bearing, it is the silence of the arena
- Not configurable per-user — drag-and-drop widgets belong only on the explicit Dashboard route, not on domain pages
- Not a theme — it is a template. Kokugikan Noir is the theme; this is how the theme is arranged

---

*Companion document to design-bible.md — last updated 2026-04-19*
