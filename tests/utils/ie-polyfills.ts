import "react-app-polyfill/ie11";
import "react-app-polyfill/stable";
import { ResizeObserver as ROP } from "@juggle/resize-observer";
if (!window.ResizeObserver) {
  // @ts-ignore
  window.ResizeObserver = ROP;
}
if (!Object.entries) {
  // @ts-ignore
  Object.entries = function (obj) {
    var ownProps = Object.keys(obj),
      i = ownProps.length,
      resArray = new Array(i); // preallocate the Array
    while (i--) resArray[i] = [ownProps[i], obj[ownProps[i]]];

    return resArray;
  };
}
