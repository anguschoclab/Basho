import "./index.css";
import { initializeApp } from "./bootstrap";

// CSP nonce for runtime-injected <style> tags (e.g. react-remove-scroll used
// by Radix dialogs). Exposed by the Electron preload; undefined in the browser
// PWA where no CSP is enforced.
if (window.__CSP_NONCE__) {
  window.__webpack_nonce__ = window.__CSP_NONCE__;
}

initializeApp(document.getElementById("root"));
