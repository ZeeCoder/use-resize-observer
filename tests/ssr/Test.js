// For simplicity, this file is not in TS so that the node generation script can be simpler.
const React = require("react");
const baseUseResizeObserver = require("../../");

// I couldn't be bothered to use es6 for the node script, so I ended up with this...
const useResizeObserver =
  baseUseResizeObserver.default || baseUseResizeObserver;

module.exports = function Test() {
  const { ref, width = 1, height = 2 } = useResizeObserver();

  return React.createElement(
    "div",
    { ref, style: { width: 100, height: 200 } },
    `${width}x${height}`
  );
};
