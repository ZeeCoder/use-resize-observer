const m = require("use-resize-observer");
if (typeof m.useResizeObserver !== "function") throw new Error("FAIL: CJS named export missing");
if ("default" in m) throw new Error("FAIL: default export should not exist in v10");
console.log("CJS smoke OK");
