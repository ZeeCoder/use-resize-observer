// For simplicity, this file is not in TS so that the node generation script can be simpler.
const React = require("react");
const baseUseResizeObserver = require("../../");

// I couldn't be bothered to use es6 for the node script, so I ended up with this...
const useResizeObserver =
  baseUseResizeObserver.default || baseUseResizeObserver;

module.exports = function Test() {
  // Pasting in our own ref here, as this used to cause issues with SSR:
  // @see https://github.com/ZeeCoder/use-resize-observer/issues/74
  const ref = React.useRef(null);
  const { width = 1, height = 2 } = useResizeObserver({ ref });

  return React.createElement(
    "div",
    { ref, style: { width: 100, height: 200 } },
    `${width}x${height}`
  );
};
