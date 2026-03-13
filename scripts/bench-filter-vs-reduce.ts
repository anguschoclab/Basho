import { bench, run } from "mitata";

const SIZE = 500; // closer to max matches in a basho day or tournament, but let's see. typically 15 days x ~20 matches = 300
const array = Array.from({ length: SIZE }, (_, i) => {
  return {
    eastRikishiId: "r1",
    westRikishiId: "r2",
    result: i % 3 === 0 ? { winner: "east" } : undefined
  };
});

bench("filter.length", () => {
  return array.filter((m) => !!m?.result).length;
});

bench("reduce", () => {
  return array.reduce((count, m) => count + (m?.result ? 1 : 0), 0);
});

bench("for-loop", () => {
  let count = 0;
  for (let i = 0; i < array.length; i++) {
    if (array[i]?.result) {
      count++;
    }
  }
  return count;
});

await run();
