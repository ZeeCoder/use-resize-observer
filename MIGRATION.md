# Migrating to v10

v10 is a maintenance-focused major release: the toolchain was modernised, React
19 support was added (while keeping React 18), and several long-standing issues
were fixed. There are no new features, but there are a handful of breaking
changes. Most upgrades are a one-line import change.

## Breaking changes

### 1. The default export is gone — use the named export

`useResizeObserver` is now a **named** export.

```diff
-import useResizeObserver from "use-resize-observer";
+import { useResizeObserver } from "use-resize-observer";
```

Why: shipping a default export from a package that also has CommonJS output is a
persistent source of interop bugs (the TypeScript handbook recommends CommonJS
libraries avoid default exports). The named export has one, unambiguous shape in
both ESM and CJS.

### 2. The `use-resize-observer/polyfilled` entrypoint was removed

```diff
-import useResizeObserver from "use-resize-observer/polyfilled";
+import { useResizeObserver } from "use-resize-observer";
```

If you relied on the bundled polyfill, polyfill `ResizeObserver` yourself in your
app's entry point instead.

This way the app controls the polyfill, not the library.

```ts
import { ResizeObserver } from "@juggle/resize-observer";

if (!window.ResizeObserver) {
  window.ResizeObserver = ResizeObserver;
}
```

### 3. Zero runtime dependencies

The `@juggle/resize-observer` dependency was removed along with the polyfilled
entrypoint. The package now has **no runtime dependencies**.

### 4. `react-dom` is no longer a peer dependency

The library never imported `react-dom`; it was only ever a stray peer
dependency. If your package manager warned about it before, that warning is gone.
`react` remains the only peer dependency.

### 5. Supported React versions

The peer range is now `^18.2 || ^19`. React `16.8`–`17` are no longer supported.

### 6. Output targets ES2020; IE 11 is no longer supported

The build no longer transpiles down to ES5 / IE 11. If you must support very old
browsers, transpile `node_modules/use-resize-observer` as part of your own build.

## Behavioural fixes in v10

These are not breaking for correct usage, but the behaviour is more correct now:

- **Cross-window elements are observed.** An element from another window or a
  cross-document iframe used to be silently ignored (it failed an
  `instanceof Element` check). It is now observed correctly. (#100, #109, #113)
- **A measured size of `0` is reported as `0`.** Previously a genuine `0`
  dimension was reported as `undefined`, making it indistinguishable from
  "not measured yet". `undefined` now means only "not measured yet". (#103)
- **No more global type augmentation.** The library used to augment every
  consumer's global `ResizeObserverEntry` type via the shipped `.d.ts`. Modern
  `lib.dom` already declares those members, so the augmentation was removed.

## Not changing

- The runtime API (`useResizeObserver(options)` and its `{ ref, width, height }`
  response) is unchanged apart from the import.
- All options (`ref`, `box`, `onResize`, `round`) behave the same.
