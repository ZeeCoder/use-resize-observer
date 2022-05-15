import "react-app-polyfill/ie11";
import React from "react";
import useResizeObserver from "../../polyfilled";
import { ResizeObserver as ROP } from "@juggle/resize-observer";
import createController from "../utils/createController";
import { act, render } from "@testing-library/react";
import awaitNextFrame from "../utils/awaitNextFrame";

/**
 * This test ensures that the shipped polyfilled version actually works.
 * This has to run alone independent from other tests, otherwise the environment
 * may have been polyfilled already.
 */
describe("Polyfilled lib testing", () => {
  beforeAll(() => {
    // @ts-ignore
    delete window.ResizeObserver;
  });

  afterAll(() => {
    if (!window.ResizeObserver) {
      // @ts-ignore
      window.ResizeObserver = ROP;
    }
  });

  it("should work with the polyfilled version", async () => {
    const controller = createController();
    const Test = () => {
      const response = useResizeObserver();
      controller.reportMeasuredSize(response);

      return <div style={{ width: 50, height: 40 }} ref={response.ref} />;
    };

    render(<Test />);

    await act(async () => {
      await awaitNextFrame();
    });

    controller.assertMeasuredSize({ width: 50, height: 40 });
  });
});
