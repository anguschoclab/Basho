# Sumo Manager Pro — UI/UX Design Bible
**Version 1.0 · Kokugikan Noir Design System**

---

## 1. Design Philosophy

### 1.1 Concept: Kokugikan Noir

The visual identity of Sumo Manager Pro is rooted in a single conceptual space: **the Kokugikan arena at night**. The crowd is silent, the dohyo is spotlit, the ceremony is about to begin. Everything outside the ring is darkness. Everything inside it is gold.

This concept drives every design decision:

- **Darkness is the ground.** Near-black surfaces are not empty — they are the arena walls, the space between matches, the weight of expectation.
- **Gold is the signal.** Championship gold is reserved for the highest-priority actions and active states. When something is gold, it matters.
- **Vermillion is urgency.** The east side's red appears for tournaments in progress, alerts, and destructive actions.
- **Indigo is structure.** West-side blue anchors the secondary tier — informational, stable, non-urgent.

### 1.2 Inspirations

| Source | What We Take |
|--------|-------------|
| NHK Sumo broadcasts | Gold text on dark, structured chyrons, authoritative typography |
| Hiroshige / Hokusai woodblock prints | Indigo ground, vermillion accent, negative space as compositional tool |
| Football Manager | Information density, 3-pane layout, data-forward design |
| Kokugikan arena | Dark interior, spotlit dohyo, ceremony and ritual |
| Japanese lacquerwork | Deep black with gold inlay accents, tactile surface suggestion |
| Sports broadcast graphics | Monospace data, tabular numbers, precision over decoration |

### 1.3 Anti-patterns to Avoid

These are explicitly forbidden in new UI work:

- **Purple gradients on white** — generic AI-generated aesthetic
- **Rounded pill buttons as primary affordances** — too soft for this context
- **Glassmorphism as decoration** — reserve for overlays and modals only
- **Inter or Roboto as body fonts** — they signal "default app", not craft
- **Evenly-distributed color palettes** — dominant ground + sharp accents only
- **Generic card grids with equal visual weight** — use typographic hierarchy instead

---

## 2. Color System

All colors are defined as HSL CSS variables. Tailwind utilities reference them via `hsl(var(--token))`.

### 2.1 Dark Mode (Primary Experience)

> Dark mode is the canonical experience. All design decisions are made in dark mode first.

| Token | Variable | HSL | Role |
|-------|----------|-----|------|
| Background | `--background` | `222 32% 5%` | Arena floor — near-black with indigo undertone |
| Card | `--card` | `222 28% 8%` | Panel surface — deep navy |
| Foreground | `--foreground` | `38 32% 87%` | Primary text — warm parchment |
| Card foreground | `--card-foreground` | `38 28% 85%` | Text on cards |
| Primary | `--primary` | `43 78% 52%` | Championship gold — highest priority actions |
| Primary foreground | `--primary-foreground` | `222 32% 5%` | Text on gold backgrounds |
| Secondary | `--secondary` | `222 22% 13%` | Secondary surfaces |
| Secondary foreground | `--secondary-foreground` | `38 22% 72%` | Secondary text |
| Muted | `--muted` | `222 20% 10%` | Subtle backgrounds |
| Muted foreground | `--muted-foreground` | `38 16% 48%` | Faded/supporting text |
| Accent | `--accent` | `5 72% 50%` | Vermillion — urgency, east side, action |
| Accent foreground | `--accent-foreground` | `38 32% 92%` | Text on vermillion |
| Border | `--border` | `222 20% 15%` | Structural lines — barely-there navy |
| Input | `--input` | `222 22% 13%` | Form field backgrounds |
| Ring | `--ring` | `43 78% 52%` | Focus ring — matches primary gold |
| Destructive | `--destructive` | `0 62% 50%` | Errors, deletions |
| Success | `--success` | `145 55% 42%` | Positive outcomes |
| Warning | `--warning` | `38 86% 54%` | Caution states |

**Sumo-Specific Tokens:**

| Token | Variable | HSL | Usage |
|-------|----------|-----|-------|
| Gold | `--gold` | `44 90% 62%` | Bright gold for shimmer, rank badges, glow effects |
| Silver | `--silver` | `222 12% 56%` | Ozeki rank, runner-up states |
| Bronze | `--bronze` | `25 58% 48%` | Sekiwake/Komusubi rank |
| East | `--east` | `5 72% 50%` | Higashi (east side) — vermillion |
| West | `--west` | `222 62% 44%` | Nishi (west side) — indigo blue |
| Dohyo | `--dohyo` | `35 32% 22%` | Ring surface |
| Dohyo border | `--dohyo-border` | `0 52% 38%` | Ring clay border |

