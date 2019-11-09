import React from "react";
import ReactDOM from "react-dom";
import useResizeObserver from "../dist/bundle.esm";
import delay from "delay";
// Using the following to support async/await in tests.
// I'm intentionally not using babel/polyfill, as that would introduce polyfills
// the actual lib might not have, giving the false impression that something
// works while it might actually not, if you use the lib without babel-polyfill.
import "babel-regenerator-runtime";

const Observed = ({ defaultWidth, defaultHeight, ...props }) => {
  const { ref, width, height } = useResizeObserver({
    defaultWidth: defaultWidth || 1,
    defaultHeight: defaultHeight || 1
  });

  return (
    <div
      {...props}
      ref={ref}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        background: "grey",
        color: "white",
        fontWeight: "bold"
      }}
    >
      {width}x{height}
    </div>
  );
};

beforeAll(() => {
  const app = document.createElement("div");
  app.style.position = "relative";
  app.style.width = "200px";
  app.style.height = "300px";
  document.body.appendChild(app);

  ReactDOM.render(
    <React.Fragment>
      <Observed id="observed" />
      <Observed
        id="observed-with-defaults"
        defaultWidth={24}
        defaultHeight={42}
      />
    </React.Fragment>,
    app
  );

  global.app = app;
  global.observed = document.querySelector("#observed");
  global.observedWithDefaults = document.querySelector(
    "#observed-with-defaults"
  );
});

it("should render with the right defaults, before the ResizeObserver is triggered", async () => {
  expect(observed.textContent).toBe("1x1");
  expect(observedWithDefaults.textContent).toBe("24x42");
});

it("should report the correct size after the size is reported by the ResizeObserver", async () => {
  await delay(100);

  expect(observed.textContent).toBe("200x300");
  expect(observedWithDefaults.textContent).toBe("200x300");
});

it("should report following size changes", async () => {
  app.style.width = "100px";
  app.style.height = "100px";

  await delay(100);
  expect(observed.textContent).toBe("100x100");
});
