import babel from "rollup-plugin-babel";

export default {
  input: "src/index.js",
  output: [
    {
      file: "dist/bundle.cjs.js",
      format: "cjs"
    },
    {
      file: "dist/bundle.esm.js",
      format: "esm"
    }
  ],
  plugins: [babel()],
  external: ["react", "resize-observer"]
};
