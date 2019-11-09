import { useEffect, useState, useRef } from "react";
import ResizeObserver from "resize-observer-polyfill";

export default function({ defaultWidth = 1, defaultHeight = 1, precision } = {}) {
  const ref = useRef(null);
  const [width, changeWidth] = useState(defaultWidth);
  const [height, changeHeight] = useState(defaultHeight);

  useEffect(() => {
    const element = ref.current;
    const resizeObserver = new ResizeObserver(entries => {
      if (!Array.isArray(entries)) {
        return;
      }

      // Since we only observe the one element, we don't need to loop over the
      // array
      if (!entries.length) {
        return;
      }

      const entry = entries[0];
      const newWidth = precision ? +(entry.contentRect.width.toPrecision(precision)) : entry.contentRect.width
      const newHeight = precision ? +(entry.contentRect.height.toPrecision(precision)) : entry.contentRect.height
      if (newWidth !== width) {
        changeWidth(newWidth);
      }
      if (newHeight !== height) {
        changeHeight(newHeight);
      }
    });

    resizeObserver.observe(element);

    return () => resizeObserver.unobserve(element);
  }, []);

  return [ref, width, height];
}
