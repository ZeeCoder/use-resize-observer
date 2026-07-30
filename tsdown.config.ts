import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  target: "es2020",
  dts: true,
  outDir: "dist",
  deps: { neverBundle: ["react"] },
});
