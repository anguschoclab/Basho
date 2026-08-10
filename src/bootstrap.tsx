import { createRoot } from "react-dom/client";
import App from "./App";
import { SplashScreen } from "./components/SplashScreen";
import { error as logError } from "./engine/utils/Logger";

/**
 * Initializes the application:
 * 1. Renders a branded splash screen immediately (synchronous).
 * 2. Dynamically imports BardEngine and awaits loadDomains() so narrative resolve() works on first render.
 * 3. Replaces the splash with <App/>.
 * On loadDomains() rejection, logs the error and renders <App/> anyway
 * (narrative degrades gracefully to empty strings — never hard-hangs).
 */
export async function initializeApp(rootElement: HTMLElement | null): Promise<void> {
  if (!rootElement) {
    logError("Root element not found", "Main");
    return;
  }

  const root = createRoot(rootElement);

  // 1. Show splash immediately
  root.render(<SplashScreen />);

  // 2. Dynamically import BardEngine and await domain loading
  try {
    const { BardEngine } = await import("./engine/bard/BardEngine");
    await BardEngine.loadDomains();
  } catch (e) {
    logError(`Failed to load narrative domains: ${e}`, "Main");
  }

  // 3. Render the app (regardless of success/failure — graceful degradation)
  root.render(<App />);
}
