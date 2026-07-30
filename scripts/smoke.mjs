import { useResizeObserver } from "use-resize-observer";
import * as ns from "use-resize-observer";
if (typeof useResizeObserver !== "function") throw new Error("FAIL: ESM named export missing");
if ("default" in ns) throw new Error("FAIL: default export should not exist in v10");
console.log("ESM smoke OK");