**Sidebar Tokens** (distinct from main bg — arena corridor feel):

| Token | HSL |
|-------|-----|
| `--sidebar-background` | `220 32% 6%` |
| `--sidebar-foreground` | `38 28% 80%` |
| `--sidebar-primary` | `43 78% 52%` (gold) |
| `--sidebar-border` | `222 18% 12%` |

### 2.2 Light Mode

Light mode uses a warm washi paper aesthetic — ink on aged parchment. Less dramatic but equally distinctive.

| Token | HSL | Character |
|-------|-----|-----------|
| `--background` | `38 28% 96%` | Warm cream/washi paper |
| `--card` | `38 32% 98%` | Slightly warmer card surface |
| `--primary` | `43 62% 38%` | Subdued gold — still authoritative |
| `--accent` | `5 68% 44%` | Ink-red vermillion |
| `--foreground` | `220 30% 12%` | Near-black ink |
| `--border` | `38 18% 82%` | Aged paper edge |

### 2.3 Color Usage Rules

**DO:**
- Use `--primary` (gold) for: active navigation items, primary CTA buttons, the Continue button, focus rings, active progress indicators
- Use `--accent` (vermillion) for: tournament-in-progress states, destructive confirmations, east side markers
- Use `--west` (indigo) for: west side markers, informational secondary actions
- Use `--gold` (bright) for: shimmer effects, rank badges, glow text
- Use `--muted-foreground` for: labels, metadata, timestamps, supporting text

**DON'T:**
- Use primary gold for more than one element per visual cluster
- Use accent vermillion for anything non-urgent or non-sumo-specific
- Apply `--success` green as a decorative color — only for genuine positive status
- Mix east/west colors in non-bout contexts

---

## 3. Typography

### 3.1 Type Scale and Families

Three typefaces form the complete typographic system:

#### Shippori Mincho B1 — Display / Headings
```css
font-family: 'Shippori Mincho B1', 'Noto Serif JP', Georgia, serif;
var(--font-display)
Tailwind: font-display
```

- **Character:** Japanese-influenced old-style serif. Evokes traditional woodblock print lettering, sumo ceremony programs, NHK title cards.
- **Use for:** All `h1`–`h6` elements, page titles, rikishi names in prominent contexts, championship/tournament displays, widget headings.
- **Weights in use:** 400 (regular), 600 (semibold), 800 (extrabold for hero moments)
- **Never use for:** Body text, UI labels, buttons, form inputs, numerical data

#### Spectral — Body / Prose
```css
font-family: 'Spectral', Georgia, serif;
var(--font-body)
Tailwind: font-body
```

- **Character:** Elegant screen-optimized serif. Designed for long-form reading, brings editorial authority. Feels like a sumo newspaper, not a SaaS dashboard.
- **Use for:** Descriptive text, narrative sections (event log, media articles), tooltip body copy, card descriptions, modal explanations.
- **Weights in use:** 300 (light for captions), 400 (regular), 600 (semibold for emphasis)
- **Base size:** 15px / 1.65 line-height

#### JetBrains Mono — Stats / Data
```css
font-family: 'JetBrains Mono', 'Courier New', monospace;
var(--font-mono)
Tailwind: font-mono
```

- **Character:** Technical precision. Every number is tabular-aligned. Makes data feel authoritative, not decorative.
- **Use for:** All numerical data (funds, records, stats), monospace labels/badges, nav section headers, the Continue button, date/phase display in top nav, stat labels, progress counters.
- **Weights in use:** 400, 500, 600

### 3.2 Typographic Hierarchy

| Level | Font | Size | Weight | Use |
|-------|------|------|--------|-----|
| Hero | Shippori Mincho B1 | 2.25rem | 800 | Tournament champion reveal, major milestones |
| Page title | Shippori Mincho B1 | 1.5rem | 700 | Section page headers |
| Section heading | Shippori Mincho B1 | 1.125rem | 600 | Widget titles, card headers |
| Sub-heading | Shippori Mincho B1 | 0.875rem | 600 | Group labels, sub-section titles |
| Body | Spectral | 0.9375rem | 400 | General descriptions, event summaries |
| Caption | Spectral | 0.8125rem | 300 | Supporting text, timestamps |
| UI label | JetBrains Mono | 0.625rem | 600 | Section headers in sidebar, nav tabs |
| Stat value | JetBrains Mono | varies | 600 | Numbers, records, rankings |
| Badge | JetBrains Mono | 0.5625rem | 600 | Inline status badges |

