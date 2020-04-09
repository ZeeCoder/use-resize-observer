import babel from "rollup-plugin-babel";
import inject from "@rollup/plugin-inject";

const getConfig = ({ polyfill = false } = {}) => {
  const config = {
    input: "src/index.ts",
    output: [],
    plugins: [babel({ extensions: ["ts"] })],
    external: ["react"],
  };

  if (polyfill) {
    config.output = [
      {
        file: "polyfilled.js",
        format: "cjs",
      },
    ];
    config.external.push("resize-observer-polyfill");
    config.plugins.push(
      inject({
        ResizeObserver: "resize-observer-polyfill",
      })
    );
  } else {
    config.output = [
      {
        file: "dist/bundle.cjs.js",
        format: "cjs",
      },
      {
        file: "dist/bundle.esm.js",
        format: "esm",
      },
    ];
  }

  return config;
};

export default [getConfig(), getConfig({ polyfill: true })];
