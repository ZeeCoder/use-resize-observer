// This polyfilled version ensures ResizeObserver is available from the polyfill
// Re-export everything from the main module, but with the polyfill available
export * from "./index";
export { default } from "./index";

// Import and re-export ResizeObserver from the polyfill for global availability
import { ResizeObserver } from "@juggle/resize-observer";

// Make it available globally if needed
if (
  typeof globalThis !== "undefined" &&
  typeof (globalThis as typeof globalThis & { ResizeObserver?: unknown })
    .ResizeObserver === "undefined"
) {
  (
    globalThis as typeof globalThis & { ResizeObserver: typeof ResizeObserver }
  ).ResizeObserver = ResizeObserver;
}
