# use-resize-observer

A React hook that allows you to use a ResizeObserver to measure an element's size.

[![npm version](https://badge.fury.io/js/use-resize-observer.svg)](https://npmjs.com/package/use-resize-observer)
[![build](https://travis-ci.org/ZeeCoder/use-resize-observer.svg?branch=master)](https://travis-ci.org/ZeeCoder/use-resize-observer)

## Highlights

- Written in **TypeScript**.
- **Tiny**: 323 B (minified, gzipped) Monitored by [size-limit](https://github.com/ai/size-limit).
- Exposes an **onResize callback** if you need more control.
- [Throttle / Debounce](#throttle--debounce)
- Works with **SSR**.
- Works with **CSS-in-JS**.
- **Supports custom refs** in case you [had one already](#passing-in-your-own-ref).
- **Tested** in real browsers. (Headless Chrome and Firefox).

## In Action

[CodeSandbox Demo](https://codesandbox.io/s/nrp0w2r5z0)

## Install

```sh
yarn add use-resize-observer --dev
# or
npm install use-resize-observer --save-dev
```

## Basic Usage

Note that the default builds are not polyfilled! For instructions and alternatives,
see the [Transpilation / Polyfilling](#transpilation--polyfilling) section.

```js
import React from "react";
import useResizeObserver from "use-resize-observer";

const App = () => {
  const { ref, width = 1, height = 1 } = useResizeObserver();

  return (
    <div ref={ref}>
      Size: {width}x{height}
    </div>
  );
};
```

## Passing in Your Own `ref`

You can pass in your own ref instead of using the one provided.
This can be useful if you already have a ref you want to measure.

```js
const ref = useRef(null);
const { width, height } = useResizeObserver({ ref });
```

You can even reuse the same hook instance to measure different elements:

[CodeSandbox Demo](https://codesandbox.io/s/use-resize-observer-reusing-refs-buftd)

## The "onResize" callback

By the default the hook will trigger a re-render on all changes to the target
element's width and / or height.

You can opt out of this behaviour, by providing an `onResize` callback function,
which'll simply receive the width and height of the element when it changes, so
that you can decide what to do with it:

```js
import React from "react";
import useResizeObserver from "use-resize-observer";

const App = () => {
  // width / height will not be returned here when the onResize callback is present
  const { ref } = useResizeObserver({
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

## Throttle / Debounce

You might want to receive values less frequently than changes actually occur.

While this hook does not come with its own implementation of throttling / debouncing,
you can use the `onResize` callback to implement your own version:

[CodeSandbox Demo](https://codesandbox.io/s/use-resize-observer-throttle-and-debounce-8uvsg)

## Defaults (SSR)

On initial mount the ResizeObserver will take a little time to report on the
actual size.

Until the hook receives the first measurement, it returns `undefined` for width
and height by default.

You can override this behaviour, which could be useful for SSR as well.

```js
const { ref, width = 100, height = 50 } = useResizeObserver();
```

Here "width" and "height" will be 100 and 50 respectively, until the
ResizeObserver kicks in and reports the actual size.

## Without Defaults

If you only want real measurements (only values from the ResizeObserver without
any default values), then you can just leave defaults off:

```js
const { ref, width, height } = useResizeObserver();
```

Here "width" and "height" will be undefined until the ResizeObserver takes its
first measurement.

## Container/Element Query with CSS-in-JS

It's possible to apply styles conditionally based on the width / height of an
element using a CSS-in-JS solution, which is the basic idea behind
container/element queries:

[CodeSandbox Demo](https://codesandbox.io/s/use-resize-observer-container-query-with-css-in-js-iitxl)

## Transpilation / Polyfilling

By default the library provides transpiled ES5 modules in CJS / ESM module formats.

Polyfilling is recommended to be done in the host app, and not within imported
libraries, as that way consumers have control over the exact polyfills being used.

That said, there's a [polyfilled](https://github.com/que-etc/resize-observer-polyfill)
CJS module that can be used for convenience (Not affecting globals):

```js
import useResizeObserver from "use-resize-observer/polyfilled";
```

## Related

- [@zeecoder/container-query](https://github.com/ZeeCoder/container-query)
- [@zeecoder/react-resize-observer](https://github.com/ZeeCoder/react-resize-observer)

## License

MIT
