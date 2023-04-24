// Tests written with react testing library
import React, { useRef, useState, useCallback } from "react";
import useResizeObserver, {
  ResizeHandler,
  ObservedSize,
  ResizeObserverBoxOptions,
  RoundingFunction,
} from "../";
import { render, cleanup, act } from "@testing-library/react";
import useRenderTrigger from "./utils/useRenderTrigger";
import awaitNextFrame from "./utils/awaitNextFrame";
import createController from "./utils/createController";
import useMergedCallbackRef from "./utils/useMergedCallbackRef";
import { supports } from "./utils";

afterEach(() => {
  cleanup();
});

describe("Testing Lib: Basics", () => {
  // TODO also make sure this error doesn't happen in the console: "Warning: Can't perform a React state update on an unmounted component..."
  it("should measure the right sizes", async () => {
    const controller = createController();

    const Test = () => {
      const {
        ref,
        width = 0,
        height = 0,
      } = useResizeObserver<HTMLDivElement>();

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
    await act(async () => {
      await controller.setSize({ width: 100, height: 200 });
    });

    controller.assertMeasuredSize({ width: 100, height: 200 });
    controller.assertRenderCount(2);
  });

  it("should render normally in react 18 strict mode on mount", async () => {
    const controller = createController();
    const Test = () => {
      const { ref, width, height } = useResizeObserver();
      controller.reportMeasuredSize({ width, height });

      return <div ref={ref} style={{ width: 100, height: 100 }} />;
    };

    render(
      <React.StrictMode>
        <Test />
      </React.StrictMode>
    );
    await act(async () => {
      await awaitNextFrame();
    });

    controller.assertMeasuredSize({ width: 100, height: 100 });
  });

  it("should report 0 width/height size", async () => {
    const controller = createController();
    const Test = () => {
      const { ref, width, height } = useResizeObserver();
      controller.reportMeasuredSize({ width, height });

      return <div ref={ref} style={{ width: 0, height: 0 }} />;
    };

    render(
      <React.StrictMode>
        <Test />
      </React.StrictMode>
    );
    await act(async () => {
      await awaitNextFrame();
    });

    controller.assertMeasuredSize({ width: 0, height: 0 });
  });

  it("should call onResize on mount when a custom ref is used", async () => {
    const controller = createController();
    const Test = () => {
      const ref = useRef(null);
      // Declaring onResize here only to test the availability and correctness of the exported `ResizeHandler` function
      const onResize: ResizeHandler = (size) => {
        controller.reportMeasuredSize(size);
      };
      useResizeObserver({
        ref,
        onResize,
      });

      return <div ref={ref} style={{ width: 10, height: 20 }} />;
    };

    render(<Test />);
    await act(async () => {
      await awaitNextFrame();
    });

    controller.assertMeasuredSize({ width: 10, height: 20 });
  });
});

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

      return <div ref={ref} />;
    };

    render(<Test />);

    act(() => {
      controller.triggerRender();
    });

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

    expect(resizeObserverInstanceCount).toBe(1);
    expect(resizeObserverObserveCount).toBe(1);
    expect(resizeObserverUnobserveCount).toBe(0);

    act(() => {
      rerender(<Test observeNewElement={true} />);
    });

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
    await act(async () => {
      rerender(<Test doMeasure={true} />);
    });
    await act(async () => {
      await awaitNextFrame();
    });

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
      const ref = useRef<HTMLDivElement>(null);
      const { width, height } = useResizeObserver<HTMLDivElement>({ ref });

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
    await act(async () => {
      rerender(<Test mount={true} />);
    });
    await act(async () => {
      await awaitNextFrame();
    });
    controller.assertMeasuredSize({ width: 100, height: 200 });
  });

  it("should work on a normal mount", async () => {
    const controller = createController();
    const Test = () => {
      const { ref, width, height } = useResizeObserver<HTMLDivElement>();

      controller.reportMeasuredSize({ width, height });

      return <div ref={ref} style={{ width: 100, height: 200 }} />;
    };

    act(() => {
      render(<Test />);
    });
    controller.assertMeasuredSize({ width: undefined, height: undefined });

    await act(async () => {
      await awaitNextFrame();
    });
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

    await act(async () => {
      await awaitNextFrame();
    });
    controller.assertMeasuredSize({ width: 100, height: 200 });
  });

  // todo separate box option testing to a separate describe block
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

      const mergedCallbackRef = useMergedCallbackRef(
        ref,
        (element: HTMLElement) => {
          c1.provideSetSizeFunction(element);
        }
      );

      c1.incrementRenderCount();
      c1.reportMeasuredSize({ width, height });

      return (
        <div
          ref={mergedCallbackRef}
          style={{ padding: "10px 20px", border: "1px solid" }}
        />
      );
    };

    render(<Test />);

    // Default response on the first render before an actual measurement took place
    c1.assertMeasuredSize({ width: undefined, height: undefined });
    c1.assertRenderCount(1);

    // Should react to component size changes.
    await act(async () => {
      await c1.setSize({ width: 100, height: 200 });
    });

    // Should report border-size
    if (supports.borderBox) {
      c1.assertRenderCount(2);
      c1.assertMeasuredSize({ width: 142, height: 222 });
    } else {
      // In non-supporting browser the hook would have nothing to report.
      c1.assertRenderCount(1);
      c1.assertMeasuredSize({ width: undefined, height: undefined });
    }

    // Should be able to switch to observing content-box
    await act(async () => {
      await c2.setBox("content-box");
    });
    await act(async () => {
      await awaitNextFrame();
    });
    c1.assertMeasuredSize({ width: 100, height: 200 });

    // 2 extra render should be happening:
    // - One for setting the local `box` state
    // - Another as a reaction to that coming from the hook, which would report the new values.
    if (supports.borderBox) {
      c1.assertRenderCount(4);
    } else {
      c1.assertRenderCount(3);
    }

    // Switching back yet again should be reported with "undefined" in non-supporting browsers.
    await act(async () => {
      await c2.setBox("border-box");
    });
    await act(async () => {
      await awaitNextFrame();
    });
    if (supports.borderBox) {
      c1.assertRenderCount(6);
      c1.assertMeasuredSize({ width: 142, height: 222 });
    } else {
      // In non-supporting browser the hook would have nothing to report.
      c1.assertRenderCount(5);
      c1.assertMeasuredSize({ width: undefined, height: undefined });
    }
  });

  it("should be able to measure device pixel content box in supporting browsers", async () => {
    const c1 = createController();
    type Controller = {
      setZoom: (zoom: number) => Promise<void>;
    };
    const c2 = {} as Controller;

    const Test = () => {
      const { ref, width, height } = useResizeObserver<HTMLDivElement>({
        box: "device-pixel-content-box",
      });
      const localRef = useRef<HTMLDivElement | null>(null);
      c2.setZoom = useCallback(async (zoom) => {
        if (localRef.current) {
          // @ts-ignore
          localRef.current.style.zoom = String(zoom);
          await awaitNextFrame();
        }
      }, []);

      const mergedCallbackRef = useMergedCallbackRef(
        ref,
        (element: HTMLDivElement) => {
          localRef.current = element;
          if (localRef.current) {
            // @ts-ignore
            window.s = localRef.current.style;
          }
          c1.provideSetSizeFunction(element);
        }
      );

      c1.incrementRenderCount();
      c1.reportMeasuredSize({ width, height });

      return <div ref={mergedCallbackRef} />;
    };

    render(<Test />);

    // Default response on the first render before an actual measurement took place
    c1.assertRenderCount(1);
    c1.assertMeasuredSize({ width: undefined, height: undefined });

    await act(async () => {
      await c1.setSize({ width: 100, height: 200 });
    });
    if (supports.devicePixelContentBoxSize) {
      c1.assertRenderCount(2);
      c1.assertMeasuredSize({
        width: Math.round(100 * devicePixelRatio),
        height: Math.round(200 * devicePixelRatio),
      });
    } else {
      c1.assertRenderCount(1);
      c1.assertMeasuredSize({ width: undefined, height: undefined });
    }
  });

  it("should not report repeated values with the onResize callback", async () => {
    const c = createController();
    const Test = () => {
      const [size, setSize] = useState<ObservedSize>({
        width: undefined,
        height: undefined,
      });
      const { ref } = useResizeObserver<HTMLDivElement>({ onResize: setSize });

      const mergedCallbackRef = useMergedCallbackRef(
        ref,
        (element: HTMLDivElement) => {
          c.provideSetSizeFunction(element);
        }
      );

      c.incrementRenderCount();
      c.reportMeasuredSize(size);

      return <div ref={mergedCallbackRef} />;
    };

    render(<Test />);

    // Default response on the first render before an actual measurement took place
    c.assertRenderCount(1);
    c.assertMeasuredSize({ width: undefined, height: undefined });

    await act(async () => {
      await c.setSize({ width: 100, height: 200 });
    });
    c.assertRenderCount(2);
    c.assertMeasuredSize({ width: 100, height: 200 });

    await act(async () => {
      await c.setSize({ width: 100.2, height: 200.4 });
    });
    c.assertRenderCount(2);
    c.assertMeasuredSize({ width: 100, height: 200 });
  });

  it("should accept a custom rounding function, and adapt to function instance changes without unnecessary renders", async () => {
    const c1 = createController();
    type Controller = {
      replaceRoundFunction: (fn: "multiply" | "unset") => void;
    };
    const c2 = {} as Controller;
    const Test = () => {
      const [rounder, setRounder] = useState<RoundingFunction | undefined>(
        () => Math.ceil
      );
      const { ref, width, height } = useResizeObserver<HTMLDivElement>({
        round: rounder,
      });

      const mergedCallbackRef = useMergedCallbackRef(
        ref,
        (element: HTMLDivElement) => {
          c1.provideSetSizeFunction(element);
          c2.replaceRoundFunction = async (fn) => {
            setRounder(() =>
              fn === "multiply" ? (n: number) => Math.round(n * 2) : undefined
            );
          };
        }
      );

      c1.incrementRenderCount();
      c1.reportMeasuredSize({ width, height });

      return <div ref={mergedCallbackRef} />;
    };

    render(<Test />);

    // Default response on the first render before an actual measurement took place
    c1.assertRenderCount(1);
    c1.assertMeasuredSize({ width: undefined, height: undefined });

    await act(async () => {
      await c1.setSize({ width: 100.1, height: 200.1 });
    });
    c1.assertRenderCount(2);
    c1.assertMeasuredSize({ width: 101, height: 201 });

    // Testing normal re-renders

    await act(async () => {
      await c1.setSize({ width: 200.2, height: 300.2 });
    });
    c1.assertRenderCount(3);
    c1.assertMeasuredSize({ width: 201, height: 301 });

    await act(async () => {
      await c2.replaceRoundFunction("multiply");
    });
    await act(async () => {
      await awaitNextFrame();
    });
    c1.assertRenderCount(5);
    c1.assertMeasuredSize({ width: 400, height: 600 });

    await act(async () => {
      await c2.replaceRoundFunction("unset");
    });
    await act(async () => {
      await awaitNextFrame();
    });
    c1.assertRenderCount(7);
    c1.assertMeasuredSize({ width: 200, height: 300 });
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

      const mergedCallbackRef = useMergedCallbackRef(
        ref,
        (element: HTMLDivElement) => {
          c.provideSetSizeFunction(element);
        }
      );

      c.incrementRenderCount();
      c.reportMeasuredSize({ width, height });

      return <div ref={mergedCallbackRef} />;
    };

    render(<Test />);

    // Default response on the first render before an actual measurement took place
    c.assertRenderCount(1);
    c.assertMeasuredSize({ width: undefined, height: undefined });

    await act(async () => {
      await c.setSize({ width: 100, height: 100 });
    });
    c.assertRenderCount(2);
    c.assertMeasuredSize({ width: 0, height: 0 });

    await act(async () => {
      await c.setSize({ width: 200, height: 200 });
    });
    c.assertRenderCount(2);
    c.assertMeasuredSize({ width: 0, height: 0 });

    await act(async () => {
      await c.setSize({ width: 600, height: 600 });
    });
    c.assertRenderCount(3);
    c.assertMeasuredSize({ width: 500, height: 500 });

    await act(async () => {
      await c.setSize({ width: 1100, height: 600 });
    });
    c.assertRenderCount(4);
    c.assertMeasuredSize({ width: 1000, height: 500 });

    await act(async () => {
      await c.setSize({ width: 1100, height: 800 });
    });
    c.assertRenderCount(4);
    c.assertMeasuredSize({ width: 1000, height: 500 });

    await act(async () => {
      await c.setSize({ width: 1100, height: 1100 });
    });
    c.assertRenderCount(5);
    c.assertMeasuredSize({ width: 1000, height: 1000 });
  });
});
