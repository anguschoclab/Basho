import { test, expect, type Page } from "@playwright/test";
import { createNewGame, dismissOnboardingTour } from "./helpers";

/**
 * E2E coverage for the WS-search expansion:
 *  - global search surfaces oyakata / staff / prospects alongside
 *    rikishi + stables, with WS7 gating on rival archetype intel
 *  - /oyakata directory, /oyakata/$id profile, /stable/oyakata redirect
 *  - candidate hits deep-link into /jsa/talent?pool=&focus=
 *  - live theme assertions: canonical fonts are actually applied
 */

interface EntityFixtures {
  playerOyakataId: string;
  playerOyakataName: string;
  npcOyakataId: string | null;
  npcOyakataName: string | null;
  npcOyakataArchetype: string | null;
  staffName: string | null;
  staffIsPlayerOwned: boolean;
  staffHeyaId: string | null;
  candidateName: string | null;
  candidateId: string | null;
  candidatePool: string | null;
}

/**
 * Locate the option id (`gs-opt-N`) for `name` inside a specific group
 * section. Names can collide across entity kinds (e.g. a rikishi shikona
 * sharing an oyakata's name), so group scoping is required — the dropdown
 * renders group headers as sibling divs before their options.
 */
async function optionIdInGroup(page: Page, group: string, name: string) {
  return page.evaluate(
    ({ group, name }) => {
      const res = document.getElementById("gs-results");
      if (!res) return null;
      let inGroup = false;
      for (const child of [...res.children]) {
        const header = child.firstElementChild;
        if (header && header.getAttribute("role") !== "option") {
          inGroup = (header.textContent ?? "").trim() === group;
        }
        const opt = child.querySelector('[role="option"]');
        if (inGroup && opt && (opt.textContent ?? "").includes(name)) {
          return opt.id;
        }
      }
      return null;
    },
    { group, name }
  );
}

