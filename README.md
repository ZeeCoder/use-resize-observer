# use-resize-observer

A React hook that allows you to use a ResizeObserver to measure an element's size.

[![npm version](https://badge.fury.io/js/use-resize-observer.svg)](https://npmjs.com/package/use-resize-observer)
[![build](https://travis-ci.org/ZeeCoder/use-resize-observer.svg?branch=master)](https://travis-ci.org/ZeeCoder/use-resize-observer)

## In Action

[CodeSandbox Demo](https://codesandbox.io/s/nrp0w2r5z0)

## Install

```sh
yarn add use-resize-observer
# or
npm install --save use-resize-observer
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

## Notes

- Uses [resize-observer-polyfill](https://github.com/que-etc/resize-observer-polyfill)
  internally, which falls back to the native ResizeObserver, if available.

## Related

- [@zeecoder/react-resize-observer](https://github.com/ZeeCoder/react-resize-observer)
- [@zeecoder/container-query](https://github.com/ZeeCoder/container-query)

## License

MIT
