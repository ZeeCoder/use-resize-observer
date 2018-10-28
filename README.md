# use-resize-observer

A React hook to use a Resize Observer.

## Usage

```
import React, { useRef } from "react";
import useResizeObserver from "use-resize-observer";

const App = () => {
  const ref = useRef();
  const { width, height } = useResizeObserver(ref);

  return (
    <div ref={ref}>
        Size: {width}x{height}
    </div>
  );
};
```
