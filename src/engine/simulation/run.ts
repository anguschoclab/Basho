import { generateInitialWorld } from "../systems/generation/WorldFactory";
import { runAutoSim } from "./AutoSimService";

interface SimArgs {
  seed: string;
  bashoCount: number;
}

function parseArgs(argv: string[]): SimArgs {
  const args: SimArgs = {
    seed: "default",
    bashoCount: 1,
  };

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--seed" && i + 1 < argv.length) {
      args.seed = argv[i + 1];
      i++;
    } else if (argv[i] === "--basho" && i + 1 < argv.length) {
      const parsed = parseInt(argv[i + 1], 10);
      args.bashoCount = Number.isNaN(parsed) ? 1 : Math.max(0, parsed);
      i++;
    }
  }

  return args;
}

function run() {
  const { seed, bashoCount } = parseArgs(process.argv.slice(2));
  const world = generateInitialWorld(seed);
  const result = runAutoSim(world, {
    duration: { type: "basho", count: bashoCount },
    stopConditions: [],
    verbosity: "minimal",
    delegationPolicy: "balanced",
    observerMode: false,
  });

  const summary = {
    seed,
    bashoCount: result.bashoSimulated,
    startYear: result.startYear,
    endYear: result.endYear,
    stoppedBy: result.stoppedBy,
    highlights: result.chronicle.highlights.slice(0, 20),
  };

  process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
}

run();
