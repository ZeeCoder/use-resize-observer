import React, { useRef } from "react";
import ReactDOM from "react-dom";
import useResizeObserver from "../dist/bundle.esm";
import delay from "delay";
// Using the following to support async/await in tests.
// I'm intentionally not using babel/polyfill, as that would introduce polyfills
// the actual lib might not have, giving the false impression that something
// works while it might actually not, if you use the lib without babel-polyfill.
import "babel-regenerator-runtime";

const Observed = () => {
  const [ref1, width1, height1] = useResizeObserver();
  const styles = {
    position: "absolute",
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
    background: "grey",
    color: "white",
    fontWeight: "bold"
  };

  const ref2 = useRef();
  const [width2, height2] = useResizeObserver(ref2);

  return (
    <>
      <div ref={ref1} id="observed1" style={styles}>
        1 {width1}x{height1}
      </div>
      <div ref={ref2} id="observed2" style={styles}>
        2 {width2}x{height2}
      </div>
    </>
  );
};

beforeAll(() => {
  const app = document.createElement("div");
  app.style.position = "relative";
  app.style.width = "200px";
  app.style.height = "300px";
  document.body.appendChild(app);

  ReactDOM.render(<Observed />, app);

  global.app = app;
  global.observed1 = document.querySelector("#observed1");
  global.observed2 = document.querySelector("#observed2");
});

it("hould render with 1x1 initially, before the ResizeObserver is triggered", async () => {
  expect(observed1.textContent).toBe("1 1x1");
  expect(observed2.textContent).toBe("2 1x1");
});

it("should report the correct size after the size is reported by the ResizeObserver", async () => {
  await delay(100);
  expect(observed1.textContent).toBe("1 200x300");
  expect(observed2.textContent).toBe("2 200x300");
});

it("should report following size changes", async () => {
  app.style.width = "100px";
  app.style.height = "100px";

  await delay(100);
  expect(observed1.textContent).toBe("1 100x100");
  expect(observed2.textContent).toBe("2 100x100");
});