### 3.3 Typographic Rules

- **Section labels** in the sidebar use `text-[9px] uppercase tracking-[0.2em]` in JetBrains Mono, color `hsl(var(--gold) / 0.6)`
- **Nav tab labels** use `text-[11px] uppercase tracking-wider` in JetBrains Mono
- **Stat labels** (above numbers) use `text-[10px] uppercase tracking-widest` in JetBrains Mono, `text-muted-foreground`
- **Page titles** use Shippori Mincho B1, never uppercase
- **All numbers in tables and stat blocks** must use `font-mono` and `tabular-nums`

---

## 4. Layout System

### 4.1 Three-Pane Shell

The game uses a persistent FM-style three-pane layout:

```
┌─────────────┬──────────────────────────────┬────────────┐
│             │  TopNavBar (h-12, sticky)     │            │
│  AppSidebar │──────────────────────────────│ EventLog   │
│  (collaps.) │                              │ (w-80,     │
│             │  MainContentPane             │  toggle.)  │
│  ~240px     │  (flex-1, scrollable)        │            │
│  icon: 52px │                              │            │
└─────────────┴──────────────────────────────┴────────────┘
```

**Rules:**
- Sidebar collapses to icon-only (52px) via shadcn `collapsible="icon"`
- Event log panel is togglable, hidden on viewports below `xl` (1280px)
- Main content max-width: 1400px, centered with padding
- Content padding: `p-5 md:p-8 lg:p-10`

### 4.2 Sidebar Anatomy

```
┌─ SidebarHeader ──────────────────────┐
│  [力] Basho Manager                  │  ← Gold lacquer box + Shippori Mincho
│  ─────────────── (gold hairline)     │
├─ SidebarContent ─────────────────────┤
│  MY STABLE ──────────────────        │  ← Section label: 9px mono, gold/0.6
│  · Overview                          │  ← Nav item: 13px Spectral
│  ▌ Roster       (active)             │  ← Active: gold inset-left border
│  · Training                          │
│  ─────────────────────────           │
│  TOURNAMENT ─────────────────        │
│  · Current Basho   [Day 7]           │  ← Badge: mono, gold border
│  ...                                 │
├─ SidebarFooter ──────────────────────┤
│  ─────────────── (gold hairline)     │
│  [⬡] My Stable     · secure          │
│  BASHO  ▓▓▓▓▓▓▓░░░░░░  7 / 15       │  ← Gradient progress (east→gold)
└──────────────────────────────────────┘
```

**Sidebar background:** Washi paper dot texture  
`background-image: radial-gradient(circle, hsl(var(--sidebar-foreground) / 0.04) 1px, transparent 1px); background-size: 16px 16px`

### 4.3 Top Navigation Bar

```
┌─────────────────────────────────────────────────────────┐
│ [☰] | Year 12 · Wk 3  [● Day 7 TOURNAMENT]  ¥4,200,000 │ … [☀][⚙] [──] [▶ Day 7 →]
└─────────────────────────────────────────────────────────┘
                                                   ↑ gold gradient CTA
```

The top bar has:
- A subtle **top accent**: `box-shadow: inset 0 1px 0 hsl(var(--gold) / 0.15)`
- Phase pill with **color-matched glow dot** (gold for tournament, blue for pre-basho, etc.)
- Continue button: gold gradient, shimmer sweep on hover, shows day number during basho
- All text in JetBrains Mono for the data section
- Basho progress rail at bottom: vermillion → gold gradient with glow

### 4.4 Sub-Navigation Tabs

Sub-nav tabs sit below the top bar when a page has multiple sections:

- 11px JetBrains Mono, uppercase, wide tracking
- Active state: animated gold underline (2px, gradient, with glow shadow)
- Inactive: muted foreground, highlights to foreground on hover
- No filled pill active state — the underline IS the indicator

### 4.5 Grid System

