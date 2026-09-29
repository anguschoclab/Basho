import { expect, type Page } from "@playwright/test";
import LZString from "lz-string";

/**
 * Shared Playwright helpers for full-stack lifecycle E2E specs.
 *
 * The canonical verification surface is the autosave in localStorage:
 * every world change serializes the whole WorldState through
 * SerializationService.serializeWorld into `basho_save_autosave`.
 * Serialized shape notes (keep in sync with SerializationService):
 *   - `world.rikishi` / `world.heyas` are plain objects (Map → Record)
 *   - `world.history` is BashoResult[] (last entry = most recent basho)
 *   - `world.awardLog` is AwardLogEntry[]
 *   - `world.currentBanzuke` / `world.historyIndex` are plain snapshots/index
 *   - `world.currentBasho` is the serialized BashoState or undefined
 */

export const AUTOSAVE_KEY = "basho_save_autosave";

/**
 * The web storage fallback LZ-compresses save values (`lz16:` prefix in
 * electronStorageProvider). localStorage reads therefore need to decode
 * before JSON.parse. Decompression can't run inside page.evaluate, so the
 * raw string is pulled out and decoded on the Node side.
 */
export async function readAutosaveSave(page: Page): Promise<any> {
  const raw = await page.evaluate((key) => localStorage.getItem(key), AUTOSAVE_KEY);
  if (!raw) return null;
  const json = raw.startsWith("lz16:")
    ? LZString.decompressFromUTF16(raw.slice(5))
    : raw;
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export type SerializedWorld = any;

/** Read the autosave's serialized world, or null if absent/unparseable. */
export async function readAutosaveWorld(page: Page): Promise<SerializedWorld | null> {
  return (await readAutosaveSave(page))?.world ?? null;
}

/**
 * Lightweight metadata read from the live in-memory world
 * (window.__BASHO_WORLD__, exposed by GameContext). Only plain fields —
 * no serialization — so it's safe to poll every few hundred ms even with
 * a multi-MB world. Use for loop diagnostics and phase/day checks.
 */
export async function readLiveWorldMeta(page: Page): Promise<any | null> {
  return page
    .evaluate(() => {
      const w = (window as any).__BASHO_WORLD__;
      if (!w) return null;
      return {
        seed: w.seed,
        dayIndexGlobal: w.dayIndexGlobal,
        cyclePhase: w.cyclePhase,
        week: w.week,
        year: w.year,
        calendar: w.calendar ? { month: w.calendar.month, currentDay: w.calendar.currentDay, currentWeek: w.calendar.currentWeek } : null,
        playerHeyaId: w.playerHeyaId,
        pendingCrisis: w.pendingCrisis ? { id: w.pendingCrisis.id ?? w.pendingCrisis.type } : null,
        currentBasho: w.currentBasho
          ? { day: w.currentBasho.day ?? w.currentBasho.currentDay, matchCount: w.currentBasho.matches?.length ?? 0 }
          : null,
        historyLength: w.history?.length ?? 0,
        awardLogLength: w.awardLog?.length ?? 0,
        rikishiCount: w.rikishi instanceof Map ? w.rikishi.size : Object.keys(w.rikishi ?? {}).length,
        banzukeIndexLength: Object.keys(w.historyIndex?.banzukeByBasho ?? {}).length,
        yokozunaVacancyStreak: w.yokozunaVacancyStreak ?? 0,
      };
    })
    .catch(() => null);
}

/**
 * Read the full live world from the in-memory handle, converting Maps to
 * Records in-page so the result matches SerializationService output.
 * Costs a multi-MB JSON.stringify on the page's main thread — call only
 * at checkpoints (a few times per basho), never inside tight poll loops.
 * Falls back to the autosave when the debug handle is absent.
 */
export async function readWorldSnapshot(page: Page): Promise<SerializedWorld | null> {
  const json = await page
    .evaluate(() => {
      const w = (window as any).__BASHO_WORLD__;
      if (!w) return null;
      return JSON.stringify(w, (_k, v) => {
        if (v instanceof Map) return Object.fromEntries(v);
        if (v instanceof Set) return [...v];
        return v;
      });
    })
    .catch(() => null);
  if (json) {
    try {
      return JSON.parse(json);
    } catch {
      /* fall through to autosave */
    }
  }
  return readAutosaveWorld(page);
}

/**
 * Poll the LIVE world until `predicateSrc` (a `(world) => ...` expression)
 * is truthy, then return a full serialized-shaped snapshot. Predicates
 * evaluate in-page against the object (no per-poll serialization), so
 * this neither depends on localStorage quota nor pays an MB-scale parse
 * every 500ms the way the autosave poller did.
 */
export async function waitForWorld(
  page: Page,
  predicateSrc: string,
  timeout = 120_000
): Promise<SerializedWorld> {
  const deadline = Date.now() + timeout;
  let lastMeta: any = null;
  while (Date.now() < deadline) {
    const hit = await page
      .evaluate((src) => {
        const w = (window as any).__BASHO_WORLD__;
        if (!w) return false;
        try {
          return !!(new Function("world", `return (${src})(world)`) as any)(w);
        } catch {
          return false;
        }
      }, predicateSrc)
      .catch(() => false);
    if (hit) {
      const snap = await readWorldSnapshot(page);
      if (snap) return snap;
    }
    lastMeta = await readLiveWorldMeta(page);
    await page.waitForTimeout(500);
  }
  throw new Error(
    `waitForWorld timed out after ${timeout}ms (last world: ${
      lastMeta ? `seed=${lastMeta.seed} day=${lastMeta.dayIndexGlobal} phase=${lastMeta.cyclePhase}` : "none"
    })`
  );
}

/**
 * Poll the autosave until `predicateSrc` (a JS expression body evaluated in
 * the page as `(world) => ...` source) returns truthy, then return the world.
 *
 * Polling is required because autosave can transiently hold a stale
 * pre-resolution world during multi-impact operations (e.g.
 * recordBashoHistory autosaves mid-construction). Reading once races.
 */
export async function waitForAutosaveWorld(
  page: Page,
  predicateSrc: string,
  timeout = 120_000
): Promise<SerializedWorld> {
  // Node-side polling — the stored value is LZ-compressed in the web
  // fallback, so it can't be parsed inside page.evaluate.
  const pred = new Function("world", `return (${predicateSrc})(world)`) as (
    w: SerializedWorld
  ) => unknown;
  const deadline = Date.now() + timeout;
  let lastWorld: SerializedWorld | null = null;
  while (Date.now() < deadline) {
    lastWorld = await readAutosaveWorld(page).catch(() => null);
    if (lastWorld) {
      try {
        if (pred(lastWorld)) return lastWorld;
      } catch {
        /* predicate threw — keep polling */
      }
    }
    await page.waitForTimeout(500);
  }
  throw new Error(
    `waitForAutosaveWorld timed out after ${timeout}ms (last world: ${
      lastWorld ? `seed=${lastWorld.seed} day=${lastWorld.dayIndexGlobal} phase=${lastWorld.cyclePhase}` : "none"
    })`
  );
}

/**
 * Main Menu → Manual Seed → enter `seed` → Sync Seed.
 *
 * createWorld() is fire-and-forget: it only sends START_WORLD to the
 * worker, and the previous world's stable cards stay rendered until the
 * worker emits WORLD_UPDATED. Waiting for "a stable card" is therefore a
 * race — the visible card may belong to the boot world (random timestamp
 * seed) and carry a heyaId that doesn't exist in the seeded world.
 * Instead, wait for the seeded world to reach UI state, proven by its
 * autosave (the GameContext effect autosaves every world update, and
 * serializeWorld stamps `seed` first).
 */
export async function setWorldSeed(page: Page, seed: string): Promise<void> {
  await page.getByRole("button", { name: /Manual Seed/i }).click();
  await page.getByPlaceholder(/Enter specific world seed/i).fill(seed);
  await page.getByRole("button", { name: /Sync Seed/i }).click();
  await waitForWorld(page, `(w) => w.seed === ${JSON.stringify(seed)}`, 180_000);
  await expect(page.locator(".space-y-6 .grid .cursor-pointer").first()).toBeVisible({
    timeout: 60_000,
  });
}

/** Complete the New Game Wizard: stable pick → name → background → ichimon → bout preview → dashboard. */
export async function createNewGame(page: Page, elderName = "TestOyakata"): Promise<void> {
  const firstStable = page.locator(".space-y-6 .grid .cursor-pointer").first();
  await firstStable.click();

  const inaugurateBtn = page.getByRole("button", { name: /Inaugurate/i });
  await expect(inaugurateBtn).toBeVisible();
  await inaugurateBtn.click({ force: true });

  await expect(page.getByRole("heading", { name: /Begin Your Legacy/i })).toBeVisible({
    timeout: 10_000,
  });
  const nameInput = page.getByRole("textbox", { name: /Official Elder Name/i });
  await nameInput.fill(elderName);
  await page.getByRole("main").getByText("Champion Inheritor").click();
  await page.getByRole("button", { name: /Next Submission/i }).click();

  await expect(page.getByRole("heading", { name: /Choose Your Ichimon/i })).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole("main").getByText("Dewanoumi").click();
  await page.getByRole("button", { name: /Verify Allegiance/i }).click();

  await expect(page.getByRole("heading", { name: /Live Bout Preview/i })).toBeVisible({
    timeout: 10_000,
  });
  const dismissBtn = page.getByRole("button", { name: /^Dismiss$/i });
  if (await dismissBtn.isVisible().catch(() => false)) {
    await dismissBtn.click();
  }
  for (let i = 0; i < 80; i++) {
    const nextBtn = page.getByRole("button", { name: /^Next$/i }).first();
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(100);
    } else {
      break;
    }
  }
  const beginCareerBtn = page.getByRole("button", { name: /Begin My Career/i });
  await expect(beginCareerBtn).toBeVisible({ timeout: 10_000 });
  await beginCareerBtn.click();
  await page.waitForURL("**/dashboard", { timeout: 10_000 });
}

