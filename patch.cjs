const fs = require('fs');
const file = 'src/engine/banzuke.ts';
let code = fs.readFileSync(file, 'utf8');

const helpers = `
function calculateYokozunaCount(makuuchi: BanzukeEntry[], perfById: Map<string, BashoPerformance>): number {
  const yokozunaIds = makuuchi.filter((e) => e.position.rank === "yokozuna").map((e) => e.rikishiId);
  const yPromotions = makuuchi.filter((e) => {
    const p = perfById.get(e.rikishiId);
    return e.position.rank === "ozeki" && !!p?.promoteToYokozuna;
  }).length;
  let yokozunaCount = yokozunaIds.length + yPromotions;
  return clampInt(yokozunaCount, 0, 6);
}

function calculateOzekiCount(makuuchi: BanzukeEntry[], perfById: Map<string, BashoPerformance>, demotedOzeki: Set<string>): number {
  const ozekiIds = makuuchi
    .filter((e) => e.position.rank === "ozeki" && !demotedOzeki.has(e.rikishiId))
    .map((e) => e.rikishiId);

  const ozekiPromoteCandidates = makuuchi.filter((e) => {
    if (e.position.rank !== "sekiwake") return false;
    const p = perfById.get(e.rikishiId);
    return (p?.wins ?? 0) >= 11;
  });

  return Math.max(2, ozekiIds.length + ozekiPromoteCandidates.length);
}

function calculateSekiwakeCount(makuuchi: BanzukeEntry[], perfById: Map<string, BashoPerformance>, demotedCount: number): number {
  const sekiwakePromoteCandidates = makuuchi.filter((e) => {
    if (e.position.rank !== "komusubi") return false;
    const p = perfById.get(e.rikishiId);
    return (p?.wins ?? 0) >= 10;
  });

  let sekiwakeCount = 2 + demotedCount + sekiwakePromoteCandidates.length;
  return clampInt(sekiwakeCount, 2, 6);
}

function calculateKomusubiCount(makuuchi: BanzukeEntry[], perfById: Map<string, BashoPerformance>): number {
  const komusubiPromoteCandidates = makuuchi.filter((e) => {
    if (e.position.rank !== "maegashira") return false;
    const p = perfById.get(e.rikishiId);
    const wins = p?.wins ?? 0;
    const yusho = !!p?.yusho;
    const rn = e.position.rankNumber ?? 99;
    const nearTop = rn <= 4;
    return yusho || (nearTop && wins >= 10);
  });

  let komusubiCount = 2 + komusubiPromoteCandidates.length;
  return clampInt(komusubiCount, 2, 6);
}
`;

code = code.replace(
  'function computeVariableSanyakuCounts(',
  helpers + '\nfunction computeVariableSanyakuCounts('
);

code = code.replace(
`  const yokozunaIds = makuuchi.filter((e) => e.position.rank === "yokozuna").map((e) => e.rikishiId);

  const ozekiIds = makuuchi
    .filter((e) => e.position.rank === "ozeki" && !demotedOzeki.has(e.rikishiId))
    .map((e) => e.rikishiId);

  const ozekiPromoteCandidates = makuuchi.filter((e) => {
    if (e.position.rank !== "sekiwake") return false;
    const p = perfById.get(e.rikishiId);
    return (p?.wins ?? 0) >= 11;
  });

  let ozekiCount = Math.max(2, ozekiIds.length + ozekiPromoteCandidates.length);

  const demotedCount = demotedOzeki.size;

  const sekiwakePromoteCandidates = makuuchi.filter((e) => {
    if (e.position.rank !== "komusubi") return false;
    const p = perfById.get(e.rikishiId);
    return (p?.wins ?? 0) >= 10;
  });

  let sekiwakeCount = 2 + demotedCount + sekiwakePromoteCandidates.length;
  sekiwakeCount = clampInt(sekiwakeCount, 2, 6);

  const komusubiPromoteCandidates = makuuchi.filter((e) => {
    if (e.position.rank !== "maegashira") return false;
    const p = perfById.get(e.rikishiId);
    const wins = p?.wins ?? 0;
    const yusho = !!p?.yusho;
    const rn = e.position.rankNumber ?? 99;
    const nearTop = rn <= 4;
    return yusho || (nearTop && wins >= 10);
  });

  let komusubiCount = 2 + komusubiPromoteCandidates.length;
  komusubiCount = clampInt(komusubiCount, 2, 6);

  const yPromotions = makuuchi.filter((e) => {
    const p = perfById.get(e.rikishiId);
    return e.position.rank === "ozeki" && !!p?.promoteToYokozuna;
  }).length;

  let yokozunaCount = yokozunaIds.length + yPromotions;
  yokozunaCount = clampInt(yokozunaCount, 0, 6);`,
`  let yokozunaCount = calculateYokozunaCount(makuuchi, perfById);
  let ozekiCount = calculateOzekiCount(makuuchi, perfById, demotedOzeki);
  let sekiwakeCount = calculateSekiwakeCount(makuuchi, perfById, demotedOzeki.size);
  let komusubiCount = calculateKomusubiCount(makuuchi, perfById);`
);

fs.writeFileSync(file, code);
