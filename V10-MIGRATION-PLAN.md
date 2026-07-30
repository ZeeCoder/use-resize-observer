# use-resize-observer v10 — Migration Plan

> Working document for the v10.0.0 rewrite. Delete before release (or add to `.gitignore`).
> Every fact marked **[verified]** was reproduced empirically on 2026-07-30 (Node v24.14.0). Do not re-litigate these.

## Context

`use-resize-observer` is a ~750-byte React hook that wraps a `ResizeObserver`. It currently:

- Builds with rollup 2 + babel (targeting **IE11**) into `dist/bundle.esm.js`, `dist/bundle.cjs.js`, plus a `polyfilled.js` root entry.
- Ships a **default export only**. CJS output is `module.exports = useResizeObserver` (rollup `exports: "default"`).
- Has **no `exports` field** in package.json — only `main`/`module`/`types`.
- Tests with jest (jsdom, `src/**/*.test.tsx`) + karma/webpack4/jasmine (real browsers, `tests/*.tsx`) + a codegen'd SSR hydration test + BrowserStack.
- Supports React `16.8.0 - 18`, and lists `react-dom` as a peer dependency (**it is never imported by `src/`**).
- Depends on `@juggle/resize-observer` (last published Aug 2022) for the polyfilled build.

**Goal:** v10.0.0 — modernise the toolchain, add React 19 support while keeping React 18, and fix long-standing issues.

---

## HARD RULES — read before writing any code

These are settled decisions. Each was investigated; do not "improve" on them.

