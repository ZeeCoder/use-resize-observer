import babel from "@rollup/plugin-babel";
import inject from "@rollup/plugin-inject";

const getConfig = ({ polyfill = false } = {}) => {
  const config = {
    input: "src/index.ts",
    output: [],
    plugins: [
      babel({
        extensions: ["ts"],
        // Seems like there's not really a difference in case of this lib, but
        // might worth reconsidering later to use "runtime".
        // @see https://github.com/rollup/plugins/tree/master/packages/babel#babelhelpers
        babelHelpers: "bundled",
      }),
    ],
    external: ["react"],
  };

  if (polyfill) {
    config.output = [
      {
        file: "polyfilled.js",
        format: "cjs",
        exports: "default",
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
        exports: "default",
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
