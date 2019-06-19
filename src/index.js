import { useEffect, useState, useRef } from "react";
import ResizeObserver from "resize-observer-polyfill";

export default function(ref) {
  const defaultRef = useRef();
  ref = ref || defaultRef;
  const [observer, setObserver] = useState(null);
  const [width, changeWidth] = useState(1);
  const [height, changeHeight] = useState(1);
  
  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      // Since we only observe the one element, we don't need to loop over the
      // array
      if (!Array.isArray(entries) || !entries.length) {
        return;
      }
      const entry = entries[0];
      changeWidth(entry.contentRect.width);
      changeHeight(entry.contentRect.height);
    });
    setObserver(resizeObserver);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!observer || !element) {
      return;
    }
    observer.observe(element);
    return () => observer.unobserve(element);
  }, [observer, ref]);

  // Since ref can be passed to function manually. It must be optional output.
  // Save compatibility with v3.1.0 and earlier.
  if (defaultRef === ref) {
    return [ref, width, height];
  } else {
    return [width, height, ref];
  }
}
