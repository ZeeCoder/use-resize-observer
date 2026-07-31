import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import type { RefObject, RefCallback } from "react";
import useResolvedElement from "./utils/useResolvedElement";
import extractSize from "./utils/extractSize";

export type ObservedSize = {
  width: number | undefined;
  height: number | undefined;
};

export type ResizeHandlerPayload = ObservedSize & {
  // The raw ResizeObserverEntry, exposed so that anything the hook doesn't
  // (or doesn't yet) surface itself stays reachable: all box sizes are reported
  // regardless of the `box` option, and `entry.target` is the observed element,
  // which is otherwise awkward to get hold of when using the returned ref callback.
  entry: ResizeObserverEntry;
};

export type ResizeHandler = (payload: ResizeHandlerPayload) => void;

type HookResponse<T extends Element> = {
  ref: RefCallback<T>;
} & ObservedSize;

// Exporting our own union as part of the public API. It mirrors the built-in
// `ResizeObserverBoxOptions` from lib.dom, but declaring it here keeps the
// exported type stable regardless of the consumer's TypeScript/lib version.
export type ResizeObserverBoxOptions = "border-box" | "content-box" | "device-pixel-content-box";

export type RoundingFunction = (n: number) => number;

function useResizeObserver<T extends Element>(
  opts: {
    ref?: RefObject<T | null> | T | null | undefined;
    onResize?: ResizeHandler;
    box?: ResizeObserverBoxOptions;
    round?: RoundingFunction;
  } = {},
): HookResponse<T> {
  // Saving the callback as a ref. With this, I don't need to put onResize in the
  // effect dep array, and just passing in an anonymous function without memoising
  // will not reinstantiate the hook's ResizeObserver.
  const onResize = opts.onResize;
  const onResizeRef = useRef<ResizeHandler | undefined>(undefined);
  onResizeRef.current = onResize;
  const round = opts.round || Math.round;

  // Using a single instance throughout the hook's lifetime
  const resizeObserverRef = useRef<
    | undefined
    | {
        box?: ResizeObserverBoxOptions;
        round?: RoundingFunction;
        instance: ResizeObserver;
      }
  >(undefined);

  const [size, setSize] = useState<{
    width?: number;
    height?: number;
  }>({
    width: undefined,
    height: undefined,
  });

  // In certain edge cases the RO might want to report a size change just after
  // the component unmounted.
  const didUnmount = useRef(false);
  useEffect(() => {
    didUnmount.current = false;

    return () => {
      didUnmount.current = true;
    };
  }, []);

  // Using a ref to track the previous width / height to avoid unnecessary renders.
  const previous: {
    current: {
      width?: number;
      height?: number;
    };
  } = useRef({
    width: undefined,
    height: undefined,
  });

  // This block is kinda like a useEffect, only it's called whenever a new
  // element could be resolved based on the ref option. It also has a cleanup
  // function.
  const refCallback = useResolvedElement<T>(
    useCallback(
      (element) => {
        // We only use a single Resize Observer instance, and we're instantiating it on demand, only once there's something to observe.
        // This instance is also recreated when the `box` option changes, so that a new observation is fired if there was a previously observed element with a different box option.
        if (
          !resizeObserverRef.current ||
          resizeObserverRef.current.box !== opts.box ||
          resizeObserverRef.current.round !== round
        ) {
          // Use the observed element's own window's ResizeObserver, so elements
          // living in another window / cross-document iframe are observed
          // correctly (their own document's observer). Falls back to the current
          // window's constructor. @see issues #100, #109, #113
          const RO = element.ownerDocument.defaultView?.ResizeObserver ?? ResizeObserver;
          resizeObserverRef.current = {
            box: opts.box,
            round,
            instance: new RO((entries) => {
              // A ResizeObserver notification can still arrive right after the
              // component unmounted. Bail out before reporting, so we neither
              // invoke the user's onResize nor setState on an unmounted component.
              if (didUnmount.current) {
                return;
              }

              const entry = entries[0];

              const boxProp =
                opts.box === "border-box"
                  ? "borderBoxSize"
                  : opts.box === "device-pixel-content-box"
                    ? "devicePixelContentBoxSize"
                    : "contentBoxSize";

              const reportedWidth = extractSize(entry, boxProp, "inlineSize");
              const reportedHeight = extractSize(entry, boxProp, "blockSize");

              // A genuinely measured size of 0 must be reported as `0`, not
              // `undefined` — `undefined` means "not measured yet". Only a missing
              // box size (unsupported box option) stays `undefined`. @see issue #103
              const newWidth = reportedWidth === undefined ? undefined : round(reportedWidth);
              const newHeight = reportedHeight === undefined ? undefined : round(reportedHeight);

              if (previous.current.width !== newWidth || previous.current.height !== newHeight) {
                const newSize = { width: newWidth, height: newHeight };
                previous.current.width = newWidth;
                previous.current.height = newHeight;
                if (onResizeRef.current) {
                  // The entry is only passed to the callback, deliberately not
                  // into state: keeping it in state would retain the entry (and
                  // through `entry.target`, the element) across renders.
                  onResizeRef.current({ ...newSize, entry });
                } else {
                  setSize(newSize);
                }
              }
            }),
          };
        }

        resizeObserverRef.current.instance.observe(element, { box: opts.box });

        return () => {
          if (resizeObserverRef.current) {
            resizeObserverRef.current.instance.unobserve(element);
          }
        };
      },
      [opts.box, round],
    ),
    opts.ref,
  );

  return useMemo(
    () => ({
      ref: refCallback,
      width: size.width,
      height: size.height,
    }),
    [refCallback, size.width, size.height],
  );
}

export { useResizeObserver };
