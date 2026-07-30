import { StrictMode, useCallback, useRef, useState } from "react";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { useResizeObserver } from "../../src";
import type {
  ObservedSize,
  ResizeHandler,
  ResizeObserverBoxOptions,
  RoundingFunction,
} from "../../src";
import createController from "../utils/createController";
import useMergedCallbackRef from "../utils/useMergedCallbackRef";
import useRenderTrigger from "../utils/useRenderTrigger";
import awaitNextFrame from "../utils/awaitNextFrame";
import { supports } from "../utils/supports";

describe("Basics", () => {
  it("should render with undefined sizes at first", async () => {
    const controller = createController();
    const Test = () => {
      const { ref, width, height } = useResizeObserver();
      controller.reportMeasuredSize({ width, height });

      return <div ref={ref} />;
    };

    await render(<Test />);
    controller.assertInitialSize({ width: undefined, height: undefined });
  });

  it("should render with custom defaults", async () => {
    const controller = createController();
    const Test = () => {
      const { ref, width = 24, height = 42 } = useResizeObserver();
      controller.reportMeasuredSize({ width, height });

      return <div ref={ref} />;
    };

    // The first render (before any measurement) should surface the destructuring
    // defaults instead of a measured value.
    await render(<Test />);
    controller.assertInitialSize({ width: 24, height: 42 });
  });

  it("should measure the right sizes", async () => {
    const controller = createController();

    const Test = () => {
      const { ref, width = 0, height = 0 } = useResizeObserver<HTMLDivElement>();

      const mergedCallbackRef = useMergedCallbackRef(ref, (element: HTMLElement) => {
        controller.provideSetSizeFunction(element);
      });

      controller.incrementRenderCount();
      controller.reportMeasuredSize({ width, height });

      return <div ref={mergedCallbackRef} />;
    };

    await render(<Test />);

    // Default response on the first render before an actual measurement took place
    controller.assertInitialSize({ width: 0, height: 0 });

    // Let the initial on-mount measurement settle, then verify each subsequent
    // size change produces exactly one additional render (no unnecessary renders).
    await awaitNextFrame();
    const baseCount = controller.getRenderCount();

    await controller.setSize({ width: 100, height: 200 });
    controller.assertMeasuredSize({ width: 100, height: 200 });
    expect(controller.getRenderCount()).toBe(baseCount + 1);

    await controller.setSize({ width: 321, height: 456 });
    controller.assertMeasuredSize({ width: 321, height: 456 });
    expect(controller.getRenderCount()).toBe(baseCount + 2);
  });

  it("should follow size changes correctly with appropriate render count and without sub-pixels as they're used in CSS", async () => {
    const controller = createController();
    const Test = () => {
      const { ref, width = 24, height = 42 } = useResizeObserver();
      controller.reportMeasuredSize({ width, height });
      controller.incrementRenderCount();

      const mergedCallbackRef = useMergedCallbackRef(ref, (element: HTMLDivElement) => {
        controller.provideSetSizeFunction(element);
      });

      return <div ref={mergedCallbackRef} />;
    };

    // Default render + first measurement
    await render(<Test />);
    await awaitNextFrame();
    controller.assertRenderCount(2);

    await controller.setSize({ width: 100, height: 200 });
    controller.assertMeasuredSize({ width: 100, height: 200 });
    controller.assertRenderCount(3);

    await controller.setSize({ width: 321, height: 456 });
    controller.assertMeasuredSize({ width: 321, height: 456 });
    controller.assertRenderCount(4);
  });

  it("should handle multiple instances", async () => {
    const Test = ({ controller }: { controller: ReturnType<typeof createController> }) => {
      const { ref, width = 24, height = 42 } = useResizeObserver();
      controller.reportMeasuredSize({ width, height });
      controller.incrementRenderCount();

      const mergedCallbackRef = useMergedCallbackRef(ref, (element: HTMLDivElement) => {
        controller.provideSetSizeFunction(element);
      });

      return <div ref={mergedCallbackRef} />;
    };
    const controller1 = createController();
    const controller2 = createController();

    await render(
      <>
        <Test controller={controller1} />
        <Test controller={controller2} />
      </>,
    );

    // Let the initial on-mount measurements settle before counting renders.
    await awaitNextFrame();
    const base1 = controller1.getRenderCount();
    const base2 = controller2.getRenderCount();

    await controller1.setSize({ width: 100, height: 200 });
    await controller2.setSize({ width: 300, height: 400 });

    controller1.assertMeasuredSize({ width: 100, height: 200 });
    controller2.assertMeasuredSize({ width: 300, height: 400 });

    expect(controller1.getRenderCount()).toBe(base1 + 1);
    expect(controller2.getRenderCount()).toBe(base2 + 1);

    // Resizing the second instance must not affect the first.
    await controller2.setSize({ width: 321, height: 456 });
    controller1.assertMeasuredSize({ width: 100, height: 200 });
    controller2.assertMeasuredSize({ width: 321, height: 456 });
    expect(controller1.getRenderCount()).toBe(base1 + 1);
    expect(controller2.getRenderCount()).toBe(base2 + 2);
  });

  it("should render normally in strict mode on mount", async () => {
    const controller = createController();
    const Test = () => {
      const { ref, width, height } = useResizeObserver();
      controller.reportMeasuredSize({ width, height });

      return <div ref={ref} style={{ width: 100, height: 100 }} />;
    };

    await render(
      <StrictMode>
        <Test />
      </StrictMode>,
    );
    await awaitNextFrame();

    controller.assertMeasuredSize({ width: 100, height: 100 });
  });

  it("should work on a normal mount", async () => {
    const controller = createController();
    const Test = () => {
      const { ref, width, height } = useResizeObserver<HTMLDivElement>();

      controller.reportMeasuredSize({ width, height });

      return <div ref={ref} style={{ width: 100, height: 200 }} />;
    };

    await render(<Test />);
    controller.assertInitialSize({ width: undefined, height: undefined });

    await awaitNextFrame();
    controller.assertMeasuredSize({ width: 100, height: 200 });
  });

  it("should keep the same response instance between renders if nothing changed", async () => {
    const responses: ReturnType<typeof useResizeObserver>[] = [];
    const controller = createController();
    const Test = () => {
      const response = useResizeObserver();
      if (response.width) {
        responses.push(response);
      }
      controller.triggerRender = useRenderTrigger();

      return <div ref={response.ref} style={{ width: 10, height: 20 }} />;
    };

    await render(<Test />);
    await awaitNextFrame();

    await controller.triggerRender();

    // As the size did not change between renders, the response objects should be the same by reference.
    expect(responses.length).toBe(2);
    expect(responses[0]).toBe(responses[1]);
  });

  it("should ignore invalid custom refs", async () => {
    const controller = createController();
    const Test = () => {
      const response = useResizeObserver({ ref: {} as HTMLDivElement });
      controller.reportMeasuredSize(response);

      return <div />;
    };

    await render(<Test />);

    // Since no refs were passed in with an element to be measured, the hook should
    // stay on the defaults
    await awaitNextFrame();
    controller.assertMeasuredSize({ width: undefined, height: undefined });
  });

  it("reports a genuinely-zero dimension as 0, not undefined (#103)", async () => {
    const controller = createController();
    const Test = () => {
      const { ref, width, height } = useResizeObserver<HTMLDivElement>();
      controller.reportMeasuredSize({ width, height });

      // A visible element with a real height of 0 — distinct from "not measured".
      return <div ref={ref} style={{ width: 100, height: 0 }} />;
    };

    await render(<Test />);
    // Before any measurement, both dimensions are unknown (undefined).
    controller.assertInitialSize({ width: undefined, height: undefined });

    // After measurement, the zero height must be reported as 0, not undefined,
    // so consumers can tell a measured 0 apart from a not-yet-measured element.
    await awaitNextFrame();
    controller.assertMeasuredSize({ width: 100, height: 0 });
  });
});