1. **Do NOT adopt Vite+ / the `vp` CLI.** Use `tsdown`, `vitest`, `oxlint`, `oxfmt` as plain devDependencies. (Vite+ is MIT and free, but it is pre-1.0 and installs as a global binary that manages global Node — wrong fit for a single-package library.)
2. **Do NOT drop React 18 support.** The peer range becomes `^18.2 || ^19`. **[verified]** three one-line edits type-check clean under both `@types/react@18.3.31` and `@19.2.17`.
3. **Do NOT keep the default export.** v10 is named-export only. **[verified]** Adding a named export _alongside_ the default silently changes CJS output to `exports.default = ...`, making `require("use-resize-observer")()` throw `is not a function`. Rolldown also emits a `MIXED_EXPORTS` warning. Shipping both would require a hand-maintained hybrid `.d.cts` forever.
4. **Do NOT add a `"use client"` directive.** **[verified]** with a real `next build` (Next 16.2.12 + React 19.2.8) that it is a no-op for a hooks-only library — a Server Component still cannot call the hook (`Error: Attempted to call the default export ... from the server, but it's on the client`). Document the requirement in the README instead.
5. **Do NOT add the `client-only` package.** It would give a better build-time error, but costs a runtime dependency, and v10's selling point is **zero runtime dependencies**.
6. **Do NOT trust `attw` as a compatibility check.** **[verified]** `attw` reports "No problems found 🌟" for the broken export shape in rule 3. It validates types-vs-runtime agreement, not semver. A runtime smoke test against the packed tarball is **mandatory**.
7. **Do NOT use `moduleResolution: "node"`.** Removed in TypeScript 7 — hard error: `Option 'moduleResolution=node10' has been removed`. Both `tsconfig.json` and `tests/tsconfig.json` currently use it.
8. **Do NOT use TypeScript 7 for declaration emit.** Typecheck on 7 (the Go port) is fine — **[verified]** `src/` passes on 7.0.2. But tsdown warns `TypeScript 7.0 does not yet have a stable API and is experimental`, and TS 7 broke `@rollup/plugin-typescript` outright. **Pin `typescript@5.9.3` or `6.0.3` for the dts path.**
9. **Do NOT use Vitest Browser Mode for the BrowserStack leg.** There is no documented cloud-grid support, no public report of anyone doing it, and a known blocker ([vitest#9338](https://github.com/vitest-dev/vitest/issues/9338): browser mode calls `crypto.randomUUID()`, unavailable in insecure contexts). Use a **separate WebdriverIO suite** (decision: real mobile-device coverage must survive, which rules out Playwright — BrowserStack's Playwright support is desktop-only).
10. **Do NOT work on `master`.** `release.yml` publishes on push to `master`. Work on the **`alpha`** branch, which semantic-release treats as a prerelease branch by default (it already shipped `9.1.0-alpha.1` this way).
11. **Do NOT let semantic-release run without an explicit breaking-change marker.** See Phase 4, step 4.1.

---

## Reference numbers (baseline)

**[verified]** with `size-limit` v13 + `"ignore": ["react"]`, measured on the _current committed_ `dist/`:

| artifact                                         | gzipped   |
| ------------------------------------------------ | --------- |
| `dist/bundle.esm.js` (rollup+babel, IE11 target) | **813 B** |
| `dist/bundle.cjs.js` (rollup+babel, IE11 target) | **831 B** |
| tsdown/rolldown es2020 esm                       | ~799 B    |
| tsdown/rolldown es2020 cjs                       | ~870 B    |

**Important:** the limits in the existing `.size-limit.json` (648 B / 625 B) were produced by size-limit **v5**'s webpack pipeline. size-limit v13 reports ~813 B for the _identical file_. **The numbers are not comparable across the upgrade — re-baseline, don't chase a phantom regression.** Also: dropping IE11 buys essentially no size headroom (the code is mostly hook calls; babel's ES5 lowering gzips away). An increase is accepted for now.

## Current versions (as of 2026-07-30)

`react` 19.2.8 · `@types/react` 19.2.17 (18 line: 18.3.31) · `typescript` 7.0.2 (also 6.0.3, 5.9.3) · `vitest` 4.1.10 · `vitest-browser-react` 2.2.0 · `tsdown` 0.22.14 · `rolldown` 1.2.1 · `oxlint` 1.76.0 · `oxfmt` 0.61.0 · `size-limit` 13.0.2 · `semantic-release` 25.0.8 · `publint` 0.3.22 · `@arethetypeswrong/cli` 0.18.5 · `husky` 9.1.7 · `pnpm` 11.18.0

---

# PHASE 0 — Baseline and release safety

Do this first. It is cheap and it prevents an unrecoverable mistake.

**0.1 — Preserve the current build output.** The existing toolchain **cannot run on modern Node** — **[verified]** `npx size-limit` fails with `ERR_OSSL_EVP_UNSUPPORTED` (webpack 4 md4 hashes vs OpenSSL 3). `dist/` is gitignored, so once deleted it may be unrecoverable.

```bash
mkdir -p .baseline && cp dist/bundle.esm.js dist/bundle.cjs.js polyfilled.js dist/index.d.ts .baseline/ 2>/dev/null
```

**0.2 — Move to the `alpha` branch.**

```bash
git checkout -b alpha   # or: git checkout alpha
```

**0.3 — Replace `.releaserc` with `.releaserc.json`.** The current file is **[verified] invalid strict JSON** (trailing comma after the last plugin entry). It only parses because cosmiconfig's loader tolerates it — fragile across the semantic-release 19 → 25 upgrade.

```bash
git rm .releaserc
```

Create `.releaserc.json`:

```json
{
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    ["@semantic-release/changelog", { "changelogFile": "CHANGELOG.md" }],
    ["@semantic-release/npm", { "tarballDir": "release" }],
    ["@semantic-release/github", { "assets": "release/*.tgz" }],
    ["@semantic-release/git", { "assets": ["CHANGELOG.md", "package.json"] }]
  ]
}
```

Verify: `node -e 'JSON.parse(require("fs").readFileSync(".releaserc.json","utf8")); console.log("valid")'`

**0.4 — Update CI Node version.** All three workflows in `.github/workflows/` pin `node-version: 14`. Move to `22` (or `24`) and bump `actions/checkout@v3` → `v4`, `actions/setup-node@v3` → `v4`.

**Gate:** `.releaserc.json` parses; you are on `alpha`; `.baseline/` contains the old artifacts.

---

# PHASE 1 — Foundations (no behaviour change)

## 1.1 Switch to pnpm

```bash
pnpm import          # converts yarn.lock -> pnpm-lock.yaml
git rm yarn.lock
```

Replace every `yarn` reference in `package.json` scripts, `CONTRIBUTING.md`, and `README.md` with `pnpm`.

**Note:** `.github/workflows/size-limit.yml` uses `andresz1/size-limit-action@v1`, which **defaults to yarn and will break**. Either pass `package_manager: pnpm`, or drop the action and run `pnpm check:size` in the main test workflow.

## 1.2 Delete dead files

```bash
git rm .babelrc browserslist rollup.config.js karma.conf.js jest.config.js .eslintrc.js
git rm -r tests/ie tests/@types
git rm tests/utils/ie-polyfills.ts
git rm tests/ssr/create-ssr-test.js tests/ssr/ssr.template.tsx tests/ssr.test.tsx
rm -rf .cache          # stale 2021 dir, already gitignored
```

Also remove from `.gitignore`: `/polyfilled.js`, `/polyfilled.d.ts`.

## 1.3 Remove the polyfilled build and the runtime dependency

- Delete `@juggle/resize-observer` from `dependencies`. **The package now has zero runtime dependencies** — worth stating in the README.
- Remove `"polyfilled*"` from the `files` array.
- The `use-resize-observer/polyfilled` subpath is **gone**. Consumers importing it get a hard module-resolution error; this must be prominent in the migration notes.

> Note: rolldown _does_ have a working `@rollup/plugin-inject` equivalent (`transform.inject`, **[verified]** on this exact polyfill case) — so this removal is a maintenance decision, not a technical limitation. Do not reintroduce the polyfill.

## 1.4 Convert to a named export

In `src/index.ts`, replace the trailing `export default useResizeObserver;` with:

```ts
export { useResizeObserver };
```

Declare the function as `function useResizeObserver<T extends Element>(...)` (unchanged) — just export it by name. **There must be no `export default` anywhere in `src/`.**

## 1.5 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "es2020",
    "lib": ["es2020", "dom"],
    "module": "preserve",
    "moduleResolution": "bundler",
    "verbatimModuleSyntax": true,
    "strict": true,
    "noImplicitAny": true,
    "esModuleInterop": true,
    "jsx": "react-jsx",
    "declaration": true,
    "emitDeclarationOnly": true,
    "outDir": "dist"
  },
  "include": ["src"],
  "exclude": ["src/**/*.test.tsx"]
}
```

Changes from today: `target` es5 → es2020; `moduleResolution` `node` → `bundler` (rule 7); added `verbatimModuleSyntax`; removed the `typeRoots` jest/jasmine hack; `jsx` → `react-jsx`.

**`verbatimModuleSyntax` requires type-only imports to be marked.** `src/index.ts` currently does:

```ts
import {
  useEffect,
  useState,
  useRef,
  useMemo,
  RefObject,
  RefCallback,
  useCallback,
} from "react";
```

Split it:

```ts
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import type { RefObject, RefCallback } from "react";
```

Do the same in `src/utils/useResolvedElement.ts`.

## 1.6 tsdown

Create `tsdown.config.ts`:

```ts
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  target: "es2020",
  dts: true,
  outDir: "dist",
  deps: { neverBundle: ["react"] },
});
```

**Caveat:** tsdown warns that the older `external: ["react"]` option is deprecated in favour of `deps.neverBundle`, but the exact `deps` schema was **not verified**. If `deps.neverBundle` fails validation, fall back to `external: ["react"]` and check `pnpm tsdown --help`.

**Verify react is not bundled** (this is the failure that would silently 40x the bundle):

```bash
pnpm build && grep -c 'from"react"\|require("react")' dist/index.mjs dist/index.cjs
# each must be >= 1 (react is imported, not inlined)
grep -c 'useState' dist/index.mjs   # must be 0 — react internals must NOT appear
```

Also **check the actual emitted filenames** after the first build and make the `exports` map below match them exactly.

## 1.7 package.json

```json
{
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.cts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.mts",
        "default": "./dist/index.mjs"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    },
    "./package.json": "./package.json"
  },
  "sideEffects": false,
  "engines": { "node": ">=20" },
  "files": ["dist", "README.md", "LICENSE", "CHANGELOG*", "CONTRIBUTING.md"],
  "peerDependencies": {
    "react": "^18.2.0 || ^19.0.0"
  },
  "scripts": {
    "build": "tsdown",
    "prepack": "pnpm build"
  }
}
```

Rules being applied (all from publint / Node docs):

- **`types` must be the FIRST key** in each condition block — TypeScript stops at the first match.
- **`default` must be LAST** — it is the fallback.
- Top-level `main`/`module`/`types` are kept for node10-style resolvers; `types` points at `.d.cts` to match `main` (CJS).
- `react-dom` is **removed** from `peerDependencies` — `src/` never imports it. Keep it as a devDependency for tests.
- **`prepublish` → `prepack`.** npm deprecated `prepublish`; it fires on install/ci, **not on publish**, so the current setup does not guarantee a fresh build in the tarball.

## 1.8 Packaging validation — all three are required

Add devDependencies `publint` and `@arethetypeswrong/cli`, then:

```bash
pnpm build
pnpm publint
pnpm attw --pack .
```

Both must be clean. **Then the runtime smoke test** (rule 6 — `attw` will not catch an export-shape break):

Create `scripts/smoke.cjs`:

```js
const m = require("use-resize-observer");
if (typeof m.useResizeObserver !== "function")
  throw new Error("FAIL: CJS named export missing");
