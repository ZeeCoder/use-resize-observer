import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import useResizeObserver from "../dist/bundle.esm";
import delay from "delay";

export const createComponentHandler = ({
  currentSizeRef,
  measuredElementRef,
  renderCountRef
}) => {
  const handler = {};

  handler.assertSize = ({ width, height }) => {
    expect(currentSizeRef.current.width).toBe(width);
    expect(currentSizeRef.current.height).toBe(height);
  };
  handler.assertDefaultSize = () =>
    handler.assertSize({ width: undefined, height: undefined });

  if (measuredElementRef) {
    handler.setSize = ({ width, height }) => {
      measuredElementRef.current.style.width = `${width}px`;
      measuredElementRef.current.style.height = `${height}px`;
    };
    handler.setAndAssertSize = async size => {
      handler.setSize(size);
      await delay(50);
      handler.assertSize(size);
    };
  }

  if (renderCountRef) {
    handler.assertRenderCount = count => {
      expect(renderCountRef.current).toBe(count);
    };
  }

  return handler;
};

export const Observed = ({
  resolveHandler,
  defaultWidth,
  defaultHeight,
  onResize,
  ...props
}) => {
  const renderCountRef = useRef(0);
  const {
    ref: measuredElementRef,
    width = defaultWidth,
    height = defaultHeight
  } = useResizeObserver({ onResize });
  const currentSizeRef = useRef({});
  currentSizeRef.current.width = width;
  currentSizeRef.current.height = height;
  renderCountRef.current++;

  useEffect(() => {
    if (!resolveHandler) {
      return;
    }

    resolveHandler(
      createComponentHandler({
        currentSizeRef,
        measuredElementRef,
        renderCountRef
      })
    );
  }, []);

  return (
    <div
      {...props}
      ref={measuredElementRef}
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        left: 0,
        top: 0,
        background: "grey",
        color: "white",
        fontWeight: "bold"
      }}
    >
      <span>
        {width}x{height}
      </span>
      <div>
        Render Count: <span>{renderCountRef.current}</span>
      </div>
    </div>
  );
};

let appRoot = null;
export const render = (
  TestComponent,
  { resolvesHandler = true, waitForFirstMeasurement = false } = {},
  props
) => {
  let resolveHandler = null;
  const controllerPromise = new Promise(
    resolve =>
      (resolveHandler = async handler => {
        if (waitForFirstMeasurement) {
          await delay(50);
        }

        resolve(handler);
      })
  );

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
