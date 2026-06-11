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

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  const testDir = path.dirname(filePath);

  content = content.replace(/vi\.mock\("([^"]+)"/g, (match, importPath) => {
    if (!importPath.startsWith('./') && !importPath.startsWith('../')) return match;

    const resolved = path.resolve(testDir, importPath);
    const relativeToSrc = path.relative(SRC_ROOT, resolved);

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

    if (!relativeToSrc.startsWith('tests' + path.sep) && !relativeToSrc.startsWith('..' + path.sep)) {
      const aliasPath = '@/' + relativeToSrc.replace(/\\/g, '/').replace(/\.ts$/, '').replace(/\.tsx$/, '').replace(/\/index$/, '');
      changed = true;
      return `vi.mock("${aliasPath}"`;
    }

    return match;
  });

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed vi.mock in ${path.relative(SRC_ROOT, filePath)}`);
  }
}

const testFiles = getAllTestFiles(TEST_ROOT);
for (const file of testFiles) {
  fixFile(file);
}

console.log(`Processed ${testFiles.length} test files.`);