if ("default" in m)
  throw new Error("FAIL: default export should not exist in v10");
console.log("CJS smoke OK");
```

Create `scripts/smoke.mjs`:

```js
import { useResizeObserver } from "use-resize-observer";
import * as ns from "use-resize-observer";
if (typeof useResizeObserver !== "function")
  throw new Error("FAIL: ESM named export missing");
if ("default" in ns)
  throw new Error("FAIL: default export should not exist in v10");
console.log("ESM smoke OK");
```

Run them **against the packed tarball installed into a temp directory** — not against `dist/` directly, or you are not testing the `exports` map:

```bash
pnpm pack
D=$(mktemp -d) && cp use-resize-observer-*.tgz "$D/" && cd "$D" \
  && npm init -y >/dev/null && npm i ./use-resize-observer-*.tgz react >/dev/null \
  && cp "$OLDPWD"/scripts/smoke.* . && node smoke.cjs && node smoke.mjs
```

Wire all of this into the `test` script.

## 1.9 Lint, format, hooks

- `oxlint` + `oxfmt` replace eslint + prettier. Delete `.eslintrc.js`.
- **Confirm oxlint covers the `react-hooks` rules** (`react-hooks/exhaustive-deps` in particular) — that is the one lint rule that genuinely matters for this repo. If it does not, keep `eslint-plugin-react-hooks` alongside oxlint rather than losing the check.
- Upgrade `husky` 8 → 9 (**the install command changed**: `husky install` → `husky`; the `prepare` script and `.husky/` layout both change — follow husky's v9 migration guide) and `lint-staged` 13 → latest. Point `lint-staged` at `oxfmt --write`.
- **Add an `oxfmt --check` pass to CI** so formatting is enforced independently of the git hook.

## 1.10 size-limit

Upgrade to v13. Rewrite `.size-limit.json` for the new filenames, **add `"ignore": ["react"]`** (today it measures "with all dependencies"), and remove the `polyfilled.js` entry. Set the limits to the newly measured values plus a small margin.

**Gate for Phase 1:** `pnpm build` succeeds; react is external; `publint` clean; `attw --pack` clean in all four resolution modes; both smoke tests pass against the packed tarball; size recorded.

---

# PHASE 2 — Test migration

> This is the bulk of the work (~2,000 lines), not the build config. Budget accordingly.

## 2.1 SPIKE FIRST — do not port tests until this is settled

Prove the **WebdriverIO + BrowserStack** transport works with a trivial placeholder test, before porting anything. If this cannot be made to work, the whole E2E strategy changes and you will have wasted the porting effort.

Setup: `@wdio/cli`, `@wdio/browserstack-service`, `wdio.conf.ts`. The service handles the BrowserStackLocal tunnel (`browserstackLocal: true`). Credentials are already in CI as `BS_USERNAME` / `BS_ACCESS_KEY`.

Port the capability matrix from the old `karma.conf.js` (it is the reference for what must keep working), **dropping the `legacy` group entirely** (IE 11, iOS 11):

- Desktop: Chrome / Firefox / Edge / Safari latest, **Safari 13.0 on OS X Catalina** (has ResizeObserver but only content-box — a genuine divergence worth keeping).
- Real mobile: **iPhone 11 / iOS 14**, **Samsung Galaxy Note 10 / Android 9** (these are why Playwright was rejected).

The E2E suite should load a **static page that imports the packed tarball** — this makes it double as an artifact/API-surface test, which also addresses the "did we accidentally change the exported types between versions" concern.

**Note:** `devicePixelContentBoxSize` is unsupported in Safari. Keep a targeted test for it.

## 2.2 Vitest for everything else

`vitest.config.ts` using `test.projects` (the documented way to run node and browser tests from one config):

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        test: {
          name: "node",
          environment: "node",
          include: ["tests/node/**/*.test.ts?(x)"],
        },
      },
      {
        test: {
          name: "browser",
          include: ["tests/browser/**/*.test.ts?(x)"],
          setupFiles: ["./tests/setup.ts"], // contains: import "vitest-browser-react"
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [
              { browser: "chromium" },
              { browser: "firefox" },
              { browser: "webkit" },
            ],
          },
        },
      },
    ],
  },
});
```

