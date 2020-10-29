import { useCallback, useEffect, useRef } from "react";

/**
 * This hook allows you to intercept a callback ref and receive the element in
 * another function as well.
 */
const useMergedCallbackRef = (...callbacks: Function[]) => {
  // Storing callbacks in a ref, so that we don't need to memoise them in
  // renders when using this hook.
  const callbacksRegistry = useRef<Function[]>(callbacks);

  useEffect(() => {
    callbacksRegistry.current = callbacks;
  }, [...callbacks]);

  return useCallback((element) => {
    callbacksRegistry.current.forEach((callback) => callback(element));
  }, []);
};

export default useMergedCallbackRef;
