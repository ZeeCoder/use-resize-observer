import { useEffect, useState, useRef } from "react";

export default function({ ref, defaultWidth = 1, defaultHeight = 1 } = {}) {
  // Has to be non-conditionally declared here whether or not it'll be used
  const defaultRef = useRef(null);
  ref = ref || defaultRef;
  const [width, changeWidth] = useState(defaultWidth);
  const [height, changeHeight] = useState(defaultHeight);
  // Using refs to track the previous width / height for comparison, without
  // rerunning the effect
  const widthRef = useRef(defaultWidth);
  const heightRef = useRef(defaultHeight);

  useEffect(() => {
    if (
      typeof ref !== "object" ||
      ref === null ||
      !(ref.current instanceof Element)
    ) {
      return;
    }

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

      const newWidth = Math.floor(entry.contentRect.width);
      if (widthRef.current !== newWidth) {
        widthRef.current = newWidth;
        changeWidth(newWidth);
      }
      const newHeight = Math.floor(entry.contentRect.height);
      if (heightRef.current !== newHeight) {
        heightRef.current = newHeight;
        changeHeight(newHeight);
      }
    });

    resizeObserver.observe(element);

    return () => resizeObserver.unobserve(element);
  }, [ref]);

  return { ref, width, height };
}
