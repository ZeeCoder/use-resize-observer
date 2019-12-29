import React, { useEffect, useState, useRef } from "react";
import useResizeObserver from "../dist/bundle.esm";
import useResizeObserverPolyfilled from "../polyfilled";
import delay from "delay";
import { createComponentHandler, Observed, render } from "./utils";
// Using the following to support async/await in tests.
// I'm intentionally not using babel/polyfill, as that would introduce polyfills
// the actual lib might not have, giving the false impression that something
// works while it might actually not, if you use the lib without babel-polyfill.
import "babel-regenerator-runtime";

it("should render with undefined sizes at first", async () => {
  const { assertDefaultSize } = await render(Observed);
  assertDefaultSize();
});

it("should render with custom defaults", async () => {
  const { assertSize } = await render(
    Observed,
    {},
    {
      defaultWidth: 24,
      defaultHeight: 42
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
    assertRenderCount
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
  const Test = ({ resolveHandler }) => {
    let resolveHandler1 = null;
    let resolveHandler2 = null;
    const handlersPromise = Promise.all([
      new Promise(resolve => (resolveHandler1 = resolve)),
      new Promise(resolve => (resolveHandler2 = resolve))
    ]);

    useEffect(() => {
      handlersPromise.then(([handler1, handler2]) => {
        resolveHandler({ handler1, handler2 });
      });
    }, []);

    return (
      <>
        <Observed resolveHandler={resolveHandler1} />
        <Observed resolveHandler={resolveHandler2} />
      </>
    );
  };
  const { handler1, handler2 } = await render(Test);

  await Promise.all([
    handler1.setAndAssertSize({ width: 100, height: 200 }),
    handler2.setAndAssertSize({ width: 300, height: 400 })
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
  const Test = ({ resolveHandler }) => {
    const ref = useRef(null);
    const { width, height } = useResizeObserver({ ref });
    const currentSizeRef = useRef({});
    currentSizeRef.current.width = width;
    currentSizeRef.current.height = height;

    useEffect(() => {
      resolveHandler(createComponentHandler({ currentSizeRef }));
    }, []);

    return (
      <div ref={ref} style={{ width: 100, height: 200 }}>
        {width}x{height}
      </div>
    );
  };

  const { assertDefaultSize, assertSize } = await render(Test);

  // Default
  assertDefaultSize();

  // Actual measurement
  await delay(50);
  assertSize({ width: 100, height: 200 });
});

it("should be able to reuse the same ref to measure different elements", async () => {
  const Test = ({ resolveHandler }) => {
    const [stateRef, setStateRef] = useState(null);
    const ref1 = useRef(null);
    const ref2 = useRef(null);
    const sizeRef = useRef(null);
    const { width, height } = useResizeObserver({ ref: stateRef });
    const currentSizeRef = useRef({});
    currentSizeRef.current.width = width;
    currentSizeRef.current.height = height;

    useEffect(() => {
      // Measures the first div on mount
      setStateRef(ref1);

      // Measures the second div on demand
      const switchRefs = () => setStateRef(ref2);

      resolveHandler({
        ...createComponentHandler({ currentSizeRef }),
        switchRefs
      });
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

  const { switchRefs, assertDefaultSize, assertSize } = await render(Test);

  // Default
  assertDefaultSize();

  // Div 1 measurement
  await delay(50);
  assertSize({ width: 100, height: 200 });

  // Div 2 measurement
  switchRefs();
  await delay(50);
  assertSize({ width: 150, height: 250 });
});

it("should be able to render without mock defaults", async () => {
  const { setSize, assertSize, assertDefaultSize } = await render(Observed);

  // Default values should be undefined
  assertDefaultSize();

  setSize({ width: 100, height: 100 });
  await delay(50);
  assertSize({ width: 100, height: 100 });
});

it("should not trigger unnecessary renders with the same width or height", async () => {
  const {
    setSize,
    assertDefaultSize,
    assertSize,
    assertRenderCount
  } = await render(Observed);

  assertDefaultSize();

  // Default render + first measurement
  await delay(50);
  assertRenderCount(2);

  setSize({ width: 100, height: 102 });
  await delay(50);
  assertSize({ width: 100, height: 102 });
  assertRenderCount(3);

  // Shouldn't trigger on subpixel values that are rounded to be the same as the
  // previous size
  setSize({ width: 100.4, height: 102.4 });
  await delay(50);
  assertSize({ width: 100, height: 102 });
  assertRenderCount(3);
});

it("should keep the same response instance between renders if nothing changed", async () => {
  const Test = ({ resolveHandler }) => {
    const previousResponseRef = useRef(null);
    const response = useResizeObserver();
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

      // Everything is set up, ready for assertions
      resolveHandler({
        assertSameInstance: () => {
          expect(sameInstance).toBe(true);
        }
      });
    }, [state]);

    return <div ref={response.ref}>{String(sameInstance)}</div>;
  };

  const { assertSameInstance } = await render(Test);

  assertSameInstance();
});

it("should ignore invalid custom refs", async () => {
  const Test = ({ resolveHandler }) => {
    const ref = useRef(null);
    const { width, height } = useResizeObserver({ ref: null }); // invalid custom ref
    const currentSizeRef = useRef({});
    currentSizeRef.current.width = width;
    currentSizeRef.current.height = height;

    useEffect(() => {
      resolveHandler(createComponentHandler({ currentSizeRef }));
    }, []);

    return (
      <div ref={ref}>
        {width}x{height}
      </div>
    );
  };

  const { assertDefaultSize } = await render(Test);

  // Since no refs were passed in with an element to be measured, the hook should
  // stay on the defaults
  await delay(50);
  assertDefaultSize();
});

it("should work with the polyfilled version", async () => {
  const Test = ({ resolveHandler }) => {
    const { ref, width, height } = useResizeObserverPolyfilled();
    const currentSizeRef = useRef({});
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
  const observations = [];
  const { setSize, assertDefaultSize, assertRenderCount } = await render(
    Observed,
    {},
    { onResize: size => observations.push(size) }
  );

  setSize({ width: 100, height: 200 });
  await delay(50);
  setSize({ width: 101, height: 201 });
  await delay(50);

  // Should stay at default as width/height is not passed to the hook response
  // when an onResize callback is given
  assertDefaultSize();

  expect(observations.length).toBe(2);
  expect(observations[0]).toEqual({ width: 100, height: 200 });
  expect(observations[1]).toEqual({ width: 101, height: 201 });

  // Should render once on mount only
  assertRenderCount(1);
});

it("should handle if the onResize handler changes properly with the correct render counts", async () => {
  const Test = ({ resolveHandler, ...props }) => {
    const [onResizeHandler, setOnResizeHandler] = useState(() => () => {});
    const changeOnResizeHandler = handler => setOnResizeHandler(() => handler);

    return (
      <Observed
        {...props}
        onResize={onResizeHandler}
        resolveHandler={handler => {
          resolveHandler({
            ...handler,
            changeOnResizeHandler
          });
        }}
      />
    );
  };

  const {
    assertRenderCount,
    setSize,
    changeOnResizeHandler
  } = await render(Test, { waitForFirstMeasurement: true });

  // Since `onResize` is used, no extra renders should've been triggered at this
  // point. (As opposed to the defaults where the hook would trigger a render
  // with the first measurement.)
  assertRenderCount(1);

  const observations1 = [];
  const observations2 = [];

  // Establishing a default, which'll be measured when the resize handler is set.
  setSize({ width: 1, height: 1 });
  await delay(50);

  assertRenderCount(1);

  changeOnResizeHandler(size => observations1.push(size));
  await delay(50);
  setSize({ width: 1, height: 2 });
  await delay(50);
  setSize({ width: 3, height: 4 });

  assertRenderCount(2);

  await delay(50);
  changeOnResizeHandler(size => observations2.push(size));
  await delay(50);
  setSize({ width: 5, height: 6 });
  await delay(50);
  setSize({ width: 7, height: 8 });
  await delay(50);

  assertRenderCount(3);

  expect(observations1.length).toBe(3);
  expect(observations1[0]).toEqual({ width: 1, height: 1 });
  expect(observations1[1]).toEqual({ width: 1, height: 2 });
  expect(observations1[2]).toEqual({ width: 3, height: 4 });
  expect(observations2.length).toBe(3);
  expect(observations2[0]).toEqual({ width: 3, height: 4 });
  expect(observations2[1]).toEqual({ width: 5, height: 6 });
  expect(observations2[2]).toEqual({ width: 7, height: 8 });
});