Notes for this migration:

- **Vitest 4 changed `provider` from a string to a function.** `provider: 'playwright'` is v3 syntax; v4+ is `provider: playwright()` from `@vitest/browser-playwright`.
- **`@testing-library/react` is fully replaced** by `vitest-browser-react`. Its `render` is **async**: `const screen = await render(<Test />)`.
- **Do NOT install `@testing-library/jest-dom`.** Vitest browser mode ships forked jest-dom matchers with built-in retry-ability. (You _would_ still need it for jsdom-mode tests — but there are none here.)
- Playwright's `webkit` is **not** real Safari. It is a good regression signal; real Safari coverage comes from the WebdriverIO suite.

## 2.3 Consolidate the test suites

`tests/basic.tsx` (402 lines) and `tests/testing-lib.tsx` (723 lines) are **both** RTL suites in real browsers with heavy overlap. `CONTRIBUTING.md` already says of the former: _"they're fairly old and much harder to add new ones to."_ **Merge into one suite while porting — do not port then consolidate.**

## 2.4 Rewrite the SSR test without codegen

The current design renders to a string in Node, then string-substitutes it into a generated `tests/ssr.test.tsx`. Delete all of that. `react-dom/server.browser`'s `renderToString` runs in the browser, so one self-contained browser test can render _and_ hydrate. Split as:

