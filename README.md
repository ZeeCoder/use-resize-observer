# use-resize-observer

A React hook that allows you to use a ResizeObserver to measure an element's size.

[![npm version](https://badge.fury.io/js/use-resize-observer.svg)](https://npmjs.com/package/use-resize-observer)
[![build](https://travis-ci.org/ZeeCoder/use-resize-observer.svg?branch=master)](https://travis-ci.org/ZeeCoder/use-resize-observer)

## On Transpilation / Polyfilling

This library is neither transpiled nor polyfilled by default.
I recommend using Babel with its "env" preset to transpile your code to your
target browsers, and adding a [ResizeObserver](https://github.com/que-etc/resize-observer-polyfill)
poly- or [ponyfill](https://github.com/sindresorhus/ponyfill) when necessary.

## In Action

[CodeSandbox Demo](https://codesandbox.io/s/nrp0w2r5z0)

## Install

```sh
yarn add use-resize-observer --dev
# or
npm install use-resize-observer --save-dev
```

## Usage

```js
import React from "react";
import useResizeObserver from "use-resize-observer";

const App = () => {
  const [ref, width, height] = useResizeObserver();

  return (
    <div ref={ref}>
      Size: {width}x{height}
    </div>
  );
};
```

## SSR, Default Size

You can set the default size, which is useful for SSR.

```js
const [ref, width, height] = useResizeObserver({
  defaultWidth: 100,
  defaultHeight: 50
});

// width / height will be 100 and 50 respectively, until the ResizeObserver
// kicks in and reports the actual size.
```

## Related

- [@zeecoder/react-resize-observer](https://github.com/ZeeCoder/react-resize-observer)
- [@zeecoder/container-query](https://github.com/ZeeCoder/container-query)

## License

MIT
