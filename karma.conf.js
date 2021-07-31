module.exports = function (karmaConfig) {
  const { useBrowserStack, runIeTests } = karmaConfig;
  const { BS_USERNAME, BS_ACCESS_KEY } = process.env;

  let testFilePattern = "tests/*.tsx";
  // const testFilePattern = "tests/basic.tsx";
  // const testFilePattern = "tests/testing-lib.tsx";

  let transpileExcludePattern = /node_modules/;
  let presetEndModules = false;
  let transformRuntimeUseESModules = true;
  if (useBrowserStack && runIeTests) {
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

  if (useBrowserStack) {
    Object.assign(config, {
      browserStack: {
        username: BS_USERNAME,
        accessKey: BS_ACCESS_KEY,
        project: "use-resize-observer",
      },
      browsers: ["bs_chrome", "bs_firefox", "bs_safari"],
      // @see https://www.browserstack.com/automate/capabilities
      customLaunchers: {
        bs_chrome: {
          base: "BrowserStack",
          os: "Windows",
          os_version: "10",
          browser: "Chrome",
          browser_version: "latest",
        },
        bs_firefox: {
          base: "BrowserStack",
          os: "Windows",
          os_version: "10",
          browser: "Firefox",
          browser_version: "latest",
        },
        bs_safari: {
          base: "BrowserStack",
          os: "OS X",
          os_version: "Catalina",
          browser: "Safari",
          browser_version: "13.0",
        },
      },
    });

    if (runIeTests) {
      Object.assign(config, {
        browsers: ["bs_ie"],
        customLaunchers: {
          bs_ie: {
            base: "BrowserStack",
            os: "Windows",
            os_version: "10",
            browser: "IE",
            browser_version: "11.0",
          },
        },
      });
    }
  } else {
    Object.assign(config, {
      browsers: (process.env.KARMA_BROWSERS || "ChromeHeadless").split(","),
      // @see https://karma-runner.github.io/5.2/config/files.html
      autoWatch: true,
    });
  }

  karmaConfig.set(config);
};
