import { test, expect, type Page } from "@playwright/test";
import { createNewGame, dismissOnboardingTour, resolveCrisisIfPresent } from "./helpers";

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

  // A fresh world has no hired staff, and its talent pools are EMPTY —
  // candidates only exist once the fortnightly refresh runs inside
  // tickWeekTalentPool (refreshAllPools fires when dayIndex > 0 &&
  // dayIndex % 14 === 0). SCOUT_POOL on an empty hidden reserve is a silent
  // no-op, so the sim must first advance ~2 weeks through the canonical
  // worker command path before prospects can exist at all.
  // (commands → resolveImpacts → syncAndDigest → __BASHO_WORLD__ refresh.)

  // 1. Mint a scout through HIRE_STAFF — also lifts the scoutMult that
  //    scales SCOUT_CANDIDATE intel gain below.
  await page.evaluate(() => {
    const w = (window as unknown as { __BASHO_WORLD__?: any }).__BASHO_WORLD__;
    const store = (window as unknown as { __BASHO_STORE__?: any }).__BASHO_STORE__;
    store?.getState?.().sendCommand?.({
      type: "HIRE_STAFF",
      heyaId: w?.playerHeyaId,
      role: "scout",
    });
  });
  await page.waitForFunction(
    () => {
      const w = (window as unknown as { __BASHO_WORLD__?: any }).__BASHO_WORLD__;
      const staff = w?.staff instanceof Map ? [...w.staff.values()] : Object.values(w?.staff ?? {});
      return staff.length > 0;
    },
    { timeout: 15000 }
  );

  // 2. Advance the sim in weekly chunks until the pool refresh + passive
  //    discovery populate the talent pools. TICK_MULTIPLE_DAYS halts early
  //    on required decisions/major same-week events (shouldHaltAdvance), so
  //    drive it in a retry loop that clears blocking decisions first.
  //    sendCommand drops non-tick commands while pendingTick is set — waits
  //    between iterations are what keep this sequence canonical.
  for (let i = 0; i < 10; i++) {
    const populated = await page.evaluate(() => {
      const w = (window as unknown as { __BASHO_WORLD__?: any }).__BASHO_WORLD__;
      const pools = w?.talentPool?.pools ?? {};
      return Object.values<any>(pools).some(
        (p: any) =>
          (p?.candidatesHidden?.length ?? 0) + (p?.candidatesVisible?.length ?? 0) > 0
      );
    });
    if (populated) break;

    await resolveCrisisIfPresent(page);
    await page.evaluate(() => {
      const w = (window as unknown as { __BASHO_WORLD__?: any }).__BASHO_WORLD__;
      const store = (window as unknown as { __BASHO_STORE__?: any }).__BASHO_STORE__;
      const send = store?.getState?.().sendCommand;
      send?.({ type: "RESUME_SIM" });
      for (const d of w?.pendingDecisions ?? []) {
        if (d?.required && d?.options?.[0]?.id) {
          send?.({
            type: "RESOLVE_LOOP_DECISION",
            decisionId: d.id,
            optionId: d.options[0].id,
          });
        }
      }
      send?.({ type: "TICK_MULTIPLE_DAYS", days: 7 });
    });
    await page
      .waitForFunction(
        () =>
          !(window as unknown as { __BASHO_STORE__?: any }).__BASHO_STORE__?.getState?.()
            .pendingTick,
        { timeout: 90000 }
      )
      .catch(() => {});
  }

  const poolDiag = await page.evaluate(() => {
    const w = (window as unknown as { __BASHO_WORLD__?: any }).__BASHO_WORLD__;
    const pools = w?.talentPool?.pools ?? {};
    const summary: Record<string, { hidden: number; visible: number }> = {};
    for (const [pt, p] of Object.entries<any>(pools)) {
      summary[pt] = {
        hidden: p?.candidatesHidden?.length ?? 0,
        visible: p?.candidatesVisible?.length ?? 0,
      };
    }
    return {
      dayIndex: w?.dayIndexGlobal,
      week: w?.week,
      phase: w?.cyclePhase,
      candidates: Object.keys(w?.talentPool?.candidates ?? {}).length,
      pendingTick: !!(window as unknown as { __BASHO_STORE__?: any }).__BASHO_STORE__?.getState?.()
        .pendingTick,
      summary,
    };
  });
  console.log("POOL-STATE", JSON.stringify(poolDiag));
  const poolSeeded = Object.values(poolDiag.summary).some(
    (p) => p.hidden + p.visible > 0
  );
  expect(poolSeeded, "talent pools populated after advancing the sim").toBe(true);

  // 3. Graft a searchable prospect into the live world. No canonical command
  //    sequence produces one in a fresh world: the emergency demographic dump
  //    reveals every prospect at the day-14 refresh, domestic candidates are
  //    signed + materialized within the same weekly tick, and the survivors
  //    are all foreign — a pool listVisibleCandidates gates behind
  //    regionalPresence ≥ 40, which a new heya cannot raise quickly.
  //    So reuse a real generated candidate, mark it public, and park it in
  //    the ungated high_school visible list — exercising the real search
  //    projection + deep-link rather than the recruitment lifecycle.
  //    onWorldUpdated is the worker→context sync bridge (same callback
  //    syncWorld invokes); LOAD_WORLD keeps the worker copy consistent.
  const graftedId = await page.evaluate(() => {
    const w = (window as unknown as { __BASHO_WORLD__?: any }).__BASHO_WORLD__;
    const store = (window as unknown as { __BASHO_STORE__?: any }).__BASHO_STORE__;
    const tp = w?.talentPool;
    const cid = Object.keys(tp?.candidates ?? {})[0];
    if (!tp || !cid) return null;
    // Move the candidate into high_school — strip it from every other pool
    // list first so it holds exactly one membership (SerializationService
    // flags cross-pool IDs as integrity violations).
    const movedPools = Object.fromEntries(
      Object.entries<any>(tp.pools).map(([pt, p]: [string, any]) => [
        pt,
        {
          ...p,
          candidatesVisible: (p.candidatesVisible ?? []).filter((id: string) => id !== cid),
          candidatesHidden: (p.candidatesHidden ?? []).filter((id: string) => id !== cid),
        },
      ])
    );
    movedPools.high_school = {
      ...movedPools.high_school,
      candidatesVisible: [cid],
    };
    const patched = {
      ...w,
      talentPool: {
        ...tp,
        candidates: {
          ...tp.candidates,
          [cid]: { ...tp.candidates[cid], visibilityBand: "public" },
        },
        pools: movedPools,
      },
    };
    store?.getState?.().onWorldUpdated?.(patched);
    store?.getState?.().sendCommand?.({ type: "LOAD_WORLD", world: patched });
    return cid;
  });
  expect(graftedId, "a generated candidate exists to graft").toBeTruthy();
  const graftedCid = graftedId as string;
  await page.waitForFunction(
    (cid) => {
      const w = (window as unknown as { __BASHO_WORLD__?: any }).__BASHO_WORLD__;
      const tp = w?.talentPool;
      return (
        tp?.candidates?.[cid]?.visibilityBand === "public" &&
        (tp?.pools?.high_school?.candidatesVisible ?? []).includes(cid)
      );
    },
    graftedCid,
    { timeout: 10000 }
  );

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
    // WS7 gating mirrors hasScoutingCoverage: a rival's archetype label is
    // only rendered when the player's knowledge already covers that heya —
    // so the "label absent" assertion needs an UNSCOUTED rival, not just any.
    const covered = (heyaId: string) =>
      Object.values<any>(w.playerKnowledge?.scouting ?? {}).some(
        (s: any) => s?.publicInfo?.heyaId === heyaId && (s?.timesObserved ?? 0) > 0
      );
    const npcO = allOyakata.find(
      (o: any) => o.heyaId !== playerHeyaId && o.name && !o.isEmeritus && !covered(o.heyaId)
    );
    const staff = toArr(w.staff).find((s: any) => s.name) ?? null;
    const candidates = toArr(w.talentPool?.candidates);
    // Mirror the search gate exactly: only pools listVisibleCandidates can
    // return without regional-presence gating (foreign needs presence ≥40),
    // and names are knowable when public or scouted ≥65.
    const searchablePools = ["high_school", "university"];
    const pub = candidates.find(
      (c: any) =>
        c.name &&
        (c.visibilityBand === "public" ||
          (w.talentPool?.playerScouting?.[c.candidateId]?.scoutingLevel ?? 0) >= 65) &&
        searchablePools.some((pt) =>
          w.talentPool?.pools?.[pt]?.candidatesVisible?.includes(c.candidateId)
        )
    );
    let candidatePool: string | null = null;
    if (pub && w.talentPool?.pools) {
      for (const pt of searchablePools) {
        if (w.talentPool.pools[pt]?.candidatesVisible?.includes(pub.candidateId)) {
          candidatePool = pt;
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
      candidateId: pub?.candidateId ?? null,
      candidatePool,
    };
  });

  expect(fx.playerOyakataId, "player oyakata exists").toBeTruthy();
  expect(fx.npcOyakataId, "at least one unscouted rival oyakata exists").toBeTruthy();
  // Sections 4–5 are load-bearing claims — fail loudly if the generated
  // world can't exercise them instead of skipping silently.
  expect(fx.staffName, "a named staff member exists").toBeTruthy();
  expect(fx.candidateId, "a public talent-pool candidate exists").toBeTruthy();
  expect(fx.candidatePool, "the candidate sits in a visible pool").toBeTruthy();

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
