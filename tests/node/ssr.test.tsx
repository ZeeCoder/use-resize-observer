import { useRef } from "react";
import { renderToString } from "react-dom/server";
import { expect, test } from "vitest";
import { useResizeObserver } from "../../src";

// Server rendering must not touch `ResizeObserver` (it only exists inside effects
// / ref callbacks, which don't run on the server) and must fall back to the
// consumer-provided default sizes. Passing a custom ref used to break SSR:
// @see https://github.com/ZeeCoder/use-resize-observer/issues/74
test("renders default sizes on the server without throwing", () => {
  const Test = () => {
    const ref = useRef<HTMLDivElement>(null);
    const { width = 1, height = 2 } = useResizeObserver<HTMLDivElement>({ ref });

    return (
      <div ref={ref} style={{ width: 100, height: 200 }}>
        {`${width}x${height}`}
      </div>
    );
  };

  const html = renderToString(<Test />);

  expect(html).toContain("1x2");
});

test("renders default sizes on the server with the built-in callback ref", () => {
  const Test = () => {
    const { ref, width = 1, height = 2 } = useResizeObserver<HTMLDivElement>();

    return <div ref={ref}>{`${width}x${height}`}</div>;
  };

  const html = renderToString(<Test />);

  expect(html).toContain("1x2");
});
