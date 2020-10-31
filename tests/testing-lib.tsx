// Tests written with react testing library
import React, { useRef, useState, useCallback } from "react";
import useResizeObserver from "../";
import { render, cleanup } from "@testing-library/react";
import useRenderTrigger from "./utils/useRenderTrigger";
import awaitNextFrame from "./utils/awaitNextFrame";
import createController from "./utils/createController";
import useMergedCallbackRef from "./utils/useMergedCallbackRef";

afterEach(() => {
  cleanup();
});

describe("Testing Lib: Basics", () => {
  // TODO also make sure this error doesn't happen in the console: "Warning: Can't perform a React state update on an unmounted component..."
  it("should measure the right sizes", async () => {
    const controller = createController();

    const Test = () => {
      const { ref, width = 0, height = 0 } = useResizeObserver<
        HTMLDivElement
      >();

      const mergedCallbackRef = useMergedCallbackRef(
        ref,
        (element: HTMLElement) => {
          controller.provideSetSizeFunction(element);
        }
      );

      controller.incrementRenderCount();
      controller.reportMeasuredSize({ width, height });

      return <div ref={mergedCallbackRef} />;
    };

    render(<Test />);

    // Default response on the first render before an actual measurement took place
    controller.assertMeasuredSize({ width: 0, height: 0 });
    controller.assertRenderCount(1);

    // Should react to component size changes.
    await controller.setSize({ width: 100, height: 200 });
    controller.assertMeasuredSize({ width: 100, height: 200 });
    controller.assertRenderCount(2);
  });
});