test("Global search finds oyakata/staff/prospects; oyakata pages and redirect work", async ({
  page,
}) => {
  test.setTimeout(300000);
  await page.goto("/");
  await expect(page.locator("h1").first()).toContainText(/Basho/i, { timeout: 60000 });
  await createNewGame(page);
  await dismissOnboardingTour(page);

  // Pull real entity handles out of the live world (Maps on oyakata/staff,
  // Record on talentPool.candidates — normalize both).
  const fx = await page.evaluate((): EntityFixtures => {
    const w = (window as unknown as { __BASHO_WORLD__?: any }).__BASHO_WORLD__;
    if (!w) throw new Error("no live world");
    const toArr = (c: any): any[] =>
      c instanceof Map ? [...c.values()] : Object.values(c ?? {});
    const playerHeyaId = w.playerHeyaId;
    const heya = w.heyas instanceof Map ? w.heyas.get(playerHeyaId) : w.heyas?.[playerHeyaId];
    const allOyakata = toArr(w.oyakata);
    const playerO = allOyakata.find((o: any) => o.id === heya?.oyakataId);
    const npcO = allOyakata.find(
      (o: any) => o.heyaId !== playerHeyaId && o.name && !o.isEmeritus
    );
    const staff = toArr(w.staff).find((s: any) => s.name) ?? null;
    const candidates = toArr(w.talentPool?.candidates);
    const pub = candidates.find((c: any) => c.visibilityBand === "public" && c.name);
    let candidatePool: string | null = null;
    if (pub && w.talentPool?.pools) {
      for (const [poolType, pool] of Object.entries<any>(w.talentPool.pools)) {
        if ((pool as any).candidatesVisible?.includes(pub.id)) {
          candidatePool = poolType;
          break;
        }
      }
    }
    return {
      playerOyakataId: playerO?.id,
      playerOyakataName: playerO?.name,
      npcOyakataId: npcO?.id ?? null,
      npcOyakataName: npcO?.name ?? null,
      npcOyakataArchetype: npcO?.archetype ?? null,
      staffName: staff?.name ?? null,
      staffIsPlayerOwned: staff?.heyaId === playerHeyaId,
      staffHeyaId: staff?.heyaId ?? null,
      candidateName: pub?.name ?? null,
      candidateId: pub?.id ?? null,
      candidatePool,
    };
  });

  expect(fx.playerOyakataId, "player oyakata exists").toBeTruthy();
  expect(fx.npcOyakataId, "at least one rival oyakata exists").toBeTruthy();

  const searchInput = page.getByRole("combobox");
  const dropdown = page.locator("#gs-results");
  const searchFor = async (q: string) => {
    await searchInput.click();
    await searchInput.fill(q);
    await expect(dropdown).toBeVisible({ timeout: 10000 });
  };
  const clickGroupOption = async (group: string, name: string) => {
    const id = await optionIdInGroup(page, group, name);
    expect(id, `a ${group} result matching "${name}"`).not.toBeNull();
    await page.locator(`#${id}`).click();
  };

  // ── 1. Oyakata bucket: player's own elder resolves and navigates ──
  await searchFor(fx.playerOyakataName);
  await expect(dropdown.getByText("Oyakata", { exact: true })).toBeVisible();
  await clickGroupOption("Oyakata", fx.playerOyakataName);
  await page.waitForURL(`**/oyakata/${fx.playerOyakataId}`, { timeout: 10000 });

  // Profile renders real state: name as Shippori page title, record card,
  // player's own stable → succession + intel visible.
  const title = page.locator("h1").filter({ hasText: fx.playerOyakataName }).first();
  await expect(title).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("Management Record")).toBeVisible();
  await expect(page.getByText("Basho", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Succession")).toBeVisible();
  await expect(page.locator('[data-testid="oyakata-intel"]')).toBeVisible();

  // Live theme checks — canonical fonts actually applied, not just in CSS.
  await expect(title).toHaveCSS("font-family", /Shippori|Noto Serif/);
  const bodyFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(bodyFont).toMatch(/Spectral/);
  await page.screenshot({ path: "test-results/oyakata-profile.png" });

  // ── 2. Rival oyakata: row renders but archetype intel stays gated ──
  await searchFor(fx.npcOyakataName!);
  const npcOptId = await optionIdInGroup(page, "Oyakata", fx.npcOyakataName!);
  expect(npcOptId, "rival oyakata appears in results").not.toBeNull();
  const npcRow = page.locator(`#${npcOptId}`);
  if (fx.npcOyakataArchetype) {
    const archetypeLabel = fx.npcOyakataArchetype.replace(/_/g, " ");
    await expect(npcRow).not.toContainText(new RegExp(archetypeLabel, "i"));
  }
  await npcRow.click();
  await page.waitForURL(`**/oyakata/${fx.npcOyakataId}`, { timeout: 10000 });
  // Rival profile: public record visible, intel card shows gated copy.
  await expect(
    page.locator("h1").filter({ hasText: fx.npcOyakataName! }).first()
  ).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("Limited intel").first()).toBeVisible();
  await expect(page.getByText("Succession")).toHaveCount(0);

  // ── 3. /oyakata directory + legacy /stable/oyakata redirect ──
  await page.goto("/oyakata");
  await expect(
    page.getByRole("heading", { name: /Elders of the Kyokai/i })
  ).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("All Oyakata")).toBeVisible();
  await expect(page.locator("main").getByText(fx.npcOyakataName!).first()).toBeVisible();

  await page.goto("/stable/oyakata");
  await page.waitForURL(`**/oyakata/${fx.playerOyakataId}`, { timeout: 10000 });

  // ── 4. Staff bucket ──
  if (fx.staffName) {
    await searchFor(fx.staffName);
    await expect(dropdown.getByText("Staff", { exact: true })).toBeVisible();
    await clickGroupOption("Staff", fx.staffName);
    const expected = fx.staffIsPlayerOwned ? "**/stable/staff" : `**/stable/${fx.staffHeyaId}`;
    await page.waitForURL(expected, { timeout: 10000 });
  }

  // ── 5. Prospects bucket → /jsa/talent deep link ──
  if (fx.candidateId && fx.candidateName && fx.candidatePool) {
    await page.goto("/dashboard");
    await searchFor(fx.candidateName);
    await expect(dropdown.getByText("Prospects", { exact: true })).toBeVisible();
    await clickGroupOption("Prospects", fx.candidateName);
    await page.waitForURL(/\/jsa\/talent/, { timeout: 10000 });
    expect(page.url()).toContain(`focus=${fx.candidateId}`);
    expect(page.url()).toContain(`pool=${fx.candidatePool}`);
  }

  // ── 6. Search group-header typography (mono section labels) ──
  await page.goto("/dashboard");
  await searchFor(fx.playerOyakataName);
  const groupHeader = dropdown.getByText("Oyakata", { exact: true });
  await expect(groupHeader).toHaveCSS("font-family", /JetBrains Mono/);
  await expect(groupHeader).toHaveCSS("text-transform", "uppercase");
  await page.screenshot({ path: "test-results/search-dropdown.png" });
});
