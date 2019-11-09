import { useEffect, useState, useRef } from "react";

export default function({ defaultWidth = 1, defaultHeight = 1 } = {}) {
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

      changeWidth(entry.contentRect.width);
      changeHeight(entry.contentRect.height);
    });

    resizeObserver.observe(element);

    return () => resizeObserver.unobserve(element);
  }, []);

  return { ref, width, height };
}
