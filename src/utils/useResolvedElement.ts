// This of course could've been more streamlined with internal state instead of
// refs, but then host hooks / components could not opt out of renders.
// This could've been exported to its own module, but the current build doesn't
// seem to work with module imports and I had no more time to spend on this...
import { RefCallback, RefObject, useCallback, useEffect, useRef } from "react";

type SubscriberCleanup = () => void;
type SubscriberResponse = SubscriberCleanup | void;

export default function useResolvedElement<T extends Element>(
  subscriber: (element: T) => SubscriberResponse,
  refOrElement?: T | RefObject<T> | null
): RefCallback<T> {
  const callbackRefElement = useRef<T | null>(null);
  const lastReportRef = useRef<{
    reporter: () => void;
    element: T | null;
  } | null>(null);
  const cleanupRef = useRef<SubscriberResponse | null>();

  // Resolving ".current" purely so that a new callSubscriber instance is created when needed.
  const refElement =
    refOrElement && "current" in refOrElement ? refOrElement.current : null;
  const callSubscriber = useCallback(() => {
    let element = null;
    if (callbackRefElement.current) {
      element = callbackRefElement.current;
    } else if (refOrElement) {
      if (refOrElement instanceof Element) {
        element = refOrElement;
      } else {
        element = refOrElement.current;
      }
    }

    if (
      lastReportRef.current &&
      lastReportRef.current.element === element &&
      lastReportRef.current.reporter === callSubscriber
    ) {
      return;
    }

    if (cleanupRef.current) {
      cleanupRef.current();
      // Making sure the cleanup is not called accidentally multiple times.
      cleanupRef.current = null;
    }
    lastReportRef.current = {
      reporter: callSubscriber,
      element,
    };

    // Only calling the subscriber, if there's an actual element to report.
    if (element) {
      cleanupRef.current = subscriber(element);
    }
  }, [refOrElement, refElement, subscriber]);

  // On each render, we check whether a ref changed, or if we got a new raw
  // element.
  useEffect(() => {
    // With this we're *technically* supporting cases where ref objects' current value changes, but only if there's a
    // render accompanying that change as well.
    // To guarantee we always have the right element, one must use the ref callback provided instead, but we support
    // RefObjects to make the hook API more convenient in certain cases.
    callSubscriber();
  }, [callSubscriber]);

  return useCallback<RefCallback<T>>(
    (element) => {
      callbackRefElement.current = element;
      callSubscriber();
    },
    [callSubscriber]
  );
}
