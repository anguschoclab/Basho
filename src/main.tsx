import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("[Main] Application startup initiated");
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("[Main] Root element not found!");
} else {
  console.log("[Main] Root element found, rendering App");
  createRoot(rootElement).render(<App />);
}
