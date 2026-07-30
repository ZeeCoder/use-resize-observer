# use-resize-observer


<h1 align="center">
	<br>
	<img width="250" src="https://raw.githubusercontent.com/ZeeCoder/use-resize-observer/master/media/Logo.png" alt="useResizeObserver">
	<br>
    <br>
</h1>

A React hook that allows you to use a ResizeObserver to measure an element's size.

[![npm version](https://badge.fury.io/js/use-resize-observer.svg)](https://npmjs.com/package/use-resize-observer)
[![build](https://github.com/ZeeCoder/use-resize-observer/workflows/Testing/badge.svg)](https://github.com/ZeeCoder/use-resize-observer/actions/workflows/testing.yml)
[![BrowserStack Status](https://automate.browserstack.com/badge.svg?badge_key=aVpjV2RZbThnWnh2S0FvREh0cGRtRHRCNzYwUmw4N0Z4WUxybHM0WkpqST0tLW9RT0tDeGk3OVU2WkNtalpON29xWFE9PQ==--ec6a97c52cd7ad30417612ca3f5df511eef5d631)](https://automate.browserstack.com/public-build/aVpjV2RZbThnWnh2S0FvREh0cGRtRHRCNzYwUmw4N0Z4WUxybHM0WkpqST0tLW9RT0tDeGk3OVU2WkNtalpON29xWFE9PQ==--ec6a97c52cd7ad30417612ca3f5df511eef5d631)

> **Upgrading from v9?** v10 has several breaking changes, see [MIGRATION.md](./MIGRATION.md).

## Highlights

- Written in **TypeScript**.
- **Zero runtime dependencies.**
- **Tiny**: under 1kB (minified, gzipped), monitored by [size-limit](https://github.com/ai/size-limit) ([budget](.size-limit.json)).
- Ships **ESM and CJS** builds.
- Exposes an **onResize callback** if you need more control.
- `box` [option](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver/observe#syntax).
- Works with **SSR**.
- Works with **CSS-in-JS**.
- **Supports custom refs** in case you [had one already](#passing-in-your-own-ref).
- **Uses RefCallback by default** to address delayed mounts and changing ref elements.
- Handles many edge cases you might not even think of.
  (See this documentation and the test cases.)
- Easy to compose ([Throttle / Debounce](#throttle--debounce), [Breakpoints](#breakpoints))
- **Tested in real browsers** (latest Chrome, Firefox, Edge and Safari, plus real iOS and Android devices, sponsored by BrowserStack)

## Requirements

- **React** `^18.2` or `^19`.
- A **`ResizeObserver`** implementation. It is available in all
  [modern browsers](https://caniuse.com/resizeobserver). If you need to support an
  environment without it, polyfill it yourself in your app's entry point (see
  [Polyfilling](#polyfilling)).

## In Action

[CodeSandbox Demo](https://codesandbox.io/s/nrp0w2r5z0)

## Install

`use-resize-observer` is a runtime dependency:

```sh
pnpm add use-resize-observer
# or
npm install use-resize-observer
# or
yarn add use-resize-observer
```

## Options

| Option   | Type                                                                                 | Description                                                                                                                   | Default        |
| -------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | -------------- |
| ref      | undefined &#124; RefObject &#124; HTMLElement                                        | A ref or element to observe.                                                                                                  | undefined      |
| box      | undefined &#124; "border-box" &#124; "content-box" &#124; "device-pixel-content-box" | The [box model](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver/observe#syntax) to use for observation.       | "content-box"  |
| onResize | undefined &#124; ({ width?: number, height?: number }) => void                       | A callback receiving the element size. If given, then the hook will not return the size, and instead will call this callback. | undefined      |
| round    | undefined &#124; (n: number) => number                                               | A function to use for rounding values instead of the default.                                                                 | `Math.round()` |

## Response

| Name   | Type                    | Description                                    |
| ------ | ----------------------- | ---------------------------------------------- |
| ref    | RefCallback             | A callback to be passed to React's "ref" prop. |
| width  | undefined &#124; number | The width (or "inlineSize") of the element.     |
| height | undefined &#124; number | The height (or "blockSize") of the element.   |

## Basic Usage

`useResizeObserver` is a **named** export:

```tsx
import { useResizeObserver } from "use-resize-observer";

const App = () => {
  const { ref, width = 1, height = 1 } = useResizeObserver<HTMLDivElement>();

  return (
    <div ref={ref}>
      Size: {width}x{height}
    </div>
  );
};
```

To observe a different box size other than content box, pass in the `box` option, like so:

```tsx
const { ref, width, height } = useResizeObserver<HTMLDivElement>({
  box: "border-box",
});
```

Note that if the browser does not support the given box type, then the hook won't report any sizes either.

### Next.js App Router / React Server Components

This is a hooks-only library, so it can only run in Client Components. In the
Next.js App Router (or any React Server Components setup), the component that
calls `useResizeObserver` must be a Client Component — add the `"use client"`
directive at the top of your own file:

```tsx
"use client";

import { useResizeObserver } from "use-resize-observer";

export function Measured() {
  const { ref, width, height } = useResizeObserver<HTMLDivElement>();
  return <div ref={ref}>{width}x{height}</div>;
}
```

The library deliberately does **not** ship its own `"use client"` directive: for
a hooks-only package that would be a no-op (a Server Component still cannot call a
hook), and it would force the directive on every consumer. Without a client
boundary you'll see an opaque `TypeError: (0 , ...useRef) is not a function` at
prerender time — the fix is the `"use client"` on your calling component above.

### Box Options

Note that box options are experimental, and as such are not supported by all browsers that implemented ResizeObservers. (See [here](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserverEntry).)

`content-box` (default)

Safe to use by all browsers that implemented ResizeObservers. The hook internally will fall back to `contentRect` from
the old spec in case `contentBoxSize` is not available.

`border-box`

Supported well for the most part by evergreen browsers. If you need to support older versions of these browsers however,
then you may want to feature-detect for support.

`device-pixel-content-box`

Surma has a [very good article](https://web.dev/device-pixel-content-box/) on how this allows us to do pixel perfect
rendering. At the time of writing, however, this has limited support (notably, it is unsupported in Safari).
Feature-detect before relying on it.

### Custom Rounding

By default this hook passes the measured values through `Math.round()`, to avoid re-rendering on every subpixel changes.

If this is not what you want, then you can provide your own function:

**Rounding Down Reported Values**

```tsx
const { ref, width, height } = useResizeObserver<HTMLDivElement>({
  round: Math.floor,
});
```

**Skipping Rounding**

```tsx
import { useResizeObserver } from "use-resize-observer";

// Outside the hook to ensure this instance does not change unnecessarily.
const noop = (n) => n;

const App = () => {
  const {
    ref,
    width = 1,
    height = 1,
  } = useResizeObserver<HTMLDivElement>({ round: noop });

  return (
    <div ref={ref}>
      Size: {width}x{height}
    </div>
  );
};
```

Note that the round option is sensitive to the function reference, so make sure you either use `useCallback`
or declare your rounding function outside of the hook's function scope, if it does not rely on any hook state.
(As shown above.)

### Getting the Raw Element from the Default `RefCallback`

Note that "ref" in the above examples is a `RefCallback`, not a `RefObject`, meaning you won't be
able to access "ref.current" if you need the element itself.

To get the raw element, either you use your own RefObject (see later in this doc),
or you can merge the returned ref with one of your own:

```tsx
import { useResizeObserver } from "use-resize-observer";
import mergeRefs from "react-merge-refs";

const App = () => {
  const { ref, width = 1, height = 1 } = useResizeObserver<HTMLDivElement>();

  const mergedCallbackRef = mergeRefs([
    ref,
    (element: HTMLDivElement) => {
      // Do whatever you want with the `element`.
    },
  ]);

  return (
    <div ref={mergedCallbackRef}>
      Size: {width}x{height}
    </div>
  );
};
```

## Passing in Your Own `ref`

You can pass in your own ref instead of using the one provided.
This can be useful if you already have a ref you want to measure.

```ts
const ref = useRef<HTMLDivElement>(null);
const { width, height } = useResizeObserver<HTMLDivElement>({ ref });
```

You can even reuse the same hook instance to measure different elements:

[CodeSandbox Demo](https://codesandbox.io/s/use-resize-observer-reusing-refs-buftd)

## Measuring a raw element

There might be situations where you have an element already that you need to measure.
`ref` now accepts elements as well, not just refs, which means that you can do this:

```ts
const { width, height } = useResizeObserver<HTMLDivElement>({
  ref: divElement,
});
```

Elements from another window (for example a cross-document iframe) are supported too.

## Using a Single Hook to Measure Multiple Refs

The hook reacts to ref changes, as it resolves it to an element to observe.
This means that you can freely change the custom `ref` option from one ref to
another and back, and the hook will start observing whatever is set in its options.

## Opting Out of (or Delaying) ResizeObserver Instantiation

In certain cases you might want to delay creating a ResizeObserver instance.

You might provide a library, that only optionally provides observation features
based on props, which means that while you have the hook within your component,
you might not want to actually initialise it.

Another example is that you might want to entirely opt out of initialising, when
you run some tests, where the environment does not provide the `ResizeObserver`.

([See discussions](https://github.com/ZeeCoder/use-resize-observer/issues/40))

Use the default `ref` RefCallback, or provide a custom ref conditionally, only
when needed. The hook will not create a ResizeObserver instance until there's
something there to actually observe.

## The "onResize" Callback

By the default the hook will trigger a re-render on all changes to the target
element's width and / or height.

You can opt out of this behaviour, by providing an `onResize` callback function,
which'll simply receive the width and height of the element when it changes, so
that you can decide what to do with it:

```tsx
import { useResizeObserver } from "use-resize-observer";

const App = () => {
  // width / height will not be returned here when the onResize callback is present
  const { ref } = useResizeObserver<HTMLDivElement>({
    onResize: ({ width, height }) => {
      // do something here.
    },
  });

  return <div ref={ref} />;
};
```

This callback also makes it possible to implement your own hooks that report only
what you need, for example:

- Reporting only width or height
- Throttle / debounce
- Wrap in `requestAnimationFrame`

## Hook Composition

As this hook intends to remain low-level, it is encouraged to build on top of it via hook composition, if additional features are required.

### Throttle / Debounce

You might want to receive values less frequently than changes actually occur.

[CodeSandbox Demo](https://codesandbox.io/s/use-resize-observer-throttle-and-debounce-8uvsg)

### Breakpoints

Another popular concept are breakpoints. Here is an example for a simple hook accomplishing that.

[CodeSandbox Demo](https://codesandbox.io/s/use-resize-observer-breakpoints-3hiv8)

## Defaults (SSR)

On initial mount the ResizeObserver will take a little time to report on the
actual size.

Until the hook receives the first measurement, it returns `undefined` for width
and height by default.

You can override this behaviour, which could be useful for SSR as well.

```ts
const { ref, width = 100, height = 50 } = useResizeObserver<HTMLDivElement>();
```

Here "width" and "height" will be 100 and 50 respectively, until the
ResizeObserver kicks in and reports the actual size.

## Without Defaults

If you only want real measurements (only values from the ResizeObserver without
any default values), then you can just leave defaults off:

```ts
const { ref, width, height } = useResizeObserver<HTMLDivElement>();
```

Here "width" and "height" will be undefined until the ResizeObserver takes its
first measurement. A measured dimension of `0` is reported as `0` (not
`undefined`), so you can distinguish a genuinely zero-sized element from one that
has not been measured yet.

## Container/Element Query with CSS-in-JS

It's possible to apply styles conditionally based on the width / height of an
element using a CSS-in-JS solution, which is the basic idea behind
container/element queries:

[CodeSandbox Demo](https://codesandbox.io/s/use-resize-observer-container-query-with-css-in-js-iitxl)

## Polyfilling

The library targets modern (ES2020) browsers and ships **no** ResizeObserver
polyfill (the `use-resize-observer/polyfilled` entrypoint and the
`@juggle/resize-observer` dependency were removed in v10 — the package now has
zero runtime dependencies).

Polyfilling is best done in the host app, and not within imported libraries, as
that way consumers control the exact polyfills being used. If you need to support
an environment without a native `ResizeObserver`, install a polyfill such as
[@juggle/resize-observer](https://github.com/juggle/resize-observer) and make it
available before the hook runs — for example in your app's entry point:

```ts
import { ResizeObserver } from "@juggle/resize-observer";

if (!window.ResizeObserver) {
  window.ResizeObserver = ResizeObserver;
}
```

## Related

- [@zeecoder/container-query](https://github.com/ZeeCoder/container-query)
- [@zeecoder/react-resize-observer](https://github.com/ZeeCoder/react-resize-observer)

## License

MIT
