import { afterEach, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { useResizeObserver } from "../../src";
import type { ObservedSize } from "../../src";
import awaitNextFrame from "../utils/awaitNextFrame";

let iframe: HTMLIFrameElement | undefined;
afterEach(() => {
  iframe?.remove();
  iframe = undefined;
});

// Regression test for issues #100 / #109 / #113: an element that lives in another
// window (here, a same-origin iframe) used to fail the `instanceof Element` check
// against the main window's `Element`, so it was mistaken for a ref object and
// silently never observed. The duck-typed check plus using the element's own
// window's ResizeObserver fixes it.
test("observes an element that belongs to another window (iframe)", async () => {
  iframe = document.createElement("iframe");
  document.body.appendChild(iframe);
  await new Promise<void>((resolve) => {
    if (iframe!.contentDocument?.readyState === "complete") resolve();
    else iframe!.addEventListener("load", () => resolve(), { once: true });
  });

  const otherDoc = iframe.contentDocument!;
  const el = otherDoc.createElement("div");
  el.style.width = "100px";
  el.style.height = "50px";
  (otherDoc.body ?? otherDoc.documentElement).appendChild(el);

  // Sanity: this element genuinely comes from another window, so the old
  // `instanceof Element` (main window) would be false, and it has no `current`.
  expect(el instanceof Element).toBe(false);
  expect("current" in el).toBe(false);

  let measured: ObservedSize | undefined;
  const Test = () => {
    const { width, height } = useResizeObserver({ ref: el });
    measured = { width, height };
    return null;
  };

  await render(<Test />);
  await awaitNextFrame();

  expect(measured).toEqual({ width: 100, height: 50 });
});
