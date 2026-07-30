// Prepares the static E2E page for the WebdriverIO/BrowserStack run.
//
//   1. Build + pack the library into a tarball at the repo root.
//   2. Install that tarball (plus react/react-dom) into tests/e2e/app, so the
//      page consumes the REAL published artifact — making the E2E suite double
//      as an API-surface/packaging test.
//   3. Bundle the page with esbuild into tests/e2e/app/bundle.js.
//
// The bundled page is then served by @wdio/static-server-service (see
// tests/e2e/wdio.conf.ts) and driven on real devices via BrowserStack.
import { execFileSync } from "node:child_process";
import { readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const appDir = join(root, "tests", "e2e", "app");
const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { stdio: "inherit", cwd: root, ...opts });
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

console.log("→ Building + packing the library");
run(pnpm, ["build"]);
for (const f of readdirSync(root)) {
  if (f.startsWith("use-resize-observer-") && f.endsWith(".tgz")) {
    rmSync(join(root, f));
  }
}
run(pnpm, ["pack"]);
const tgz = readdirSync(root).find(
  (f) => f.startsWith("use-resize-observer-") && f.endsWith(".tgz"),
);
if (!tgz) throw new Error("FAIL: no tarball produced by `pnpm pack`");

console.log(`\n→ Installing dependencies + ${tgz} into the E2E app`);
// npm (not pnpm) gives a self-contained node_modules the bundler can resolve
// without workspace linking. Install react/react-dom from package.json first,
// then the tarball with --no-save so the app's package.json stays version-free.
run(npm, ["install", "--no-audit", "--no-fund", "--no-package-lock", "--loglevel=error"], {
  cwd: appDir,
});
run(
  npm,
  [
    "install",
    "--no-audit",
    "--no-fund",
    "--no-save",
    "--no-package-lock",
    "--loglevel=error",
    join(root, tgz),
  ],
  { cwd: appDir },
);

console.log("\n→ Bundling the page with esbuild");
run(pnpm, [
  "exec",
  "esbuild",
  join(appDir, "index.tsx"),
  "--bundle",
  "--format=iife",
  "--jsx=automatic",
  '--define:process.env.NODE_ENV="production"',
  `--outfile=${join(appDir, "bundle.js")}`,
]);

console.log("\n✓ E2E page ready at tests/e2e/app/index.html");
