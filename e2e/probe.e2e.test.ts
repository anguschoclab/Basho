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
    console.log(
      label,
      JSON.stringify({
        day: w?.dayIndexGlobal,
        week: w?.week,
        phase: w?.cyclePhase,
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
  }
});
