import { useEffect, useState, useRef, useMemo, RefObject } from "react";

type ObservedSize = {
  width: number | undefined;
  height: number | undefined;
};

type ResizeHandler = (size: ObservedSize) => void;

// Type definition when the user wants the hook to provide the ref with the given type.
function useResizeObserver<T extends HTMLElement>(opts?: {
  onResize?: ResizeHandler;
}): { ref: RefObject<T> } & ObservedSize;

// Type definition when the hook just passes through the user provided ref.
function useResizeObserver<T extends HTMLElement>(opts?: {
  ref: RefObject<T>;
  onResize?: ResizeHandler;
}): { ref: RefObject<T> } & ObservedSize;

function useResizeObserver<T>(
  opts: {
    ref?: RefObject<T>;
    onResize?: ResizeHandler;
  } = {}
): { ref: RefObject<T> } & ObservedSize {
  // `defaultRef` Has to be non-conditionally declared here whether or not it'll
  // be used as that's how hooks work.
  // @see https://reactjs.org/docs/hooks-rules.html#explanation
  const defaultRef = useRef<T>(null);

  const ref = opts.ref || defaultRef;
  const onResize = opts.onResize;
  const [size, setSize] = useState<{
    width?: number;
    height?: number;
  }>({
    width: undefined,
    height: undefined,
  });

  // Using a ref to track the previous width / height to avoid unnecessary renders
  const previous: {
    current: {
      width?: number;
      height?: number;
    };
  } = useRef({
    width: undefined,
    height: undefined,
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
    const resizeObserver = new ResizeObserver((entries) => {
      if (!Array.isArray(entries)) {
        return;
      }

      // Since we only observe the one element, we don't need to loop over the
      // array
      if (!entries.length) {
        return;
      }

      const entry = entries[0];

      // `Math.round` is in line with how CSS resolves sub-pixel values
      const newWidth = Math.round(entry.contentRect.width);
      const newHeight = Math.round(entry.contentRect.height);
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

  return useMemo(() => ({ ref, width: size.width, height: size.height }), [
    ref,
    size ? size.width : null,
    size ? size.height : null,
  ]);
}

export default useResizeObserver;