describe("Custom refs", () => {
  it("should handle ref objects on mount", async () => {
    const controller = createController();
    const Test = () => {
      const ref = useRef(null);
      const { width, height } = useResizeObserver({ ref });
      controller.reportMeasuredSize({ width, height });

      return <div ref={ref} style={{ width: 100, height: 200 }} />;
    };

    await render(<Test />);
    controller.assertInitialSize({ width: undefined, height: undefined });

    // Actual measurement
    await awaitNextFrame();
    controller.assertMeasuredSize({ width: 100, height: 200 });
  });

  it("should call onResize on mount when a custom ref is used", async () => {
    const controller = createController();
    const Test = () => {
      const ref = useRef(null);
      // Declaring onResize here only to test the availability and correctness of the exported `ResizeHandler` type
      const onResize: ResizeHandler = (size) => {
        controller.reportMeasuredSize(size);
      };
      useResizeObserver({ ref, onResize });

      return <div ref={ref} style={{ width: 10, height: 20 }} />;
    };

    await render(<Test />);
    await awaitNextFrame();

    controller.assertMeasuredSize({ width: 10, height: 20 });
  });

  it("should be able to reuse the same ref to measure different elements", async () => {
    let switchRefs = (): void => {
      throw new Error(`"switchRefs" should've been implemented by now.`);
    };
    const controller = createController();
    const Test = () => {
      const ref1 = useRef<HTMLDivElement>(null);
      const ref2 = useRef<HTMLDivElement>(null);
      const [stateRef, setStateRef] = useState(ref1); // Measuring ref1 first
      switchRefs = () => setStateRef(ref2);
      const response = useResizeObserver({ ref: stateRef });
      controller.reportMeasuredSize(response);

      return (
        <>
          <div ref={ref1} style={{ width: 100, height: 200 }} />
          <div ref={ref2} style={{ width: 150, height: 250 }} />
        </>
      );
    };

    await render(<Test />);

    // Default
    controller.assertInitialSize({ width: undefined, height: undefined });

    // Div 1 measurement
    await awaitNextFrame();
    controller.assertMeasuredSize({ width: 100, height: 200 });

    // Div 2 measurement
    switchRefs();
    await awaitNextFrame();
    controller.assertMeasuredSize({ width: 150, height: 250 });
  });

  it("should work with a regular element as the 'custom ref' too", async () => {
    const controller = createController();
    const Test = () => {
      // This is a bit of a roundabout way of simulating the case where we have
      // an Element from somewhere, when we can't simply use a RefCallback.
      const [element, setElement] = useState<HTMLDivElement | null>(null);
      const { width, height } = useResizeObserver<HTMLDivElement>({ ref: element });

      // Interestingly, if this callback is not memoised, then on each render,
      // the callback is called with "null", then again with the element.
      const receiveElement = useCallback((element: HTMLDivElement) => {
        setElement(element);
      }, []);

      controller.reportMeasuredSize({ width, height });

      return <div ref={receiveElement} style={{ width: 100, height: 200 }} />;
    };

    await render(<Test />);
    controller.assertInitialSize({ width: undefined, height: undefined });

    await awaitNextFrame();
    controller.assertMeasuredSize({ width: 100, height: 200 });
  });

  // Note that even though this sort of "works", callback refs are the preferred
  // method to use in such cases. Relying on this behaviour will certainly cause
  // issues down the line.
  it("should work with refs even if the ref value is filled by react later, with a delayed mount", async () => {
    const controller = createController();

    // Mounting later. Previously this wouldn't have been picked up
    // automatically, and users would've had to wait for the mount, and only
    // then set the ref from null, to its actual object value.
    // @see https://github.com/ZeeCoder/use-resize-observer/issues/43#issuecomment-674719609
    const Test = ({ mount = false }) => {
      const ref = useRef<HTMLDivElement>(null);
      const { width, height } = useResizeObserver<HTMLDivElement>({ ref });

      controller.triggerRender = useRenderTrigger();
      controller.reportMeasuredSize({ width, height });

      if (!mount) {
        return null;
      }

      return <div ref={ref} style={{ width: 100, height: 200 }} />;
    };

    // Reported size should be undefined before the hook kicks in — the component
    // renders `null` initially so there is no element for the ref object yet.
    const { rerender } = await render(<Test />);
    controller.assertInitialSize({ width: undefined, height: undefined });
    controller.assertMeasuredSize({ width: undefined, height: undefined });

    // Once mounted, the ref object *will* be filled in, but the hook only learns
    // about it on a subsequent render, where it re-evaluates the ref's current
    // value. A render trigger nudges that re-evaluation.
    await rerender(<Test mount={true} />);
    await awaitNextFrame();
    await controller.triggerRender();
    await awaitNextFrame();
    controller.assertMeasuredSize({ width: 100, height: 200 });
  });

  // This is the proper way of handling refs where the component mounts with a delay
  it("should pick up on delayed mounts", async () => {
    const controller = createController();

    const Test = ({ mount = false }) => {
      const { ref, width, height } = useResizeObserver<HTMLDivElement>();

      controller.reportMeasuredSize({ width, height });

      if (!mount) {
        return null;
      }

      return <div ref={ref} style={{ width: 100, height: 200 }} />;
    };

    // Reported size should be undefined before the hook kicks in
    const { rerender } = await render(<Test />);
    controller.assertMeasuredSize({ width: undefined, height: undefined });

    // Once the hook supposedly kicked in, it should still be undefined, as the ref is not in use yet.
    await awaitNextFrame();
    controller.assertMeasuredSize({ width: undefined, height: undefined });

    // Once mounted, the hook should automatically pick the new element up with
    // the RefCallback.
    await rerender(<Test mount={true} />);
    await awaitNextFrame();
    controller.assertMeasuredSize({ width: 100, height: 200 });
  });
});

