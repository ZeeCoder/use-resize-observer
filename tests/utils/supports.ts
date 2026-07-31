// Detects which ResizeObserver box options the current browser actually
// supports. `borderBoxSize` and `devicePixelContentBoxSize` are absent in
// older engines (e.g. Safari only reports the content box), so tests branch on
// these flags rather than asserting a single expected value everywhere.
//
// Creating the RO instance as a side effect of importing this module (kicked
// off before any test runs) so the flags are populated by the time they're read.
export const supports = {
  borderBox: false,
  devicePixelContentBoxSize: false,
};

new ResizeObserver((entries) => {
  supports.borderBox = Boolean(entries[0].borderBoxSize);
  supports.devicePixelContentBoxSize = Boolean(entries[0].devicePixelContentBoxSize);
}).observe(document.body);
