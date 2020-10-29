import React, {
  useEffect,
  useState,
  useRef,
  RefObject,
  FunctionComponent,
  RefCallback,
} from "react";
import useResizeObserver from "../";
import useResizeObserverPolyfilled from "../polyfilled";
import delay from "delay";
import {
  createComponentHandler,
  Observed,
  render,
  HandlerReceiver,
  ObservedSize,
  MultiHandlerResolverComponentProps,
  ComponentHandler,
  HandlerResolverComponentProps,
} from "./utils";

describe("Vanilla tests", () => {
  it("should render with undefined sizes at first", async () => {
    const handler = await render(Observed);
    handler.assertDefaultSize();
  });

  it("should render with custom defaults", async () => {
    const { assertSize } = await render(
      Observed,
      {},
      {
        defaultWidth: 24,
        defaultHeight: 42,
      }
    );

    // By running this assertion immediately, it should check the default values
    // instead ot the first on-mount measurement.
    assertSize({ width: 24, height: 42 });
  });

  it("should follow size changes correctly with appropriate render count and without sub-pixels as they're used in CSS", async () => {
    const {
      setAndAssertSize,
      setSize,
      assertSize,
      assertRenderCount,
    } = await render(Observed, { waitForFirstMeasurement: true });

    // Default render + first measurement
    assertRenderCount(2);

    await setAndAssertSize({ width: 100, height: 200 });
    assertRenderCount(3);

    setSize({ width: 321, height: 456 });
    await delay(50);
    assertSize({ width: 321, height: 456 });
    assertRenderCount(4);
  });

  it("should handle multiple instances", async () => {
    const Test: FunctionComponent<MultiHandlerResolverComponentProps> = ({
      resolveHandler,
    }) => {
      let resolveHandler1: HandlerReceiver = () => {};
      let resolveHandler2: HandlerReceiver = () => {};

      const handlersPromise = Promise.all([
        new Promise<ComponentHandler>(
          (resolve) => (resolveHandler1 = resolve as HandlerReceiver)
        ),
        new Promise<ComponentHandler>(
          (resolve) => (resolveHandler2 = resolve as HandlerReceiver)
        ),
      ]);

      useEffect(() => {
        handlersPromise.then(
          ([handler1, handler2]: [ComponentHandler, ComponentHandler]) => {
            resolveHandler([handler1, handler2]);
          }
        );
      }, []);

      return (
        <>
          <Observed resolveHandler={resolveHandler1} />
          <Observed resolveHandler={resolveHandler2} />
        </>
      );
    };
    const [handler1, handler2] = await render(Test);

    await Promise.all([
      handler1.setAndAssertSize({ width: 100, height: 200 }),
      handler2.setAndAssertSize({ width: 300, height: 400 }),
    ]);

    handler1.assertRenderCount(2);
    handler2.assertRenderCount(2);

    await handler2.setAndAssertSize({ width: 321, height: 456 });

    handler1.assertRenderCount(2);
    handler2.assertRenderCount(3);

    // Instance No. 1 should still be at the previous state.
    handler1.assertSize({ width: 100, height: 200 });
  });

  it("should handle custom refs", async () => {
    const Test: FunctionComponent<HandlerResolverComponentProps> = ({
      resolveHandler,
    }) => {
      const ref = useRef(null);
      const { width, height } = useResizeObserver({ ref });
      const currentSizeRef = useRef<ObservedSize>({} as ObservedSize);
      currentSizeRef.current.height = height;
      currentSizeRef.current.width = width;

      useEffect(() => {
        resolveHandler(createComponentHandler({ currentSizeRef }));
      }, []);

      return (
        <div ref={ref} style={{ width: 100, height: 200 }}>
          {width}x{height}
        </div>
      );
    };

    const handler = await render(Test);

    // Default
    handler.assertDefaultSize();

    // Actual measurement
    await delay(50);
    handler.assertSize({ width: 100, height: 200 });
  });

  it("should be able to reuse the same ref to measure different elements", async () => {
    let switchRefs = (): void => {
      throw new Error(`"switchRefs" should've been implemented by now.`);
    };
    const Test = ({ resolveHandler }: { resolveHandler: HandlerReceiver }) => {
      const ref1 = useRef<HTMLDivElement>(null);
      const ref2 = useRef<HTMLDivElement>(null);
      const [stateRef, setStateRef] = useState<RefObject<HTMLDivElement>>(ref1); // Measures ref1 first
      const sizeRef = useRef(null);
      const { width, height } = useResizeObserver({ ref: stateRef });
      const currentSizeRef = useRef<ObservedSize>({
        width: undefined,
        height: undefined,
      });
      currentSizeRef.current.width = width;
      currentSizeRef.current.height = height;

      useEffect(() => {
        // Measures the second div on demand
        switchRefs = () => setStateRef(ref2);

        resolveHandler(createComponentHandler({ currentSizeRef }));
      }, []);

      return (
        <>
          <div ref={sizeRef}>
            {width}x{height}
          </div>
          <div ref={ref1} style={{ width: 100, height: 200 }} />
          <div ref={ref2} style={{ width: 150, height: 250 }} />
        </>
      );
    };

    const handler = await render(Test);

    // Default
    handler.assertDefaultSize();

    // Div 1 measurement
    await delay(50);
    handler.assertSize({ width: 100, height: 200 });

    // Div 2 measurement
    switchRefs();
    await delay(50);
    handler.assertSize({ width: 150, height: 250 });
  });

  it("should be able to render without mock defaults", async () => {
    const handler = await render(Observed);

    // Default values should be undefined
    handler.assertDefaultSize();

    handler.setSize({ width: 100, height: 100 });
    await delay(50);
    handler.assertSize({ width: 100, height: 100 });
  });

  it("should not trigger unnecessary renders with the same width or height", async () => {
    const handler = await render(Observed);

    handler.assertDefaultSize();

    // Default render + first measurement
    await delay(50);
    handler.assertRenderCount(2);

    handler.setSize({ width: 100, height: 102 });
    await delay(50);
    handler.assertSize({ width: 100, height: 102 });
    handler.assertRenderCount(3);

    // Shouldn't trigger on subpixel values that are rounded to be the same as the
    // previous size
    handler.setSize({ width: 100.4, height: 102.4 });
    await delay(50);
    handler.assertSize({ width: 100, height: 102 });
    handler.assertRenderCount(3);
  });

  it("should keep the same response instance between renders if nothing changed", async () => {
    let assertSameInstance = (): void => {
      throw new Error(
        `"assertSameInstance" should've been implemented by now.`
      );
    };

    const Test: FunctionComponent<HandlerResolverComponentProps> = ({
      resolveHandler,
    }) => {
      const previousResponseRef = useRef<
        | ({
            ref: RefCallback<HTMLElement>;
          } & ObservedSize)
        | null
      >(null);
      const response = useResizeObserver<HTMLDivElement>();
      const [state, setState] = useState(false);

      const sameInstance = previousResponseRef.current === response;
      previousResponseRef.current = response;

      useEffect(() => {
        if (response.width && response.height) {
          // Triggering an extra render once the hook properly measured the element size once.
          // This'll allow us to see if the hook keeps the same response object or not.
          setState(true);
        }
      }, [response]);

      useEffect(() => {
        if (!state) {
          return;
        }

        assertSameInstance = () => {
          expect(sameInstance).toBe(true);
        };

        // Everything is set up, ready for assertions
        resolveHandler({});
      }, [state]);

      return <div ref={response.ref}>{String(sameInstance)}</div>;
    };

    await render(Test);

    assertSameInstance();
  });

  it("should ignore invalid custom refs", async () => {
    const Test: FunctionComponent<HandlerResolverComponentProps> = ({
      resolveHandler,
    }) => {
      // Passing in an invalid custom ref.
      // Same should be work if "null" or something similar gets passed in.
      const { width, height } = useResizeObserver({
        ref: {} as RefObject<HTMLDivElement>,
      });
      const currentSizeRef = useRef<ObservedSize>({} as ObservedSize);
      currentSizeRef.current.width = width;
      currentSizeRef.current.height = height;

      useEffect(() => {
        resolveHandler(createComponentHandler({ currentSizeRef }));
      }, []);

      return (
        <div>
          {width}x{height}
        </div>
      );
    };

    const handler = await render(Test);

    // Since no refs were passed in with an element to be measured, the hook should
    // stay on the defaults
    await delay(50);
    handler.assertDefaultSize();
  });

  it("should work with the polyfilled version", async () => {
    const Test: FunctionComponent<HandlerResolverComponentProps> = ({
      resolveHandler,
    }) => {
      const { ref, width, height } = useResizeObserverPolyfilled<
        HTMLDivElement
      >();
      const currentSizeRef = useRef<ObservedSize>({} as ObservedSize);
      currentSizeRef.current.width = width;
      currentSizeRef.current.height = height;

      useEffect(() => {
        resolveHandler(createComponentHandler({ currentSizeRef }));
      }, []);

      return (
        <div style={{ width: 50, height: 40 }} ref={ref}>
          {width}x{height}
        </div>
      );
    };

    const { assertSize } = await render(Test);

    await delay(50);
    assertSize({ width: 50, height: 40 });
  });

  it("should be able to work with onResize instead of rendering the values", async () => {
    const observations: ObservedSize[] = [];
    const handler = await render(
      Observed,
      {},
      { onResize: (size: ObservedSize) => observations.push(size) }
    );

    handler.setSize({ width: 100, height: 200 });
    await delay(50);
    handler.setSize({ width: 101, height: 201 });
    await delay(50);

    // Should stay at default as width/height is not passed to the hook response
    // when an onResize callback is given
    handler.assertDefaultSize();

    expect(observations.length).toBe(2);
    expect(observations[0]).toEqual({ width: 100, height: 200 });
    expect(observations[1]).toEqual({ width: 101, height: 201 });

    // Should render once on mount only
    handler.assertRenderCount(1);
  });

  it("should handle if the onResize handler changes properly with the correct render counts", async () => {
    let changeOnResizeHandler: (fn: Function) => void = () => {};
    const Test: FunctionComponent<HandlerResolverComponentProps> = ({
      resolveHandler,
      ...props
    }) => {
      const [onResizeHandler, setOnResizeHandler] = useState(() => () => {});

      changeOnResizeHandler = (handler) => setOnResizeHandler(() => handler);

      return (
        <Observed
          {...props}
          onResize={onResizeHandler}
          resolveHandler={resolveHandler}
        />
      );
    };

    const { assertRenderCount, setSize } = await render(Test, {
      waitForFirstMeasurement: true,
    });

    // Since `onResize` is used, no extra renders should've been triggered at this
    // point. (As opposed to the defaults where the hook would trigger a render
    // with the first measurement.)
    assertRenderCount(1);

    const observations1: ObservedSize[] = [];
    const observations2: ObservedSize[] = [];

    // Establishing a default, which'll be measured when the resize handler is set.
    setSize({ width: 1, height: 1 });
    await delay(50);

    assertRenderCount(1);

    changeOnResizeHandler((size: ObservedSize) => observations1.push(size));
    await delay(50);
    setSize({ width: 1, height: 2 });
    await delay(50);
    setSize({ width: 3, height: 4 });

    assertRenderCount(2);

    await delay(50);
    changeOnResizeHandler((size: ObservedSize) => observations2.push(size));
    await delay(50);
    setSize({ width: 5, height: 6 });
    await delay(50);
    setSize({ width: 7, height: 8 });
    await delay(50);

    assertRenderCount(3);

    expect(observations1.length).toBe(2);
    expect(observations1[0]).toEqual({ width: 1, height: 2 });
    expect(observations1[1]).toEqual({ width: 3, height: 4 });

    expect(observations2.length).toBe(2);
    expect(observations2[0]).toEqual({ width: 5, height: 6 });
    expect(observations2[1]).toEqual({ width: 7, height: 8 });
  });
});
