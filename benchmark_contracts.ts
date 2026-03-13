import { bench, run } from "mitata";

interface ContractInfo {
  isExpiringSoon: boolean;
  monthlyIncome: number;
}

// Generate realistic dataset (e.g., 100 contracts, 20% expiring soon)
const DATA_SIZES = [10, 100, 1000, 10000];

for (const size of DATA_SIZES) {
  const contracts: ContractInfo[] = Array.from({ length: size }, (_, i) => ({
    isExpiringSoon: i % 5 === 0,
    monthlyIncome: 100000,
  }));

  bench(`[size=${size}] filter.length`, () => {
    return contracts.filter(c => c.isExpiringSoon).length;
  });

  bench(`[size=${size}] reduce`, () => {
    return contracts.reduce((count, c) => count + (c.isExpiringSoon ? 1 : 0), 0);
  });

  bench(`[size=${size}] for loop`, () => {
    let count = 0;
    for (let i = 0; i < contracts.length; i++) {
      if (contracts[i].isExpiringSoon) count++;
    }
    return count;
  });

  bench(`[size=${size}] for...of loop`, () => {
    let count = 0;
    for (const c of contracts) {
      if (c.isExpiringSoon) count++;
    }
    return count;
  });
}

await run();
