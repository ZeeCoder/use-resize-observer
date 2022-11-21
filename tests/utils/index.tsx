import React from "react";

// Creating an RO instance ahead of time as a "side effect" of using this module, to avoid affecting tests.
export const supports = {
  borderBox: false,
  devicePixelContentBoxSize: false,
};
new ResizeObserver((entries) => {
  supports.borderBox = Boolean(entries[0].borderBoxSize);
  supports.devicePixelContentBoxSize = Boolean(
    entries[0].devicePixelContentBoxSize
  );
}).observe(document.body);
