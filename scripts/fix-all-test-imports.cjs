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

function existsAsTs(resolvedPath) {
  return fs.existsSync(resolvedPath + '.ts') ||
         fs.existsSync(resolvedPath + '.tsx') ||
         fs.existsSync(path.join(resolvedPath, 'index.ts')) ||
         fs.existsSync(path.join(resolvedPath, 'index.tsx'));
}

function toAliasPath(relativeToSrc) {
  return '@/' + relativeToSrc.replace(/\\/g, '/').replace(/\.ts$/, '').replace(/\.tsx$/, '').replace(/\/index$/, '');
}

function fixPathInFile(filePath, regexPattern, prefix) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  const testDir = path.dirname(filePath);

  content = content.replace(regexPattern, (match, importPath) => {
    if (!importPath.startsWith('./') && !importPath.startsWith('../')) return match;

    const resolved = path.resolve(testDir, importPath);
    const relativeToSrc = path.relative(SRC_ROOT, resolved);

    // Old __tests__/utils references -> fix to correct test helper path
    if (importPath.includes('__tests__/utils')) {
      const possibleUtilsPaths = [
        path.join(TEST_ROOT, 'engine', 'utils.ts'),
        path.join(TEST_ROOT, 'utils.ts'),
      ];
      for (const utilsPath of possibleUtilsPaths) {
        if (fs.existsSync(utilsPath)) {
          const relToUtils = path.relative(testDir, utilsPath).replace(/\\/g, '/').replace(/\.ts$/, '');
          changed = true;
          return `${prefix}"${relToUtils}"`;
        }
      }
      return match;
    }

    // If it resolves inside src/tests/ AND exists, keep it (test helper)
    if (relativeToSrc.startsWith('tests' + path.sep) && existsAsTs(resolved)) {
      return match;
    }

    // If it resolves inside src/tests/ but DOESN'T exist, it's a broken source import.
    // Strip 'tests/unit/' prefix to get the correct source path.
    if (relativeToSrc.startsWith('tests' + path.sep) && !existsAsTs(resolved)) {
      const stripped = relativeToSrc.replace(/^tests\/unit\//, '');
      if (!stripped.startsWith('..') && existsAsTs(path.join(SRC_ROOT, stripped))) {
        changed = true;
        return `${prefix}"${toAliasPath(stripped)}"`;
      }
    }

    // For source imports outside tests/
    if (!relativeToSrc.startsWith('tests' + path.sep) && !relativeToSrc.startsWith('..' + path.sep)) {
      changed = true;
      return `${prefix}"${toAliasPath(relativeToSrc)}"`;
    }

    return match;
  });

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed ${path.relative(SRC_ROOT, filePath)}`);
  }
}

function fixFile(filePath) {
  // Fix import statements
  fixPathInFile(filePath, /from\s+"([^"]+)"/g, 'from ');
  // Fix vi.mock statements
  fixPathInFile(filePath, /vi\.mock\("([^"]+)"/g, 'vi.mock(');
  // Fix dynamic import statements
  fixPathInFile(filePath, /import\("([^"]+)"\)/g, 'import(');
}

const testFiles = getAllTestFiles(TEST_ROOT);
for (const file of testFiles) {
  fixFile(file);
}

console.log(`Processed ${testFiles.length} test files.`);
