const fs = require('fs');
const file = 'src/engine/banzuke.ts';
let code = fs.readFileSync(file, 'utf8');

const jsdoc = `/**
 * Compute variable sanyaku counts.
 *  * @param current - The Current.
 *  * @param perfById - The Perf by id.
 *  * @param demotedOzeki - The Demoted ozeki.
 *  * @returns The result.
 */
`;

code = code.replace(jsdoc, '');

code = code.replace(
  'function computeVariableSanyakuCounts(',
  jsdoc + 'function computeVariableSanyakuCounts('
);

fs.writeFileSync(file, code);
