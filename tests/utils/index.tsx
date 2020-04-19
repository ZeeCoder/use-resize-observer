import React, { useEffect, useRef, RefObject, FunctionComponent } from "react";
import ReactDOM from "react-dom";
import useResizeObserver from "../..";
import delay from "delay";

export type Size = {
  width: number;
  height: number;
};

export type ObservedSize = {
  width: number | undefined;
  height: number | undefined;
};

type BaseComponentHandler = {
  assertSize: (size: ObservedSize) => void;
  assertDefaultSize: () => void;
};
type SizingComponentHandler = {
  setSize: (size: Size | ObservedSize) => void;
  setAndAssertSize: (size: Size | ObservedSize) => void;
};
type CountingComponentHandler = {
  assertRenderCount: (count: number) => void;
};

export type ComponentHandler = BaseComponentHandler &
  SizingComponentHandler &
  CountingComponentHandler;

export function createComponentHandler(opts: {
  currentSizeRef: RefObject<ObservedSize>;
}): BaseComponentHandler;
export function createComponentHandler(opts: {
  currentSizeRef: RefObject<ObservedSize>;
  measuredElementRef: RefObject<HTMLElement>;
}): BaseComponentHandler & SizingComponentHandler;
export function createComponentHandler(opts: {
  currentSizeRef: RefObject<ObservedSize>;
  renderCountRef: RefObject<number>;
}): BaseComponentHandler & CountingComponentHandler;
export function createComponentHandler(opts: {
  currentSizeRef: RefObject<ObservedSize>;
  measuredElementRef: RefObject<HTMLElement>;
  renderCountRef: RefObject<number>;
}): ComponentHandler;
export function createComponentHandler({
  currentSizeRef,
  measuredElementRef,
  renderCountRef,
}: {
  currentSizeRef: RefObject<ObservedSize>;
  measuredElementRef?: RefObject<HTMLElement>;
  renderCountRef?: RefObject<number>;
}): BaseComponentHandler {
  let handler = {
    assertSize: function ({ width, height }: ObservedSize) {
      if (currentSizeRef.current === null) {
        throw new Error(`currentSizeRef.current is not set.`);
      }

      expect(currentSizeRef.current.width).toBe(width);
      expect(currentSizeRef.current.height).toBe(height);
    },
    assertDefaultSize: function () {
      return this.assertSize({ width: undefined, height: undefined });
    },
  } as ComponentHandler;

  if (measuredElementRef) {
    handler.setSize = ({ width, height }) => {
      if (measuredElementRef.current === null) {
        throw new Error(`measuredElementRef.current is not set.`);
      }

      measuredElementRef.current.style.width = `${width}px`;
      measuredElementRef.current.style.height = `${height}px`;
    };
    handler.setAndAssertSize = async (size) => {
      handler.setSize(size);
      await delay(50);
      handler.assertSize(size);
    };
  }

  if (renderCountRef) {
    handler.assertRenderCount = (count) => {
      expect(renderCountRef.current).toBe(count);
    };
  }

  return handler;
}

export type HandlerResolverComponentProps = {
  resolveHandler: HandlerReceiver;
};

export type MultiHandlerResolverComponentProps = {
  resolveHandler: MultiHandlerReceiver;
};

export const Observed: FunctionComponent<
  HandlerResolverComponentProps & {
    defaultWidth?: number;
    defaultHeight?: number;
    onResize?: (size: ObservedSize) => void;
  }
> = ({ resolveHandler, defaultWidth, defaultHeight, onResize, ...props }) => {
  const renderCountRef = useRef(0);
  const {
    ref: measuredElementRef,
    width = defaultWidth,
    height = defaultHeight,
  } = useResizeObserver<HTMLDivElement>({ onResize });
  const currentSizeRef = useRef<ObservedSize>({
    width: undefined,
    height: undefined,
  });
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
        renderCountRef,
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
        fontWeight: "bold",
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

export type HandlerReceiver = <T extends Partial<ComponentHandler>>(
  handler: T
) => void;
export type MultiHandlerReceiver = <T extends Partial<ComponentHandler>>(
  handler: T[]
) => void;

let appRoot: HTMLDivElement | null = null;

export function render<T extends ComponentHandler>(
  TestComponent: FunctionComponent<HandlerResolverComponentProps>,
  opts?: { waitForFirstMeasurement?: boolean },
  props?: {}
): Promise<T>;
export function render<T extends ComponentHandler>(
  TestComponent: FunctionComponent<MultiHandlerResolverComponentProps>,
  opts?: { waitForFirstMeasurement?: boolean },
  props?: {}
): Promise<T[]>;
export function render(
  TestComponent:
    | FunctionComponent<HandlerResolverComponentProps>
    | FunctionComponent<MultiHandlerResolverComponentProps>,
  {
    waitForFirstMeasurement = false,
  }: { waitForFirstMeasurement?: boolean } = {},
  props?: {}
) {
  return new Promise((resolve) => {
    async function resolveHandler<T extends Partial<ComponentHandler>>(
      handler: T | T[]
    ): Promise<void> {
      if (waitForFirstMeasurement) {
        await delay(50);
      }

      resolve(handler);
    }

    if (!appRoot) {
      appRoot = document.createElement("div");
      appRoot.id = "app";
      document.body.appendChild(appRoot);
    }

    // Clean out previous renders
    ReactDOM.render(<div></div>, appRoot);

    ReactDOM.render(
      <TestComponent {...props} resolveHandler={resolveHandler} />,
      appRoot
    );
  });
}
