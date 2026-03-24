import fs from 'fs';
import path from 'path';

function getSortFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(getSortFiles(file));
        } else {
            if (file.endsWith('.ts') && !file.includes('__tests__') && !file.endsWith('sort.ts')) {
                const content = fs.readFileSync(file, 'utf8');
                if (content.includes('.sort(')) {
                    results.push(file);
                }
            }
        }
    });
    return results;
}

console.log(getSortFiles('./src/engine'));
