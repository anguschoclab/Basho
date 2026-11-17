import { test, expect } from "@playwright/test";
import { BASHO_CALENDAR } from "../../src/engine/calendar/calendar";
import type { BashoName } from "../../src/engine/types/basho";
import { DIVISION_NAMES } from "../../src/constants/engine/rankDisplay";
import { IRON_MAN_BEAT_THRESHOLD } from "../../src/constants/engine/generation";
import type { Division } from "../../src/engine/types/banzuke";
import {
  advanceToBasho,
  createNewGame,
  dismissOnboardingTour,
  readLiveWorldMeta,
  readWorldSnapshot,
  resolveCrisisIfPresent,
  setWorldSeed,
  waitForWorld,
} from "./helpers";

/**
 * Workstream UI E2E
 * =================
 * Exercises the UI surfaces added by the commentary workstreams:
 *   - W I  DegeikoPanel on /stable/training — request flow + scheduled state
 *   - W F  Records boards on /records/history — new leaderboard categories
 *   - W J  Venue chip on /basho — location + dohyo condition in the lede
 *   - W L  Schedule badges on /basho/schedule — call-up / maezumo / 8th-bout
 *   - W A  Mono-ii verdict chips — BoutNarrativeModal shimpan-panel
 *   - W K  Day-recap headlines — mediaState.headlines tagged day_recap
 *   - W F/H Rikishi chips — Iron Man streak + sibling/schoolmate callouts
 *
 * Conditional surfaces (callups, mono-ii, iron-man, siblings) are asserted
 * against whatever the pinned seed actually produced — same contract as the
 * awards assertions in full-basho-lifecycle.
 */

const WORLD_SEED = "e2e-workstream-ui-v1";

interface FlaggedMatch {
  day: number;
  eastRikishiId: string;
  westRikishiId: string;
  crossDivisionCallupId?: string;
  eighthBoutForRikishiId?: string;
  result?: { winner?: string; monoii?: boolean; [k: string]: unknown } | null;
}

/** Escape a shikona/label for interpolation into a RegExp. */
const rx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** In-app navigation — never page.goto (a reload discards the worker world). */
async function navTo(page: import("@playwright/test").Page, href: string) {
  const link = page.locator(`a[href="${href}"]`).first();
  await expect(link).toBeVisible({ timeout: 15_000 });
  await link.click();
  await page.waitForTimeout(800);
}

