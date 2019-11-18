# use-resize-observer

A React hook that allows you to use a ResizeObserver to measure an element's size.

[![npm version](https://badge.fury.io/js/use-resize-observer.svg)](https://npmjs.com/package/use-resize-observer)
[![build](https://travis-ci.org/ZeeCoder/use-resize-observer.svg?branch=master)](https://travis-ci.org/ZeeCoder/use-resize-observer)

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
  const { ref, width, height } = useResizeObserver();

  return (
    <div ref={ref}>
      Size: {width}x{height}
    </div>
  );
};
```

## Passing in your own `ref`

You can pass in your own ref to measure, use now.
This can be useful if you already have a ref from somewhere you want to measure.

```js
const { ref, width, height } = useResizeObserver({
  defaultWidth: 100,
  defaultHeight: 50
});
```

You can even reuse the same hook instance to measure different elements:

[CodeSandbox Demo](https://codesandbox.io/s/use-resize-observer-reusing-refs-buftd)

## Throttle / Debounce

You might want values less frequently than actually reported.

While this hook does not come its own implementation of throttling / debouncing
the reported values (Issue #19), you can use hook composition to achieve it:

[CodeSandbox Demo](https://codesandbox.io/s/use-resize-observer-throttle-and-debounce-8uvsg)

## SSR, Default Size

You can set the default size, which is useful for SSR.

```js
const { ref, width, height } = useResizeObserver({
  defaultWidth: 100,
  defaultHeight: 50
});
```

Here "width" and "height" will be 100 and 50 respectively, until the
ResizeObserver kicks in and reports the actual size.

## Without Default Measurements

If you only want real measurements (only values from the ResizeObserver without
defaults), then you can use the following:

```js
const { ref, width, height } = useResizeObserver({
  useDefaults: false
});
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

Polyfilling is recommended to be done in the host app, and not in the library, as
that gives users more control over what exact polyfills they might want to use.

However, there's a polyfilled CJS module (without affecting globals) that can be
used for convenience:

```js
import useResizeObserver from "use-resize-observer/polyfilled";
```

[Bundled ResizeObserver implementation](<[ResizeObserver](https://github.com/que-etc/resize-observer-polyfill)>)

## Related

- [@zeecoder/container-query](https://github.com/ZeeCoder/container-query)
- [@zeecoder/react-resize-observer](https://github.com/ZeeCoder/react-resize-observer)

## License

MIT