- `tests/node/ssr.test.tsx` — assert the `renderToString` markup.
- `tests/browser/hydration.test.tsx` — render to string, inject, `hydrateRoot`, assert the default→measured transition.

## 2.5 React version matrix

- **Type-level (cheap, highest value):** typecheck a small consumer fixture against `@types/react@18` **and** `@19`. The ref types are the only thing that diverged, so this is the check that matters and it is near-instant.
- **Runtime:** run the Vitest component tests against React 18 and 19 (pnpm overrides or a CI matrix).
- **BrowserStack leg: React 19 only.** Doubling a real-device cloud matrix to catch a React-version bug the component tests already cover is spend without signal.

**Watch out:** under React 19 StrictMode, ref callbacks appear to run an extra dev-only `node → null → node` cycle that React 18 did not reliably do. The `assertRenderCount` / `assertMeasuredSize` assertions in the old `testing-lib.tsx` are exactly what would go red. This is _unverified_ (sourced from a stale-closed React issue) — confirm empirically and do not mistake it for a library bug.

**Gate for Phase 2:** full suite green on React 18 and 19; WebdriverIO/BrowserStack suite green in CI.

---

# PHASE 3 — React 19 support and behavioural fixes

Do these as **separate commits with tests green between each**.

## 3.1 The three type edits

