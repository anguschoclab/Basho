const fs = require('fs');
let code = fs.readFileSync('src/engine/bout.ts', 'utf8');

// If there's an import for clamp from utils, we shouldn't declare it again. But let's check if it's imported.
if (code.includes('import { clamp } from')) {
    code = code.replace(/const clamp = \(n: number, a: number, b: number\) => Math.max\(a, Math.min\(b, n\)\);/, '');
} else {
    // If not imported, we can just rename the local one to _clamp or localClamp to be safe, but wait, the error is in the bundled file.
    // The vite bundler might hoist it or complain if there's a conflict in the same scope due to some merging.
    // Let's just change `const clamp = ` to `const localClamp = ` and update references in bout.ts.
}

// Actually, wait, the error is "Identifier 'clamp' has already been declared".
// It could be in narrativeDescriptions.ts or worldgen.ts or bout.ts.
