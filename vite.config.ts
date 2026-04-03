import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";

import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**", "**/.{idea,git,cache,output,temp}/**"],
    server: {
      deps: {
        inline: ["seedrandom"],
      },
    },
  },
});