// todo instead of this being a separate block, just add it globally. Then each test has the option to utilise it.
describe("Testing Lib: Resize Observer Instance Counting Block", () => {
  let resizeObserverInstanceCount = 0;
  let resizeObserverObserveCount = 0;
  let resizeObserverUnobserveCount = 0;
  const NativeResizeObserver = (window as any).ResizeObserver;

  beforeAll(() => {
    (window as any).ResizeObserver = function PatchedResizeObserver(
      cb: Function
    ) {
      resizeObserverInstanceCount++;

      const ro = new NativeResizeObserver(cb) as ResizeObserver;

      // mock
      return {
        observe: (element: Element) => {
          resizeObserverObserveCount++;
          return ro.observe(element);
        },
        unobserve: (element: Element) => {
          resizeObserverUnobserveCount++;
          return ro.unobserve(element);
        },
      };
    };
  });

  beforeEach(() => {
    resizeObserverInstanceCount = 0;
    resizeObserverObserveCount = 0;
    resizeObserverUnobserveCount = 0;
  });

  afterAll(() => {
    // Try catches fixes a Firefox issue on Travis:
    // https://travis-ci.org/github/ZeeCoder/use-resize-observer/builds/677364283
    try {
      (window as any).ResizeObserver = NativeResizeObserver;
    } catch (error) {
      // it's fine
    }
  });

  it("should use a single ResizeObserver instance even if the onResize callback is not memoised", async () => {
    const controller = createController();
    const Test = () => {
      const { ref } = useResizeObserver<HTMLDivElement>({
        // This is only here so that each render passes a different callback
        // instance through to the hook.
        onResize: () => {},
      });

      controller.triggerRender = useRenderTrigger();
      const mergedCallbackRef = useMergedCallbackRef(
        ref,
        (element: HTMLElement) => {
          controller.provideSetSizeFunction(element);
        }
      );

      return <div ref={mergedCallbackRef} />;
    };

    render(<Test />);

    await awaitNextFrame();
    await controller.triggerRender();

    // Different onResize instances used to trigger the hook's internal useEffect,
    // resulting in the hook using a new ResizeObserver instance on each render
    // regardless of what triggered it.
    // Now it should handle such cases and keep the previous RO instance.
    expect(resizeObserverInstanceCount).toBe(1);
    expect(resizeObserverObserveCount).toBe(1);
    expect(resizeObserverUnobserveCount).toBe(0);
  });

  it("should not create a new RO instance if the hook is the same and the observed element changes", async () => {
    const Test = ({ observeNewElement = false }) => {
      const customRef = useRef<HTMLDivElement>(null);
      const { ref } = useResizeObserver<HTMLDivElement>({
        ref: observeNewElement ? customRef : null,
      });

      // This is a span, so that when we switch over, React actually renders a
      // new element used with the custom ref, which is the main point of this
      // test. If this were a div, then React would recycle the old element,
      // which is not what we want.
      if (observeNewElement) {
        return <span ref={customRef} />;
      }

      return <div ref={ref} />;
    };

    const { rerender } = render(<Test />);
    await awaitNextFrame();

    expect(resizeObserverInstanceCount).toBe(1);
    expect(resizeObserverObserveCount).toBe(1);
    expect(resizeObserverUnobserveCount).toBe(0);

    rerender(<Test observeNewElement={true} />);
    await awaitNextFrame();

    expect(resizeObserverInstanceCount).toBe(1);
    expect(resizeObserverObserveCount).toBe(2);
    // The following unobserve count assertion actually caught the cleanup
    // functions being called more than one times, so it's especially important
    // to keep this in place in order to cover that.
    expect(resizeObserverUnobserveCount).toBe(1);
  });

  it("should not create a ResizeObserver instance until there's an actual element present to be measured", async () => {
    let renderCount = 0;
    let measuredWidth: number | undefined;
    let measuredHeight: number | undefined;
    const Test = ({ doMeasure }: { doMeasure: boolean }) => {
      const ref = useRef<HTMLDivElement>(null);
      const { width, height } = useResizeObserver({
        ref: doMeasure ? ref : null,
      });

      renderCount++;
      measuredWidth = width;
      measuredHeight = height;

      return <div ref={ref} style={{ width: 100, height: 200 }} />;
    };

    const { rerender } = render(<Test doMeasure={false} />);

    // Default behaviour on initial mount with a null ref passed to the hook
    expect(resizeObserverInstanceCount).toBe(0);
    expect(renderCount).toBe(1);
    expect(measuredWidth).toBe(undefined);
    expect(measuredHeight).toBe(undefined);

    // Actually kickstarting the hook by switching from null to a real ref.
    rerender(<Test doMeasure={true} />);
    await awaitNextFrame();
    expect(resizeObserverInstanceCount).toBe(1);
    expect(renderCount).toBe(3);
    expect(measuredWidth).toBe(100);
    expect(measuredHeight).toBe(200);
  });

  // Note that even thought this sort of "works", callback refs are the preferred
  // method to use in such cases. Relying in this behaviour will certainly cause
  // issues down the line.
  it("should work with refs even if the ref value is filled by react later, with a delayed mount", async () => {
    const controller = createController();

    // Mounting later. Previously this wouldn't have been picked up
    // automatically, and users would've had to wait for the mount, and only
    // then set the ref from null, to its actual object value.
    // @see https://github.com/ZeeCoder/use-resize-observer/issues/43#issuecomment-674719609
    const Test = ({ mount = false }) => {
      const { ref, width, height } = useResizeObserver<HTMLDivElement>();

      controller.triggerRender = useRenderTrigger();
      controller.reportMeasuredSize({ width, height });

      if (!mount) {
        return null;
      }

      return <div ref={ref} style={{ width: 100, height: 200 }} />;
    };

    // Reported size should be undefined before the hook kicks in
    const { rerender } = render(<Test />);
    controller.assertMeasuredSize({ width: undefined, height: undefined });

    // Once the hook supposedly kicked in, it should still be undefined, as the ref is not in use yet.
    await awaitNextFrame();
    controller.assertMeasuredSize({ width: undefined, height: undefined });

    // Once mounted, the ref *will* be filled in the next render. However, the
    // hook has no way of knowing about this, until there's another render call,
    // where it gets to compare the current values between the previous and
    // current render.
    await awaitNextFrame();
    rerender(<Test mount={true} />);
    controller.assertMeasuredSize({ width: undefined, height: undefined });

    // Once that render happened, the hook finally gets a chance to measure the element.
    await awaitNextFrame();
    await controller.triggerRender();
    controller.assertMeasuredSize({ width: 100, height: 200 });
  });

  // This is the proper way of handling refs where the component mounts with a delay
  it("should pick up on delayed mounts", async () => {
    const controller = createController();

    // Mounting later. Previously this wouldn't have been picked up
    // automatically, and users would've had to wait for the mount, and only
    // then set the ref from null, to its actual object value.
    // @see https://github.com/ZeeCoder/use-resize-observer/issues/43#issuecomment-674719609
    const Test = ({ mount = false }) => {
      const { ref, width, height } = useResizeObserver<HTMLDivElement>();

      controller.reportMeasuredSize({ width, height });

      if (!mount) {
        return null;
      }

      return <div ref={ref} style={{ width: 100, height: 200 }} />;
    };

    // Reported size should be undefined before the hook kicks in
    const { rerender } = render(<Test />);
    controller.assertMeasuredSize({ width: undefined, height: undefined });

    // Once the hook supposedly kicked in, it should still be undefined, as the ref is not in use yet.
    await awaitNextFrame();
    controller.assertMeasuredSize({ width: undefined, height: undefined });

    // Once mounted, the hook should automatically pick the new element up with
    // the RefCallback.
    rerender(<Test mount={true} />);
    await awaitNextFrame();
    controller.assertMeasuredSize({ width: 100, height: 200 });
  });

  it("should work on a normal mount", async () => {
    const controller = createController();
    const Test = () => {
      const { ref, width, height } = useResizeObserver<HTMLDivElement>();

      controller.reportMeasuredSize({ width, height });

      return <div ref={ref} style={{ width: 100, height: 200 }} />;
    };

    render(<Test />);
    controller.assertMeasuredSize({ width: undefined, height: undefined });

    await awaitNextFrame();
    controller.assertMeasuredSize({ width: 100, height: 200 });
  });

  it("should work with a regular element as the 'custom ref' too", async () => {
    const controller = createController();
    const Test = () => {
      // This is a bit of a roundabout way of simulating the case where we have
      // an Element from somewhere, when we can't simply use a RefCallback.
      const [element, setElement] = useState<HTMLDivElement | null>(null);
      const { width, height } = useResizeObserver<HTMLDivElement>({
        ref: element,
      });

      // Interestingly, if this callback is not memoised, then on each render,
      // the callback is called with "null", then again with the element.
      const receiveElement = useCallback((element: HTMLDivElement) => {
        setElement(element);
      }, []);

      controller.reportMeasuredSize({ width, height });

      return <div ref={receiveElement} style={{ width: 100, height: 200 }} />;
    };

    render(<Test />);
    controller.assertMeasuredSize({ width: undefined, height: undefined });

    await awaitNextFrame();
    controller.assertMeasuredSize({ width: 100, height: 200 });
  });
});
