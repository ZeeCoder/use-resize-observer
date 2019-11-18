import React, { useEffect, useState, useRef, forwardRef } from "react";
import ReactDOM from "react-dom";
import useResizeObserver from "../dist/bundle.esm";
import delay from "delay";
// Using the following to support async/await in tests.
// I'm intentionally not using babel/polyfill, as that would introduce polyfills
// the actual lib might not have, giving the false impression that something
// works while it might actually not, if you use the lib without babel-polyfill.
import "babel-regenerator-runtime";

const Observed = ({
  resolveHandler,
  defaultWidth,
  defaultHeight,
  useDefaults,
  ...props
}) => {
  const textRef = useRef(null);
  const renderRef = useRef(null);
  const renderCountRef = useRef(0);
  const { ref, width, height } = useResizeObserver({
    defaultWidth: defaultWidth || 1,
    defaultHeight: defaultHeight || 1,
    useDefaults: useDefaults !== false
  });
  const [size, setSize] = useState({ width: "100%", height: "100%" });

  renderCountRef.current++;

  useEffect(() => {
    if (!resolveHandler) {
      return;
    }

    resolveHandler({
      assertSize: ({ width, height }) => {
        expect(textRef.current.textContent).toBe(`${width}x${height}`);
      },
      assertRenderCount: count => {
        expect(renderRef.current.textContent).toBe(`${count}`);
      },
      setSize
    });
  }, []);

  return (
    <div
      {...props}
      ref={ref}
      style={{
        ...size,
        position: "absolute",
        left: 0,
        top: 0,
        background: "grey",
        color: "white",
        fontWeight: "bold"
      }}
    >
      <span ref={textRef}>
        {width}x{height}
      </span>
      <div>
        Render Count: <span ref={renderRef}>{renderCountRef.current}</span>
      </div>
    </div>
  );
};

let appRoot = null;
const render = (TestComponent, { resolvesHandler = true } = {}, props) => {
  let resolveHandler = null;
  const controllerPromise = new Promise(resolve => (resolveHandler = resolve));

  if (!appRoot) {
    appRoot = document.createElement("div");
    appRoot.id = "app";
    document.body.appendChild(appRoot);
  }

  ReactDOM.render(null, appRoot);

  ReactDOM.render(
    <TestComponent {...props} resolveHandler={resolveHandler} />,
    appRoot
  );

  if (!resolvesHandler) {
    resolveHandler({});
  }

  return controllerPromise;
};

it("should render with 1x1 by default", async () => {
  const { assertSize } = await render(Observed);
  assertSize({ width: 1, height: 1 });
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

  assertSize({ width: 24, height: 42 });
});

it("should follow size changes correctly with appropriate render count and without sub-pixels as they're used in CSS", async () => {
  const { setSize, assertSize, assertRenderCount } = await render(Observed);

  // Default render
  assertRenderCount(1);

  setSize({ width: 100, height: 200 });
  await delay(50);
  // One render for setting the CSS, and another for the hook to react
  assertRenderCount(3);
  assertSize({ width: 100, height: 200 });

  setSize({ width: 321, height: 456 });
  await delay(50);
  // One render for setting the CSS, and another for the hook to react
  assertRenderCount(5);
  assertSize({ width: 321, height: 456 });
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

  handler1.setSize({ width: 100, height: 200 });
  handler2.setSize({ width: 300, height: 400 });
  await delay(50);
  handler1.assertSize({ width: 100, height: 200 });
  handler2.assertSize({ width: 300, height: 400 });

  handler2.setSize({ width: 321, height: 456 });
  await delay(50);
  handler1.assertSize({ width: 100, height: 200 });
  handler2.assertSize({ width: 321, height: 456 });
});

it("should handle custom refs", async () => {
  const Test = ({ resolveHandler }) => {
    const ref = useRef(null);
    const { width, height } = useResizeObserver({ ref });

    useEffect(() => {
      resolveHandler({
        assertSize: ({ width, height }) => {
          expect(ref.current.textContent).toBe(`${width}x${height}`);
        }
      });
    }, []);

    return (
      <div ref={ref} style={{ width: 100, height: 200 }}>
        {width}x{height}
      </div>
    );
  };

  const { assertSize } = await render(Test);

  // Default
  assertSize({ width: 1, height: 1 });

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

    useEffect(() => {
      // Measures the first div on mount
      setStateRef(ref1);

      resolveHandler({
        // Measures the second div on demand
        switchRefs: () => setStateRef(ref2),
        assertSize: ({ width, height }) => {
          expect(sizeRef.current.textContent).toBe(`${width}x${height}`);
        }
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

  const { assertSize, switchRefs } = await render(Test);

  // Default
  assertSize({ width: 1, height: 1 });

  // Div 1 measurement
  await delay(50);
  assertSize({ width: 100, height: 200 });

  // Div 2 measurement
  switchRefs();
  await delay(50);
  assertSize({ width: 150, height: 250 });
});

it("should be able to render without mock defaults", async () => {
  const { setSize, assertSize } = await render(
    Observed,
    {},
    {
      useDefaults: false
    }
  );

  // Text should be "x" without the sizes, as they're simply undefined on the
  // returned object at this point.
  assertSize({ width: "", height: "" });

  setSize({ width: 100, height: 100 });
  await delay(50);
  assertSize({ width: 100, height: 100 });
});

it("should not trigger unnecessary renders with the same width or height", async () => {
  const Test = ({ resolveHandler }) => {
    return (
      <div style={{ position: "relative" }} id="container">
        <Observed resolveHandler={resolveHandler} />
      </div>
    );
  };

  // Setting the size like this won't trigger any unnecessary re-renders within
  // the components, so we can accurately measure renders being triggered by the
  // hook itself.
  const setSize = ({ width, height }) => {
    const container = document.querySelector("#container");
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;
  };
  const { assertSize, assertRenderCount } = await render(Test);

  assertSize({ width: 1, height: 1 });
  assertRenderCount(1);

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
    const response = useResizeObserver({ useDefaults: false });
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

    useEffect(() => {
      resolveHandler({
        assertSize: ({ width, height }) => {
          expect(ref.current.textContent).toBe(`${width}x${height}`);
        }
      });
    }, []);

    return (
      <div ref={ref}>
        {width}x{height}
      </div>
    );
  };

  const { assertSize } = await render(Test);

  // Since no refs were passed in with an element to be measured, the hook should
  // stay on the defaults
  await delay(50);
  assertSize({ width: 1, height: 1 });
});
