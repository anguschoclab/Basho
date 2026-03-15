const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Navigate to app
  try {
      await page.goto('http://localhost:5173');
      await page.waitForTimeout(2000); // let UI mount
      await page.screenshot({ path: 'verify-ui.png' });

      console.log('UI Verification Screenshot Taken on port 5173');
  } catch(e) {
      console.error(e);
  } finally {
      await browser.close();
  }
})();
