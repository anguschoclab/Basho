const fs = require('fs');
let content = fs.readFileSync('electron/main.ts', 'utf-8');

const search = `  // Prevent dragging and dropping files from navigating the app
  mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    try {
      const parsedUrl = new URL(navigationUrl);

      // In production (file://), hash routing is used, so valid navigations won't trigger will-navigate.
      // We only allow will-navigate for the dev server origin to support HMR and dev reloads.
      const devServerUrlStr = process.env["ELECTRON_RENDERER_URL"];
      if (devServerUrlStr) {
        const devServerUrl = new URL(devServerUrlStr);
        if (parsedUrl.origin === devServerUrl.origin) {
          return; // Allow dev server navigation
        }
      }

      // Block all other navigations (including all file://) to prevent local file attacks
      event.preventDefault();
    } catch {
      // If URL parsing fails, prevent navigation to be safe
      event.preventDefault();
    }
  });

  // Open external links in the OS browser, not inside Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol === "https:") {
        shell
          .openExternal(parsedUrl.href)
          .catch((e) => console.error("Failed to open external URL:", e));
      } else {
        console.warn(\`Blocked attempt to open non-HTTPS URL: \${url}\`);
      }
    } catch (e) {
      console.error(\`Blocked attempt to open invalid URL: \${url}\`, e);
    }
    return { action: "deny" };
  });`;

const replace = `  // Security: Handle window creation, navigation, and webviews globally
  // This is now handled in app.on("web-contents-created") for all WebContents`;

if (content.includes(search)) {
  console.log("Search block found!");
} else {
  console.log("Search block not found!");
}