/** Dismiss the onboarding tour overlay if it is showing. */
export async function dismissOnboardingTour(page: Page): Promise<void> {
  await page.waitForTimeout(1000);
  const skipTourBtn = page.getByRole("button", { name: /Skip Tour/i }).first();
  if (await skipTourBtn.isVisible().catch(() => false)) {
    await skipTourBtn.click();
    await page.waitForTimeout(500);
  }
  for (let i = 0; i < 5; i++) {
    const btn = page.getByRole("button", { name: /Next Guide|Begin Your Legacy/i }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(200);
    } else {
      break;
    }
  }
}

/**
 * From the interim dashboard, advance days until the basho begins
 * ("Sim All" becomes visible). Uses the Week fast-forward when available.
 */
export async function advanceToBasho(page: Page): Promise<void> {
  const simAllBtn = page
    .getByRole("button", { name: /Automatically simulate the remainder/i })
    .first();
  const weekBtn = page
    .getByRole("button", { name: /Progress simulation by one full week/i })
    .first();
  const continueBtn = page.getByRole("button", { name: /Continue|Start Basho/i }).first();
  const dayBtn = page
    .getByRole("button", { name: /Advance the simulation by one day/i })
    .first();
  const endBashoBtn = page.getByRole("button", { name: /^End Basho$/i }).first();

  // Wait for the dashboard's advance controls to mount — the dashboard
  // lazy-renders after the wizard navigation and an early poll sees none
  // of them, which would break the loop on its first iteration. A seed
  // can also land the world mid-basho (e.g. past Day 15 waiting for the
  // interactive End Basho) before this is ever called.
  await expect(
    simAllBtn.or(weekBtn).or(continueBtn).or(dayBtn).or(endBashoBtn).first()
  ).toBeVisible({ timeout: 30_000 });

  for (let i = 0; i < 120; i++) {
    if (await simAllBtn.isVisible().catch(() => false)) return;
    // Already inside an active basho — let driveBashoToRecap take over.
    // A Week click can fast-forward straight into active_basho while the
    // URL stays on /dashboard, so detect the phase via autosave too.
    if (
      page.url().includes("/basho") ||
      (await endBashoBtn.isVisible().catch(() => false))
    ) {
      return;
    }
    if (i % 5 === 4) {
      const w = await readLiveWorldMeta(page);
      if (w?.cyclePhase === "active_basho" || w?.currentBasho) return;
    }

    // A blocking decision can halt the interim advance — resolve it so
    // the next tick can proceed.
    if (await resolveCrisisIfPresent(page)) continue;

    if (await weekBtn.isVisible().catch(() => false)) {
      if (!(await tryClick(weekBtn))) await resolveCrisisIfPresent(page);
      await page.waitForTimeout(700);
    } else if (await continueBtn.isVisible().catch(() => false)) {
      if (!(await tryClick(continueBtn))) await resolveCrisisIfPresent(page);
      await page.waitForTimeout(700);
    } else if (await dayBtn.isVisible().catch(() => false)) {
      if (!(await tryClick(dayBtn))) await resolveCrisisIfPresent(page);
      await page.waitForTimeout(700);
    } else {
      // Controls briefly unmount during world sync — keep polling.
      await page.waitForTimeout(1000);
    }

    if (i % 15 === 14) {
      const w = await readLiveWorldMeta(page);
      const cal = await page
        .getByText(/Week \d+|Day \d+|Tournament/i)
        .first()
        .innerText()
        .catch(() => "?");
      const dlgInfo = await page
        .evaluate(() =>
          [...document.querySelectorAll('[role="dialog"]')].map((d) => ({
            state: d.getAttribute("data-state"),
            hidden: d.getAttribute("aria-hidden"),
            text: (d.textContent ?? "").slice(0, 90),
          }))
        )
        .catch(() => [] as any[]);
      console.log(
        `[advanceToBasho] iter ${i + 1}: url=${page.url().replace(/.*:\d+/, "")} cal="${cal}" ` +
          `world=${w ? `day${w.dayIndexGlobal} wk${w.week} ${w.cyclePhase}${w.currentBasho ? " bashoDay" + w.currentBasho.day : ""}${w.pendingCrisis ? " crisis:" + w.pendingCrisis.id : ""}` : "none"} ` +
          `dialogs=${JSON.stringify(dlgInfo)}`
      );
    }
  }
  await expect(simAllBtn).toBeVisible({ timeout: 10_000 });
}

