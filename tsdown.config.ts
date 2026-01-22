import { defineConfig } from "tsdown";

export default defineConfig([
  // Main build: CJS + ESM + declarations
  {
    entry: "src/index.ts",
    format: ["cjs", "esm"],
    dts: {
      resolve: true,
    },
    outDir: "dist",
    external: ["react"],
  },
  // Polyfilled build: CJS only + declarations
  {
    entry: "src/polyfilled.ts",
    format: ["cjs"],
    dts: {
      resolve: true,
    },
    outDir: ".",
    clean: false, // Cannot clean root directory
    external: ["react", "@juggle/resize-observer"],
  },
]);
