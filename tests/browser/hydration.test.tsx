import { useRef } from "react";
// The browser server entry runs `renderToString` inside the browser test with
// the same React instance as the client (see `tests/react-dom-server.d.ts` for
// why the import is typed manually — @types/react-dom@18 doesn't declare it).
import { renderToString } from "react-dom/server.browser";
import { hydrateRoot } from "react-dom/client";
import { act } from "react";
import { expect, test } from "vitest";
import { useResizeObserver } from "../../src";
import awaitNextFrame from "../utils/awaitNextFrame";

// The self-contained successor to the old codegen'd SSR test: render to a string,
// inject it, hydrate it, and assert the default -> measured transition — all in
// one browser test, no build-time template substitution.
test("hydrates server markup and transitions from default to measured size", async () => {
  const Test = () => {
    const ref = useRef<HTMLDivElement>(null);
    const { width = 1, height = 2 } = useResizeObserver<HTMLDivElement>({ ref });

    return (
      <div ref={ref} style={{ width: 100, height: 200 }}>
        {`${width}x${height}`}
      </div>
    );
  };

  // 1. Server-render to a string. Before any measurement this shows the defaults.
  const html = renderToString(<Test />);
  expect(html).toContain("1x2");

  // 2. Inject the markup into the document.
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);
  expect(container.textContent).toContain("1x2");

  // 3. Hydrate. The client's first render must match the server markup (still the
  //    defaults), so there is no hydration mismatch.
  await act(async () => {
    hydrateRoot(container, <Test />);
  });

  // 4. Once the ResizeObserver measures the element, the size updates in place.
  await awaitNextFrame();
  expect(container.textContent).toContain("100x200");
});