describe("ResizeObserver instance counting", () => {
  let resizeObserverInstanceCount = 0;
  let resizeObserverObserveCount = 0;
  let resizeObserverUnobserveCount = 0;
  const NativeResizeObserver = window.ResizeObserver;

  beforeAll(() => {
    // @ts-expect-error - replacing the global with a counting proxy for these tests
    window.ResizeObserver = function PatchedResizeObserver(cb: ResizeObserverCallback) {
      resizeObserverInstanceCount++;

      const ro = new NativeResizeObserver(cb);

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
    window.ResizeObserver = NativeResizeObserver;
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

      return <div ref={ref} />;
    };

    await render(<Test />);

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

    const { rerender } = await render(<Test />);

    expect(resizeObserverInstanceCount).toBe(1);
    expect(resizeObserverObserveCount).toBe(1);
    expect(resizeObserverUnobserveCount).toBe(0);

    await rerender(<Test observeNewElement={true} />);

    expect(resizeObserverInstanceCount).toBe(1);
    expect(resizeObserverObserveCount).toBe(2);
    // The following unobserve count assertion actually caught the cleanup
    // functions being called more than one time, so it's especially important
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

    const { rerender } = await render(<Test doMeasure={false} />);

    // Default behaviour on initial mount with a null ref passed to the hook
    expect(resizeObserverInstanceCount).toBe(0);
    expect(renderCount).toBe(1);
    expect(measuredWidth).toBe(undefined);
    expect(measuredHeight).toBe(undefined);

    // Actually kickstarting the hook by switching from null to a real ref.
    await rerender(<Test doMeasure={true} />);
    await awaitNextFrame();

    expect(resizeObserverInstanceCount).toBe(1);
    expect(renderCount).toBe(3);
    expect(measuredWidth).toBe(100);
    expect(measuredHeight).toBe(200);
  });
});