| Context | Layout |
|---------|--------|
| Dashboard widgets | Draggable 12-col grid, responsive |
| Management grids | `auto-fill, minmax(300px, 1fr)` |
| Standard card rows | 2-col or 3-col on desktop, 1-col on mobile |
| Stat blocks | Inline flex, monospace tabular |

---

## 5. Component Patterns

### 5.1 Cards

**Standard card (`paper` class):**
```css
background: hsl(var(--card));
border: 1px solid hsl(var(--border) / 0.6);
border-radius: var(--radius); /* 0.25rem */
box-shadow: var(--shadow-sm);
transition: box-shadow 0.2s, border-color 0.2s;
```
Hover: `shadow-md` + slightly more opaque border. No transform on default cards.

**Widget card (`widget-card` class):**  
Same as paper but `transform: translateY(-1px)` on hover.

**Dossier paper (`dossier-paper` class):**  
Adds a subtle 18px dot texture grid. Use for sections needing "document" feel (player stats pages, history views).

**Rules for cards:**
- Never round corners more than `var(--radius)` (0.25rem)
- No `backdrop-blur` on cards — only on modals and overlays
- No drop shadows larger than `shadow-md` outside of modals

### 5.2 Buttons

**Primary (Continue / CTA):**
- Gold gradient: `linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(44 68% 40%) 100%)`
- Dark text on gold
- Hover: shimmer sweep animation + `scale(1.03)`
- Active: `scale(0.97)`
- Shadow: `0 2px 12px hsl(var(--primary) / 0.35)`
- Font: JetBrains Mono

**Secondary actions:**
- Ghost style with `hover:bg-muted/50`
- Border only on outlined variants
- Never use a filled button for a secondary action if a primary exists nearby

**Destructive:**
- Background: `hsl(var(--destructive))`
- Always requires confirmation (never single-click destructive)

### 5.3 Badges

Badges always use JetBrains Mono at 9px with `tracking-wider`.

| Kind | Background | Border | Text |
|------|-----------|--------|------|
| Tournament day | `hsl(var(--gold) / 0.15)` | `hsl(var(--gold) / 0.35)` | `hsl(var(--gold))` |
| Financial warning | `hsl(var(--warning) / 0.15)` | `hsl(var(--warning) / 0.35)` | `hsl(var(--warning))` |
| Financial critical | `hsl(var(--destructive) / 0.15)` | `hsl(var(--destructive) / 0.35)` | `hsl(var(--destructive))` |
| Rank: Yokozuna | gold→dark-gold gradient | — | `hsl(222 32% 5%)` |
| Rank: Ozeki | silver gradient | — | `hsl(222 32% 5%)` |
| Rank: Sanyaku | bronze gradient | — | `hsl(38 28% 97%)` |

### 5.4 East / West Side Indicators

Always use the canonical colors:
- **East (Higashi):** `hsl(var(--east))` — vermillion red `5 72% 50%`
- **West (Nishi):** `hsl(var(--west))` — indigo blue `222 62% 44%`

Visual pattern: 3px left border (`east-accent` / `west-accent` classes). Never background-color the entire card for side distinction.

### 5.5 Bout Cards

```css
.bout-card {
  /* Gradient glow on hover — east left, west right */
  ::before { background: linear-gradient(90deg,
    hsl(var(--east) / 0.04), transparent 35%,
    transparent 65%, hsl(var(--west) / 0.04)
  ); }
}
.bout-card--player {
  box-shadow: 0 0 0 1px hsl(var(--primary) / 0.35),
              0 0 16px -4px hsl(var(--primary) / 0.2);
}
```

Player's bouts get a subtle gold ring glow. Never use a background color to highlight player bouts.

### 5.6 Progress Indicators

**Basho progress (in sidebar/topnav):**  
`linear-gradient(to right, hsl(var(--east)), hsl(var(--gold)))` + glow `box-shadow: 0 0 6px hsl(var(--gold) / 0.4)`

**Standard progress bars:**  
Use `hsl(var(--primary))` fill on `hsl(var(--border))` track.

**Financial runway:**  
Color matches runway state — green (secure/comfortable) → amber (tight) → red (critical/desperate).

---

## 6. Motion & Animation

### 6.1 Principles

- **One orchestrated entrance per screen load**, not scattered micro-interactions everywhere
- Stagger reveals with 50–60ms delays (not uniform — feels mechanical)
- Prefer `cubic-bezier(0.22, 1, 0.36, 1)` (decelerate) for entrances — content arrives with authority
- Prefer `ease-out` for state changes, `ease-in-out` for looping animations

