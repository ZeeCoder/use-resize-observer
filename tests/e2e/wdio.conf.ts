/// <reference types="webdriverio" />

// Real-browser / real-device coverage on BrowserStack. This is the leg that
// keeps Playwright out of the picture: BrowserStack's Playwright support is
// desktop-only, and v10 must keep testing real iOS/Android devices.
//
// The capability matrix is ported from the old karma.conf.js, minus the dropped
// `legacy` group (IE 11 / iOS 11). React 19 only — doubling the device matrix to
// re-catch a React-version bug the Vitest suite already covers is spend without
// signal (see migration plan 2.5).
const commonCaps = {
  "bstack:options": {
    projectName: "use-resize-observer",
    buildName: process.env.GITHUB_RUN_ID ? `ci-${process.env.GITHUB_RUN_ID}` : "local",
    local: true,
    seleniumVersion: "4.20.0",
  },
};

export const config: WebdriverIO.Config = {
  runner: "local",
  tsConfigPath: "./tsconfig.json",

  user: process.env.BROWSERSTACK_USERNAME,
  key: process.env.BROWSERSTACK_ACCESS_KEY,

  specs: ["./specs/**/*.e2e.ts"],
  maxInstances: 5,

  capabilities: [
    // --- Desktop, latest ---
    {
      browserName: "Chrome",
      "bstack:options": {
        ...commonCaps["bstack:options"],
        os: "Windows",
        osVersion: "11",
        browserVersion: "latest",
      },
    },
    {
      browserName: "Firefox",
      "bstack:options": {
        ...commonCaps["bstack:options"],
        os: "Windows",
        osVersion: "11",
        browserVersion: "latest",
      },
    },
    {
      browserName: "Edge",
      "bstack:options": {
        ...commonCaps["bstack:options"],
        os: "Windows",
        osVersion: "11",
        browserVersion: "latest",
      },
    },
    {
      browserName: "Safari",
      "bstack:options": {
        ...commonCaps["bstack:options"],
        os: "OS X",
        osVersion: "Sequoia",
        browserVersion: "latest",
      },
    },
    // Safari 13 on Catalina — has ResizeObserver but only content-box; a genuine
    // divergence worth keeping.
    {
      browserName: "Safari",
      "bstack:options": {
        ...commonCaps["bstack:options"],
        os: "OS X",
        osVersion: "Catalina",
        browserVersion: "13.0",
      },
    },
    // --- Real mobile devices (why Playwright was rejected) ---
    {
      browserName: "safari",
      "bstack:options": {
        ...commonCaps["bstack:options"],
        deviceName: "iPhone 11",
        osVersion: "14",
        realMobile: true,
      },
    },
    {
      browserName: "chrome",
      "bstack:options": {
        ...commonCaps["bstack:options"],
        deviceName: "Samsung Galaxy Note 10",
        osVersion: "9.0",
        realMobile: true,
      },
    },
  ],

  services: [
    [
      "browserstack",
      {
        browserstackLocal: true,
        // We only need plain Automate sessions. The service otherwise auto-enables
        // Test Observability + Accessibility, which download a separate SDK/CLI
        // binary and add auth/setup surface we don't want here.
        testObservability: false,
        accessibility: false,
      },
    ],
    ["static-server", { folders: [{ mount: "/", path: "./app" }], port: 4567 }],
  ],

  baseUrl: "http://localhost:4567",

  framework: "mocha",
  reporters: ["spec"],
  mochaOpts: { ui: "bdd", timeout: 60000 },

  logLevel: "warn",
  waitforTimeout: 15000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
};
