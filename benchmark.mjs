import { run, bench, group } from "mitata";

const vacanciesByHeyaId = {};
for (let i = 0; i < 50; i++) {
  vacanciesByHeyaId[`heya_${i}`] = Math.floor(Math.random() * 5);
}
const playerHeyaId = "heya_25";

group("totalNPCVacancies", () => {
  bench("current", () => {
    return Object.entries(vacanciesByHeyaId)
      .filter(([id]) => id !== playerHeyaId)
      .reduce((sum, [, v]) => sum + v, 0);
  });

  bench("reduce only", () => {
    return Object.entries(vacanciesByHeyaId)
      .reduce((sum, [id, v]) => id !== playerHeyaId ? sum + v : sum, 0);
  });

  bench("for...in loop", () => {
    let sum = 0;
    for (const id in vacanciesByHeyaId) {
      if (id !== playerHeyaId) {
        sum += vacanciesByHeyaId[id];
      }
    }
    return sum;
  });
});

await run();
