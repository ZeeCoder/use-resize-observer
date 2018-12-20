module.exports = function(config) {
  const singleRun = process.env.KARMA_SINGLE_RUN !== "false";

  config.set({
    basePath: ".",
    frameworks: ["jasmine"],
    files: ["browser-tests/dist/index.js"],
    autoWatch: true,

    // todo come up with a way to switch in between dev / CI setup
    browsers: ["Chrome"],
    reporters: ["spec"],

    // reporters: ["spec", "saucelabs"],
    // browsers: ["sl_chrome_70"],

    singleRun,

    // Max concurrency for SauceLabs OS plan
    concurrency: 5,

    // @see https://wiki.saucelabs.com/display/DOCS/Platform+Configurator/
    customLaunchers: {
      sl_chrome_35: {
        base: "SauceLabs",
        browserName: "chrome",
        platform: "Windows 7",
        version: "35"
      },
      sl_chrome_70: {
        base: "SauceLabs",
        browserName: "chrome",
        platform: "Windows 10",
        version: "70"
      }
    },

    // Saucelabs launcher
    // sauceLabs: {
    //   testName: 'react-container-query',
    //   public: 'public'
    // },
    sauceLabs: {
      testName: "use-resize-observer",
      public: "public"
    },
    client: {
      jasmine: {
        // Order of the tests matter, so don't randomise it
        random: false
      }
    }
  });
};
