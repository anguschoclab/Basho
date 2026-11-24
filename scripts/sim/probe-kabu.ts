import { generateInitialWorld } from "@/engine/generation/WorldFactory";
import { isSekitoriDivision } from "@/constants/engine/rankDisplay";
const w = generateInitialWorld("kabu-dist-seed");
const sekByClan = new Map<string, number>();
for (const r of w.rikishi.values()) {
  if (r.isRetired || !isSekitoriDivision(r.division)) continue;
  const clan = w.heyas.get(r.heyaId)?.ichimon ?? "?";
  sekByClan.set(clan, (sekByClan.get(clan) ?? 0) + 1);
}
console.log("sekitori:", [...sekByClan.entries()]);
const heldByClan = new Map<string, number>();
for (const s of Object.values(w.myosekiMarket?.stocks ?? {})) {
  if (s.status !== "held") continue;
  heldByClan.set(s.ichimon ?? "?", (heldByClan.get(s.ichimon ?? "?") ?? 0) + 1);
}
console.log("held:", [...heldByClan.entries()]);
