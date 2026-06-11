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

function findSourcePath(stripped, testDomain) {
  const candidates = [
    stripped,
    testDomain ? path.join(testDomain, stripped) : null,
    path.join('engine', stripped),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsAsTs(path.join(SRC_ROOT, candidate))) {
      return candidate;
    }
  }
  return null;
}

function fixPathInFile(filePath, regexPattern, prefix) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  const testDir = path.dirname(filePath);
  const testDomain = path.relative(TEST_ROOT, testDir).split(path.sep)[0];

  content = content.replace(regexPattern, (match, importPath) => {
    if (!importPath.startsWith('./') && !importPath.startsWith('../') && !importPath.startsWith('@/tests/unit/')) return match;

    // Fix previously-incorrect @/tests/unit/ aliases
    if (importPath.startsWith('@/tests/unit/')) {
      const stripped = importPath.replace('@/tests/unit/', '');
      const sourcePath = findSourcePath(stripped, testDomain);
      if (sourcePath) {
        changed = true;
        return `${prefix}"${toAliasPath(sourcePath)}"`;
      }
      return match;
    }

    const resolved = path.resolve(testDir, importPath);
    const relativeToSrc = path.relative(SRC_ROOT, resolved);

    // Fix __tests__/utils references
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

    // If it resolves inside src/tests/ AND exists, keep it
    if (relativeToSrc.startsWith('tests' + path.sep) && existsAsTs(resolved)) {
      return match;
    }

    // If it resolves inside src/tests/ but DOESN'T exist, try to find the source file
    if (relativeToSrc.startsWith('tests' + path.sep) && !existsAsTs(resolved)) {
      const stripped = relativeToSrc.replace(/^tests\/unit\//, '');
      const sourcePath = findSourcePath(stripped, testDomain);
      if (sourcePath) {
        changed = true;
        return `${prefix}"${toAliasPath(sourcePath)}"`;
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
  fixPathInFile(filePath, /from\s+"([^"]+)"/g, 'from ');
  fixPathInFile(filePath, /vi\.mock\("([^"]+)"/g, 'vi.mock(');
  fixPathInFile(filePath, /import\("([^"]+)"\)/g, 'import(');
}

const testFiles = getAllTestFiles(TEST_ROOT);
for (const file of testFiles) {
  fixFile(file);
}

console.log(`Processed ${testFiles.length} test files.`);
