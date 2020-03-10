import { useEffect, useState, useRef, useMemo } from "react";

export default function({ ref, onResize, type } = {}) {
  // `defaultRef` Has to be non-conditionally declared here whether or not it'll
  // be used as that's how hooks work.
  // @see https://reactjs.org/docs/hooks-rules.html#explanation
  const defaultRef = useRef(null);
  ref = ref || defaultRef;
  const [size, setSize] = useState({
    width: undefined,
    height: undefined
  });

  // Using a ref to track the previous width / height to avoid unnecessary renders
  const previous = useRef({
    width: undefined,
    height: undefined
  });

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

      let newWidth, newHeight;
      switch (type) {
        case "scroll":
          // Actual size of content and padding, including content hidden by
          // element-level scroll bars
          newWidth = entry.target.scrollWidth;
          newHeight = entry.target.scrollHeight;
          break;
        case "client":
          // Displayed size of content and padding
          newWidth = entry.target.clientWidth;
          newHeight = entry.target.clientHeight;
          break;
        case "offset":
          // Displayed size of content, padding, and border
          newWidth = entry.target.offsetWidth;
          newHeight = entry.target.offsetHeight;
          break;
        case "content":
        default:
          // Displayed size of content only
          // `Math.round` is in line with how CSS resolves sub-pixel values
          newWidth = Math.round(entry.contentRect.width);
          newHeight = Math.round(entry.contentRect.height);
      }
      if (
        previous.current.width !== newWidth ||
        previous.current.height !== newHeight
      ) {
        const newSize = { width: newWidth, height: newHeight };
        if (onResize) {
          onResize(newSize);
        } else {
          previous.current.width = newWidth;
          previous.current.height = newHeight;
          setSize(newSize);
        }
      }
    });

    resizeObserver.observe(element);

    return () => resizeObserver.unobserve(element);
  }, [ref, onResize]);

  return useMemo(() => ({ ref, ...size }), [
    ref,
    size ? size.width : null,
    size ? size.height : null
  ]);
}
