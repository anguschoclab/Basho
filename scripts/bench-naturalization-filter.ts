import { bench, run } from "mitata";

const SIZE = 1000;
const rikishiMap = new Map();
for (let i = 0; i < SIZE; i++) {
  rikishiMap.set(`r${i}`, {
    id: `r${i}`,
    nationality: i % 10 === 0 ? "Mongolia" : "Japan"
  });
}

bench("for-of push", () => {
  const foreignRikishi = [];
  for (const r of rikishiMap.values()) {
    if (r.nationality !== "Japan") {
      foreignRikishi.push(r);
    }
  }
  return foreignRikishi;
});

bench("Array.from.filter", () => {
  return Array.from(rikishiMap.values()).filter(r => r.nationality !== "Japan");
});

bench("spread filter", () => {
  return [...rikishiMap.values()].filter(r => r.nationality !== "Japan");
});

await run();