**[verified]** these are the _only_ changes needed, and all three type-check clean under `@types/react` 18 **and** 19.

**(a)** `src/index.ts` — the public ref option (this is [issue #117](https://github.com/ZeeCoder/use-resize-observer/issues/117)):

```ts
// before
ref?: RefObject<T> | T | null | undefined;
// after
ref?: RefObject<T | null> | T | null | undefined;
```

Why: React 19 changed `RefObject<T>` from `{ readonly current: T | null }` to `{ current: T }`, and `useRef<T>(null)` now returns `RefObject<T | null>`. `RefObject<T | null>` is the cross-version idiom — under React 18 it collapses to the identical shape.

**(b)** `src/utils/useResolvedElement.ts` — same change on the internal signature:

```ts
// before
refOrElement?: T | RefObject<T> | null
// after
refOrElement?: T | RefObject<T | null> | null
```

**(c)** `src/index.ts` — the zero-argument `useRef` (React 19 removed that overload; **[verified]** this is the single error when compiling current `src/` against `@types/react@19`):

```ts
// before
const resizeObserverRef = useRef<{ box?: ...; round?: ...; instance: ResizeObserver }>();
// after
const resizeObserverRef = useRef<undefined | { box?: ...; round?: ...; instance: ResizeObserver }>(undefined);
```

## 3.2 Delete the global type augmentation

`src/index.ts` contains:

```ts
declare global {
  interface ResizeObserverEntry {
    readonly devicePixelContentBoxSize: ReadonlyArray<ResizeObserverSize>;
  }
}
```

This ends up in the shipped `.d.ts`, meaning **the library augments every consumer's global scope**. **[verified]** modern `lib.dom.d.ts` already declares both `devicePixelContentBoxSize` and `ResizeObserverBoxOptions`. **Delete the whole `declare global` block.**

Keep the hand-rolled `ResizeObserverBoxOptions` union (it works without `lib.dom`), but the adjacent comment justifying it cites TS 4.2.2 — update or drop the comment.

## 3.3 Cross-window fix (issues #109, #113, #100)

`src/utils/useResolvedElement.ts` uses `refOrElement instanceof Element` to distinguish an element from a ref object. An element from **another window or cross-document iframe fails that check**, gets treated as a RefObject, and is silently never observed.

```ts
// before
const element: T | null = cbElement
  ? cbElement
  : refOrElement
  ? refOrElement instanceof Element
    ? refOrElement
    : refOrElement.current
  : null;

// after — duck-type, so elements from other windows work
const element: T | null = cbElement
  ? cbElement
  : refOrElement
  ? "current" in refOrElement
    ? refOrElement.current
    : refOrElement
  : null;
```

This should be **smaller** than `instanceof Element`. Separately, `new ResizeObserver(...)` in `src/index.ts` uses the current window's constructor; for full cross-window correctness it needs the element's window:

```ts
const RO = element.ownerDocument.defaultView?.ResizeObserver ?? ResizeObserver;
```

That one **costs** bytes. Measure the pair together and decide.

## 3.4 Remaining issues

Address individually, each with a test: [#103](https://github.com/ZeeCoder/use-resize-observer/pull/103) (undefined vs 0), [#101](https://github.com/ZeeCoder/use-resize-observer/issues/101) (externalise `useResolvedElement`), [#107](https://github.com/ZeeCoder/use-resize-observer/issues/107) (element coordinates). #117 is already covered by 3.1(a).

**Gate for Phase 3:** re-run size-limit and record the final numbers.

---

# PHASE 4 — Release

## 4.1 The breaking-change marker — CRITICAL

**[verified]** the git history contains **no** `BREAKING CHANGE:` footer and no `!` marker anywhere — it is all bare `feat:`/`fix:`/`chore:`. With the default commit-analyzer, this entire rewrite would publish as a **minor**, and you cannot unpublish.

At least one commit must carry the marker. Use a single `BREAKING CHANGE:` footer with a multi-line body (multiple separate footers of the same token may not all parse):

```
feat!: modernise toolchain and add React 19 support

BREAKING CHANGE: The default export has been removed. Use the named export instead:
  import { useResizeObserver } from "use-resize-observer";
The "use-resize-observer/polyfilled" entrypoint has been removed, along with the
@juggle/resize-observer dependency. The package now has zero runtime dependencies.
React 16.8 - 17 are no longer supported; the peer range is now ^18.2 || ^19.
react-dom is no longer a peer dependency.
Output now targets ES2020; IE 11 is no longer supported.
```

**Verify before merging:**

```bash
npx semantic-release --dry-run
```

Confirm it reports the **next release as `10.0.0`**. If it says 9.2.0, the marker did not parse — fix it before going near `master`.

## 4.2 Documentation

- **`README.md`** — the default→named import in _every_ example; remove the "Ships a polyfilled version" highlight and the whole "Transpilation / Polyfilling" section; remove IE 11 from the tested-browsers list; update the "Tiny: 648B" claim; `yarn` → `pnpm`; add "zero runtime dependencies"; add a note that **App Router consumers must put `"use client"` on the calling component** (this is the only mitigation for what would otherwise be an opaque `TypeError: (0 , c.useRef) is not a function` at prerender — Next.js deliberately skips its friendly hook error for `node_modules`). Fix the `yarn add use-resize-observer --dev` bug — it is a runtime dependency, not a dev one.
- **`CONTRIBUTING.md`** — yarn → pnpm; replace the karma watch-mode instructions; update the "add new tests to `test/testing-lib.tsx`" guidance to point at the consolidated suite.
- **`MIGRATION.md`** — new. Five breaking changes deserve more than a changelog line.
- **The 4+ CodeSandbox demos linked from the README** are external and will all break on the named export. Easy to forget.

## 4.3 Ship the prerelease first

Pushing to `alpha` publishes `10.0.0-alpha.N` under the `alpha` dist-tag. Validate against a real consumer app, then merge `alpha` → `master` to promote to `latest`.

Consider also publishing a final **9.x** whose README/changelog announces the removal of `/polyfilled`, so that failure is not the first warning consumers get.

## 4.4 Add npm provenance

Publish with `--provenance` from GitHub Actions.

## 4.5 Prevent the next three-year gap

Add **Renovate or Dependabot**. The root cause of this whole rewrite was unattended dependencies, not any single tool choice.

---

## Summary of breaking changes for v10.0.0

1. Default export removed → named export `useResizeObserver`.
2. `use-resize-observer/polyfilled` entrypoint removed.
3. `@juggle/resize-observer` runtime dependency removed.
4. `react-dom` peer dependency removed.
5. React 16.8–17 support dropped (peer range now `^18.2 || ^19`).
6. Output targets ES2020; IE 11 no longer supported.
