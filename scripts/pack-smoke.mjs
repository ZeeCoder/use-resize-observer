// Packaging validation for v10 (migration plan §1.8).
//
// Runs the three required checks in order:
//   1. publint          — package.json / exports sanity
//   2. attw --pack .    — types-vs-runtime resolution across module modes
//   3. runtime smoke     — install the PACKED TARBALL into a temp project and
//                          assert the real export shape (attw does NOT catch an
//                          export-shape break — see plan rule 6)
//
// The smoke step deliberately tests the tarball via its `exports` map, not the
// `dist/` folder directly.
import { execFileSync } from "node:child_process";
import { mkdtempSync, copyFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { stdio: "inherit", cwd: root, shell: false, ...opts });

const pnpm = "pnpm";

console.log("→ Building");
run(pnpm, ["build"]);

console.log("\n→ publint");
run(pnpm, ["exec", "publint", "--strict"]);

console.log("\n→ attw --pack");
run(pnpm, ["exec", "attw", "--pack", "."]);

console.log("\n→ packing tarball");
run(pnpm, ["pack", "--pack-destination", root]);
const tgz = readdirSync(root).find(
  (f) => f.startsWith("use-resize-observer-") && f.endsWith(".tgz"),
);
if (!tgz) throw new Error("FAIL: no tarball produced by `pnpm pack`");

const dir = mkdtempSync(join(tmpdir(), "urs-smoke-"));
console.log(`\n→ smoke-testing packed tarball in ${dir}`);
writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "smoke", private: true }));
// Standalone temp project (outside the repo); --ignore-workspace keeps it isolated.
run(pnpm, ["add", "--ignore-workspace", join(root, tgz), "react"], { cwd: dir });
copyFileSync(join(root, "scripts", "smoke.cjs"), join(dir, "smoke.cjs"));
copyFileSync(join(root, "scripts", "smoke.mjs"), join(dir, "smoke.mjs"));
run("node", ["smoke.cjs"], { cwd: dir });
run("node", ["smoke.mjs"], { cwd: dir });

console.log("\n✓ Packaging validation passed");