/** Navigate to a rikishi profile via the top-bar entity search (in-app). */
async function gotoRikishi(page: import("@playwright/test").Page, shikona: string) {
  const search = page.getByPlaceholder(/Search wrestlers & stables/i);
  await expect(search).toBeVisible({ timeout: 15_000 });
  await search.fill(shikona);
  const option = page.locator('[id^="gs-opt-"]').filter({ hasText: shikona }).first();
  await expect(option).toBeVisible({ timeout: 10_000 });
  await option.click();
  await page.waitForURL(/\/rikishi\//, { timeout: 10_000 });
}

test("Workstream UI: degeiko -> records boards -> venue chip -> schedule badges -> mono-ii + day-recap", async ({
  page,
}) => {
  test.setTimeout(600_000);

  // ── Boot + pinned seed + new game ──────────────────────────────────────
  await page.goto("/");
  await expect(page.locator("h1").first()).toContainText(/Basho/i, { timeout: 60_000 });
  await setWorldSeed(page, WORLD_SEED);
  await createNewGame(page);
  await dismissOnboardingTour(page);

  // ── W I — DegeikoPanel on /stable/training ─────────────────────────────
  await navTo(page, "/stable/training");
  await expect(page.getByText("Degeiko — Cross-Stable Keiko")).toBeVisible({
    timeout: 15_000,
  });

  // Card ancestor of the title (CardTitle → CardHeader → Card).
  const panel = page
    .getByText("Degeiko — Cross-Stable Keiko")
    .locator("..")
    .locator("..");

  // Pick a host stable from the Radix select. NPC acceptance is a seeded
  // roll keyed per (requester, host, week) — a decline is deterministic for
  // a pinned seed, so iterate options until one accepts.
  let degeikoScheduled = false;
  for (let attempt = 0; attempt < 6 && !degeikoScheduled; attempt++) {
    await panel.getByRole("combobox").click();
    const option = page.getByRole("option").nth(attempt);
    if (!(await option.isVisible().catch(() => false))) {
      await page.keyboard.press("Escape");
      break;
    }
    await option.click();

    // Pick a rikishi badge, then submit — button enables once both are chosen.
    const rikishiBadge = panel.locator(".cursor-pointer").first();
    if (!(await rikishiBadge.isVisible().catch(() => false))) break;
    await rikishiBadge.click();
    const requestBtn = panel.getByRole("button", { name: /Request degeiko/i });
    if (!(await requestBtn.isEnabled().catch(() => false))) break;
    await requestBtn.click();

    // The command resolves on the worker; on acceptance the world records
    // pendingDegeiko on the player's training state.
    degeikoScheduled = await page
      .waitForFunction(
        () => {
          const w = (window as unknown as {
            __BASHO_WORLD__?: {
              playerHeyaId?: string;
              trainingState?: Map<string, { pendingDegeiko?: unknown }>;
            };
          }).__BASHO_WORLD__;
          return !!w?.trainingState?.get?.(w.playerHeyaId ?? "")?.pendingDegeiko;
        },
        undefined,
        { timeout: 8_000 }
      )
      .then(() => true)
      .catch(() => false);
  }
  expect(degeikoScheduled, "an NPC host accepted a degeiko request").toBe(true);
  await expect(panel.getByText("Scheduled")).toBeVisible({ timeout: 10_000 });

  // ── W F — Records boards on /records/museum ────────────────────────────
  await navTo(page, "/records/museum");
  for (const label of [
    "Career Bouts",
    "Top Division Bouts",
    "Iron Men (Consecutive Basho)",
    "Kinboshi Conceded (Yokozuna)",
  ]) {
    await expect(page.getByText(label, { exact: false }).first()).toBeVisible({
      timeout: 15_000,
    });
  }

  // ── Advance into the basho ─────────────────────────────────────────────
  await navTo(page, "/dashboard");
  await advanceToBasho(page);
  if (!page.url().includes("/basho")) {
    await navTo(page, "/basho");
  }

  // ── W J — venue chip: location + dohyo condition in the lede ───────────
  let world = await waitForWorld(page, `(w) => !!w.currentBasho`, 30_000);
  const bashoName = (world.currentBasho?.bashoName ?? "hatsu") as BashoName;
  const venueLocation = BASHO_CALENDAR[bashoName]?.location;
  expect(venueLocation, "basho has a venue location").toBeTruthy();
  await expect(page.getByText(venueLocation!).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/dohyo:\s*(firm|slick|heavy)/)).toBeVisible({
    timeout: 10_000,
  });

  world = await readWorldSnapshot(page) ?? world;
  const rikishiById = world.rikishi ?? {};

  // ── Drive days; assert mono-ii chips when a flagged bout appears ───────
  let monoiiChecked = false;
  let recapChecked = false;
  for (let day = 0; day < 12 && (!monoiiChecked || !recapChecked); day++) {
    await navTo(page, "/basho");

    // Resolve any blocking dialog, then Sim All today's bouts.
    await resolveCrisisIfPresent(page);
    await page
      .evaluate(() => {
        for (const b of document.querySelectorAll("button")) {
          if ((b.textContent ?? "").trim() === "Sim All" && !b.disabled) {
            b.click();
            return true;
          }
        }
        return false;
      })
      .catch(() => false);
    // Wait for the day's results to land — poll the live world until every
    // scheduled match for the current day carries a result (fusen results
    // carry a result too, so absence of result = still pending).
    await page
      .waitForFunction(
        () => {
          const w = (window as unknown as { __BASHO_WORLD__?: { currentBasho?: { day?: number; matches?: { day: number; result?: unknown }[] } } })
            .__BASHO_WORLD__;
          const b = w?.currentBasho;
          if (!b?.matches) return false;
          const today = b.day ?? 0;
          const todays = b.matches.filter((m) => m.day === today);
          return todays.length > 0 && todays.every((m) => m.result != null);
        },
        undefined,
        { timeout: 30_000 }
      )
      .catch(() => {});
    await resolveCrisisIfPresent(page); // player-bout auto viewer, crisis, etc.

    world = (await readWorldSnapshot(page)) ?? world;
    const today = world.currentBasho?.day ?? 0;
    const todayMatches = ((world.currentBasho?.matches ?? []) as FlaggedMatch[]).filter(
      (m) => m.day === today && m.result
    );

    // W A — mono-ii verdict: open the flagged bout's narrative modal.
    const monoBout = todayMatches.find((m) => m.result?.monoii);
    if (monoBout && !monoiiChecked) {
      const e = rikishiById[monoBout.eastRikishiId];
      const w = rikishiById[monoBout.westRikishiId];
      const card = page.getByRole("button", {
        name: new RegExp(
          `View bout detail:\\s*${rx(e?.shikona ?? "")}.*${rx(w?.shikona ?? "")}`,
          "i"
        ),
      });
      if (await card.isVisible().catch(() => false)) {
        await card.click();
        await expect(page.getByTestId("shimpan-panel")).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText("Mono-ii").first()).toBeVisible();
        await expect(
          page.getByText(/Decision upheld|Decision reversed|Rematch ordered/)
        ).toBeVisible();
        await page.keyboard.press("Escape");
        monoiiChecked = true;
      }
    }

    // W K — day-recap headline lands on the resolved day (emitted at the
    // day-advance boundary; checking each iteration catches the prior day's).
    const headlines = (world.mediaState as { headlines?: { tags?: string[] }[] })?.headlines ?? [];
    if (headlines.some((h) => h.tags?.includes("day_recap"))) {
      recapChecked = true;
    }

    // Advance to the next day.
    const advanced = await page
      .evaluate(() => {
        const btn = document.querySelector("#advance-basho-btn") as HTMLButtonElement | null;
        if (btn && !btn.disabled) {
          btn.click();
          return (btn.textContent ?? "").trim();
        }
        return null;
      })
      .catch(() => null);
    if (advanced === null || /End Basho/i.test(advanced)) break;
    await page.waitForTimeout(2000);
    await resolveCrisisIfPresent(page);
  }

  // ── W L — schedule badges on /basho/schedule (checked after several days
  // so callups/8th-bouts had a chance to appear on the card) ─────────────
  world = (await readWorldSnapshot(page)) ?? world;
  const flagged = ((world.currentBasho?.matches ?? []) as FlaggedMatch[]).find(
    (m) => m.crossDivisionCallupId || m.eighthBoutForRikishiId
  );
  if (flagged) {
    await navTo(page, "/basho/schedule");
    await expect(page.getByText("Filters", { exact: true })).toBeVisible({ timeout: 15_000 });

    const callupId = flagged.crossDivisionCallupId ?? flagged.eighthBoutForRikishiId!;
    const callupRikishi = rikishiById[callupId];
    expect(callupRikishi, "flagged callup rikishi exists").toBeTruthy();
    // The bout is listed under either participant's division — filter by the
    // called-up rikishi's own division so his badge renders.
    const hostDivision = callupRikishi!.division as Division;

    // Scope to the Filters card — the top-bar entity search is also a
    // role="combobox" and would shift the indices.
    const filtersCard = page.getByText("Filters", { exact: true }).locator("..").locator("..");
    const combos = filtersCard.getByRole("combobox");
    await combos.nth(0).click();
    await page
      .getByRole("option", { name: new RegExp(`^${rx(DIVISION_NAMES[hostDivision])}$`, "i") })
      .click();
    await combos.nth(1).click();
    await page.getByRole("option", { name: new RegExp(`^Day ${flagged.day}\\b`) }).click();

    const expectedLabel = flagged.eighthBoutForRikishiId
      ? "8th bout"
      : callupRikishi!.isMaezumo
        ? "Maezumo call-up"
        : `${DIVISION_NAMES[callupRikishi!.division] ?? callupRikishi!.division} call-up`;
    await expect(page.getByText(new RegExp(`·\\s*${rx(expectedLabel)}`)).first()).toBeVisible({
      timeout: 10_000,
    });
  }

  console.log(
    `[workstream-ui] monoiiChecked=${monoiiChecked} recapChecked=${recapChecked} flaggedCallup=${!!flagged}`
  );

  // ── W F/H — rikishi profile chips (conditional on seed output) ─────────
  const ironMan = Object.values(rikishiById).find(
    (r) => (r.consecutiveBashoFought ?? 0) >= IRON_MAN_BEAT_THRESHOLD
  );
  if (ironMan) {
    await gotoRikishi(page, ironMan.shikona);
    await expect(page.getByText("Iron Man Streak")).toBeVisible({ timeout: 15_000 });
  }
  const sibling = Object.values(rikishiById).find((r) => (r.siblingIds?.length ?? 0) > 0);
  if (sibling) {
    await gotoRikishi(page, sibling.shikona);
    await expect(page.getByText(/brother[s]? on the banzuke/i)).toBeVisible({
      timeout: 15_000,
    });
  }
  const schooled = Object.values(rikishiById).find((r) => r.schoolOrigin);
  if (schooled && !sibling) {
    await gotoRikishi(page, schooled.shikona);
    await expect(page.getByText("School")).toBeVisible({ timeout: 15_000 });
  }

  // Sanity: world still live at the end.
  const meta = await readLiveWorldMeta(page);
  expect(meta, "world still live").not.toBeNull();
});
