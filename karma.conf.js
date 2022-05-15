// @see https://www.browserstack.com/automate/capabilities
const customLaunchers = {
  modern: {
    bs_chrome_latest: {
      base: "BrowserStack",
      os: "Windows",
      os_version: "10",
      browser: "Chrome",
      browser_version: "latest",
    },
    bs_firefox_latest: {
      base: "BrowserStack",
      os: "Windows",
      os_version: "10",
      browser: "Firefox",
      browser_version: "latest",
    },
    bs_edge_latest: {
      base: "BrowserStack",
      os: "Windows",
      os_version: "10",
      browser: "Edge",
      browser_version: "latest",
    },
    bs_opera_latest: {
      base: "BrowserStack",
      os: "Windows",
      os_version: "10",
      browser: "Opera",
      browser_version: "latest",
    },
    // Safari 13 is very important to be listed here, as while it does have an RO implementation,
    // it does not support different box sizes, only content-box.
    bs_safari_13: {
      base: "BrowserStack",
      os: "OS X",
      os_version: "Catalina",
      browser: "Safari",
      browser_version: "13.0",
    },
    bs_ios_14: {
      base: "BrowserStack",
      device: "iPhone 11",
      os: "ios",
      os_version: "14",
    },
    bs_samsung: {
      base: "BrowserStack",
      device: "Samsung Galaxy Note 10",
      os: "Android",
      os_version: "9.0",
    },
  },
  legacy: {
    bs_ios_11: {
      base: "BrowserStack",
      device: "iPhone X",
      os: "ios",
      os_version: "11",
    },
    bs_ie_11: {
      base: "BrowserStack",
      os: "Windows",
      os_version: "10",
      browser: "IE",
      browser_version: "11.0",
    },
  },
};

module.exports = function (karmaConfig) {
  const { BS_USERNAME, BS_ACCESS_KEY, KARMA_BROWSERS } = process.env;

  const browsers =
    KARMA_BROWSERS === "modern"
      ? Object.keys(customLaunchers.modern)
      : KARMA_BROWSERS === "legacy"
      ? Object.keys(customLaunchers.legacy)
      : KARMA_BROWSERS
      ? KARMA_BROWSERS.split(",").map((val) => val.trim())
      : ["ChromeHeadless"];

  const useBrowserStack = browsers[0].startsWith("bs_");

  const polyfilledRun = browsers.reduce(
    (carry, browser) =>
      carry || Object.keys(customLaunchers.legacy).includes(browser),
    false
  );

  let testFilePattern = "tests/*.tsx";
  // let testFilePattern = "tests/ssr.test.tsx";
  // let testFilePattern = "tests/basic.tsx";
  // let testFilePattern = "tests/testing-lib.tsx";

  let transpileExcludePattern = /node_modules/;
  let presetEndModules = false;
  let transformRuntimeUseESModules = true;
  if (polyfilledRun) {
    // IE runs a special set of (polyfilled) tests
    testFilePattern = "tests/ie/*.tsx";
    // Processing everything (including node_modules) for IE11 to make sure 3rd
    // party deps can run during the tests.
    transpileExcludePattern = /^$/;
    presetEndModules = "commonjs";
    transformRuntimeUseESModules = false;
  }

  const config = {
    basePath: ".",
    frameworks: ["jasmine", "webpack"],
    files: [
      {
        pattern: testFilePattern,
        watched: !useBrowserStack,
      },
    ],
    reporters: ["spec"],
    preprocessors: {
      [testFilePattern]: ["webpack", "sourcemap"],
    },
    ...(useBrowserStack && {
      browserStack: {
        username: BS_USERNAME,
        accessKey: BS_ACCESS_KEY,
        project: "use-resize-observer",
      },
    }),
    // @see https://karma-runner.github.io/5.2/config/files.html
    autoWatch: !useBrowserStack,
    browsers,
    customLaunchers: {
      ...customLaunchers.modern,
      ...customLaunchers.legacy,
    },
    webpack: {
      mode: "development",
      devtool: "inline-source-map",
      module: {
        rules: [
          {
            test: /\.(ts|tsx|js|jsx)$/,
            exclude: transpileExcludePattern,
            use: {
              loader: "babel-loader",
              options: {
                presets: [
                  [
                    "@babel/preset-env",
                    { loose: true, modules: presetEndModules },
                  ],
                  "@babel/preset-react",
                  "@babel/preset-typescript",
                ],
                plugins: [
                  [
                    "@babel/transform-runtime",
                    { useESModules: transformRuntimeUseESModules },
                  ],
                ],
              },
            },
          },
        ],
      },
      resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx"],
      },
    },
  };

  karmaConfig.set(config);
};
