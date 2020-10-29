module.exports = function (config) {
  const browsers = (process.env.KARMA_BROWSERS || "ChromeHeadless").split(",");

  const testFilePattern = "tests/*.tsx";
  // const testFilePattern = "tests/basic.tsx";
  // const testFilePattern = "tests/testing-lib.tsx";

  config.set({
    basePath: ".",
    frameworks: ["jasmine"],
    files: [
      {
        pattern: testFilePattern,
        watched: true,
      },
    ],
    autoWatch: true,

    browsers,
    reporters: ["spec"],
    preprocessors: {
      [testFilePattern]: ["webpack", "sourcemap"],
    },

    // Max concurrency for SauceLabs OS plan
    concurrency: 5,

    client: {
      jasmine: {
        // Order of the tests matter, so don't randomise it
        random: false,
      },
    },

    webpack: {
      mode: "development",
      devtool: "inline-source-map",
      module: {
        rules: [
          {
            test: /\.(ts|tsx|js|jsx)$/,
            exclude: /node_modules/,
            use: {
              loader: "babel-loader",
              options: {
                presets: [
                  ["@babel/preset-env", { loose: true, modules: false }],
                  "@babel/preset-react",
                  "@babel/preset-typescript",
                ],
                plugins: [["@babel/transform-runtime", { useESModules: true }]],
              },
            },
          },
        ],
      },
      resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx"],
      },
    },
  });
};
