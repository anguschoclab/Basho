import { test, expect } from "@playwright/test";
import {
  createNewGame,
  dismissOnboardingTour,
  setWorldSeed,
  waitForAutosaveWorld,
  readAutosaveWorld,
} from "./helpers";

test("probe: worker messages around Week advance", async ({ page }) => {
  test.setTimeout(300_000);

  await page.addInitScript(() => {
    // Wrap Worker to expose instances + sniff outbound messages.
    const OrigWorker = window.Worker;
    (window as any).__workerEvents = [] as any[];
    // @ts-ignore
    window.Worker = class extends OrigWorker {
      constructor(url: any, opts: any) {
        super(url, opts);
        this.addEventListener("message", (e: MessageEvent) => {
          const d = e.data ?? {};
          if (d.type !== "PROGRESS") {
            (window as any).__workerEvents.push({
              t: d.type,
              msg: typeof d.message === "string" ? d.message.slice(0, 300) : "",
              v: d.version,
            });
          }
        });
        this.addEventListener("error", (e: ErrorEvent) => {
          (window as any).__workerEvents.push({ t: "WORKER_ERROR", msg: String(e.message) });
        });
      }
    };
  });

  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.text().includes("dropped")) {
      console.log(`PAGE [${msg.type()}] ${msg.text().slice(0, 250)}`);
    }
  });
  page.on("pageerror", (err) => console.log(`PAGEERROR: ${String(err).slice(0, 300)}`));

  await page.goto("/");
  await expect(page.locator("h1").first()).toContainText(/Basho/i, { timeout: 60_000 });
  await setWorldSeed(page, "e2e-basho-lifecycle-v1");
  await createNewGame(page);
  await dismissOnboardingTour(page);

  const dump = async (label: string) => {
    const events = await page.evaluate(() => (window as any).__workerEvents);
    const w = await readAutosaveWorld(page);
    const calText = await page
      .getByText(/Week \d+|Day \d+/i)
      .first()
      .innerText()
      .catch(() => "?");
    const dialogOpen = await page
      .locator('[role="dialog"][data-state="open"]')
      .first()
      .isVisible()
      .catch(() => false);
    const dialogText = dialogOpen
      ? await page
          .locator('[role="dialog"][data-state="open"]')
          .first()
          .innerText()
          .catch(() => "?")
      : null;
    console.log(
      label,
      JSON.stringify({
        url: page.url().replace(/.*localhost:\d+/, ""),
        calText,
        day: w?.dayIndexGlobal,
        week: w?.week,
        phase: w?.cyclePhase,
        bashoDay: w?.currentBasho?.day,
        pendingCrisis: w?.pendingCrisis ? { id: w.pendingCrisis.id, type: w.pendingCrisis.type } : null,
        reqDecisions: (w?.pendingDecisions ?? []).filter((d: any) => d.required).length,
        dialog: dialogText ? dialogText.slice(0, 120) : null,
        eventsTail: (events ?? []).slice(-8),
      })
    );
    await page.evaluate(() => ((window as any).__workerEvents.length = 0));
  };

  await waitForAutosaveWorld(page, "(w) => !!w.playerHeyaId", 60_000).catch(() => {});
  await dump("AFTER WIZARD:");

  const weekBtn = page
    .getByRole("button", { name: /Progress simulation by one full week/i })
    .first();
  await expect(weekBtn).toBeVisible({ timeout: 30_000 });
  await weekBtn.click();

  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(5000);
    await dump(`T+${(i + 1) * 5}s:`);
    // resolve any crisis modal and click again
    const dialog = page.locator('[role="dialog"][data-state="open"]').first();
    if (await dialog.isVisible().catch(() => false)) {
      const btn = dialog.getByRole("button").first();
      await btn.click().catch(() => {});
      console.log("resolved dialog");
    }
    if (await weekBtn.isVisible().catch(() => false)) {
      await weekBtn.click().catch(() => console.log("week click blocked"));
    }
  }
});
