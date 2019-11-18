import babel from "rollup-plugin-babel";
import inject from "rollup-plugin-inject";

const getConfig = polyfill => {
  const config = {
    input: "src/index.js",
    output: [],
    plugins: [babel()],
    external: ["react"]
  };

  if (polyfill) {
    config.output = [
      {
        file: "polyfilled.js",
        format: "cjs"
      }
    ];
    config.external.push("resize-observer-polyfill");
    config.plugins.push(
      inject({
        ResizeObserver: "resize-observer-polyfill"
      })
    );
  } else {
    config.output = [
      {
        file: "dist/bundle.cjs.js",
        format: "cjs"
      },
      {
        file: "dist/bundle.esm.js",
        format: "esm"
      }
    ];
  }

  return config;
};

export default [getConfig(), getConfig(true)];
