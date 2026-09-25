import { test, expect } from "@playwright/test";

test("probe: autosave debug after seed sync", async ({ page }) => {
  test.setTimeout(120_000);

  page.on("console", (msg) => {
    const t = msg.text();
    if (t.includes("AUTOSAVE-DEBUG") || msg.type() === "error") {
      console.log(`PAGE [${msg.type()}] ${t.slice(0, 300)}`);
    }
  });
  page.on("pageerror", (err) => console.log(`[pageerror] ${String(err).slice(0, 300)}`));

  await page.goto("/");
  await expect(page.locator("h1").first()).toContainText(/Basho/i, { timeout: 60_000 });
  await page.waitForTimeout(3000);

  await page.getByRole("button", { name: /Manual Seed/i }).click();
  await page.getByPlaceholder(/Enter specific world seed/i).fill("e2e-probe-seed");
  await page.getByRole("button", { name: /Sync Seed/i }).click();

  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(4000);
    const seed = await page.evaluate(() => {
      const raw = localStorage.getItem("basho_save_autosave");
      try {
        return raw ? JSON.parse(raw)?.world?.seed : null;
      } catch {
        return "PARSE_ERR";
      }
    });
    console.log(`t+${(i + 1) * 4}s saveSeed=${seed}`);
    if (seed === "e2e-probe-seed") break;
  }
});
