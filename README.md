# Basho — Sumo Wrestling Manager Simulation

A deep, deterministic sumo wrestling management simulation game. Take on the role of an _Oyakata_ (stablemaster), manage your _heya_ (stable), scout and train _rikishi_ (wrestlers), and guide them up the prestigious _banzuke_ (rankings) to reach the pinnacle of the sport: Yokozuna.

## Features

- **Realistic Banzuke System:** Dynamic ranking system that mirrors real-life sumo promotions and demotions based on _basho_ (tournament) performance.
- **Deep Simulation Engine:** A fully deterministic simulation engine handling daily ticks, bouts, and tournaments with custom random number generation to ensure reproducible results.
- **Stable Management:** Manage your stable's facilities, finances, sponsors, and training regimes.
- **Rikishi Lifecycle:** Scout raw talent, guide them through training, manage their injuries, and watch them develop rivalries, enter the Hall of Fame, or retire.
- **Tournaments (Basho):** Experience the 15-day bi-monthly tournaments with full scheduling, matchmaking, and play-by-play bout generation featuring authentic _kimarite_ (winning moves).
- **Rich World Building:** Includes media perception, governance, historical tracking (Almanacs), and an in-depth economy system.

## Tech Stack

This project is a modern web application built with:

- **Frontend Framework:** React 18, Vite
- **Language:** TypeScript
- **Styling & UI:** Tailwind CSS, shadcn/ui, Radix UI
- **State Management & Routing:** React Query, React Router DOM
- **Runtime & Package Manager:** [Bun](https://bun.sh/)

## Project Structure

- `src/engine/` - The core deterministic simulation engine containing all business logic, game state, and sumo domain rules (banzuke, basho, matchmaking, scouting, etc.).
- `src/pages/` - React pages corresponding to different views in the game (Dashboard, Stable, Rikishi, Basho, etc.).
- `src/components/` - Reusable UI components, primarily built with shadcn/ui and Tailwind.
- `src/contexts/` - Global React contexts, such as `GameContext` which bridges the UI with the simulation engine.
- `src/lib/` - Utility functions.

## Getting Started

### Prerequisites

Ensure you have [Bun](https://bun.sh/) installed, as it is the primary runtime, package manager, and test runner for this project.

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

   `bun.lock` is the canonical lockfile. `npm install` / `yarn` / `pnpm install`
   are blocked by a `preinstall` guard — a second lockfile would silently
   diverge from what CI and other developers (macOS and Windows) install.

### Running the Application

Start the Vite development server:

```bash
bun run dev
```

The application will be available at `http://localhost:5173` (or the port specified in your terminal).

## Testing and Verification

The core engine is strictly deterministic to ensure that simulations are reproducible. Direct use of `Math.random()` is prohibited in the engine, utilizing `src/engine/rng.ts` instead.

**Run tests:**

The unit suite is split so the default run stays fast. During development,
prefer the fast suite or target specific files directly:

```bash
bun run test                   # fast unit tests (src/tests/unit/**)
npx vitest run <filepath>      # single file
```

Slow and long-horizon suites run adhoc — they spawn subprocesses
(eslint/knip/madge), need a production build, or simulate full game years:

```bash
bun run test:slow              # slow gates (src/tests/slow/**); run `bun run build` first
bun run test:perf              # perf benchmarks (src/tests/perf/**)
bun run test:all               # fast + slow + perf
```

Browser end-to-end specs (Playwright) are also adhoc and split by duration:

```bash
bun run test:e2e:smoke         # golden-path + reload-restore (~few min)
bun run test:e2e:soak          # full-basho-lifecycle + year-of-bashos (~10 min)
bun run test:e2e               # all e2e specs
```

The slow and perf suites run nightly in CI (`.github/workflows/slow-tests.yml`);
PRs gate on the fast suite, lint, and typecheck only.

**Verify determinism (static analysis for RNG & mutable state violations):**

```bash
bun scripts/engine-reviewer.ts
```

## Building for Production

To create a production build:

```bash
bun run build
```

The built assets will be located in the `dist/` directory.

## Contributing

When contributing to the codebase, especially within the `src/engine/` directory:

- Always use the provided RNG utility (`src/engine/rng.ts`) instead of `Math.random()`.
- Ensure new engine logic includes appropriate tests and maintains deterministic behavior.
- Avoid introducing browser-specific APIs (like `localStorage`) into core engine files to maintain testability in CLI environments.

## License

All rights reserved.
