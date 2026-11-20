import { test, expect, type Page } from "@playwright/test";
import {
  createNewGame,
  dismissOnboardingTour,
  resolveCrisisIfPresent,
  setWorldSeed,
} from "./helpers";

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
  playerHeyaName: string | null;
  npcOyakataId: string | null;
  npcOyakataName: string | null;
  npcOyakataArchetype: string | null;
  npcHeyaName: string | null;
  staffName: string | null;
  staffIsPlayerOwned: boolean;
  staffHeyaId: string | null;
  staffHeyaName: string | null;
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
async function optionIdInGroup(page: Page, group: string, name: string, sub?: string) {
  return page.evaluate(
    ({ group, name, sub }) => {
      const res = document.getElementById("gs-results");
      if (!res) return null;
      let inGroup = false;
      for (const child of [...res.children]) {
        const header = child.firstElementChild;
        if (header && header.getAttribute("role") !== "option") {
          inGroup = (header.textContent ?? "").trim() === group;
        }
        const opt = child.querySelector('[role="option"]');
        if (!inGroup || !opt) continue;
        const text = opt.textContent ?? "";
        // Same-named entities can appear in one group — the row also shows
        // the heya name, so callers can pass it as a secondary matcher.
        if (text.includes(name) && (!sub || text.includes(sub))) {
          return opt.id;
        }
      }
      return null;
    },
    { group, name, sub }
  );
}

