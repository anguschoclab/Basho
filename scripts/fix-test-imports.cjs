/**
 * Fix relative imports in all moved test files under src/tests/unit/.
 * Converts source-code relative imports to @/... aliases.
 * Adjusts test-helper relative imports to correct locations.
 * Also fixes vi.mock() paths.
 */

const fs = require('fs');
const path = require('path');

const TEST_ROOT = path.resolve(__dirname, '../src/tests/unit');
const SRC_ROOT = path.resolve(__dirname, '../src');

function getAllTestFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllTestFiles(fullPath));
    } else if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

function resolveImport(testDir, importPath) {
  // Don't resolve non-relative imports
  if (!importPath.startsWith('./') && !importPath.startsWith('../')) {
    return null;
  }
  try {
    const resolved = path.resolve(testDir, importPath);
    return resolved;
  } catch {
    return null;
  }
}

function getAliasPath(resolvedPath) {
  const relativeToSrc = path.relative(SRC_ROOT, resolvedPath);
  if (relativeToSrc.startsWith('..')) return null;
  return '@/' + relativeToSrc.replace(/\\/g, '/').replace(/\.ts$/, '').replace(/\.tsx$/, '').replace(/\/index$/, '');
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  const testDir = path.dirname(filePath);

  // Pattern 1: from "..."
  content = content.replace(/from\s+"([^"]+)"/g, (match, importPath) => {
    if (!importPath.startsWith('./') && !importPath.startsWith('../')) return match;

    const resolved = resolveImport(testDir, importPath);
    if (!resolved) return match;

    const relativeToSrc = path.relative(SRC_ROOT, resolved);

    // Old __tests__/utils references -> fix to correct test helper path
    if (importPath.includes('__tests__/utils')) {
      // Find the new utils.ts location. It should be in tests/unit/engine/utils.ts
      // or tests/unit/utils.ts depending on what exists
      const possibleUtilsPaths = [
        path.join(TEST_ROOT, 'engine', 'utils.ts'),
        path.join(TEST_ROOT, 'utils.ts'),
      ];
      for (const utilsPath of possibleUtilsPaths) {
        if (fs.existsSync(utilsPath)) {
          const relToUtils = path.relative(testDir, utilsPath).replace(/\\/g, '/').replace(/\.ts$/, '');
          changed = true;
          return `from "${relToUtils}"`;
        }
      }
      return match;
    }

    // If it resolves inside src/engine/, src/components/, src/contexts/, etc. (source code)
    // and NOT inside src/tests/, convert to @/ alias
    if (!relativeToSrc.startsWith('tests' + path.sep) && !relativeToSrc.startsWith('..' + path.sep)) {
      const aliasPath = getAliasPath(resolved);
      if (aliasPath) {
        changed = true;
        return `from "${aliasPath}"`;
      }
    }

    return match;
  });

  // Pattern 2: vi.mock("...", () => ({
  content = content.replace(/vi\.mock\("([^"]+)"/, (match, importPath) => {
    if (!importPath.startsWith('./') && !importPath.startsWith('../')) return match;

    const resolved = resolveImport(testDir, importPath);
    if (!resolved) return match;

    const relativeToSrc = path.relative(SRC_ROOT, resolved);

    // Old __tests__/utils references in vi.mock
    if (importPath.includes('__tests__/utils')) {
      const possibleUtilsPaths = [
        path.join(TEST_ROOT, 'engine', 'utils.ts'),
        path.join(TEST_ROOT, 'utils.ts'),
      ];
      for (const utilsPath of possibleUtilsPaths) {
        if (fs.existsSync(utilsPath)) {
          const relToUtils = path.relative(testDir, utilsPath).replace(/\\/g, '/').replace(/\.ts$/, '');
          changed = true;
          return `vi.mock("${relToUtils}"`;
        }
      }
      return match;
    }

    // If it resolves to source code outside tests/
    if (!relativeToSrc.startsWith('tests' + path.sep) && !relativeToSrc.startsWith('..' + path.sep)) {
      const aliasPath = getAliasPath(resolved);
      if (aliasPath) {
        changed = true;
        return `vi.mock("${aliasPath}"`;
      }
    }

    return match;
  });

  // Pattern 3: import("...") dynamic imports
  content = content.replace(/import\("([^"]+)"\)/g, (match, importPath) => {
    if (!importPath.startsWith('./') && !importPath.startsWith('../')) return match;

    const resolved = resolveImport(testDir, importPath);
    if (!resolved) return match;

    const relativeToSrc = path.relative(SRC_ROOT, resolved);

    if (!relativeToSrc.startsWith('tests' + path.sep) && !relativeToSrc.startsWith('..' + path.sep)) {
      const aliasPath = getAliasPath(resolved);
      if (aliasPath) {
        changed = true;
        return `import("${aliasPath}")`;
      }
    }

    return match;
  });

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed ${path.relative(SRC_ROOT, filePath)}`);
  }
}

const testFiles = getAllTestFiles(TEST_ROOT);
for (const file of testFiles) {
  fixFile(file);
}

console.log(`Processed ${testFiles.length} test files.`);
