import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  plugins: [react()],
  // Ensure a single React instance across `react`, `react-dom/client` and
  // `react-dom/server.browser` so the hydration test's `renderToString` shares
  // the same internal hook dispatcher (otherwise `useRef` reads a null dispatcher).
  resolve: { dedupe: ["react", "react-dom"] },
  optimizeDeps: { include: ["react-dom/server.browser"] },
  test: {
    projects: [
      {
        plugins: [react()],
        test: {
          name: "node",
          environment: "node",
          include: ["tests/node/**/*.test.ts?(x)"],
        },
      },
      {
        plugins: [react()],
        test: {
          name: "browser",
          include: ["tests/browser/**/*.test.ts?(x)"],
          setupFiles: ["./tests/setup.ts"],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [
              {
                browser: "chromium",
                // Stability flags for headed runs on Linux: avoid renderer
                // "Page crashed" from a small /dev/shm and from flaky GPU drivers.
                // Harmless (and often already implied) for headless / CI runs.
                launchOptions: { args: ["--disable-dev-shm-usage", "--disable-gpu"] },
              },
              { browser: "firefox" },
              { browser: "webkit" },
            ],
          },
        },
      },
    ],
  },
});
