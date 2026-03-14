# Sumo Wrestling Manager Simulation

A deep, deterministic sumo wrestling management simulation game. Take on the role of an *Oyakata* (stablemaster), manage your *heya* (stable), scout and train *rikishi* (wrestlers), and guide them up the prestigious *banzuke* (rankings) to reach the pinnacle of the sport: Yokozuna.

## Features

- **Realistic Banzuke System:** Dynamic ranking system that mirrors real-life sumo promotions and demotions based on *basho* (tournament) performance.
- **Deep Simulation Engine:** A fully deterministic simulation engine handling daily ticks, bouts, and tournaments with custom random number generation to ensure reproducible results.
- **Stable Management:** Manage your stable's facilities, finances, sponsors, and training regimes.
- **Rikishi Lifecycle:** Scout raw talent, guide them through training, manage their injuries, and watch them develop rivalries, enter the Hall of Fame, or retire.
- **Tournaments (Basho):** Experience the 15-day bi-monthly tournaments with full scheduling, matchmaking, and play-by-play bout generation featuring authentic *kimarite* (winning moves).
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

### Running the Application

Start the Vite development server:

```bash
bun run dev
```

The application will be available at `http://localhost:5173` (or the port specified in your terminal).

## Testing and Verification

The core engine is strictly deterministic to ensure that simulations are reproducible. Direct use of `Math.random()` is prohibited in the engine, utilizing `src/engine/rng.ts` instead.

**Run tests:**
```bash
bun test
```

**Verify determinism (RNG checks):**
```bash
bun run check:determinism
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
