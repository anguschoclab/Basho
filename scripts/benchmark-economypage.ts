import { bench, run } from "mitata";

// Mock data similar to playerRikishi
const generateData = (size: number) => {
  return Array.from({ length: size }, (_, i) => ({
    id: `r_${i}`,
    shikona: `Wrestler ${i}`,
    economics: {
      careerKenshoWon: Math.floor(Math.random() * 500)
    }
  }));
};

const data = generateData(1000); // 1000 wrestlers might be an extreme case, but good for benching

bench("with spread: [...arr].filter().sort()", () => {
  return [...data]
    .filter((r: any) => r && typeof r === "object")
    .sort((a: any, b: any) => {
      const av = Number((a as any)?.economics?.careerKenshoWon ?? 0) || 0;
      const bv = Number((b as any)?.economics?.careerKenshoWon ?? 0) || 0;
      return bv - av;
    })
    .slice(0, 5);
});

bench("without spread: arr.filter().sort()", () => {
  return data
    .filter((r: any) => r && typeof r === "object")
    .sort((a: any, b: any) => {
      const av = Number((a as any)?.economics?.careerKenshoWon ?? 0) || 0;
      const bv = Number((b as any)?.economics?.careerKenshoWon ?? 0) || 0;
      return bv - av;
    })
    .slice(0, 5);
});

await run();
