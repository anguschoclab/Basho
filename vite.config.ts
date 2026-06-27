import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

import path from "path";

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "@tanstack/react-router"],
          "vendor-recharts": ["recharts"],
          "vendor-framer": ["framer-motion"],
          "vendor-lucide": ["lucide-react"],
        },
      },
    },
  },
});
