// Quick test script
const fs = require('fs');
const result = fs.readFileSync('src/tests/unit/engine/tick/pipelineRunner.test.ts', 'utf-8');
console.log(result.includes('__PERF__'));
