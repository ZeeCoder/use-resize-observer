import { useEffect, useState, useRef, useMemo } from "react";

const isResizable = element => typeof element.handleResize === "function";

const resizeObserver = new ResizeObserver(entries => {
  if (!Array.isArray(entries)) {
    return;
  }

  for (const entry of entries) {
    if (isResizable(entry.target)) {
      entry.target.handleResize(entry.contentRect);
    }
  }
});

export default function({
  ref,
  defaultWidth = 1,
  defaultHeight = 1,
  useDefaults = true
} = {}) {
  // `defaultRef` Has to be non-conditionally declared here whether or not it'll
  // be used as that's how hooks work.
  // @see https://reactjs.org/docs/hooks-rules.html#explanation
  const defaultRef = useRef(null);
  ref = ref || defaultRef;
  const [size, setSize] = useState(
    useDefaults
      ? {
          width: defaultWidth,
          height: defaultHeight
        }
      : null
  );
  // Using a ref to track the previous width / height to avoid unnecessary renders
  const previous = useRef({
    width: defaultWidth,
    height: defaultHeight
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

    element.handleResize = contentRect => {
      // `Math.round` is in line with how CSS resolves sub-pixel values
      const newWidth = Math.round(contentRect.width);
      const newHeight = Math.round(contentRect.height);
      if (
        previous.current.width !== newWidth ||
        previous.current.height !== newHeight
      ) {
        previous.current.width = newWidth;
        previous.current.height = newHeight;
        setSize({ width: newWidth, height: newHeight });
      }
    };

    resizeObserver.observe(element);

    return () => resizeObserver.unobserve(element);
  }, [ref]);

  return useMemo(() => ({ ref, ...size }), [
    ref,
    size ? size.width : null,
    size ? size.height : null
  ]);
}
