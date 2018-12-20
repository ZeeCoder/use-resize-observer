module.exports = function(config) {
  const singleRun = process.env.KARMA_SINGLE_RUN !== "false";
  const browsers = (process.env.KARMA_BROWSERS || "Chrome").split(",");

  config.set({
    basePath: ".",
    frameworks: ["jasmine"],
    files: ["tests/dist/index.js"],
    autoWatch: true,

    browsers,
    reporters: ["spec"],

    singleRun,

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
