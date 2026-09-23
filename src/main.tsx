import "./index.css";
// sonner injects its stylesheet via an inline <style> at module load. Under the
// strict CSP (style-src without 'unsafe-inline') that injection is blocked in
// Electron dev; importing the packaged stylesheet keeps toasts styled via
// bundled CSP-allowed CSS regardless.
import "sonner/dist/styles.css";
import { initializeApp } from "./bootstrap";

// CSP nonce for runtime-injected <style> tags (e.g. react-remove-scroll used
// by Radix dialogs). Exposed by the Electron preload; undefined in the browser
// PWA where no CSP is enforced.
if (window.__CSP_NONCE__) {
  window.__webpack_nonce__ = window.__CSP_NONCE__;
}

initializeApp(document.getElementById("root"));
