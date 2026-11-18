import { test, expect } from "@playwright/test";
import {
  advanceToBasho,
  createNewGame,
  dismissOnboardingTour,
  driveBashoToRecap,
  resolveCrisisIfPresent,
  setWorldSeed,
} from "./helpers";

/**
 * JSA UI Spot Checks
 * ==================
 * Verifies the rule-alignment pass renders correctly in the real client:
 *   1. Roster surfaces show the raw rikishi count — no "/30" cap remains.
 *   2. Replay chrome shows no kensho on a juryo bout (makuuchi-only rule),
 *      and still shows the envelope badge on a kensho-carrying makuuchi bout.
 *   3. The post-basho recap renders the Committee Deliberations section
 *      seeded by banzuke/sansho committee feed events.
 */

const WORLD_SEED = "e2e-jsa-ui-spotcheck-v1";

interface BoutPick {
  east: string;
  west: string;
  envelopes: number;
  banners: number;
}

test("JSA UI spot checks: raw roster count, juryo replay has no kensho, recap shows committee deliberations", async ({
  page,
}) => {
  test.setTimeout(600_000);

  await page.goto("/");
  await expect(page.locator("h1").first()).toContainText(/Basho/i, { timeout: 60_000 });
  await setWorldSeed(page, WORLD_SEED);
  await createNewGame(page);
  await dismissOnboardingTour(page);

  // ── 1. Roster surfaces show a raw count, no cap denominator ─────────
  await page.goto("/stable");
  const lede = page.getByText(/^\d+ rikishi · /);
  await expect(lede.first()).toBeVisible({ timeout: 15_000 });
  // No "N/30" cap display anywhere on the stable page.
  await expect(page.getByText(/\/\s*30\b/)).toHaveCount(0);

  // ── 2. Reach the basho page and resolve the current day ─────────────
  await page.goto("/dashboard");
  await advanceToBasho(page);

  const dayResolved = () =>
    page
      .evaluate(() => {
        const w = (
          window as unknown as {
            __BASHO_WORLD__?: {
              currentBasho?: { day: number; matches: { day: number; result?: unknown }[] };
            };
          }
        ).__BASHO_WORLD__;
        const b = w?.currentBasho;
        if (!b) return false;
        const today = b.matches.filter((m) => m.day === b.day);
        return today.length > 0 && today.every((m) => m.result);
      })
      .catch(() => false);

  // Route to /basho. Prefer the Day pill (mid-basho worlds) or "Start
  // Basho" (basho-eve worlds) — the dashboard "Sim All" is the last resort
  // because it fast-sims the whole remainder instead of entering day 1.
  if (!page.url().includes("/basho")) {
    const dayPill = page.getByRole("button", { name: /^Day \d+/ }).first();
    const startBasho = page.getByRole("button", { name: /^Start Basho$/i }).first();
    const dashSimAll = page
      .getByRole("button", { name: /Automatically simulate the remainder/i })
      .first();
    if (await dayPill.isVisible().catch(() => false)) await dayPill.click();
    else if (await startBasho.isVisible().catch(() => false)) await startBasho.click();
    else if (await dashSimAll.isVisible().catch(() => false)) await dashSimAll.click();
    await page.waitForURL("**/basho", { timeout: 15_000 }).catch(() => {});
  }

  // Resolve the current day if it still has pending bouts. The day's sim
  // can pause on a blocking decision modal (crisis/storyline), so poll and
  // clear dialogs as they appear. A fully-simmed basho already shows the
  // last day's completed card list and skips straight through.
  const bashoDeadline = Date.now() + 240_000;
  while (!(await dayResolved()) && Date.now() < bashoDeadline) {
    if (await resolveCrisisIfPresent(page)) continue;
    const clicked = await page
      .evaluate(() => {
        for (const b of document.querySelectorAll("button")) {
          const t = (b.textContent ?? "").trim();
          if ((t === "Sim All" || t === "Sim Day") && !b.disabled) {
            b.click();
            return t;
          }
        }
        return null;
      })
      .catch(() => null);
    await page.waitForTimeout(clicked ? 1500 : 1000);
  }
  // Settle re-check: an auto-sim racing through days can make dayResolved
  // transiently true — give it a beat and confirm the day is still done.
  await page.waitForTimeout(2000);
  expect(await dayResolved(), "a completed match day is displayed").toBe(true);
  // A decision modal can still be open the moment the day resolves — clear
  // any queued dialogs before clicking through to a bout card.
  for (let i = 0; i < 3 && (await resolveCrisisIfPresent(page)); i++) {
    await page.waitForTimeout(500);
  }

  const pickBout = (where: string) =>
    page.evaluate((clause) => {
      const w = (
        window as unknown as {
          __BASHO_WORLD__?: {
            currentBasho?: {
              day: number;
              matches: {
                day: number;
                eastRikishiId: string;
                westRikishiId: string;
                result?: { kenshoEnvelopes?: number; kenshoBanners?: unknown[] } | null;
              }[];
            };
            rikishi?:
              | Map<string, { shikona?: string; division?: string }>
              | Record<string, { shikona?: string; division?: string }>;
          };
        }
      ).__BASHO_WORLD__;
      const b = w?.currentBasho;
      if (!b || !w?.rikishi) return null;
      const get =
        w.rikishi instanceof Map
          ? (id: string) => w.rikishi instanceof Map && w.rikishi.get(id)
          : (id: string) =>
              (w.rikishi as Record<string, { shikona?: string; division?: string }>)[id];
      for (const m of b.matches) {
        if (m.day !== b.day || !m.result) continue;
        const e = get(m.eastRikishiId);
        const wst = get(m.westRikishiId);
        if (!e?.shikona || !wst?.shikona) continue;
        const hit = new Function("e", "w", "m", `return (${clause});`)(
          e,
          wst,
          m
        ) as boolean;
        if (hit) {
          return {
            east: e.shikona,
            west: wst.shikona,
            envelopes: m.result.kenshoEnvelopes ?? 0,
            banners: m.result.kenshoBanners?.length ?? 0,
          } as BoutPick;
        }
      }
      return null;
    }, where);

  // ── 2a. Juryo bout: no kensho data recorded, no kensho in the chrome ─
  const juryoBout = await pickBout(`e.division === "juryo" && w.division === "juryo"`);
  expect(juryoBout, "a completed juryo bout exists on the resolved day").toBeTruthy();
  expect(juryoBout!.envelopes, "juryo bout carries no kensho envelopes").toBe(0);
  expect(juryoBout!.banners, "juryo bout carries no kensho banners").toBe(0);

  await page
    .getByRole("button", {
      name: `View bout detail: ${juryoBout!.east} vs ${juryoBout!.west}`,
    })
    .click();
  const dialog = page.getByRole("dialog").last();
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  // Let the replay run through finish/ceremony — the only phases where the
  // kensho overlay could appear — then assert it never does.
  await page.waitForTimeout(6000);
  await expect(dialog.getByText(/kensho/i)).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible({ timeout: 5_000 }).catch(() => {});

  // ── 2b. Positive control: a makuuchi bout carrying envelopes ─────────
  const makuuchiBout = await pickBout(
    `e.division === "makuuchi" && (m.result.kenshoEnvelopes ?? 0) > 0`
  );
  if (makuuchiBout) {
    await page
      .getByRole("button", {
        name: `View bout detail: ${makuuchiBout.east} vs ${makuuchiBout.west}`,
      })
      .click();
    const mkDialog = page.getByRole("dialog").last();
    await expect(mkDialog).toBeVisible({ timeout: 10_000 });
    // Badge appears during finish/ceremony phases — poll rather than wait.
    await expect(mkDialog.getByText(/\d+ kensho/i).first()).toBeVisible({ timeout: 30_000 });
    await page.keyboard.press("Escape");
  } else {
    console.log(
      "[spotcheck] seeded world produced no kensho banners on the resolved day — " +
        "positive chrome check skipped (envelope gating covered by unit tests)"
    );
  }

  // ── 3. Recap shows committee deliberation feed items ────────────────
  await driveBashoToRecap(page);
  expect(page.url()).toContain("/recap");

  // World-level proof the feed items exist for this basho.
  const committeeEventCount = await page.evaluate(() => {
    const w = (
      window as unknown as {
        __BASHO_WORLD__?: {
          events?: { log?: { category?: string; data?: { status?: string } }[] };
        };
      }
    ).__BASHO_WORLD__;
    return (w?.events?.log ?? []).filter(
      (e) =>
        e.category === "banzuke_committee" ||
        e.data?.status === "committee_deliberation" ||
        e.data?.status === "sansho_committee"
    ).length;
  });
  expect(committeeEventCount, "committee feed events were logged").toBeGreaterThan(0);

  await expect(page.getByText("Committee Deliberations")).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByText(/committee \(\d+[–-]\d+\)/i).first()
  ).toBeVisible({ timeout: 10_000 });
});
