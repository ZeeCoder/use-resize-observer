// Creates a shared object which can be used in the test function, as well as
// within the test component.
// Provides some often used functions as well.
import { expect } from "vitest";
import awaitNextFrame from "./awaitNextFrame";

const setSizePlaceholder: SetSizeFunction = async (_params: SizeParams) => {};

type SizeParams = {
  width?: number;
  height?: number;
};
type SetSizeFunction = (params: SizeParams) => Promise<void>;
const doSetSize = async (element: HTMLElement | null, params: SizeParams) => {
  if (!element) {
    return;
  }

  if (params.width) {
    element.style.width = `${params.width}px`;
  }
  if (params.height) {
    element.style.height = `${params.height}px`;
  }

  // Returning a promise here to wait for the next "tick".
  // Useful when you want to check the effects of a size change
  await awaitNextFrame();
};

export default function createController() {
  let renderCount = 0;
  const incrementRenderCount = () => renderCount++;
  const assertRenderCount = (count: number) => expect(renderCount).toBe(count);
  const getRenderCount = () => renderCount;

  let measuredWidth: number | undefined;
  let measuredHeight: number | undefined;
  // The size reported on the very first render, captured synchronously before
  // any ResizeObserver callback can fire. Under Vitest browser mode `render()`
  // is async and may flush the first measurement before the test regains
  // control, so post-render assertions can't observe the pre-measurement state
  // — this snapshot can.
  let initialSize: SizeParams | undefined;
  const reportMeasuredSize = (params: SizeParams) => {
    if (initialSize === undefined) {
      initialSize = { width: params.width, height: params.height };
    }
    if (typeof params.width === "number" || typeof params.width === "undefined") {
      measuredWidth = params.width;
    }
    if (typeof params.height === "number" || typeof params.height === "undefined") {
      measuredHeight = params.height;
    }
  };
  const assertMeasuredSize = (params: SizeParams) => {
    expect(measuredWidth).toBe(params.width);
    expect(measuredHeight).toBe(params.height);
  };
  // Poll for a measured size instead of relying on a fixed frame wait. Use this
  // after actions that make the hook tear down and recreate its ResizeObserver
  // (changing `box` or `round`), where the new value only lands once the fresh RO
  // fires its first callback — several async hops that a fixed wait can miss
  // under real vsync (e.g. headed browsers).
  const waitForMeasuredSize = (params: SizeParams) =>
    expect
      .poll(() => ({ width: measuredWidth, height: measuredHeight }), { timeout: 2000 })
      .toEqual({ width: params.width, height: params.height });
  const assertInitialSize = (params: SizeParams) => {
    expect(initialSize?.width).toBe(params.width);
    expect(initialSize?.height).toBe(params.height);
  };

  const controller = {
    incrementRenderCount,
    assertRenderCount,
    getRenderCount,
    reportMeasuredSize,
    assertMeasuredSize,
    waitForMeasuredSize,
    assertInitialSize,
    setSize: setSizePlaceholder,
    provideSetSizeFunction: (_ref: HTMLElement | null) => {}, // Placeholder to make TS happy
    triggerRender: async () => {},
  };

  // surely there's a better way to do this?
  controller.provideSetSizeFunction = (element: HTMLElement | null) => {
    controller.setSize = (params: SizeParams) => doSetSize(element, params);
  };

  return controller;
}
