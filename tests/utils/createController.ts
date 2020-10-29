// Creates a shared object which can be used in the test function, as well as
// within the test component.
// Provides some often used functions as well.
import awaitNextFrame from "./awaitNextFrame";

const setSizePlaceholder: SetSizeFunction = async (params: SizeParams) => {};

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

  let measuredWidth: number | undefined;
  let measuredHeight: number | undefined;
  const reportMeasuredSize = (params: SizeParams) => {
    if (typeof params.width === "number") {
      measuredWidth = params.width;
    }
    if (typeof params.height === "number") {
      measuredHeight = params.height;
    }
  };
  const assertMeasuredSize = (params: SizeParams) => {
    expect(measuredWidth).toBe(params.width);
    expect(measuredHeight).toBe(params.height);
  };

  const controller = {
    incrementRenderCount,
    assertRenderCount,
    reportMeasuredSize,
    assertMeasuredSize,
    setSize: setSizePlaceholder,
    provideSetSizeFunction: (ref: HTMLElement | null) => {}, // Placeholder to make TS happy
    triggerRender: async () => {},
  };

  // surely there's a better way to do this?
  controller.provideSetSizeFunction = (element: HTMLElement | null) => {
    controller.setSize = (params: SizeParams) => doSetSize(element, params);
  };

  return controller;
}
