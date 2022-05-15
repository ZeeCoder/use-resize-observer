// Tests written with react testing library
import React, { useRef, useState } from "react";
import { render, cleanup, act } from "@testing-library/react";
import createController from "./utils/createController";
import useResizeObserver from "../";
import useMergedCallbackRef from "./utils/useMergedCallbackRef";
import awaitNextFrame from "./utils/awaitNextFrame";
import { ObservedSize } from "./utils";
import useRenderTrigger from "./utils/useRenderTrigger";

afterEach(() => {
  cleanup();
});

describe("Basic tests", () => {
  it("should render with undefined sizes at first", async () => {
    const controller = createController();
    const Test = () => {
      const { ref, width, height } = useResizeObserver();
      controller.reportMeasuredSize({ width, height });

      return <div ref={ref} />;
    };

    render(<Test />);
    controller.assertMeasuredSize({ width: undefined, height: undefined });
  });

  it("should render with custom defaults", async () => {
    const controller = createController();
    const Test = () => {
      const { ref, width = 24, height = 42 } = useResizeObserver();
      controller.reportMeasuredSize({ width, height });

      return <div ref={ref} />;
    };

    // By running this assertion immediately, it should check the default values
    // instead ot the first on-mount measurement.
    render(<Test />);
    controller.assertMeasuredSize({ width: 24, height: 42 });
  });

  it("should follow size changes correctly with appropriate render count and without sub-pixels as they're used in CSS", async () => {
    const controller = createController();
    const Test = () => {
      const { ref, width = 24, height = 42 } = useResizeObserver();
      controller.reportMeasuredSize({ width, height });
      controller.incrementRenderCount();

      const mergedCallbackRef = useMergedCallbackRef(
        ref,
        (element: HTMLDivElement) => {
          controller.provideSetSizeFunction(element);
        }
      );

      return <div ref={mergedCallbackRef} />;
    };

    // Default render + first measurement
    render(<Test />);
    await act(async () => {
      await awaitNextFrame();
    });
    controller.assertRenderCount(2);

    await act(async () => {
      await controller.setSize({ width: 100, height: 200 });
    });
    controller.assertMeasuredSize({ width: 100, height: 200 });
    controller.assertRenderCount(3);

    await act(async () => {
      await controller.setSize({ width: 321, height: 456 });
    });
    controller.assertMeasuredSize({ width: 321, height: 456 });
    controller.assertRenderCount(4);
  });

  it("should handle multiple instances", async () => {
    const Test = ({
      controller,
    }: {
      controller: ReturnType<typeof createController>;
    }) => {
      const { ref, width = 24, height = 42 } = useResizeObserver();
      controller.reportMeasuredSize({ width, height });
      controller.incrementRenderCount();

      const mergedCallbackRef = useMergedCallbackRef(
        ref,
        (element: HTMLDivElement) => {
          controller.provideSetSizeFunction(element);
        }
      );

      return <div ref={mergedCallbackRef} />;
    };
    const controller1 = createController();
    const controller2 = createController();

    render(
      <>
        <Test controller={controller1} />
        <Test controller={controller2} />
      </>
    );

    await act(async () => {
      await controller1.setSize({ width: 100, height: 200 });
      await controller2.setSize({ width: 300, height: 400 });
    });

    controller1.assertMeasuredSize({ width: 100, height: 200 });
    controller2.assertMeasuredSize({ width: 300, height: 400 });

    controller1.assertRenderCount(2);
    controller2.assertRenderCount(2);

    await act(async () => {
      await controller2.setSize({ width: 321, height: 456 });
    });
    controller1.assertMeasuredSize({ width: 100, height: 200 });
    controller2.assertMeasuredSize({ width: 321, height: 456 });
    controller1.assertRenderCount(2);
    controller2.assertRenderCount(3);
  });

  it("should handle ref objects on mount", async () => {
    const controller = createController();
    const Test = () => {
      const ref = useRef(null);
      const { width, height } = useResizeObserver({ ref });
      controller.reportMeasuredSize({ width, height });

      return <div ref={ref} style={{ width: 100, height: 200 }} />;
    };

    render(<Test />);
    controller.assertMeasuredSize({ width: undefined, height: undefined });

    // Actual measurement
    await act(async () => {
      await awaitNextFrame();
    });
    controller.assertMeasuredSize({ width: 100, height: 200 });
  });

  it("should handle ref objects calling onResize on mount", async () => {
    const controller = createController();
    const Test = () => {
      const ref = useRef(null);
      useResizeObserver({
        ref,
        onResize: (size) => {
          controller.reportMeasuredSize(size);
        },
      });

      return <div ref={ref} style={{ width: 100, height: 200 }} />;
    };

    render(<Test />);
    controller.assertMeasuredSize({ width: undefined, height: undefined });

    // Actual measurement
    await act(async () => {
      await awaitNextFrame();
    });
    controller.assertMeasuredSize({ width: 100, height: 200 });
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

    render(<Test />);

    // Default
    controller.assertMeasuredSize({ width: undefined, height: undefined });

    // Div 1 measurement
    await act(async () => {
      await awaitNextFrame();
    });
    controller.assertMeasuredSize({ width: 100, height: 200 });

    // Div 2 measurement
    await act(async () => {
      switchRefs();
    });
    await act(async () => {
      await awaitNextFrame();
    });
    controller.assertMeasuredSize({ width: 150, height: 250 });
  });

  it("should not trigger unnecessary renders with the same width or height", async () => {
    const controller = createController();
    const Test = () => {
      const { ref, width, height } = useResizeObserver();
      controller.reportMeasuredSize({ width, height });
      controller.incrementRenderCount();

      const mergedCallbackRef = useMergedCallbackRef(
        ref,
        (element: HTMLDivElement) => {
          controller.provideSetSizeFunction(element);
        }
      );

      return <div ref={mergedCallbackRef} />;
    };

    render(<Test />);

    // Default render + first measurement
    controller.assertMeasuredSize({ width: undefined, height: undefined });
    await act(async () => {
      await awaitNextFrame();
    });
    controller.assertRenderCount(2);

    await act(async () => {
      await controller.setSize({ width: 100, height: 102 });
    });
    controller.assertMeasuredSize({ width: 100, height: 102 });
    controller.assertRenderCount(3);

    // Shouldn't trigger on subpixel values that are rounded to be the same as the
    // previous size
    await act(async () => {
      await controller.setSize({ width: 100.4, height: 102.4 });
    });
    controller.assertMeasuredSize({ width: 100, height: 102 });
    controller.assertRenderCount(3);
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

    render(<Test />);
    await act(async () => {
      await awaitNextFrame();
    });

    await act(async () => {
      await controller.triggerRender();
    });
    // ignoring the first "undefined" measurement before uRO received the element
    responses.unshift();

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

    render(<Test />);

    // Since no refs were passed in with an element to be measured, the hook should
    // stay on the defaults
    await awaitNextFrame();
    controller.assertMeasuredSize({ width: undefined, height: undefined });
  });

  it("should be able to work with onResize instead of rendering the values", async () => {
    const observations: ObservedSize[] = [];
    const controller = createController();
    const Test = () => {
      const { ref, width, height } = useResizeObserver({
        onResize: (size) => observations.push(size),
      });
      controller.reportMeasuredSize({ width, height });
      controller.incrementRenderCount();

      const mergedCallbackRef = useMergedCallbackRef(
        ref,
        (element: HTMLDivElement) => {
          controller.provideSetSizeFunction(element);
        }
      );

      return <div ref={mergedCallbackRef} />;
    };

    render(<Test />);

    await act(async () => {
      await controller.setSize({ width: 100, height: 200 });
      await controller.setSize({ width: 101, height: 201 });
    });

    // Should stay at default as width/height is not passed to the hook response
    // when an onResize callback is given
    controller.assertMeasuredSize({ width: undefined, height: undefined });

    expect(observations.length).toBe(2);
    expect(observations[0]).toEqual({ width: 100, height: 200 });
    expect(observations[1]).toEqual({ width: 101, height: 201 });

    // Should render once on mount only
    controller.assertRenderCount(1);
  });

  it("should handle if the onResize handler changes, with the correct render counts", async () => {
    const controller = createController();
    type OnResizeHandler = (size: ObservedSize) => {};
    let changeOnResizeHandler = (handler: OnResizeHandler) => {};
    const Test = () => {
      const [onResize, setOnResize] = useState<OnResizeHandler>(() => () => {});
      changeOnResizeHandler = (handler) => setOnResize(() => handler);
      const { ref, width, height } = useResizeObserver({ onResize });
      controller.reportMeasuredSize({ width, height });
      controller.incrementRenderCount();

      const mergedCallbackRef = useMergedCallbackRef(
        ref,
        (element: HTMLDivElement) => {
          controller.provideSetSizeFunction(element);
        }
      );

      return <div ref={mergedCallbackRef} />;
    };

    render(<Test />);

    // Since `onResize` is used, no extra renders should've been triggered at this
    // point. (As opposed to the defaults where the hook would trigger a render
    // with the first measurement.)
    controller.assertRenderCount(1);

    const observations1: ObservedSize[] = [];
    const observations2: ObservedSize[] = [];
    // Establishing a default onResize handler, which'll be measured when the resize handler is set.
    await act(async () => {
      await controller.setSize({ width: 1, height: 1 });
    });
    controller.assertRenderCount(1);

    await act(async () => {
      changeOnResizeHandler((size) => observations1.push(size));
    });
    await act(async () => {
      await controller.setSize({ width: 1, height: 2 });
      await controller.setSize({ width: 3, height: 4 });
    });
    controller.assertRenderCount(2);

    await act(async () => {
      changeOnResizeHandler((size) => observations2.push(size));
    });
    await act(async () => {
      await controller.setSize({ width: 5, height: 6 });
      await controller.setSize({ width: 7, height: 8 });
    });
    controller.assertRenderCount(3);

    expect(observations1.length).toBe(2);
    expect(observations1[0]).toEqual({ width: 1, height: 2 });
    expect(observations1[1]).toEqual({ width: 3, height: 4 });

    expect(observations2.length).toBe(2);
    expect(observations2[0]).toEqual({ width: 5, height: 6 });
    expect(observations2[1]).toEqual({ width: 7, height: 8 });
  });
});
