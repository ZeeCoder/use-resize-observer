# CONTRIBUTING

When contributing to this project, please keep in mind the following:

- The hook must remain as simple as possible. It's only a low-level "proxy" to a
  ResizeObserver instance aiming for correctness, which should not add or polyfill
  features on top. All that can be done by composing hooks.
- All features must be covered with test(s).

It's also best to first submit an issue, before creating a pull request so that
the required feature can be discussed, as well as the actual implementation.

## Toolchain

- Package manager: **pnpm** (run `pnpm install`).
- Build: **tsdown** (`pnpm build`) → ESM + CJS + type declarations in `dist/`.
- Component tests: **Vitest** browser mode via Playwright (Chromium / Firefox /
  WebKit). Node/SSR tests run in the `node` project.
- Real-device tests: a **WebdriverIO + BrowserStack** suite under `tests/e2e`.
- Lint / format: **oxlint** and **oxfmt**.

## Adding a New Feature

- Open an issue, so that a discussion can take place.
- Once discussed, add the changes to `src/index.ts` (or `src/utils/`), making
  sure the TS types are respected as well.
- Add new test(s) to cover the feature. The consolidated hook suite lives in
  `tests/browser/useResizeObserver.test.tsx`; element-resolution unit tests live
  in `tests/browser/useResolvedElement.test.tsx`.
- Run the checks locally (see below).

## Running the tests

```sh
pnpm build          # produce dist/ (component tests import from src, but the build must pass)
pnpm check:types    # tsc for src, tests, and the e2e config
pnpm check:lint     # oxlint
pnpm check:format   # oxfmt --check
pnpm check:size     # size-limit
pnpm test:node      # SSR / node tests
pnpm test:browser   # component + hydration tests in real browsers (installs Playwright browsers)
pnpm test:pack      # publint + attw + a runtime smoke test against the packed tarball
```

`pnpm test` runs the locally-runnable subset (build, checks, node tests, packaging).

The first `pnpm test:browser` run needs the Playwright browsers:

```sh
pnpm exec playwright install --with-deps chromium firefox webkit
```

### Watching tests in a real (headed) browser

To watch the tests run in a real browser window, override the headless default —
but do it for **one engine at a time**. Launching all three headed browsers at
once overwhelms the browser pool and a session's page can crash (you'll see an
`[birpc] rpc is closed` / `Page crashed` unhandled error and a chunk of tests
silently won't run). Headless is unaffected, which is why CI runs headless.

```sh
pnpm exec vitest --project 'browser (chromium)' --browser.headless=false
# or 'browser (firefox)' / 'browser (webkit)'
```

## Real-device tests (BrowserStack)

The `tests/e2e` suite serves a static page that consumes the **packed tarball**
and drives it on real desktop/mobile browsers via BrowserStack. It requires the
`BS_USERNAME` and `BS_ACCESS_KEY` env vars (exposed to the runner as
`BROWSERSTACK_USERNAME` / `BROWSERSTACK_ACCESS_KEY`):

```sh
BROWSERSTACK_USERNAME=... BROWSERSTACK_ACCESS_KEY=... pnpm test:e2e
```

`pnpm test:e2e` builds + packs the library, installs the tarball into
`tests/e2e/app`, bundles the page, and then runs WebdriverIO against BrowserStack.
