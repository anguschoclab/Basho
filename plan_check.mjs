import fs from "fs";
const file = "src/engine/rivalries.ts";
console.log(fs.readFileSync(file, 'utf8').substring(0, 1000));
