# use-resize-observer

A React hook to use a Resize Observer.

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