/** Dismiss queued retirement ceremonies (IntaiCeremony dialog) if present. */
export async function dismissRetirementCeremonies(page: Page): Promise<void> {
  for (let i = 0; i < 10; i++) {
    const clicked = await page
      .evaluate(() => {
        for (const b of document.querySelectorAll("button")) {
          if (/Acknowledge Retirement/i.test(b.textContent ?? "") && !b.disabled) {
            b.click();
            return true;
          }
        }
        return false;
      })
      .catch(() => false);
    if (!clicked) break;
    await page.waitForTimeout(500);
  }
}

/**
 * From the Recap page: clear ceremony overlays, click "Finalize Basho",
 * and wait for the dashboard.
 *
 * The recap page runs continuous Framer Motion animations (ceremony
 * layer), so Playwright's actionability/stability checks can stall
 * indefinitely — drive the click at DOM level like the basho-page path.
 */
export async function finalizeRecap(page: Page): Promise<void> {
  for (let i = 0; i < 20; i++) {
    if (page.url().includes("/dashboard")) return;
    await dismissRetirementCeremonies(page);
    await resolveCrisisIfPresent(page);
    const clicked = await page
      .evaluate(() => {
        for (const b of document.querySelectorAll("button")) {
          if (/Finalize Basho/i.test(b.textContent ?? "") && !b.disabled) {
            b.click();
            return true;
          }
        }
        return false;
      })
      .catch(() => false);
    if (clicked) {
      await page.waitForURL("**/dashboard", { timeout: 8_000 }).catch(() => {});
    } else {
      await page.waitForTimeout(1000);
    }
  }
  await page.waitForURL("**/dashboard", { timeout: 10_000 });
}

