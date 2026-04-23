# Sumo Manager Pro — Player's Manual

> You are the Oyakata. You run the stable. You build the dynasty.

---

## Table of Contents

1. [What Is Sumo Manager Pro?](#1-what-is-sumo-manager-pro)
2. [Getting Started](#2-getting-started)
3. [The Game Interface](#3-the-game-interface)
4. [The Sumo Calendar](#4-the-sumo-calendar)
5. [Rikishi — Your Wrestlers](#5-rikishi--your-wrestlers)
6. [The Division Hierarchy & Ranks](#6-the-division-hierarchy--ranks)
7. [Basho — Tournament Play](#7-basho--tournament-play)
8. [Kimarite — Winning Techniques](#8-kimarite--winning-techniques)
9. [Training Your Stable](#9-training-your-stable)
10. [Injuries & Recovery](#10-injuries--recovery)
11. [The Banzuke — Rankings](#11-the-banzuke--rankings)
12. [Stable Finances](#12-stable-finances)
13. [Sponsorships & Koenkai](#13-sponsorships--koenkai)
14. [Recruitment & Scouting](#14-recruitment--scouting)
15. [Governance & Compliance](#15-governance--compliance)
16. [Welfare System](#16-welfare-system)
17. [Factions & Political Capital](#17-factions--political-capital)
18. [Facilities](#18-facilities)
19. [Narrative & Media](#19-narrative--media)
20. [Hall of Fame & Legacy](#20-hall-of-fame--legacy)
21. [Advanced Mechanics](#21-advanced-mechanics)
22. [Glossary](#22-glossary)

---

## 1. What Is Sumo Manager Pro?

Sumo Manager Pro is a deep management simulation set in the world of professional sumo wrestling. You play as an **Oyakata** — the master of a sumo stable (Heya) — responsible for every aspect of running your organisation: recruiting young wrestlers, training them to elite level, managing finances, navigating the political landscape of the Japan Sumo Association, and ultimately competing in six grand tournaments (Basho) per year.

The game simulates a living sumo world with dozens of other stables, each run by AI opponents with their own personalities, ambitions, and strategies. Wrestlers are born, develop, peak, age, and retire. Dynasties rise and fall. Your goal is to build a **legendary Heya** — one that stamps its name on the history books.

---

## 2. Getting Started

### New Game Setup

When you start a new game you will be walked through a setup wizard:

1. **Choose your Heya** — select from established stables or create your own
2. **Name your Oyakata** — your player character's identity
3. **Set your Ichimon** — choose a sumo faction (see [Factions](#17-factions--political-capital))
4. **Configure your starting roster** — adjust the balance of experienced and developing wrestlers
5. **Set starting budget** — allocate initial funds across facilities, recruitment, and reserves
6. **Choose your Oyakata archetype** — this shapes your management style (see [Advanced Mechanics](#21-advanced-mechanics))

### Advancing Time

The game is turn-based at the day level. Three options control time:

| Button | What It Does |
|--------|-------------|
| **Advance One Day** | Simulate a single day — basho fights happen, training ticks, events fire |
| **Advance to Next Event** | Jump to the next meaningful moment (next bout day, phase transition, recruit deadline) |
| **Auto-Sim** | Simulate multiple days or weeks automatically |

Use **Advance to Next Event** during inter-basho periods to skip quiet stretches. Use **Advance One Day** during active tournaments to watch each bout play out.

---

## 3. The Game Interface

The game uses a three-panel layout:

```
┌─────────────┬──────────────────────────────────┬────────────┐
│  Sidebar    │  Navigation Bar                  │ Event Log  │
│  (Nav Menu) │──────────────────────────────────│ (toggle)   │
│             │  Main Content Area               │            │
│             │                                  │            │
└─────────────┴──────────────────────────────────┴────────────┘
```

- **Sidebar** — main navigation; collapse it for more workspace
- **Top Bar** — current date, phase indicator, quick stats (funds, morale)
- **Main Area** — the active screen (roster, finances, basho, etc.)
- **Event Log** — scrolling feed of events (toggle open/closed)

### Navigation Sections

| Section | Key Screens |
|---------|-------------|
| **Stable** | Roster, Training, Medical, Staff, Oyakata |
| **Office** | Finances, Scouting, Sponsors, Facilities |
| **Association** | Governance, Talent Pool, Trends, Myoseki |
| **Tournament** | Basho, Schedule, Banzuke, Rivalries |
| **Archives** | History, Almanac, Media, Hall of Fame |

---

## 4. The Sumo Calendar

### The Six Grand Tournaments

Professional sumo holds **six Basho per year**, each 15 days long:

| # | Name | Month | Venue |
|---|------|-------|-------|
| 1 | **Hatsu** (初場所) — New Year | January | Tokyo — Ryōgoku Kokugikan |
| 2 | **Haru** (春場所) — Spring | March | Osaka — Edion Arena |
| 3 | **Natsu** (夏場所) — Summer | May | Tokyo — Ryōgoku Kokugikan |
| 4 | **Nagoya** (名古屋場所) | July | Nagoya — Aichi Prefectural Gymnasium |
| 5 | **Aki** (秋場所) — Autumn | September | Tokyo — Ryōgoku Kokugikan |
| 6 | **Kyushu** (九州場所) | November | Fukuoka — Fukuoka Kokusai Center |

### Cycle Phases

Between and during tournaments the game moves through five distinct phases:

| Phase | Description |
|-------|-------------|
| **pre_basho** | Final preparations, ~7 days before the tournament opens |
| **active_basho** | The tournament is live — 15 days of daily bouts |
| **post_basho** | Results processed, prizes awarded, banzuke calculations begin |
| **banzuke_reveal** | Official rankings published, 14 days before next basho |
| **interim** | 6-week inter-tournament bridge — training, recruitment, finance |

The **interim** period is your main window for management: training hard, scouting new talent, negotiating sponsorships, and responding to governance matters.

---

## 5. Rikishi — Your Wrestlers

### Core Stats

Every wrestler has ten core stats, each rated 0–100:

| Stat | What It Does |
|------|-------------|
| **Strength** | Power in grapples, throws, and force-outs |
| **Speed** | Movement velocity and reaction time |
| **Balance** | Stability and footing recovery after impact |
| **Technique** | Execution precision of winning moves |
| **Weight** | Mass in kg — affects physics of clashes |
| **Stamina** | Endurance over a 15-day tournament |
| **Mental** | Composure under pressure, crisis recovery |
| **Adaptability** | How quickly they adjust to new opponents |
| **Aggression** | Initiative tendency — how often they attack first |
| **Experience** | Career learning that sharpens all other stats |

### Condition Stats

These fluctuate daily and weekly:

| Stat | Range | What It Means |
|------|-------|---------------|
| **Condition** | 0–100 | Physical readiness right now |
| **Motivation** | 0–100 | Drive and morale |
| **Fatigue** | 0–100 | Accumulated tiredness — high fatigue hurts performance |
| **Momentum** | Variable | Psychological state mid-basho (winning streaks boost it) |
| **Durability** | 0–100 | Resistance to injury |

### Combat Archetypes

Each rikishi has a fighting style that shapes which techniques they prefer:

| Archetype | Style |
|-----------|-------|
| **Oshi** | Push/thrust specialist — drives opponents out with open palms |
| **Yotsu** | Belt specialist — seeks mawashi grip, wins through grapples |
| **Trickster** | Pulldowns, feints, unconventional tactics — high variance |
| **Speedster** | Lateral movement and quick angles — evades before attacking |
| **Hybrid** | Balanced push/belt — flexible but no single strength |
| **Giant** | Mass-dominant — sheer weight and strength |
| **Tsuppari** | Rapid open-palm thrusting — no belt contact, relentless offense |
| **Defensive** | Counter-wrestler — absorbs pressure and punishes aggression |

### Grip Preference

Belt wrestlers additionally have preferred grip types:
- **Migi** (right inside) or **Hidari** (left inside)
- **Depth**: Maemitsu (front belt), Deep, or Standard

Getting into preferred grip is a major competitive advantage.

### Career Development

Wrestlers are not static. Stats develop over time based on training, experience, and hidden potential:

- **Potential Ability (PA)** — a hidden ceiling for each stat (0–100)
- **Development Speed** — how fast they approach their PA
- **Peak Age Offset** — when they hit peak ability (ranges from early to late bloomers)
- **Ceiling Fraction** — some wrestlers never reach their full PA (journeymen cap below 1.0)

**Development Profiles:**

| Profile | Description |
|---------|-------------|
| **Prodigy** | Fast early development, peaks young |
| **Standard** | Steady growth, peak in mid-20s |
| **Late Bloomer** | Slow start, peaks in late 20s–early 30s |
| **Early Peaker** | Strong early, falls off fast |
| **Journeyman** | Ceiling fraction below 1.0 — reliable but limited |

### Shikona — The Ring Name

A wrestler's **shikona** (ring name) is their public identity. It may differ from their birth name. Ring names often carry a stable's naming tradition (e.g., "Chiyo-" prefix for Kokonoe Stable wrestlers). Wrestlers may change their shikona at significant career moments.

### Head-to-Head Records

The game tracks every rikishi's record against each specific opponent — wins, losses, last kimarite used, and streaks. This history feeds into rivalry systems and media coverage.

---

## 6. The Division Hierarchy & Ranks

Professional sumo has six divisions. Only the top two divisions (Makuuchi and Juryo) receive monthly salaries.

### Divisions from Top to Bottom

| Division | Pro Status | Monthly Salary |
|----------|-----------|----------------|
| **Makuuchi** (幕内) | Professional | ¥1,400,000 – ¥3,000,000 |
| **Juryo** (十両) | Professional | ¥1,100,000 |
| **Makushita** (幕下) | Semi-pro | None |
| **Sandanme** (三段目) | Amateur | None |
| **Jonidan** (序二段) | Amateur | None |
| **Jonokuchi** (序ノ口) | Amateur | None |

The term **Sekitori** refers to all wrestlers in Makuuchi and Juryo — the paid professionals who receive monthly salaries and travel allowances.

### Ranks Within Makuuchi

| Rank | Japanese | Notes |
|------|----------|-------|
| **Yokozuna** | 横綱 | Grand Champion — never demotes, only retires |
| **Ozeki** | 大関 | Champion — subject to Kadoban system |
| **Sekiwake** | 関脇 | Third rank |
| **Komusubi** | 小結 | Fourth rank |
| **Maegashira** | 前頭 | Numbered 1–13+, East and West |

### East and West Sides

Every rank at Maegashira level and below has an **East** (Higashi/東) and **West** (Nishi/西) designation. East is slightly more prestigious. After each basho, wrestlers may move between sides as well as between ranks.

---

## 7. Basho — Tournament Play

### How a Tournament Works

Each basho runs for **15 consecutive days**. Every wrestler in the top two divisions (Makuuchi and Juryo) fights once per day. Lower divisions fight 7 bouts across the 15 days.

Matchups are set by the **torikumi** — a scheduling committee that uses a Swiss-style pairing system, matching wrestlers with similar records as the basho progresses.

### Win/Loss Records

- **Kachi-koshi** (勝ち越し): 8+ wins — a winning record; key for promotion consideration
- **Make-koshi** (負け越し): 7 or fewer wins — a losing record; triggers demotion risk

### Tournament Awards

| Award | Japanese | Description |
|-------|----------|-------------|
| **Yusho** | 優勝 | Championship — most wins (playoff if tied) |
| **Jun-Yusho** | 準優勝 | Runner-up |
| **Ginosho** | 技能賞 | Technique Award — best technique display |
| **Kantosho** | 敢闘賞 | Fighting Spirit Award |
| **Shukunsho** | 殊勲賞 | Outstanding Performance — beating top-ranked opponents |
| **Bout of the Basho** | — | Most exciting match by excitement score |

### Special Bout Outcomes

| Event | Description |
|-------|-------------|
| **Kinboshi** (金星) | Gold Star — Maegashira or lower beats a Yokozuna |
| **Ginboshi** (銀星) | Silver Star — Maegashira or lower beats an Ozeki |
| **Fusensho** (不戦勝) | Default win — opponent absent (kyūjō) |
| **Hansoku** (反則) | Disqualification — rule violation |

**Kinboshi** is one of the highest individual honours outside a championship win. It is a significant career milestone for lower-ranked wrestlers and a source of media attention.

### Kenshō Envelopes

Corporate sponsors place **kenshō** envelopes on featured bouts. Each envelope contains **¥50,000** for the winner. High-profile bouts can carry dozens of envelopes — a meaningful income source for top wrestlers and their stables.

### Withdrawal — Kyūjō

Wrestlers can withdraw from a tournament, receiving default losses for the remaining days. Reasons include:
- **Injury** (most common — a medical certificate is required for official records)
- **Voluntary** — rare, with reputational consequences
- **Personal circumstances**

---

## 8. Kimarite — Winning Techniques

There are **82 official kimarite** (winning techniques) in professional sumo, from common workhorses to legendary rarities. The game simulates all of them, with probability weighted by a wrestler's archetype, stats, and the tactical situation.

### Kimarite Families

| Family | Type | Examples |
|--------|------|---------|
| **Kihonwaza** | Force-out & push basics | Yorikiri, Oshidashi, Tsukidashi |
| **Nageite** | Throwing | Uwatenage, Sukuinage, Shitatenage |
| **Hinerite** | Twisting | Tsukiotoshi, Tottari, Kotehineri |
| **Kakeite** | Tripping/Hooking | Sotogake, Ashitori, Ketaguri |
| **Sorite** | Backwards body drops | Izori, Kakezori — extremely rare |

### Most Common Techniques

| Kimarite | Japanese | Meaning | Frequency |
|----------|----------|---------|-----------|
| **Yorikiri** | 寄り切り | Belt force-out | Very common |
| **Oshidashi** | 押し出し | Push out | Common |
| **Uwatenage** | 上手投げ | Overarm throw | Moderate |
| **Tsukidashi** | 突き出し | Thrust out | Moderate |
| **Oshitaoshi** | 押し倒し | Push down | Moderate |

Rare techniques like **Ipponzeoi** (shoulder throw) or the **Sorite** family (backward body drops) are extraordinary moments that generate significant media attention and excitement.

### Rarity Tiers

| Tier | Weight Range | Example |
|------|-------------|---------|
| Common | > 150 | Yorikiri (1000), Oshidashi (850) |
| Uncommon | 30–150 | Uwatenage (350), Tsukiotoshi (350) |
| Rare | 5–30 | Kubinage (15), Tottari (30) |
| Legendary | 1 | Sorite family, exotic tricks |

---

## 9. Training Your Stable

Training is how your wrestlers grow. During the **interim** and **pre_basho** phases you configure your heya's training programme.

### Heya-Wide Settings

**Training Intensity** — affects stat gains and fatigue accumulation:

| Level | Stat Gains | Fatigue | Notes |
|-------|-----------|---------|-------|
| **Conservative** | Low | Low | Safe — good for recovering wrestlers |
| **Balanced** | Moderate | Moderate | Default for most stables |
| **Intensive** | High | Moderate-High | Pushes development faster |
| **Punishing** | Maximum | High | Burnout risk — use sparingly |

> **Warning:** Intensive and Punishing training can trigger welfare investigations if sustained. They may also be blocked if your stable is under sanctions.

**Training Focus** — which stat cluster receives emphasis:

| Focus | Primary Benefit |
|-------|----------------|
| **Power** | Strength gains |
| **Speed** | Speed gains |
| **Technique** | Technique gains |
| **Balance** | Balance gains |
| **Neutral** | Spread across all stats |

**Style Bias** — heya-wide tactical direction:

| Bias | Effect |
|------|--------|
| **Oshi** | Emphasises push technique and speed — favours thrusting archetypes |
| **Yotsu** | Emphasises belt/grappling and technique — favours belt archetypes |
| **Neutral** | No bias — develops all archetypes equally |

**Recovery Emphasis** — how aggressively the stable manages fatigue:

| Setting | Effect |
|---------|--------|
| **Low** | Training-first — fatigue accumulates faster |
| **Normal** | Balanced approach |
| **High** | Recovery-first — reduces fatigue, protects at the cost of gains |

### Per-Wrestler Focus Modes

You can override the heya-wide settings for individual wrestlers:

| Mode | Use When |
|------|---------|
| **Develop** | Normal progression — follow heya settings |
| **Push** | Accelerate gains — more fatigue, higher reward |
| **Protect** | Cap intensity — recovering from injury or burnout |
| **Rebuild** | Post-injury rehabilitation focus |

### Advanced Drill Scheduling (P2 Extension)

The advanced training system lets you schedule day-by-day drills each week:

| Drill | Japanese | Focus |
|-------|----------|-------|
| **Asageiko** | 朝稽古 | Dawn sparring — technique and conditioning |
| **Butsukari** | ぶつかり | Charging practice — strength and aggression |
| **Teppo** | 手っ甲 | Pole thrusting — arm strength and push technique |
| **Moushi-ai** | 申し合い | Full match practice — competitive experience |
| **Shindo** | 進道 | Advancement training — focused stat development |
| **Rest** | — | Recovery day — reduces fatigue |

### How Stats Actually Grow

Each week, a wrestler's stats advance toward their **Potential Ability** ceiling based on:
1. Training intensity and focus
2. Facility level (training, recovery, nutrition)
3. Coaching staff quality
4. Age and development profile
5. Individual focus mode

Gains slow as a stat approaches its PA ceiling. A wrestler rated 85 Strength with a PA of 90 will improve much more slowly than one rated 60 with the same ceiling.

### Archetype Drift

Over time, a wrestler's actual combat habits (tracked from real bout outcomes) may diverge from their assigned archetype. A wrestler who keeps winning with throwing techniques will naturally drift toward a throwing profile. This is tracked as **archetype evidence** — the cumulative record of what actually worked in bouts.

---

## 10. Injuries & Recovery

### Injury Types

| Category | Examples |
|----------|---------|
| **Type** | Sprain, Strain, Contusion, Inflammation, Tear, Fracture, Nerve |
| **Location** | Shoulder, Elbow, Wrist, Back, Hip, Knee, Ankle, Neck, Rib |

### Severity Levels

| Severity | Typical Recovery |
|----------|----------------|
| **Minor** | 1–2 weeks |
| **Moderate** | 2–5 weeks |
| **Serious** | 6–13 weeks |

Recovery times extend for certain locations: knee and back injuries take longer regardless of severity. Fractures and nerve injuries carry additional weeks on top of the base estimate.

### Career-Ending Injury

A sufficiently severe injury (severity index above the critical threshold) can be **career-ending**, forcing immediate retirement. This is rare but a real risk at punishing training intensity or during high-impact basho.

### Managing Injured Wrestlers

- **Kyūjō** (withdrawal): Pull a wrestler from an active basho. Issue a **medical certificate** for official documentation — this affects how the absence is recorded and reported.
- **Focus Mode: Protect or Rebuild**: Limit training intensity for a recovering wrestler.
- **Nutrition**: Premium diet regimens accelerate recovery.
- **Recovery Facility**: Higher facility level reduces weeks remaining.

---

## 11. The Banzuke — Rankings

### How Rankings Work

After each basho the JSA publishes the **banzuke** — the official rankings for the next tournament. Wrestlers are promoted or demoted based on their win/loss record:

- **Win record (kachi-koshi, 8+)** → promotion candidate
- **Lose record (make-koshi, 7 or fewer)** → demotion candidate
- **Yusho winner** → strong promotion, sometimes a large jump

The size of rank movement depends on how dominant the performance was. A 10-5 record earns a modest promotion; a 13-2 runner-up performance may jump multiple ranks.

### Banzuke Reveal Phase

Before each basho, a dedicated **banzuke_reveal** phase (14 days) publishes the official rankings. Use this period to:
- Assess where your wrestlers will be placed
- Study opponent matchup projections
- Adjust training targets and recovery plans

### Kadoban — Ozeki Probation

If an **Ozeki** posts a losing record (make-koshi) in any basho, they enter **kadoban** status for the following tournament. Kadoban means:
- They must achieve kachi-koshi (8+ wins) or face demotion to Sekiwake
- Kadoban status is publicly tracked and generates media attention
- A wrestler can enter and exit kadoban multiple times in their career

### Yokozuna — The Grand Champion

Promotion to **Yokozuna** requires:
- Current Ozeki status
- Two consecutive yusho (championships) — or exceptional equivalent performance
- Approval by the Yokozuna Deliberation Council

Once promoted, a Yokozuna **never demotes**. However, they face mounting pressure to retire if performance drops, particularly if lower-ranked wrestlers claim kinboshi against them multiple times.

---

## 12. Stable Finances

Running a heya costs money — wrestlers' salaries, facilities, food, travel, staff. Prize money and sponsorships pay the bills. Managing the budget carefully is central to long-term success.

### Monthly Salary Scale

| Division/Rank | Monthly Salary |
|--------------|----------------|
| Yokozuna | ¥3,000,000 |
| Ozeki | ¥2,500,000 |
| Sekiwake / Komusubi | ¥1,800,000 each |
| Maegashira | ¥1,400,000 |
| Juryo | ¥1,100,000 |
| Makushita and below | ¥0 (no salary) |

Sekitori (Makuuchi and Juryo wrestlers) also receive a **travel allowance** each month, variable by rank and tournament location.

### Income Sources

| Source | Frequency | Amount |
|--------|-----------|--------|
| **Prize money** | Per basho | Yusho: ~¥2,000,000+; Jun-Yusho: ~¥1,000,000; Special prizes: ~¥200,000 |
| **Kenshō envelopes** | Per bout | ¥50,000 per envelope won |
| **Koenkai donations** | Monthly | ¥0 – ¥500,000+ depending on supporter strength |
| **Sponsorships** | Per contract | Variable by sponsor tier |
| **Mochikyukin** | Career-accumulated | Prize money that converts to stable revenue |

### Expenses

| Expense | Frequency |
|---------|-----------|
| Salaries | Monthly |
| Travel allowances | Monthly |
| Facility maintenance/rent | Monthly |
| Food/nutrition | Monthly (rate depends on diet regimen) |
| Medical treatment | As needed |
| Loan repayments | Monthly (fixed principal + interest) |
| Governance fines | As imposed |

### Loans

When funds run low you can take out loans:

| Type | Notes |
|------|-------|
| **Emergency** | High interest, fast access |
| **Supporter** | Fan-backed, moderate terms |
| **Benefactor** | Wealthy patron, may come with conditions |

Interest rates typically range from **5–15% per payment**. Loans with conditions ("strings attached") — such as a requirement to promote a specific wrestler within a timeframe — can have serious consequences if you fail to meet them.

### The Finance Ledger

The **Office → Finances** screen shows:
- Running balance
- Monthly income/expense projection
- Loan obligations and remaining terms
- Historical ledger entries

---

## 13. Sponsorships & Koenkai

### Koenkai — The Supporter Club

A **Koenkai** is a stable's organised fan club. Members contribute regular donations. The stronger your Koenkai, the more reliable monthly income you receive:

| Band | Monthly Income Range |
|------|---------------------|
| None | ¥0 |
| Weak | Small contribution |
| Moderate | Meaningful contribution |
| Strong | Significant contribution |
| Powerful | Major monthly income |

Koenkai strength grows with prestige, notable wrestlers, championship victories, and community engagement.

### Corporate Sponsorships

Sponsors offer financial support in several roles:
- **Kenshō** — bout-specific banner sponsorship (prize per bout win)
- **Koenkai Member / Pillar** — regular supporter club contributor
- **Benefactor** — large one-time donation
- **Creditor** — loan provider

Sponsors have hidden personality traits:
- **Prestige Affinity** — how much they care about your stable's ranking
- **Loyalty** — willingness to stick through difficult periods
- **Scandal Tolerance** — how much misbehaviour they'll accept
- **Visibility Preference** — from quiet patron to publicity-hungry partner

Sponsor **satisfaction** (0–100) affects renewals. Keep them happy with strong performances and a clean reputation. A scandal can cause your most visibility-sensitive sponsors to withdraw immediately.

---

## 14. Recruitment & Scouting

Building for the future means finding and signing new talent before your rivals do.

### The Talent Pool

Candidates enter the talent pool from three sources:

| Source | Profile |
|--------|---------|
| **High School** | Youngest entrants — cheapest, least experienced, highest development ceiling |
| **University** | More developed, moderate cost, less total development room |
| **Foreign** | International wrestlers — variable stats, costs, and political capital requirements |

### Visibility

Not all candidates are equally visible. You may need to scout to find them:

| Visibility | How to Access |
|------------|--------------|
| **Public** | Everyone can see and scout immediately |
| **Rumored** | Word of mouth — require light scouting to confirm |
| **Obscure** | Require dedicated scouting investment |
| **Hidden** | Rare talent requiring master-level scouting |

### Scouting

Scouting costs time and money. Higher scouting levels reveal more of a candidate's hidden potential:

- **Level 1**: Basic visible stats only
- **Level 3**: Partial hidden potential visible
- **Level 5**: Full potential revealed (combat archetype, development profile, PA)

### Making an Offer

Once you've scouted a candidate:

| Offer Type | Notes |
|------------|-------|
| **Standard** | Normal offer — competitive but not aggressive |
| **Aggressive** | Higher financial terms — better chance vs. rivals |
| **Prestige Pitch** | Emphasise stable legacy and development track record |
| **Covert** | Quiet approach — reduces visibility of your interest |

Other stables compete for the same talent. A candidate's **suitor interest band** (Low, Medium, High, All-In) tells you how much competition you're facing. Watch the **deadline** — if you don't finalise before it closes, the candidate may sign elsewhere.

### Recruitment Windows

Recruitment is only open during specific periods:
- **Post-basho** recovery period
- **Mid-interim** window

Outside these windows you cannot make new signings.

---

## 15. Governance & Compliance

The Japan Sumo Association (JSA) maintains strict standards. Violations damage your reputation, cost money, and can restrict your operations.

### Governance Status

Your heya's standing with the JSA:

| Status | Effect |
|--------|--------|
| **Good Standing** | No restrictions |
| **Warning** | First formal notice — reputation penalty |
| **Probation** | Escalated scrutiny — prestige penalty, possible fine |
| **Sanctioned** | Active penalties — recruitment freeze, fines, training caps |

### What Triggers Violations

- Wrestler scandals (violence, gambling, abuse allegations)
- Welfare compliance failures
- Repeated governance violations
- Financial irregularities

### Responding to Governance Actions

When you receive a ruling you can:
- **Submit a written response** — may reduce penalty severity
- **Issue internal discipline** — warn or dismiss staff involved
- **Spend political capital** — influence council decisions

### Scandal Score

Every heya carries a **scandal score** (0–100+). This accumulates with each incident and decays slowly over time. A high scandal score:
- Damages sponsor satisfaction
- Reduces Koenkai strength
- Attracts negative media coverage
- Increases probability of JSA investigation

---

## 16. Welfare System

Separate from governance, the welfare system monitors how your wrestlers are treated.

### Welfare Risk

**WelfareRisk** (0–100) reflects the quality of your training environment. Higher means worse conditions:

- **0–30**: Healthy environment
- **30–60**: Watch territory — inspection risk
- **60–80**: High risk — investigation likely
- **80+**: Critical — sanctions probable

### Compliance States

| State | Meaning |
|-------|---------|
| **Compliant** | Passes inspection — no issues |
| **Watch** | Flagged for monitoring |
| **Investigation** | Active audit underway (progress 0–100%) |
| **Sanctioned** | Penalties active |

### What Sanctions Do

If your welfare investigation fails:
- **Recruitment freeze**: Cannot sign new wrestlers for a fixed number of weeks
- **Training intensity cap**: Limited to Conservative or Balanced training only
- **Fines**: Direct financial penalty

### Diet Regimen

The food you provide directly affects welfare risk and rikishi wellbeing:

| Diet | Effect |
|------|--------|
| **Austerity** | Budget cut — increases welfare risk |
| **Maintenance** | Standard — neutral welfare impact |
| **Heavy Bulk** | Aggressive weight gain — moderate cost |
| **Premium** | High-end nutrition — morale and stamina boost, best welfare score |

---

## 17. Factions & Political Capital

### Ichimon — The Five Factions

Every stable belongs to one of five historical sumo factions:

| Faction | Japanese |
|---------|----------|
| Dewanoumi | 出羽海 |
| Nishonoseki | 二所ノ関 |
| Takasago | 高砂 |
| Tokitsukaze | 時津風 |
| Isegahama | 伊勢ヶ浜 |

Your ichimon affects:
- Alliances with other stables in your faction
- NPC oyakata relationships
- Access to political capital trades

### Political Capital

**Political capital** is a resource spent to influence JSA decisions:
- Soften governance rulings
- Influence banzuke committee decisions
- Support or oppose other stables
- Block or accelerate league policy changes

Political capital is gained through prestige, faction alignment, championship wins, and alliances. It is spent on specific actions through the **JSA → Governance** screen.

---

## 18. Facilities

Your heya's physical infrastructure directly affects training outcomes and wrestler recovery.

### Facility Types

| Facility | What It Affects |
|----------|----------------|
| **Training** | Stat gains per week (multiplier on all training) |
| **Recovery** | Injury healing speed and fatigue recovery rate |
| **Nutrition** | Stamina baseline and health recovery |

### Upgrade Levels

Each facility can be upgraded from **Level 1 to Level 5**:

| Level | Description |
|-------|-------------|
| 1 | Basic — minimal multiplier |
| 2 | Decent — noticeable improvement |
| 3 | Good — meaningful impact |
| 4 | Excellent — significant advantage |
| 5 | World-class — maximum benefit |

Upgrades are expensive and take time to complete. Prioritise based on your current strategy:
- Building a training-focused dynasty? → invest in Training first
- Running older wrestlers hard? → Recovery facility is critical
- Focused on stamina and endurance? → Nutrition delivers sustained gains

---

## 19. Narrative & Media

### The Event Log

The scrolling event log on the right side of the screen captures everything significant: bout results, injuries, governance rulings, sponsor events, recruitment news, and atmospheric storytelling generated by the **Bard Engine**.

### Media Coverage

Three media outlets cover sumo in different ways:

| Outlet | Focus |
|--------|-------|
| **JSA Official** | Formal announcements, rulings, banzuke |
| **Sports Daily** | Mainstream sports coverage, tournament news |
| **Tabloid** | Gossip, scandals, personal stories |

### Media Heat

Each rikishi has a **media heat** rating (0–100) reflecting the intensity of press focus on them. High media heat wrestlers attract more kenshō sponsors, generate more fan interest, and — if involved in a scandal — cause greater reputational damage.

Heat rises from: championship runs, kinboshi victories, dramatic comebacks, streaks, retirement watch coverage. It fades slowly between relevant events.

### Scandal Types

| Scandal | Description |
|---------|-------------|
| **Late-night brawl** | Off-field violence incident |
| **Secret injury leak** | Private medical information exposed |
| **Illegal gambling** | Betting on matches |
| **Training abuse allegation** | Welfare violation |
| **Coach dispute** | Staff conflict made public |

Each scandal type carries different governance and sponsor consequences.

---

## 20. Hall of Fame & Legacy

### Retirement

Wrestlers retire for several reasons:

| Reason | Details |
|--------|---------|
| **Age** | Mandatory retirement at 45; Yokozuna at 40 |
| **Career-ending injury** | Injury severity beyond the critical threshold |
| **Council pressure** | Yokozuna receiving 3 formal performance warnings |
| **Performance decline** | 2+ consecutive make-koshi, or 3+ missed basho |
| **Natural aging** | ~5% chance per year after age 34 |
| **Voluntary** | Player-initiated early retirement |

### Hall of Fame

Retired wrestlers with significant careers enter the **Hall of Fame**, accessible via the Archives section. Records include:
- Career wins, yusho, special prizes
- Rank peak achieved
- Basho milestones
- Head-to-head records
- Career kimarite breakdown

### Legacy Tiers

Your heya's long-term track record earns a **legacy tier**:

| Tier | Meaning |
|------|---------|
| **Emerging** | New or rebuilding stable |
| **Established** | Proven track record |
| **Dynasty** | Multiple championships, deep history |
| **Legend** | All-time great stable — historical prestige |

Legacy tier affects Koenkai strength, sponsor attraction, and recruitment appeal.

---

## 21. Advanced Mechanics

### Oyakata Archetypes

Your personal management style affects how the game's AI and events respond to you:

| Archetype | Tendency |
|-----------|---------|
| **Traditionalist** | Conservative training, historical methods, slow development |
| **Scientist** | Data-driven, experimental tactics — higher burnout risk |
| **Gambler** | High risk/reward decisions, volatile outcomes |
| **Nurturer** | Welfare-focused, steady growth, morale-heavy |
| **Tyrant** | Punishing training, scandal-prone, high turnover |
| **Strategist** | Political play, faction moves, long calculation |
| **Strict** | Discipline-focused, rigid structure, welfare-compliant |
| **Indulgent** | Permissive, morale-boosting — potential scandal risk |

### Excitement Score

Every bout is assigned an **excitement score** based on:
- Rank disparity (upsets score higher)
- Rarity of the kimarite used
- Competitive balance (close matches score higher than dominant ones)
- Comeback factor (winning after being driven to the edge)

The highest-excitement match of the tournament wins **Bout of the Basho**.

### Era Tone / Meta Drift

The sumo world's overall tactical meta shifts over time between four eras:

| Era | Tendency |
|-----|---------|
| **Classic** | Yorikiri and traditional belt wrestling dominate |
| **Explosive** | Fast, high-energy bouts with more throws |
| **Technical** | Rare techniques appear more often |
| **Defensive** | Counter-wrestling and patience rewarded |

Era drift is reflected in media commentary and visible in the Almanac's league-wide kimarite statistics.

### Myoseki — Wrestling Name Market

The **Myoseki** market (under the JSA section) allows buying and selling of official wrestling names — prestigious shikona that carry historical weight. Acquiring a famous myoseki can boost a wrestler's brand value and koenkai appeal.

### Auto-Simulation

The **Auto-Sim** function simulates weeks or months of game time automatically. The AI manages all NPC stables' decisions; your wrestlers train and compete without your input. Use it to accelerate through quiet off-season stretches, but be cautious — injuries can occur, governance events can demand responses, and recruitment windows can close.

---

## 22. Glossary

| Term | Definition |
|------|-----------|
| **Aki** | Autumn basho, held in September in Tokyo |
| **Asageiko** | Dawn sparring session |
| **Banzuke** | Official ranking document published before each basho |
| **Basho** | Grand sumo tournament; six per year |
| **Bout of the Basho** | Most exciting match of a tournament |
| **Butsukari** | Charging practice drill |
| **Cycleephase** | Current game phase (pre_basho, active_basho, post_basho, interim, banzuke_reveal) |
| **Fusensho** | Default win — opponent was absent |
| **Ginosho** | Technique Award special prize |
| **Ginboshi** | Silver Star — beating an Ozeki as a lower-ranked wrestler |
| **Hansoku** | Disqualification for rule violation |
| **Hatsu** | New Year basho, held in January in Tokyo |
| **Heya** | Sumo stable — your organisation |
| **H2H** | Head-to-head record between two specific wrestlers |
| **Ichimon** | Sumo faction |
| **Interim** | Six-week period between tournaments |
| **Jonidan** | Fifth division |
| **Jonokuchi** | Sixth (lowest) division |
| **Juryo** | Second division; first paid professional level |
| **Kachi-koshi** | Winning record: 8+ wins in a 15-match basho |
| **Kadoban** | Ozeki on probation after a losing record |
| **Kantosho** | Fighting Spirit Award |
| **Kenshō** | Prize envelopes placed on featured bouts |
| **Kimarite** | Official winning technique used to end a bout |
| **Kinboshi** | Gold Star — lower-ranked wrestler beats a Yokozuna |
| **Koenkai** | Stable's organised fan and supporter club |
| **Komusubi** | Fourth rank in Makuuchi |
| **Kyūjō** | Tournament withdrawal |
| **Kyushu** | November basho, held in Fukuoka |
| **Makuuchi** | Top (first) division |
| **Makushita** | Third division; first below professional |
| **Make-koshi** | Losing record: 7 or fewer wins |
| **Maegashira** | Numbered ranks in Makuuchi (1–13+) |
| **Mochikyukin** | Career prize money accumulation |
| **Moushi-ai** | Full match practice |
| **Myoseki** | Official wrestling name — a tradable asset |
| **Nagoya** | July basho, held in Nagoya |
| **Natsu** | Summer basho, held in May in Tokyo |
| **Oyakata** | Stable master — the player character |
| **Ozeki** | Second rank in Makuuchi |
| **PA (Potential Ability)** | Hidden ceiling for each wrestler stat |
| **Rikishi** | A sumo wrestler |
| **Sandanme** | Fourth division |
| **Sekitori** | Professional wrestler — Makuuchi or Juryo rank |
| **Sekiwake** | Third rank in Makuuchi |
| **Shikona** | Ring name |
| **Shukunsho** | Outstanding Performance Award |
| **Teppo** | Pole-thrusting practice drill |
| **Torikumi** | Daily bout schedule set by the JSA committee |
| **Welfare Risk** | Score (0–100) measuring quality of training environment |
| **Yokozuna** | Grand Champion — highest rank in sumo |
| **Yusho** | Tournament championship |

---

*Sumo Manager Pro — build your heya, forge your dynasty.*