describe("Box options", () => {
  // This test will also make sure that firefox works, where the reported sizes are not returned in an array.
  it("should support switching back-and-forth between box types", async () => {
    const c1 = createController();
    type Controller = {
      setBox: (box: ResizeObserverBoxOptions) => Promise<void>;
    };
    const c2 = {} as Controller;

    const Test = () => {
      const [box, setBox] = useState<ResizeObserverBoxOptions>("border-box");
      c2.setBox = useCallback(async (box) => {
        setBox(box);
      }, []);
      const { ref, width, height } = useResizeObserver<HTMLDivElement>({ box });

      const mergedCallbackRef = useMergedCallbackRef(ref, (element: HTMLElement) => {
        c1.provideSetSizeFunction(element);
      });

      c1.incrementRenderCount();
      c1.reportMeasuredSize({ width, height });

      return <div ref={mergedCallbackRef} style={{ padding: "10px 20px", border: "1px solid" }} />;
    };

    await render(<Test />);

    // Default response on the first render before an actual measurement took place
    c1.assertInitialSize({ width: undefined, height: undefined });

    // Should react to component size changes, reporting the border-box size.
    await c1.setSize({ width: 100, height: 200 });

    if (supports.borderBox) {
      await c1.waitForMeasuredSize({ width: 142, height: 222 });
    } else {
      // In a non-supporting browser the hook would have nothing to report.
      await c1.waitForMeasuredSize({ width: undefined, height: undefined });
    }

    // Should be able to switch to observing content-box (recreates the RO).
    await c2.setBox("content-box");
    await c1.waitForMeasuredSize({ width: 100, height: 200 });

    // Switching back to border-box reports the border-box size again (or stays
    // undefined in a non-supporting browser).
    await c2.setBox("border-box");
    if (supports.borderBox) {
      await c1.waitForMeasuredSize({ width: 142, height: 222 });
    } else {
      await c1.waitForMeasuredSize({ width: undefined, height: undefined });
    }
  });

  it("should be able to measure device pixel content box in supporting browsers", async ({
    skip,
  }) => {
    // Safari/WebKit does not implement the `device-pixel-content-box` option and
    // `observe()` throws a TypeError when it is passed, so this test only runs in
    // supporting engines (Chromium, Firefox).
    skip(!supports.devicePixelContentBoxSize, "device-pixel-content-box unsupported");

    const c1 = createController();

    const Test = () => {
      const { ref, width, height } = useResizeObserver<HTMLDivElement>({
        box: "device-pixel-content-box",
      });

      const mergedCallbackRef = useMergedCallbackRef(ref, (element: HTMLDivElement) => {
        c1.provideSetSizeFunction(element);
      });

      c1.incrementRenderCount();
      c1.reportMeasuredSize({ width, height });

      return <div ref={mergedCallbackRef} />;
    };

    await render(<Test />);

    // Default response on the first render before an actual measurement took place
    c1.assertInitialSize({ width: undefined, height: undefined });

    await c1.setSize({ width: 100, height: 200 });
    c1.assertMeasuredSize({
      width: Math.round(100 * devicePixelRatio),
      height: Math.round(200 * devicePixelRatio),
    });
  });
});

