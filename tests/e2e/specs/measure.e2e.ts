import { browser, $ } from "@wdio/globals";

describe("use-resize-observer (packed tarball, real browsers)", () => {
  before(async () => {
    await browser.url("/");
    await $('[data-testid="measured"]').waitForExist();
  });

  it("exposes the v10 export surface (named export, no default)", async () => {
    const surface = await browser.execute(
      () => (window as unknown as Record<string, any>).__URO_SURFACE__,
    );

    expect(surface.hasNamedExport).toBe(true);
    expect(surface.hasDefault).toBe(false);
    expect(surface.keys).toContain("useResizeObserver");
  });

  it("measures the observed element and reacts to size changes", async () => {
    const measured = $('[data-testid="measured"]');

    // The initial box is 100x100, so the first measurement settles there.
    await browser.waitUntil(async () => (await measured.getText()) === "100x100", {
      timeoutMsg: "initial measurement never settled to 100x100",
    });

    await $('[data-testid="set-300x400"]').click();
    await browser.waitUntil(async () => (await measured.getText()) === "300x400", {
      timeoutMsg: "size change to 300x400 was not reported",
    });

    await $('[data-testid="set-100x200"]').click();
    await browser.waitUntil(async () => (await measured.getText()) === "100x200", {
      timeoutMsg: "size change to 100x200 was not reported",
    });
  });

  it("measures device-pixel-content-box where supported, and degrades safely where not", async () => {
    const supported = (await $('[data-testid="dpb-supported"]').getText()) === "true";

    if (!supported) {
      // Safari: the box option is unsupported. The page must still work — the
      // main measurement above already proved the hook did not crash the app.
      expect(await $('[data-testid="dpb-box"]').isExisting()).toBe(false);
      return;
    }

    const dpr = await browser.execute(() => window.devicePixelRatio);
    const dpb = $('[data-testid="dpb-measured"]');
    const expected = `${Math.round(100 * dpr)}x${Math.round(200 * dpr)}`;

    await $('[data-testid="set-100x200"]').click();
    await browser.waitUntil(async () => (await dpb.getText()) === expected, {
      timeoutMsg: `device-pixel-content-box measurement never reached ${expected}`,
    });
  });
});