/** Advance the interim simulation by `days` via the calendar Day button. */
export async function advanceDays(page: Page, days: number): Promise<void> {
  const dayBtn = page
    .getByRole("button", { name: /Advance the simulation by one day/i })
    .first();
  const continueBtn = page.getByRole("button", { name: /Continue|Start Basho/i }).first();
  for (let i = 0; i < days; i++) {
    if (await dayBtn.isVisible().catch(() => false)) {
      if (!(await tryClick(dayBtn))) await resolveCrisisIfPresent(page);
    } else if (await continueBtn.isVisible().catch(() => false)) {
      if (!(await tryClick(continueBtn))) await resolveCrisisIfPresent(page);
    }
    await page.waitForTimeout(800);
  }
}

/**
 * Repair stale Radix overlay state. When a dialog unmounts mid-animation
 * (e.g. confirming "End Basho" navigates to /recap during the close
 * animation), Radix can leave `pointer-events:none` on <body> and stale
 * aria-hidden on siblings — Playwright hit-testing then fails on every
 * element with no dialog visible. If no dialog/alertdialog is open, the
 * locks are stale: clear them.
 */
async function repairStaleOverlayState(page: Page): Promise<void> {
  const repaired = await page
    .evaluate(() => {
      const open = document.querySelector(
        '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'
      );
      if (open) return null;
      const found: string[] = [];
      if (document.body.style.pointerEvents === "none") {
        document.body.style.pointerEvents = "";
        found.push("body:pointer-events");
      }
      // Elements hidden by Radix's aria-hidden package carry a
      // data-aria-hidden marker — restore them if their dialog is gone.
      for (const el of document.querySelectorAll('[data-aria-hidden="true"]')) {
        el.removeAttribute("aria-hidden");
        el.removeAttribute("data-aria-hidden");
        found.push("data-aria-hidden");
      }
      return found.length ? found : null;
    })
    .catch(() => null);
  if (repaired) {
    console.log(`[helpers] repaired stale overlay state: ${repaired.join(",")} @ ${page.url()}`);
  }
}

