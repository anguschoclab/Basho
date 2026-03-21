import fs from "fs";
const of = fs.readFileSync("src/engine/overflow.ts", "utf8");
console.log(of.match(/scoredCandidates.*?\n.*?\n.*?\n.*?\n/));

const mt = fs.readFileSync("src/engine/mergers.ts", "utf8");
console.log(mt.match(/candidates.*?\n.*?\n.*?\n.*?\n/));

const kt = fs.readFileSync("src/engine/kimarite.ts", "utf8");
console.log(kt.match(/export interface Kimarite.*?\n.*?\n.*?\n.*?\n/s));

const ud = fs.readFileSync("src/engine/uiDigest.ts", "utf8");
console.log(ud.match(/export interface OzekiRunCandidate.*?\n.*?\n.*?\n.*?\n/s));

const um = fs.readFileSync("src/engine/uiModels.ts", "utf8");
console.log(um.match(/export interface UIRivalEntry.*?\n.*?\n.*?\n.*?\n/s));

const rt = fs.readFileSync("src/engine/rivalries.ts", "utf8");
console.log(rt.match(/export interface RivalryPairState.*?\n.*?\n.*?\n.*?\n/s));
