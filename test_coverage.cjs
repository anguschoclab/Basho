const fs = require('fs');

const content = fs.readFileSync('src/tests/unit/engine/tick/pipelineRunner.test.ts', 'utf-8');
console.log(content.includes('__PERF__'));
