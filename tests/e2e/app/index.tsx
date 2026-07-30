import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
// Imported from the PACKED TARBALL installed into this folder — so the E2E run
// doubles as an artifact / public-API-surface test against the real published
// output, not the source.
import * as ns from "use-resize-observer";
import { useResizeObserver } from "use-resize-observer";

// Expose the resolved export surface so the spec can assert the v10 shape
// (named export present, no default) on the real published bundle.
(window as unknown as Record<string, unknown>).__URO_SURFACE__ = {
  hasNamedExport: typeof useResizeObserver === "function",
  hasDefault: "default" in ns,
  keys: Object.keys(ns).sort(),
};

// Safari does not implement `device-pixel-content-box`; observing with it throws
// synchronously, so feature-detect before ever using that box option.
let supportsDevicePixelContentBox = false;
try {
  const ro = new ResizeObserver(() => {});
  ro.observe(document.body, { box: "device-pixel-content-box" });
  ro.disconnect();
  supportsDevicePixelContentBox = true;
} catch {
  supportsDevicePixelContentBox = false;
}

const SIZES = [
  { label: "100x200", width: 100, height: 200 },
  { label: "300x400", width: 300, height: 400 },
];

function DevicePixelBox({ width, height }: { width: number; height: number }) {
  const {
    ref,
    width: w,
    height: h,
  } = useResizeObserver<HTMLDivElement>({
    box: "device-pixel-content-box",
  });

  return (
    <>
      <div ref={ref} data-testid="dpb-box" style={{ width, height }} />
      <p data-testid="dpb-measured">{`${w ?? "?"}x${h ?? "?"}`}</p>
    </>
  );
}

function App() {
  const [size, setSize] = useState({ width: 100, height: 100 });
  const { ref, width, height } = useResizeObserver<HTMLDivElement>();

  return (
    <main style={{ fontFamily: "sans-serif" }}>
      <h1>use-resize-observer E2E</h1>

      <div data-testid="controls">
        {SIZES.map((s) => (
          <button key={s.label} data-testid={`set-${s.label}`} onClick={() => setSize(s)}>
            {s.label}
          </button>
        ))}
      </div>

      {/* The observed box; buttons above drive its size. */}
      <div
        ref={ref}
        data-testid="box"
        style={{ width: size.width, height: size.height, background: "#cde" }}
      />
      <p data-testid="measured">{`${width ?? "?"}x${height ?? "?"}`}</p>

      <p data-testid="dpb-supported">{String(supportsDevicePixelContentBox)}</p>
      {supportsDevicePixelContentBox && <DevicePixelBox width={size.width} height={size.height} />}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
