import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // The default fork pool can time out while starting workers on this
    // Windows setup. Threads with a single reused isolate are stable.
    pool: "threads",
    maxWorkers: 1,
    isolate: false,
    clearMocks: true,
    restoreMocks: true,
  },
});
