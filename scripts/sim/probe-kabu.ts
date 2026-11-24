/**
 * probe-kabu.ts — genesis elder-stock distribution check.
 *
 * Reports sekitori supply per ichimon vs held-stock clan tags so the
 * supply-constrained KABU_HELD_DISTRIBUTION targets can be verified
 * without a sim run.
 */
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
