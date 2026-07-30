import { useCallback, useRef } from "react";
import type { RefCallback } from "react";

// A callback ref that tolerates any element type — the merged ref forwards the
// same element (or null on detach) to every registered callback, which may be
// typed for different, more specific element types.
type AnyRefCallback = (element: any) => void;

/**
 * This hook allows you to intercept a RefCallback and receive the element in
 * another function as well.
 */
const useMergedCallbackRef = <T extends Element = Element>(
  ...callbacks: AnyRefCallback[]
): RefCallback<T> => {
  // Storing callbacks in a ref, so that we don't need to memoise them in
  // renders when using this hook. Assigning during render keeps the registry
  // current without an effect (and its dependency-array churn).
  const callbacksRegistry = useRef(callbacks);
  callbacksRegistry.current = callbacks;

  return useCallback((element: T | null) => {
    callbacksRegistry.current.forEach((callback) => callback(element));
  }, []);
};

export default useMergedCallbackRef;
