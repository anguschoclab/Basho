import { generateInitialWorld } from "@/engine/generation/WorldFactory";

const world = generateInitialWorld("roster-c");
const sizes: number[] = [];
const sekitori: Record<string, number> = {};
for (const heya of world.heyas.values()) {
  const ids = heya.rikishiIds ?? [];
  sizes.push(ids.length);
  sekitori[heya.name] = ids.filter((id) => {
    const d = world.rikishi.get(id)?.division;
    return d === "makuuchi" || d === "juryo";
  }).length;
}
sizes.sort((a, b) => b - a);
const total = sizes.reduce((a, b) => a + b, 0);
console.log(`stables=${sizes.length} total=${total} mean=${(total / sizes.length).toFixed(1)}`);
console.log(`top10 sizes: ${sizes.slice(0, 10).join(", ")}`);
console.log(`bottom10: ${sizes.slice(-10).join(", ")}`);
const sek = Object.entries(sekitori).sort((a, b) => b[1] - a[1]);
console.log(`sekitori total=${sek.reduce((a, [, n]) => a + n, 0)} | top: ${sek.slice(0, 8).map(([n, c]) => `${n}:${c}`).join(" ")}`);
