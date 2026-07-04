import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { error } from "./engine/utils/Logger";

const rootElement = document.getElementById("root");
if (!rootElement) {
  error("Root element not found", "Main");
} else {
  createRoot(rootElement).render(<App />);
}
