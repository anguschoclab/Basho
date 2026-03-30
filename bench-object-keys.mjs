import { run, bench, group } from 'mitata';

function runBench() {
  group('Isolated check', () => {
    bench('Object.keys(smallStables).length > 0', () => {
      let result = 0;
      const smallStables = {};
      for (let i = 0; i < 50; i++) {
        smallStables[`heya_${i}`] = i;
      }
      for (let j = 0; j < 10000; j++) {
        if (Object.keys(smallStables).length > 0) {
          result++;
        }
      }
      return result;
    });

    bench('boolean tracking', () => {
      let result = 0;
      const smallStables = {};
      let hasVacancies = false;
      for (let i = 0; i < 50; i++) {
        smallStables[`heya_${i}`] = i;
        hasVacancies = true;
      }
      for (let j = 0; j < 10000; j++) {
        if (hasVacancies) {
          result++;
        }
      }
      return result;
    });
  });
}

runBench();
await run();
