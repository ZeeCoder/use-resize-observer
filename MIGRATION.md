# Migrating to v10

v10 is a maintenance-focused major release: the toolchain was modernised, React
19 support was added (while keeping React 18), and several long-standing issues
were fixed. There are a handful of breaking changes, but most upgrades are a
one-line import change.

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

## Worth checking: the `onResize` payload gained an `entry`

The `onResize` callback now receives the raw `ResizeObserverEntry` alongside the
measured size. This is additive, so handlers that destructure what they need keep
working unchanged:

```ts
onResize: ({ width, height }) => {} // unaffected
```

It only matters if you pass the whole payload on somewhere, because it now carries
that extra property:

- **Storing it in state.** `onResize: setSize` now puts the entry in your state,
  which keeps it — and through `entry.target`, the observed element — alive for as
  long as that state does. Pick out the values instead:

  ```diff
  -onResize: setSize
  +onResize: ({ width, height }) => setSize({ width, height })
  ```

- **Exact comparisons.** Deep-equality checks against the payload (a test doing
  `expect(size).toEqual({ width, height })`, or a memo comparing payloads) no
  longer match. Compare the individual values, or use a partial match.
