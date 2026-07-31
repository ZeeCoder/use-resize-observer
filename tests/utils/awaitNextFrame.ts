// Waits for a ResizeObserver notification to be delivered and for React to
// flush the resulting update. RO notifications are dispatched as part of the
// browser's frame lifecycle (right before paint), so two animation frames
// guarantee a notification has fired; the trailing macrotask then lets React's
// scheduler commit the update. This is more reliable across engines than a
// fixed timeout — Firefox in particular could miss a too-short wait under load.
export default function awaitNextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 0)));
  });
}