describe("Rounding", () => {
  it("should accept a custom rounding function, and adapt to function instance changes without unnecessary renders", async () => {
    const c1 = createController();
    type Controller = {
      replaceRoundFunction: (fn: "multiply" | "unset") => void;
    };
    const c2 = {} as Controller;
    const Test = () => {
      const [rounder, setRounder] = useState<RoundingFunction | undefined>(() => Math.ceil);
      const { ref, width, height } = useResizeObserver<HTMLDivElement>({
        round: rounder,
      });

      const mergedCallbackRef = useMergedCallbackRef(ref, (element: HTMLDivElement) => {
        c1.provideSetSizeFunction(element);
        c2.replaceRoundFunction = async (fn) => {
          setRounder(() => (fn === "multiply" ? (n: number) => Math.round(n * 2) : undefined));
        };
      });

      c1.incrementRenderCount();
      c1.reportMeasuredSize({ width, height });

      return <div ref={mergedCallbackRef} />;
    };

    await render(<Test />);

    // Default response on the first render before an actual measurement took place
    c1.assertInitialSize({ width: undefined, height: undefined });

    // Settle the initial measurement, then count renders relative to that point.
    await awaitNextFrame();
    const base = c1.getRenderCount();

    await c1.setSize({ width: 100.1, height: 200.1 });
    c1.assertMeasuredSize({ width: 101, height: 201 });
    expect(c1.getRenderCount()).toBe(base + 1);

    // Testing normal re-renders
    await c1.setSize({ width: 200.2, height: 300.2 });
    c1.assertMeasuredSize({ width: 201, height: 301 });
    expect(c1.getRenderCount()).toBe(base + 2);

    // Replacing the rounding function recreates the RO and re-measures with it:
    // one render for the state change, one for the freshly measured (and newly
    // rounded) value. Poll for the value, then assert the render count.
    await c2.replaceRoundFunction("multiply");
    await c1.waitForMeasuredSize({ width: 400, height: 600 });
    expect(c1.getRenderCount()).toBe(base + 4);

    await c2.replaceRoundFunction("unset");
    await c1.waitForMeasuredSize({ width: 200, height: 300 });
    expect(c1.getRenderCount()).toBe(base + 6);
  });

  it("should only re-render with a custom rounding function when it produces a new value", async () => {
    const c = createController();
    // A rounding function that "snaps" to its values.
    const rounder = (n: number) => {
      if (n < 500) {
        return 0;
      } else if (n < 1000) {
        return 500;
      }

      return 1000;
    };
    const Test = () => {
      const { ref, width, height } = useResizeObserver<HTMLDivElement>({
        round: rounder,
      });

      const mergedCallbackRef = useMergedCallbackRef(ref, (element: HTMLDivElement) => {
        c.provideSetSizeFunction(element);
      });

      c.incrementRenderCount();
      c.reportMeasuredSize({ width, height });

      // Start at 1x1 so the initial on-mount measurement deterministically
      // snaps to the 0-bucket regardless of the test viewport width.
      return <div ref={mergedCallbackRef} style={{ width: 1, height: 1 }} />;
    };

    await render(<Test />);

    // Default response on the first render before an actual measurement took place
    c.assertInitialSize({ width: undefined, height: undefined });

    // Settle the initial measurement (snaps to the 0-bucket), then count from there.
    await awaitNextFrame();
    const base = c.getRenderCount();
    c.assertMeasuredSize({ width: 0, height: 0 });

    await c.setSize({ width: 100, height: 100 });
    c.assertMeasuredSize({ width: 0, height: 0 });
    expect(c.getRenderCount()).toBe(base);

    await c.setSize({ width: 200, height: 200 });
    c.assertMeasuredSize({ width: 0, height: 0 });
    expect(c.getRenderCount()).toBe(base);

    await c.setSize({ width: 600, height: 600 });
    c.assertMeasuredSize({ width: 500, height: 500 });
    expect(c.getRenderCount()).toBe(base + 1);

    await c.setSize({ width: 1100, height: 600 });
    c.assertMeasuredSize({ width: 1000, height: 500 });
    expect(c.getRenderCount()).toBe(base + 2);

    await c.setSize({ width: 1100, height: 800 });
    c.assertMeasuredSize({ width: 1000, height: 500 });
    expect(c.getRenderCount()).toBe(base + 2);

    await c.setSize({ width: 1100, height: 1100 });
    c.assertMeasuredSize({ width: 1000, height: 1000 });
    expect(c.getRenderCount()).toBe(base + 3);
  });
});