test("Global search finds oyakata/staff/prospects; oyakata pages and redirect work", async ({
  page,
}) => {
  test.setTimeout(300000);
  await page.goto("/");
  await expect(page.locator("h1").first()).toContainText(/Basho/i, { timeout: 60000 });
  await setWorldSeed(page, "search-oyakata-e2e-v1");
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
  //    sendCommand drops EVERY command while pendingTick is set — including
  //    RESOLVE_LOOP_DECISION — so each phase must wait for a strictly idle
  //    store before sending. Iterate on world-age, not round count: a halted
  //    chunk may only advance a day or two.
  const idle = (ms = 120000) =>
    page.waitForFunction(
      () =>
        !(window as unknown as { __BASHO_STORE__?: any }).__BASHO_STORE__?.getState?.().pendingTick,
      { timeout: ms }
    );
  const poolSnap = () =>
    page.evaluate(() => {
      const w = (window as unknown as { __BASHO_WORLD__?: any }).__BASHO_WORLD__;
      const ww = (window as unknown as { __BASHO_STORE__?: any }).__BASHO_STORE__?.getState?.()
        ?.workerWorld;
      const pools = w?.talentPool?.pools ?? {};
      return {
        populated: Object.values<any>(pools).some(
          (p: any) => (p?.candidatesHidden?.length ?? 0) + (p?.candidatesVisible?.length ?? 0) > 0
        ),
        uiDay: (w?.dayIndexGlobal ?? 0) as number,
        wkDay: (ww?.dayIndexGlobal ?? 0) as number,
        // advanceOneDay's senshuraku early-return freezes the worker world at
        // currentBasho.day > 15 — further ticks no-op until the player ends
        // the basho. The day-14 pool refresh lands before that wall, so a
        // frozen worker still means the pools exist; wait for the UI world
        // to converge rather than ticking forever.
        wkFrozen: (ww?.currentBasho?.day ?? 0) > 15,
      };
    });

  for (let i = 0; i < 15; i++) {
    const snap = await poolSnap();
    if (snap.populated || snap.wkFrozen || snap.uiDay >= 30) break;

    await idle();
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
    });
    // Resolutions post non-tick world updates — still idle — then tick and
    // drain it fully before the next round's sends.
    await idle();
    await page.evaluate(() => {
      const store = (window as unknown as { __BASHO_STORE__?: any }).__BASHO_STORE__;
      store?.getState?.().sendCommand?.({ type: "TICK_MULTIPLE_DAYS", days: 7 });
    });
    await idle();
  }

  // __BASHO_WORLD__ (the reducer state the search actually reads) converges
  // behind the worker under load — updateWorld dispatches ride
  // startTransition and starve while syncs stream in. Assert on the UI world
  // only after it has had a quiet window to catch up.
  const poolSeeded = await page
    .waitForFunction(
      () => {
        const w = (window as unknown as { __BASHO_WORLD__?: any }).__BASHO_WORLD__;
        const pools = w?.talentPool?.pools ?? {};
        return Object.values<any>(pools).some(
          (p: any) => (p?.candidatesHidden?.length ?? 0) + (p?.candidatesVisible?.length ?? 0) > 0
        );
      },
      { timeout: 60000 }
    )
    .then(() => true)
    .catch(() => false);
  expect(poolSeeded, "talent pools populated after advancing the sim").toBe(true);

  // The seed loop can exit with a crisis minted by its final tick (the
  // populated-check breaks before the next resolve pass). A world-backed
  // pendingCrisis opens an undismissable modal on /dashboard — its scrim
  // intercepts every search click below (observed: combobox click blocked
  // by data-state=open aria-hidden scrim → 300s timeout, e.g. a "Nightlife
  // Scandal" narrative crisis). Resolve whatever is pending — modals
  // first, then any required decisions — before any UI interaction.
  for (let i = 0; i < 3; i++) {
    if (!(await resolveCrisisIfPresent(page))) break;
  }
  const sentResolutions = await page.evaluate(() => {
    const w = (window as unknown as { __BASHO_WORLD__?: any }).__BASHO_WORLD__;
    const store = (window as unknown as { __BASHO_STORE__?: any }).__BASHO_STORE__;
    const send = store?.getState?.().sendCommand;
    const beforeVer = store?.getState?.().worldVersion ?? 0;
    let sent = 0;
    send?.({ type: "RESUME_SIM" });
    for (const d of w?.pendingDecisions ?? []) {
      if (d?.required && d?.options?.[0]?.id) {
        send?.({
          type: "RESOLVE_LOOP_DECISION",
          decisionId: d.id,
          optionId: d.options[0].id,
        });
        sent++;
      }
    }
    return { beforeVer, sent };
  });
  if (sentResolutions.sent > 0) {
    await page.waitForFunction(
      (prevVer: number) => {
        const st = (window as unknown as { __BASHO_STORE__?: any }).__BASHO_STORE__?.getState?.();
        const w = (window as unknown as { __BASHO_WORLD__?: any }).__BASHO_WORLD__;
        const reqLeft = (w?.pendingDecisions ?? []).filter((d: any) => d?.required).length;
        return (st?.worldVersion ?? 0) > prevVer && !st?.pendingTick && reqLeft === 0;
      },
      sentResolutions.beforeVer,
      { timeout: 30000 }
    );
  }
  await idle();
  // Let any trailing worker sync / startTransition settle before grafting.
  await page.waitForTimeout(500);

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
  //
  //    Hard requirement: no tick may be in flight. sendCommand drops
  //    LOAD_WORLD while pendingTick is set — the main-thread graft then
  //    gets clobbered when the in-flight tick completes and syncs the
  //    worker's pre-graft world (the intermittent 10s waitForFunction
  //    timeout this sequence used to hit). The advance loop above exits
  //    its pendingTick wait via .catch, so idle is not guaranteed here.
  await page.waitForFunction(
    () =>
      !(window as unknown as { __BASHO_STORE__?: any }).__BASHO_STORE__?.getState?.().pendingTick,
    { timeout: 90000 }
  );
  const grafted = await page.evaluate(() => {
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
    const toArr = (c: any): any[] => (c instanceof Map ? [...c.values()] : Object.values(c ?? {}));
    const allOyakata = toArr(w.oyakata);
    const uniqueName = (list: any[], self: any) =>
      list.filter((x: any) => x.name === self.name).length === 1;
    const targetNpcO = allOyakata.find(
      (o: any) =>
        o.heyaId !== w.playerHeyaId && o.name && !o.isEmeritus && uniqueName(allOyakata, o)
    );
    const prevScouting = w.playerKnowledge?.scouting ?? {};
    const nextScouting = targetNpcO
      ? Object.fromEntries(
          Object.entries<any>(prevScouting).map(([k, v]) => [
            k,
            v?.publicInfo?.heyaId === targetNpcO.heyaId ? { ...v, timesObserved: 0 } : v,
          ])
        )
      : prevScouting;
    const patched = {
      ...w,
      ...(w.playerKnowledge
        ? { playerKnowledge: { ...w.playerKnowledge, scouting: nextScouting } }
        : {}),
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
    // sendCommand returns false when dropped (tick in progress) — surface
    // it at the graft rather than timing out downstream on a world the
    // worker never received.
    const accepted = store?.getState?.().sendCommand?.({ type: "LOAD_WORLD", world: patched });
    return { cid, accepted };
  });
  expect(grafted, "a generated candidate exists to graft").toBeTruthy();
  expect(
    (grafted as { accepted?: boolean }).accepted,
    "LOAD_WORLD was not dropped by a pending tick"
  ).not.toBe(false);
  const graftedCid = (grafted as { cid: string }).cid;
  try {
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
  } catch (err) {
    // Diagnostic: did the grafted world reach the UI (transition committed),
    // or was it clobbered by a later worker WORLD_UPDATED?
    const diag = await page
      .evaluate((cid) => {
        const w = (window as unknown as { __BASHO_WORLD__?: any }).__BASHO_WORLD__;
        const st = (window as unknown as { __BASHO_STORE__?: any }).__BASHO_STORE__?.getState?.();
        const tp = w?.talentPool;
        return {
          dayIndex: w?.dayIndexGlobal,
          graftedBand: tp?.candidates?.[cid]?.visibilityBand,
          hsVisible: (tp?.pools?.high_school?.candidatesVisible ?? []).slice(0, 3),
          cidIn: (tp?.pools?.high_school?.candidatesVisible ?? []).includes(cid),
          workerDayIndex: st?.workerWorld?.dayIndexGlobal,
          workerBand: st?.workerWorld?.talentPool?.candidates?.[cid]?.visibilityBand,
          pendingTick: !!st?.pendingTick,
          queuedTick: !!st?.queuedTick,
          rejected: st?.commandRejected ?? null,
          error: st?.error ?? null,
        };
      }, graftedCid)
      .catch(() => "evaluate failed");
    console.log("GRAFT-DIAG", JSON.stringify(diag));
    throw err;
  }
  // Wait past autosaveWithSignal's 2000ms debounce so the grafted world flushes
  // to persistence BEFORE Section 3/5 trigger full document reloads via page.goto.
  await page.waitForTimeout(2500);

  // Pull real entity handles out of the live world (Maps on oyakata/staff,
  // Record on talentPool.candidates — normalize both).
  const fx = await page.evaluate((): EntityFixtures => {
    const w = (window as unknown as { __BASHO_WORLD__?: any }).__BASHO_WORLD__;
    if (!w) throw new Error("no live world");
    const toArr = (c: any): any[] => (c instanceof Map ? [...c.values()] : Object.values(c ?? {}));
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
    // Same-named elders/staff are legal in this world — optionIdInGroup
    // resolves by display name, so pick fixtures whose names are unique
    // within their bucket or the click lands on a different entity's page.
    const uniqueName = (list: any[], self: any) =>
      list.filter((x: any) => x.name === self.name).length === 1;
    const npcO = allOyakata.find(
      (o: any) =>
        o.heyaId !== playerHeyaId &&
        o.name &&
        !o.isEmeritus &&
        !covered(o.heyaId) &&
        uniqueName(allOyakata, o)
    );
    const allStaff = toArr(w.staff);
    const staff = allStaff.find((s: any) => s.name && uniqueName(allStaff, s)) ?? null;
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
    const heyaNameOf = (id: string | undefined | null) => {
      if (!id) return null;
      const h = w.heyas instanceof Map ? w.heyas.get(id) : w.heyas?.[id];
      return h?.name ?? null;
    };
    return {
      playerOyakataId: playerO?.id,
      playerOyakataName: playerO?.name,
      playerHeyaName: heyaNameOf(playerHeyaId),
      npcOyakataId: npcO?.id ?? null,
      npcOyakataName: npcO?.name ?? null,
      npcOyakataArchetype: npcO?.archetype ?? null,
      npcHeyaName: heyaNameOf(npcO?.heyaId),
      staffName: staff?.name ?? null,
      staffIsPlayerOwned: staff?.heyaId === playerHeyaId,
      staffHeyaId: staff?.heyaId ?? null,
      staffHeyaName: heyaNameOf(staff?.heyaId),
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
  const clickGroupOption = async (group: string, name: string, sub?: string) => {
    const id = await optionIdInGroup(page, group, name, sub);
    expect(id, `a ${group} result matching "${name}"`).not.toBeNull();
    await page.locator(`#${id}`).click();
  };

  // ── 1. Oyakata bucket: player's own elder resolves and navigates ──
  await searchFor(fx.playerOyakataName);
  await expect(dropdown.getByText("Oyakata", { exact: true })).toBeVisible();
  await clickGroupOption("Oyakata", fx.playerOyakataName, fx.playerHeyaName ?? undefined);
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
  const npcOptId = await optionIdInGroup(
    page,
    "Oyakata",
    fx.npcOyakataName!,
    fx.npcHeyaName ?? undefined
  );
  expect(npcOptId, "rival oyakata appears in results").not.toBeNull();
  const npcRow = page.locator(`#${npcOptId}`);
  if (fx.npcOyakataArchetype) {
    const archetypeLabel = fx.npcOyakataArchetype.replace(/_/g, " ");
    await expect(npcRow).not.toContainText(new RegExp(archetypeLabel, "i"));
  }
  await npcRow.click();
  await page.waitForURL(`**/oyakata/${fx.npcOyakataId}`, { timeout: 10000 });
  // Rival profile: public record visible, intel card shows gated copy.
  await expect(page.locator("h1").filter({ hasText: fx.npcOyakataName! }).first()).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByText("Limited intel").first()).toBeVisible();
  await expect(page.getByText("Succession")).toHaveCount(0);

  // ── 3. /oyakata directory + legacy /stable/oyakata redirect ──
  await page.goto("/oyakata");
  await expect(page.getByRole("heading", { name: /Elders of the Kyokai/i })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByText("All Oyakata")).toBeVisible();
  await expect(page.locator("main").getByText(fx.npcOyakataName!).first()).toBeVisible();

  await page.goto("/stable/oyakata");
  await page.waitForURL(`**/oyakata/${fx.playerOyakataId}`, { timeout: 10000 });

  // ── 4. Staff bucket ──
  if (fx.staffName) {
    await searchFor(fx.staffName);
    await expect(dropdown.getByText("Staff", { exact: true })).toBeVisible();
    await clickGroupOption("Staff", fx.staffName, fx.staffHeyaName ?? undefined);
    const expected = fx.staffIsPlayerOwned ? "**/stable/staff" : `**/stable/${fx.staffHeyaId}`;
    await page.waitForURL(expected, { timeout: 10000 });
  }

  // ── 5. Prospects bucket → /jsa/talent deep link ──
  if (fx.candidateId && fx.candidateName && fx.candidatePool) {
    const graftedCid2 = fx.candidateId;
    // Wait past autosaveWithSignal's 2000ms debounce so the grafted world is
    // flushed to persistence before the full document reload below.
    await page.waitForTimeout(2500);
    await page.goto("/dashboard");
    // The goto is a full reload — the world only returns once useRequireWorld
    // restores the autosave. The graft must survive the save/load round-trip.
    await page.waitForFunction(
      () => !!(window as unknown as { __BASHO_WORLD__?: any }).__BASHO_WORLD__?.dayIndexGlobal,
      { timeout: 15000 }
    );
    const graftRestored = await page.evaluate((cid: string) => {
      const w = (window as unknown as { __BASHO_WORLD__?: any }).__BASHO_WORLD__;
      const tp = w?.talentPool;
      return (
        tp?.candidates?.[cid]?.visibilityBand === "public" &&
        (tp?.pools?.high_school?.candidatesVisible ?? []).includes(cid)
      );
    }, graftedCid2);
    expect(graftRestored, "grafted prospect survives the save/load round-trip").toBe(true);
    await searchFor(fx.candidateName);
    await expect(dropdown.getByText("Prospects", { exact: true })).toBeVisible();
    await clickGroupOption("Prospects", fx.candidateName);
    await page.waitForURL(/\/jsa\/talent/, { timeout: 10000 });
    expect(page.url()).toContain(`focus=${fx.candidateId}`);
    expect(page.url()).toContain(`pool=${fx.candidatePool}`);
  }

  // ── 5b. Foreign-pool Prospects gating + search + deep link (O6) ──
  // Verify foreign-pool candidates are hidden while regionalPresence < 40,
  // become searchable once regionalPresence >= 40 (using country -> ExhibitionRegion
  // mapping e.g. Russia -> Europe), survive autosave reload, and deep-link to
  // /jsa/talent?pool=foreign&focus=...
  await idle();
  const foreignGraft = await page.evaluate((excludeId: string | null) => {
    const w = (window as unknown as { __BASHO_WORLD__?: any }).__BASHO_WORLD__;
    const store = (window as unknown as { __BASHO_STORE__?: any }).__BASHO_STORE__;
    const tp = w?.talentPool;
    const excludeName = excludeId ? tp?.candidates?.[excludeId]?.name : null;
    const cid = Object.keys(tp?.candidates ?? {}).find(
      (id) =>
        id !== excludeId && tp?.candidates?.[id]?.name && tp.candidates[id].name !== excludeName
    );
    if (!tp || !cid) return null;
    const cand = tp.candidates[cid];
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
    movedPools.foreign = {
      ...movedPools.foreign,
      candidatesVisible: [...(movedPools.foreign?.candidatesVisible ?? []), cid],
    };
    const playerHeya =
      w.heyas instanceof Map ? w.heyas.get(w.playerHeyaId) : w.heyas?.[w.playerHeyaId];
    const nextHeya = { ...playerHeya, regionalPresence: { Europe: 0 } };
    const nextHeyas =
      w.heyas instanceof Map
        ? new Map(w.heyas).set(w.playerHeyaId, nextHeya)
        : { ...w.heyas, [w.playerHeyaId]: nextHeya };
    const patched = {
      ...w,
      heyas: nextHeyas,
      talentPool: {
        ...tp,
        candidates: {
          ...tp.candidates,
          [cid]: {
            ...cand,
            originRegion: "Russia",
            nationality: "Russia",
            visibilityBand: "public",
          },
        },
        pools: movedPools,
      },
    };
    store?.getState?.().onWorldUpdated?.(patched);
    const accepted = store?.getState?.().sendCommand?.({ type: "LOAD_WORLD", world: patched });
    return { cid, name: cand.name as string, accepted };
  }, fx.candidateId);
  expect(foreignGraft, "foreign graft candidate exists").toBeTruthy();
  expect((foreignGraft as { accepted?: boolean }).accepted).not.toBe(false);
  const fCid = (foreignGraft as { cid: string }).cid;
  const fName = (foreignGraft as { name: string }).name;

  await page.waitForFunction(
    (cid: string) => {
      const w = (window as unknown as { __BASHO_WORLD__?: any }).__BASHO_WORLD__;
      return (w?.talentPool?.pools?.foreign?.candidatesVisible ?? []).includes(cid);
    },
    fCid,
    { timeout: 10000 }
  );
  // Flush autosave before page.goto("/dashboard") below.
  await page.waitForTimeout(2500);

  // Below threshold (< 40): foreign prospect must stay hidden from global search.
  await page.goto("/dashboard");
  await page.waitForFunction(
    () => !!(window as unknown as { __BASHO_WORLD__?: any }).__BASHO_WORLD__?.dayIndexGlobal,
    { timeout: 15000 }
  );
  await searchFor(fName);
  const hiddenOpt = await optionIdInGroup(page, "Prospects", fName);
  expect(hiddenOpt, "foreign prospect hidden when regionalPresence < 40").toBeNull();

  // Raise Europe regionalPresence >= 40, persist through reload, and verify search + deep-link.
  await idle();
  const unlocked = await page.evaluate(() => {
    const w = (window as unknown as { __BASHO_WORLD__?: any }).__BASHO_WORLD__;
    const store = (window as unknown as { __BASHO_STORE__?: any }).__BASHO_STORE__;
    const playerHeya =
      w.heyas instanceof Map ? w.heyas.get(w.playerHeyaId) : w.heyas?.[w.playerHeyaId];
    const nextHeya = {
      ...playerHeya,
      regionalPresence: { ...(playerHeya?.regionalPresence ?? {}), Europe: 45 },
    };
    const nextHeyas =
      w.heyas instanceof Map
        ? new Map(w.heyas).set(w.playerHeyaId, nextHeya)
        : { ...w.heyas, [w.playerHeyaId]: nextHeya };
    const patched = { ...w, heyas: nextHeyas };
    store?.getState?.().onWorldUpdated?.(patched);
    return store?.getState?.().sendCommand?.({ type: "LOAD_WORLD", world: patched });
  });
  expect(unlocked).not.toBe(false);
  await page.waitForFunction(
    () => {
      const w = (window as unknown as { __BASHO_WORLD__?: any }).__BASHO_WORLD__;
      const h = w?.heyas instanceof Map ? w.heyas.get(w.playerHeyaId) : w?.heyas?.[w?.playerHeyaId];
      return (h?.regionalPresence?.Europe ?? 0) >= 40;
    },
    { timeout: 10000 }
  );
  // Wait past autosaveWithSignal's 2000ms debounce before full reload.
  await page.waitForTimeout(2500);

  await page.goto("/dashboard");
  await page.waitForFunction(
    () => !!(window as unknown as { __BASHO_WORLD__?: any }).__BASHO_WORLD__?.dayIndexGlobal,
    { timeout: 15000 }
  );
  await searchFor(fName);
  await expect(dropdown.getByText("Prospects", { exact: true })).toBeVisible();
  await clickGroupOption("Prospects", fName);
  await page.waitForURL(/\/jsa\/talent/, { timeout: 10000 });
  expect(page.url()).toContain(`focus=${fCid}`);
  expect(page.url()).toContain("pool=foreign");
  await expect(page.locator(`#candidate-${fCid}`)).toBeVisible({ timeout: 10000 });

  // ── 6. Search group-header typography (mono section labels) ──
  await page.goto("/dashboard");
  await searchFor(fx.playerOyakataName);
  const groupHeader = dropdown.getByText("Oyakata", { exact: true });
  await expect(groupHeader).toHaveCSS("font-family", /JetBrains Mono/);
  await expect(groupHeader).toHaveCSS("text-transform", "uppercase");
  await page.screenshot({ path: "test-results/search-dropdown.png" });
});
