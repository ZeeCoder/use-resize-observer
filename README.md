# use-resize-observer

A React hook to use a Resize Observer.

[![npm version](https://badge.fury.io/js/%40zeecoder%2Fuse-resize-observer.svg)](https://npmjs.com/package/@zeecoder/use-resize-observer)
[![build](https://travis-ci.org/ZeeCoder/use-resize-observer.svg?branch=master)](https://travis-ci.org/ZeeCoder/use-resize-observer)

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

## License

MIT