describe("onResize callback", () => {
  it("should be able to work with onResize instead of rendering the values", async () => {
    const observations: ObservedSize[] = [];
    const controller = createController();
    const Test = () => {
      const { ref, width, height } = useResizeObserver({
        onResize: (size) => observations.push(size),
      });
      controller.reportMeasuredSize({ width, height });
      controller.incrementRenderCount();

      const mergedCallbackRef = useMergedCallbackRef(ref, (element: HTMLDivElement) => {
        controller.provideSetSizeFunction(element);
      });

      return <div ref={mergedCallbackRef} />;
    };

    await render(<Test />);

    await controller.setSize({ width: 100, height: 200 });
    await controller.setSize({ width: 101, height: 201 });

    // Should stay at default as width/height is not passed to the hook response
    // when an onResize callback is given
    controller.assertMeasuredSize({ width: undefined, height: undefined });

    expect(observations.length).toBe(2);
    expect(observations[0]).toEqual({ width: 100, height: 200 });
    expect(observations[1]).toEqual({ width: 101, height: 201 });

    // Should render once on mount only
    controller.assertRenderCount(1);
  });

  it("should not report repeated values with the onResize callback", async () => {
    const c = createController();
    const Test = () => {
      const [size, setSize] = useState<ObservedSize>({
        width: undefined,
        height: undefined,
      });
      const { ref } = useResizeObserver<HTMLDivElement>({ onResize: setSize });

      const mergedCallbackRef = useMergedCallbackRef(ref, (element: HTMLDivElement) => {
        c.provideSetSizeFunction(element);
      });

      c.incrementRenderCount();
      c.reportMeasuredSize(size);

      return <div ref={mergedCallbackRef} />;
    };

    await render(<Test />);

    // Default response on the first render before an actual measurement took place
    c.assertRenderCount(1);
    c.assertMeasuredSize({ width: undefined, height: undefined });

    await c.setSize({ width: 100, height: 200 });
    c.assertRenderCount(2);
    c.assertMeasuredSize({ width: 100, height: 200 });

    await c.setSize({ width: 100.2, height: 200.4 });
    c.assertRenderCount(2);
    c.assertMeasuredSize({ width: 100, height: 200 });
  });

  it("should handle if the onResize handler changes, with the correct render counts", async () => {
    const controller = createController();
    let changeOnResizeHandler = (_handler: ResizeHandler) => {};
    const Test = () => {
      const [onResize, setOnResize] = useState<ResizeHandler>(() => () => {});
      changeOnResizeHandler = (handler) => setOnResize(() => handler);
      const { ref, width, height } = useResizeObserver({ onResize });
      controller.reportMeasuredSize({ width, height });
      controller.incrementRenderCount();

      const mergedCallbackRef = useMergedCallbackRef(ref, (element: HTMLDivElement) => {
        controller.provideSetSizeFunction(element);
      });

      return <div ref={mergedCallbackRef} />;
    };

    await render(<Test />);

    // Since `onResize` is used, no extra renders should've been triggered at this
    // point. (As opposed to the defaults where the hook would trigger a render
    // with the first measurement.)
    controller.assertRenderCount(1);

    const observations1: ObservedSize[] = [];
    const observations2: ObservedSize[] = [];
    // Establishing a default onResize handler, which'll be measured when the resize handler is set.
    await controller.setSize({ width: 1, height: 1 });
    controller.assertRenderCount(1);

    changeOnResizeHandler((size) => observations1.push(size));
    await awaitNextFrame();
    await controller.setSize({ width: 1, height: 2 });
    await controller.setSize({ width: 3, height: 4 });
    controller.assertRenderCount(2);

    changeOnResizeHandler((size) => observations2.push(size));
    await awaitNextFrame();
    await controller.setSize({ width: 5, height: 6 });
    await controller.setSize({ width: 7, height: 8 });
    controller.assertRenderCount(3);

    expect(observations1.length).toBe(2);
    expect(observations1[0]).toEqual({ width: 1, height: 2 });
    expect(observations1[1]).toEqual({ width: 3, height: 4 });

    expect(observations2.length).toBe(2);
    expect(observations2[0]).toEqual({ width: 5, height: 6 });
    expect(observations2[1]).toEqual({ width: 7, height: 8 });
  });
});