### 6.2 Entrance Animations

| Class | Keyframe | Duration | Use |
|-------|----------|----------|-----|
| `widget-enter` | `widgetEnter` (slide up + scale) | 550ms | Dashboard widgets, staggered |
| `bout-enter` | `boutSlideIn` (slide right) | 300ms | Bout cards, staggered |
| `animate-fade-in` | `fadeIn` | 350ms | General content reveals |
| `animate-slide-up` | `slideUp` | 450ms | Page content |
| `animate-scale-in` | `scaleIn` | 250ms | Modals, popovers |
| `result-reveal` | `resultPop` (spring scale) | 400ms | Bout result display |

**Stagger delays:** Start at 0ms, increment by 55ms (widgets) or 35ms (bout cards).

### 6.3 Shimmer Effects

```css
/* Rank shimmer — Yokozuna/Ozeki badges */
.rank-shimmer: diagonal 45° sweep, 200% size, 3.5s loop

/* Shimmer bar — loading states */
.shimmer-bar: horizontal sweep, 200% size, 2.4s loop
```

### 6.4 Interactive States

| Interaction | Transform | Duration |
|-------------|-----------|----------|
| Button hover | `scale(1.03)` | 200ms |
| Button active | `scale(0.97)` | 100ms |
| Widget card hover | `translateY(-1px)` | 180ms |
| Nav item icon active | `scale(1.1)` implied by class | 150ms |
| Continue button | shimmer sweep overlay + scale | 200ms |

---

## 7. Iconography

All icons use **Lucide React** at consistent sizes:

| Context | Size | Color |
|---------|------|-------|
| Sidebar nav | `h-3.5 w-3.5` | Sidebar foreground / gold when active |
| Top nav controls | `h-3.5 w-3.5` | Muted foreground |
| Event log categories | `h-3.5 w-3.5` | Category-specific color |
| Card section icons | `h-4 w-4` | Muted foreground |
| Hero/feature icons | `h-5 w-5` or `h-6 w-6` | Primary or gold |
| Alert/warning icons | `h-4 w-4` | Destructive or warning |

**Never:** Decorative icons without semantic meaning. Every icon must communicate information.

---

## 8. Section Dividers and Separators

Three patterns for visual separation:

### Gold hairline rule (sidebar, section heads)
```css
background: linear-gradient(to right, hsl(var(--gold) / 0.4), hsl(var(--gold) / 0.1), transparent);
height: 1px;
```
Use in: sidebar header/footer transitions, major section dividers

### Standard border
```css
border-color: hsl(var(--border)); /* 222 20% 15% in dark */
```
Use in: card borders, grid separators, sub-nav bar bottom

### Gold rule heading (`.gold-rule` class)
Text flanked by fading gold hairlines. Use for named sections within a page that need visual ceremony (tournament results headers, hall of fame sections).

---

## 9. The Dohyo as Visual Motif

The sumo ring (dohyo) is the central metaphor. It appears as:

1. **Functional element** (`.dohyo-ring`): A circular bordered element, tan fill, clay-red border with an inner ring detail
2. **Background watermark** (`.hero-gradient`): Radial gradients simulating a spotlight effect — `radial-gradient(ellipse at 50% 0%, hsl(var(--primary) / 0.08)...)`
3. **Progress arc**: Basho day progress as a curved element where applicable
4. **Navigation motif**: The 力 (strength) kanji in the sidebar logo represents the dohyo's spiritual dimension

When in doubt about a decorative element, ask: does this reference the arena, the ceremony, or the competition? If not, remove it.

---

## 10. Page-Level Patterns

### 10.1 Dashboard
- 12-column draggable widget grid
- Widgets enter staggered via `widget-enter` class (55ms increments)
- Each widget: `widget-card` class, no padding variation — consistent padding within each
- Widget titles: Shippori Mincho B1 small (0.875rem), with stat labels in JetBrains Mono

### 10.2 Roster / List Pages
- Rikishi entries: side indicator (east/west), rank badge, tabular mono stats
- Search: always in the top-right of the list header
- Sorting: column headers in JetBrains Mono, 10px uppercase
- No zebra striping — use bottom border only (`border-b border-border/30`)

