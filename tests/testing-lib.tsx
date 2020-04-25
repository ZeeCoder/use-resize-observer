// Tests written with react testing library
import React, { useRef, useEffect, useState } from "react";
import useResizeObserver from "../";
import { render, cleanup, RenderResult } from "@testing-library/react";
import { ObservedSize } from "./utils";
import delay from "delay";

afterEach(() => {
  cleanup();
});

type ComponentController = {
  setSize: (width: number, height: number) => void;
  getRenderCount: () => number;
  getWidth: () => number | undefined;
  getHeight: () => number | undefined;
  triggerRender: () => void;
  switchToExplicitRef: () => void;
};

type TestProps = {
  onResize?: (size: ObservedSize) => void;
  resolveController: (controller: ComponentController) => void;
};

const Test = ({ onResize, resolveController }: TestProps) => {
  const [, setRenderTrigger] = useState(false);
  const [useExplicitRef, setUseExplicitRef] = useState(false);
  const explicitRef = useRef<HTMLDivElement>(null);
  const { ref, width = 0, height = 0 } = useResizeObserver<HTMLDivElement>({
    // We intentionally create a new function instance here if onResize is given.
    // The hook is supposed to handle it and not recreate ResizeObserver instances on each render for example.
    onResize: onResize ? (size: ObservedSize) => onResize(size) : undefined,
    ...(useExplicitRef ? { ref: explicitRef } : {}),
  });
  const controllerStateRef = useRef<{ renderCount: number } & ObservedSize>({
    renderCount: 0,
    width: undefined,
    height: undefined,
  });

  controllerStateRef.current.renderCount++;
  controllerStateRef.current.width = width;
  controllerStateRef.current.height = height;

  useEffect(() => {
    resolveController({
      setSize: (width: number, height: number) => {
        if (!ref.current) {
          throw new Error(`Expected "ref.current" to be set.`);
        }

        ref.current.style.width = `${width}px`;
        ref.current.style.height = `${height}px`;
      },
      getRenderCount: () => controllerStateRef.current.renderCount,
      getWidth: () => controllerStateRef.current.width,
      getHeight: () => controllerStateRef.current.height,
      triggerRender: () => setRenderTrigger((value) => !value),
      switchToExplicitRef: () => setUseExplicitRef(true),
    });
  }, []);

  return <div ref={useExplicitRef ? explicitRef : ref}></div>;
};

const awaitNextFrame = () =>
  new Promise((resolve) => setTimeout(resolve, 1000 / 60));

const renderTest = (
  props: Omit<TestProps, "resolveController"> = {}
): Promise<[ComponentController, RenderResult]> =>
  new Promise((resolve) => {
    const tools = render(
      <Test
        {...props}
        resolveController={(controller) => resolve([controller, tools])}
      ></Test>
    );
  });

describe("Testing Lib: Basics", () => {
  it("should measure the right sizes", async () => {
    const [controller] = await renderTest();

    // Default response on the first render before an actual measurement took place
    expect(controller.getWidth()).toBe(0);
    expect(controller.getHeight()).toBe(0);
    expect(controller.getRenderCount()).toBe(1);

    // Should react to component size changes.
    controller.setSize(100, 200);
    await awaitNextFrame();
    expect(controller.getWidth()).toBe(100);
    expect(controller.getHeight()).toBe(200);
    expect(controller.getRenderCount()).toBe(2);
  });
});

describe("Testing Lib: Resize Observer Instance Counting Block", () => {
  let resizeObserverInstanceCount = 0;
  let resizeObserverObserveCount = 0;
  let resizeObserverUnobserveCount = 0;
  const NativeResizeObserver = (window as any).ResizeObserver;

  beforeAll(() => {
    (window as any).ResizeObserver = function PatchedResizeObserver(
      cb: Function
    ) {
      resizeObserverInstanceCount++;

      const ro = new NativeResizeObserver(cb) as ResizeObserver;

      const mock = {
        observe: (element: Element) => {
          resizeObserverObserveCount++;
          return ro.observe(element);
        },
        unobserve: (element: Element) => {
          resizeObserverUnobserveCount++;
          return ro.unobserve(element);
        },
      };

      return mock;
    };
  });

  beforeEach(() => {
    resizeObserverInstanceCount = 0;
    resizeObserverObserveCount = 0;
    resizeObserverUnobserveCount = 0;
  });

  afterAll(() => {
    // Try catches fixes a Firefox issue on Travis:
    // https://travis-ci.org/github/ZeeCoder/use-resize-observer/builds/677364283
    try {
      (window as any).ResizeObserver = NativeResizeObserver;
    } catch (error) {
      // it's fine
    }
  });

  it("should use a single ResizeObserver instance even if the onResize callback is not memoised", async () => {
    const [controller] = await renderTest({
      // This is only here so that each render passes a different callback
      // instance through to the hook.
      onResize: (size) => {},
    });

    await awaitNextFrame();

    controller.triggerRender();

    await awaitNextFrame();

    // Different onResize instances used to trigger the hook's internal useEffect,
    // resulting in the hook using a new ResizeObserver instance on each render
    // regardless of what triggered it.
    expect(resizeObserverInstanceCount).toBe(1);
    expect(resizeObserverObserveCount).toBe(1);
    expect(resizeObserverUnobserveCount).toBe(0);
  });

  it("should not reinstantiate if the hook is the same but the observed element changes", async () => {
    const [controller] = await renderTest();

    // Default behaviour on initial mount with the explicit ref
    expect(resizeObserverInstanceCount).toBe(1);
    expect(resizeObserverObserveCount).toBe(1);
    expect(resizeObserverUnobserveCount).toBe(0);

    // Switching to a different ref / element causes the hook to unobserve the
    // previous element, and observe the new one, but it should not recreate the
    // ResizeObserver instance.

    // The waits here are added to replicate, and address an issue with travis
    // running Firefox in headless mode:
    // https://travis-ci.org/github/ZeeCoder/use-resize-observer/builds/677375509
    await awaitNextFrame();
    controller.switchToExplicitRef();
    await delay(1000);
    expect(resizeObserverInstanceCount).toBe(1);
    expect(resizeObserverObserveCount).toBe(2);
    expect(resizeObserverUnobserveCount).toBe(1);
  });
});
