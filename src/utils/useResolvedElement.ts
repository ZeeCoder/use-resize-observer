import { RefCallback, RefObject, useCallback, useEffect, useRef } from "react";

type SubscriberCleanupFunction = () => void;
type SubscriberResponse = SubscriberCleanupFunction | void;

// This could've been more streamlined with internal state instead of abusing
// refs to such extent, but then composing hooks and components could not opt out of unnecessary renders.
export default function useResolvedElement<T extends Element>(
  subscriber: (element: T) => SubscriberResponse,
  refOrElement?: T | RefObject<T> | null
): RefCallback<T> {
  const lastReportRef = useRef<{
    element: T | null;
    subscriber: typeof subscriber;
    cleanup?: SubscriberResponse;
  } | null>(null);
  const refOrElementRef = useRef<typeof refOrElement>(null);
  refOrElementRef.current = refOrElement;
  const cbElementRef = useRef<T | null>(null);

  // Calling re-evaluation after each render without using a dep array,
  // as the ref object's current value could've changed since the last render.
  useEffect(() => {
    evaluateSubscription();
  });

  const evaluateSubscription = useCallback(() => {
    const cbElement = cbElementRef.current;
    const refOrElement = refOrElementRef.current;
    // Ugly ternary. But smaller than an if-else block.
    const element: T | null = cbElement
      ? cbElement
      : refOrElement
      ? refOrElement instanceof Element
        ? refOrElement
        : refOrElement.current
      : null;

    if (
      lastReportRef.current &&
      lastReportRef.current.element === element &&
      lastReportRef.current.subscriber === subscriber
    ) {
      return;
    }

    if (lastReportRef.current && lastReportRef.current.cleanup) {
      lastReportRef.current.cleanup();
    }
    lastReportRef.current = {
      element,
      subscriber,
      // Only calling the subscriber, if there's an actual element to report.
      // Setting cleanup to undefined unless a subscriber returns one, as an existing cleanup function would've been just called.
      cleanup: element ? subscriber(element) : undefined,
    };
  }, [subscriber]);

  // making sure we call the cleanup function on unmount
  useEffect(() => {
    return () => {
      if (lastReportRef.current && lastReportRef.current.cleanup) {
        lastReportRef.current.cleanup();
        lastReportRef.current = null;
      }
    };
  }, []);

  return useCallback(
    (element) => {
      cbElementRef.current = element;
      evaluateSubscription();
    },
    [evaluateSubscription]
  );
}