### 10.3 Tournament (Basho) Page
- Bout cards: `.bout-enter` staggered, `.bout-card` class
- Player bout: `.bout-card--player` gold ring glow
- Day navigation: monospace day counter, east→gold gradient progress
- Results: `.result-reveal` spring animation

### 10.4 Financial Pages
- All numbers: JetBrains Mono, tabular-nums
- Positive values: `hsl(var(--success))`
- Negative values: `hsl(var(--destructive))`
- Charts: use east/west/gold as primary chart colors (no arbitrary rainbow)

### 10.5 Governance / Association Pages
- Severity indicators: destructive (high) → warning (medium) → success (low)
- Faction influence: never use arbitrary colors — map to east/west/gold/muted spectrum

---

## 11. Writing Style for UI Text

### Labels and Headings
- Section labels (sidebar, top nav): ALL CAPS, JetBrains Mono, 0.18–0.2em tracking
- Page titles: Title Case, Shippori Mincho B1, never uppercase
- Sub-navigation tabs: ALL CAPS, JetBrains Mono

### Data Labels
- Stat labels above numbers: ALL CAPS, JetBrains Mono, muted foreground
- Never use "N/A" — use `—` (em dash) for missing data
- Financial values: always prefix `¥` (yen sign), always `.toLocaleString()`

### Event Log / Narrative
- Event titles: sentence case, Spectral, foreground color
- Event summaries: sentence case, Spectral, muted foreground, max 2 lines
- Timestamps: JetBrains Mono, 10px, muted foreground

---

## 12. Accessibility Baseline

- All interactive elements must have `aria-label` or visible text
- Focus rings use `hsl(var(--ring))` — championship gold on dark
- Color is never the sole indicator of state — always pair with text or icon
- Minimum touch target: 32px (h-8 w-8) for icon-only buttons
- Event log filter buttons have `aria-pressed` state
- Sidebar navigation items support keyboard focus and tooltip on collapse

---

## 13. Dark Mode First Workflow

**Build and review in dark mode.** Light mode is a derived theme.

When adding new CSS variables:
1. Define the dark value in `.dark { }` first
2. Derive the light equivalent by warming the hue and brightening significantly
3. Test that light mode remains legible — warm cream ground, ink-dark text

When using Tailwind utilities that don't have a dark variant automatically, use inline `style` with CSS variables:
```tsx
style={{ color: "hsl(var(--gold))" }}
```
rather than hardcoded Tailwind color classes like `text-yellow-400`.

---

## 14. File Reference

| File | Purpose |
|------|---------|
| `src/index.css` | All CSS variables, design tokens, global styles, component classes |
| `tailwind.config.ts` | Tailwind color tokens (references CSS vars), font families, border radius |
| `src/components/layout/AppSidebar.tsx` | Sidebar shell, navigation groups, logo, footer |
| `src/components/layout/TopNavBar.tsx` | Global header, phase info, Continue button |
| `src/components/layout/AppLayout.tsx` | 3-pane shell assembly |
| `src/components/layout/MainContentPane.tsx` | Content area wrapper, page title, padding |
| `src/components/layout/SubNavTabs.tsx` | Page-level sub-navigation tabs |
| `src/components/layout/EventLogPanel.tsx` | Right pane event log |

---

## 15. Quick Reference: Do / Don't

| Do | Don't |
|----|-------|
| Use `font-display` (Shippori) for all headings | Use Inter or system fonts for headings |
| Use `font-mono` (JetBrains) for all numbers/data | Use proportional fonts for tabular data |
| Use `font-body` (Spectral) for descriptions/prose | Use a sans-serif for body text |
| Gold for primary actions and active states | Gold for decorative purposes |
| Vermillion for east/tournament/urgency | Vermillion for generic alerts |
| Dark navy as panel surfaces | Generic grey as panel surfaces |
| Thin gold hairline rules for section separation | Thick dividers or colored backgrounds |
| CSS variables for all color references | Hardcoded hex/rgb values |
| `.east-accent` / `.west-accent` (3px border) | Full background color for side distinction |
| `tabular-nums` on all numerical displays | Proportional number rendering |
| One primary CTA per view | Multiple gold buttons competing |
| Staggered entrance animations on lists | Simultaneous pop-in of all list items |
| Test in dark mode first | Design in light mode, patch dark mode |

---

*Last updated: April 2026 — Kokugikan Noir v1.0*
