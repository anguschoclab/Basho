/**
 * dup-boutid-probe.ts — empirical check for the duplicate React key
 * `b-<year>-<basho>-d<day>-<east>-<west>` observed in e2e smoke.
 * Runs bashos via the canonical fast-advance tick path and reports any
 * day whose match list contains duplicate boutIds (or duplicate pairs
 * under different ids).
 *
 * Run: bun scripts/sim/dup-boutid-probe.ts [seed]
 */
import { generateInitialWorld } from "@/engine/generation/WorldFactory";
import { advanceDaysFast } from "@/engine/tick/tickDaily";
import { BardEngine } from "@/engine/bard/BardEngine";

const SEED = process.argv[2] ?? "dup-boutid-probe-v1";

await BardEngine.loadDomains();
let world = generateInitialWorld(SEED);

let collisions = 0;
const seenBasho = new Set<string>();

for (let step = 0; step < 140; step++) {
  world = advanceDaysFast(world, 1, { autonomous: true });
  const b = world.currentBasho;
  if (!b || !b.isActive) continue;
  if (seenBasho.has(`${b.id}#${b.day}`)) continue;
  seenBasho.add(`${b.id}#${b.day}`);

  const ids = new Map<string, number>();
  const pairs = new Map<string, number>();
  for (const m of b.matches) {
    ids.set(m.boutId, (ids.get(m.boutId) ?? 0) + 1);
    pairs.set(
      `${m.day}|${m.eastRikishiId}|${m.westRikishiId}`,
      (pairs.get(`${m.day}|${m.eastRikishiId}|${m.westRikishiId}`) ?? 0) + 1
    );
  }
  for (const [id, n] of ids) {
    if (n > 1) {
      collisions++;
      const ms = b.matches.filter((m) => m.boutId === id);
      console.log(
        `DUP-ID ${b.bashoName} ${b.year}: ${id} x${n}` +
          ms
            .map(
              (m) =>
                ` [div-ish flags: callup=${m.crossDivisionCallupId ?? "-"} 8th=${m.eighthBoutForRikishiId ?? "-"} result=${m.result ? "y" : "n"}]`
            )
            .join("")
      );
    }
  }
  for (const [pair, n] of pairs) {
    if (n > 1) {
      const [d, e, w] = pair.split("|");
      const ms = b.matches.filter(
        (m) => m.day === Number(d) && m.eastRikishiId === e && m.westRikishiId === w
      );
      if (new Set(ms.map((m) => m.boutId)).size === n) {
        collisions++;
        console.log(
          `DUP-PAIR ${b.bashoName} ${b.year}: day=${d} ${e} vs ${w} x${n} ids=${ms.map((m) => m.boutId).join(",")}`
        );
      }
    }
  }
}

console.log(`done: ${seenBasho.size} day-checks, ${collisions} collisions`);
