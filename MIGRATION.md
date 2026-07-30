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

`react-dom` is no longer listed as a peer dependency; `react` remains the only
one. If your package manager warned about a missing `react-dom` peer before, that
warning is now gone.

### 5. Supported React versions

You now need React 18.2 or newer (18.2+ or 19). Anything older is no longer supported.

### 6. Output targets ES2020; IE 11 is no longer supported

The build no longer transpiles down to ES5 / IE 11. If you must support very old
browsers, transpile `node_modules/use-resize-observer` as part of your own build.

## Not changing

- The runtime API (`useResizeObserver(options)` and its `{ ref, width, height }`
  response) is unchanged apart from the import.
- All options (`ref`, `box`, `onResize`, `round`) behave the same.
