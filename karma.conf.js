module.exports = function(config) {
  const browsers = (process.env.KARMA_BROWSERS || "Chrome").split(",");

  config.set({
    basePath: ".",
    frameworks: ["jasmine"],
    files: ["tests/dist/index.js"],
    autoWatch: true,

    browsers,
    reporters: ["spec"],

    singleRun: true,

    // Max concurrency for SauceLabs OS plan
    concurrency: 5,

    client: {
      jasmine: {
        // Order of the tests matter, so don't randomise it
        random: false
      }
    }
  });
};