/**
 * Click with a bounded actionability timeout. Returns false instead of
 * hanging when a modal overlay intercepts pointer events — the caller
 * then resolves the blocking dialog and retries.
 */
async function tryClick(
  loc: ReturnType<Page["getByRole"]> | ReturnType<Page["locator"]>
): Promise<boolean> {
  try {
    await loc.click({ timeout: 2_500 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve a blocking modal if one is currently displayed. Covers the
 * CrisisModal ("Emergency Protocol" header) and any other open dialog
 * that intercepts pointer events — clicking its first action button.
 * Returns true if a dialog was handled.
 */
export async function resolveCrisisIfPresent(page: Page): Promise<boolean> {
  // Clear stale pointer-events/aria-hidden locks when no dialog is open
  // (Radix cleanup leak after mid-animation navigation) — otherwise every
  // Playwright click silently fails with nothing visibly blocking.
  await repairStaleOverlayState(page);
  // Radix aria-hides covered layers — but the topmost dialog can also be
  // flagged aria-hidden transiently, so do NOT filter it out. Use CSS
  // locators (getByRole skips aria-hidden subtrees) and resolve dialogs
  // topmost-last; each handled dialog returns true so the caller loops.
  // Radix AlertDialog (e.g. the End Basho confirmation) uses
  // role="alertdialog" — include it or the confirm deadlocks the loop.
  const dialogs = page.locator(
    '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'
  );
  const count = await dialogs.count().catch(() => 0);
  if (count === 0) return false;

  // Topmost dialog is last in DOM order. Choose the LAST substantive
  // button: Radix AlertDialogs render [Cancel][Action] so the action is
  // last, and a world-backed CrisisModal ignores its Close control while a
  // decision is pending (any option resolves it). Pure-close controls are
  // only a fallback for dialogs whose sole action is dismissal.
  const dialog = dialogs.last();
  // DOM-click the target: a stale pointer-events lock on <body> (Radix
  // cleanup leak after mid-animation navigation) makes Playwright clicks
  // dead while dialogs are still open — el.click() bypasses hit-testing.
  const clicked = await dialog
    .evaluate((d) => {
      const btns = [...d.querySelectorAll("button")];
      const action =
        btns
          .filter((b) => {
            const t = (b.textContent ?? "").trim();
            const al = b.getAttribute("aria-label") ?? "";
            if (/^(close|x|×|cancel)$/i.test(t) || /^(close|x|×|cancel)$/i.test(al)) return false;
            return t || al;
          })
          .pop() ?? btns[0];
      if (!action || (action as HTMLButtonElement).disabled) return false;
      (action as HTMLElement).click();
      return true;
    })
    .catch(() => false);
  if (clicked) {
    await page.waitForTimeout(500);
    return true;
  }
  return false;
}

/**
 * Drive the active basho to the post-basho Recap page.
 *
 * Assumes the dashboard shows "Sim All". Clicks it, then loops:
 *   - resolves blocking crisis modals (they halt TICK_MULTIPLE_DAYS),
 *   - clicks "End Basho" once Day 15 resolves (the pipeline never
 *     auto-ends a basho),
 *   - resumes the fast path via dashboard Sim All if halted.
 * Returns once the Recap's "Finalize Basho" button is visible — the caller
 * is responsible for finalizing after verifying recap state.
 */
export async function driveBashoToRecap(page: Page): Promise<void> {
  const simAllBtn = page
    .getByRole("button", { name: /Automatically simulate the remainder/i })
    .first();
  // The world can already be inside an active basho (e.g. the previous
  // fast-forward ran straight through to Day 15+). Only click Sim All
  // when it's actually offered; otherwise skip to the drive loop.
  if (
    !page.url().includes("/basho") &&
    (await simAllBtn.isVisible().catch(() => false))
  ) {
    // A crisis modal can open between the visibility check and the click —
    // clear it before clicking Sim All.
    if (!(await tryClick(simAllBtn))) {
      await resolveCrisisIfPresent(page);
      await tryClick(simAllBtn);
    }
    // Sim All normally navigates to /basho, but if the world was already
    // mid-basho the app may stay on the dashboard — the drive loop below
    // handles either case.
    await page.waitForURL("**/basho", { timeout: 10_000 }).catch(() => {});
  } else if (!page.url().includes("/basho")) {
    // Neither on /basho nor showing Sim All. A modal may be covering the
    // controls — or the world is already inside an active basho that the
    // dashboard can't advance (a Week fast-forward can land mid-basho).
    // Resolve any modal, then navigate to the basho page.
    await resolveCrisisIfPresent(page);
    if (await tryClick(simAllBtn)) {
      await page.waitForURL("**/basho", { timeout: 10_000 });
    } else {
      // World is mid-basho on the dashboard — navigate via the TopNavBar
      // "Day N" pill (its onClick routes to /basho during active_basho),
      // falling back to the sidebar link by href. NEVER page.goto() here:
      // a full reload discards the worker world and restores only via the
      // Main Menu's user-triggered autosave load — i.e., never in a test.
      const dayPill = page.getByRole("button", { name: /^Day \d+/ }).first();
      const bashoNavLink = page.locator('a[href="/basho"]').first();
      if (await dayPill.isVisible().catch(() => false)) {
        await tryClick(dayPill);
      } else if (await bashoNavLink.isVisible().catch(() => false)) {
        await tryClick(bashoNavLink);
      }
      await page.waitForURL("**/basho", { timeout: 10_000 }).catch(() => {});
    }
  }

  const finalizeBtn = page.getByRole("button", { name: /Finalize Basho/i }).first();

  for (let i = 0; i < 60; i++) {
    if (i % 5 === 4) {
      const w = await readLiveWorldMeta(page);
      const dlgInfo = await page
        .evaluate(() =>
          [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].map((d) => ({
            state: d.getAttribute("data-state"),
            text: (d.textContent ?? "").slice(0, 80),
            btns: [...d.querySelectorAll("button")].map((b) => (b.textContent ?? "").trim()).slice(0, 6),
          }))
        )
        .catch(() => [] as any[]);
      console.log(
        `[driveBasho] iter ${i + 1}: url=${page.url().replace(/.*:\d+/, "")} ` +
          `world=${w ? `day${w.dayIndexGlobal} ${w.cyclePhase}${w.currentBasho ? " bashoDay" + w.currentBasho.day + " matches" + w.currentBasho.matchCount : ""}${w.pendingCrisis ? " crisis:" + w.pendingCrisis.id : ""}` : "none"} ` +
          `dialogs=${JSON.stringify(dlgInfo)}`
      );
    }
    if (
      (await page.getByText(/No Active Tournament/i).isVisible().catch(() => false)) ||
      (await finalizeBtn.isVisible().catch(() => false))
    ) {
      break;
    }

    if (await resolveCrisisIfPresent(page)) continue;

    // On the basho page, drive via DOM-level clicks. Stale aria-hidden
    // layers (Radix hideOthers leaks when a dialog unmounts mid-nav) make
    // getByRole locators report "invisible" while the element is rendered,
    // and non-dialog overlays can fail Playwright's hit-test. el.click()
    // fires the React handler regardless — acceptable for a sim driver.
    if (page.url().includes("/basho")) {
      const action = await page
        .evaluate(() => {
          // "Next Day"/"End Basho" — rendered once today's bouts are done.
          const advance = document.querySelector(
            "#advance-basho-btn"
          ) as HTMLButtonElement | null;
          if (advance && !advance.disabled) {
            const label = (advance.textContent ?? "").trim();
            advance.click();
            return `advance:${label}`;
          }
          // "Sim All" — simulate the remainder of today's bouts.
          for (const b of document.querySelectorAll("button")) {
            if ((b.textContent ?? "").trim() === "Sim All" && !b.disabled) {
              b.click();
              return "sim-all";
            }
          }
          return null;
        })
        .catch(() => null);

      if (action === "sim-all") {
        await page.waitForTimeout(1500);
        continue;
      }
      if (action?.startsWith("advance:")) {
        await page.waitForTimeout(800);
        // "End Basho" opens a Radix AlertDialog — confirm via DOM click on
        // the last non-cancel button.
        const confirm = await page
          .evaluate(() => {
            const dlg = document.querySelector(
              '[role="alertdialog"][data-state="open"], [role="dialog"][data-state="open"]'
            );
            if (!dlg) return "no-dialog";
            const btns = [...dlg.querySelectorAll("button")];
            const btn = btns
              .filter(
                (b) => !/^(close|cancel|x|×)$/i.test((b.textContent ?? "").trim())
              )
              .pop();
            if (!btn) return "no-action";
            (btn as HTMLElement).click();
            return `confirmed:"${(btn.textContent ?? "").trim()}"`;
          })
          .catch(() => "err");
        console.log(`[driveBasho] iter ${i + 1}: ${action} → ${confirm}`);
        await page.waitForTimeout(2000);
        continue;
      }

      if (i % 5 === 4) {
        const ctl = await page
          .evaluate(() => {
            const btn = document.querySelector("#advance-basho-btn") as HTMLElement | null;
            return {
              advanceBtn: btn
                ? {
                    text: btn.textContent?.trim(),
                    disabled: (btn as HTMLButtonElement).disabled,
                    ariaHidden: btn.closest('[aria-hidden="true"]') != null,
                  }
                : null,
            };
          })
          .catch(() => null);
        console.log(`[driveBasho] no actionable control — bashoCtl=${JSON.stringify(ctl)}`);
      }
      await page.waitForTimeout(2000);
      continue;
    }

    if (!page.url().includes("/dashboard")) {
      const backBtn = page.getByRole("button", { name: /Dashboard/i }).first();
      if (await backBtn.isVisible().catch(() => false)) {
        await backBtn.click();
        await page.waitForTimeout(1000);
      }
    }
    const dashSimAll = page
      .getByRole("button", { name: /Automatically simulate the remainder/i })
      .first();
    if (await dashSimAll.isVisible().catch(() => false)) {
      if (await tryClick(dashSimAll)) {
        await page.waitForURL("**/basho", { timeout: 10_000 }).catch(() => {});
      } else {
        await resolveCrisisIfPresent(page);
      }
    }
    await page.waitForTimeout(6000);
  }

  await expect(finalizeBtn).toBeVisible({ timeout: 120_000 });
}
