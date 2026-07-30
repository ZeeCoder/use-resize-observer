// Prepares the static E2E page for the WebdriverIO/BrowserStack run.
//
//   1. Build + pack the library into a tarball at the repo root.
//   2. Install the E2E app, which depends on that tarball (via a `file:` link) plus
//      react/react-dom — so the page consumes the REAL published artifact, making
//      the E2E suite double as an API-surface/packaging test.
//   3. Bundle the page with esbuild into tests/e2e/app/bundle.js.
//
// The bundled page is then served by @wdio/static-server-service (see
// tests/e2e/wdio.conf.ts) and driven on real devices via BrowserStack.
import { execFileSync } from "node:child_process";
import { readdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const appDir = join(root, "tests", "e2e", "app");
// Stable filename the app's `file:../../../use-resize-observer.tgz` dependency
// points at (so it doesn't change per version).
const tarball = join(root, "use-resize-observer.tgz");
const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { stdio: "inherit", cwd: root, ...opts });

console.log("→ Building + packing the library");
run("pnpm", ["build"]);
for (const f of readdirSync(root)) {
  if (f.startsWith("use-resize-observer") && f.endsWith(".tgz")) rmSync(join(root, f));
}
run("pnpm", ["pack", "--pack-destination", root]);
const packed = readdirSync(root).find(
  (f) => f.startsWith("use-resize-observer-") && f.endsWith(".tgz"),
);
if (!packed) throw new Error("FAIL: no tarball produced by `pnpm pack`");
renameSync(join(root, packed), tarball);

console.log("\n→ Installing the E2E app (react + the packed tarball)");
// Fresh install each run: the tarball keeps a stable filename but changing
// content, so drop the previous install to guarantee the rebuilt tarball is used.
rmSync(join(appDir, "node_modules"), { recursive: true, force: true });
rmSync(join(appDir, "pnpm-lock.yaml"), { force: true });
// The app declares the tarball as a `file:` dependency. --ignore-workspace so it
// installs standalone, decoupled from the repo's pnpm workspace.
run("pnpm", ["install", "--ignore-workspace"], { cwd: appDir });

console.log("\n→ Bundling the page with esbuild");
run("pnpm", [
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
