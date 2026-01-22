// This polyfilled version ensures ResizeObserver is available from the polyfill
// Re-export everything from the main module, but with the polyfill available
export * from "./index";
export { default } from "./index";

// Import and re-export ResizeObserver from the polyfill for global availability
import { ResizeObserver } from "@juggle/resize-observer";
// Make it available globally if needed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (typeof globalThis !== "undefined" && !(globalThis as any).ResizeObserver) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).ResizeObserver = ResizeObserver;
}
