import "react-app-polyfill/ie11";
import React, { FunctionComponent, useEffect, useRef } from "react";
import {
  createComponentHandler,
  HandlerResolverComponentProps,
  ObservedSize,
  render,
} from "../utils";
import useResizeObserver from "../../polyfilled";
import { ResizeObserver as ROP } from "@juggle/resize-observer";
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
    const Test: FunctionComponent<HandlerResolverComponentProps> = ({
      resolveHandler,
    }) => {
      const { ref, width, height } = useResizeObserver<HTMLDivElement>();
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

    await awaitNextFrame();
    assertSize({ width: 50, height: 40 });
  });
});
