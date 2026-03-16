import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else if (dirPath.endsWith('.ts') || dirPath.endsWith('.tsx')) {
      callback(dirPath);
    }
  });
}

walkDir('./src', (filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  if (content.includes('.find(') && (content.includes('for (') || content.includes('.map(') || content.includes('.filter('))) {
    console.log(filePath);
  }
});
