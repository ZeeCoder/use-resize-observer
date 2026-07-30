/// <reference types="webdriverio" />
import { Local } from "browserstack-local";

// Real-browser / real-device coverage on BrowserStack. This is the leg that
// keeps Playwright out of the picture: BrowserStack's Playwright support is
// desktop-only, and v10 must keep testing real iOS/Android devices.
//
// We talk to the BrowserStack hub directly and manage the BrowserStackLocal
// tunnel ourselves (via `browserstack-local`) instead of using
// @wdio/browserstack-service. That service force-runs a "TestHub" SDK CLI
// (Test Observability / Accessibility / Percy) that downloads a separate binary
// and fails auth against those products — none of which we need for plain
// Automate sessions.
//
// The capability matrix is ported from the old karma.conf.js, minus the dropped
// `legacy` group (IE 11 / iOS 11). React 19 only — doubling the device matrix to
// re-catch a React-version bug the Vitest suite already covers is spend without
// signal (see migration plan 2.5).
const userName = process.env.BROWSERSTACK_USERNAME;
const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;

const commonBstackOptions = {
  userName,
  accessKey,
  // Route traffic through the BrowserStackLocal tunnel to reach the static page
  // served on localhost.
  local: true,
  projectName: "use-resize-observer",
  buildName: process.env.GITHUB_RUN_ID ? `ci-${process.env.GITHUB_RUN_ID}` : "local",
  seleniumVersion: "4.20.0",
};

const bsLocal = new Local();

export const config: WebdriverIO.Config = {
  runner: "local",
  tsConfigPath: "./tsconfig.json",

  hostname: "hub.browserstack.com",
  port: 443,
  path: "/wd/hub",
  protocol: "https",
  user: userName,
  key: accessKey,

  specs: ["./specs/**/*.e2e.ts"],
  maxInstances: 5,

  capabilities: [
    // --- Desktop, latest ---
    {
      browserName: "Chrome",
      "bstack:options": {
        ...commonBstackOptions,
        os: "Windows",
        osVersion: "11",
        browserVersion: "latest",
      },
    },
    {
      browserName: "Firefox",
      "bstack:options": {
        ...commonBstackOptions,
        os: "Windows",
        osVersion: "11",
        browserVersion: "latest",
      },
    },
    {
      browserName: "Edge",
      "bstack:options": {
        ...commonBstackOptions,
        os: "Windows",
        osVersion: "11",
        browserVersion: "latest",
      },
    },
    {
      browserName: "Safari",
      "bstack:options": {
        ...commonBstackOptions,
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
        ...commonBstackOptions,
        os: "OS X",
        osVersion: "Catalina",
        browserVersion: "13.0",
      },
    },
    // --- Real mobile devices (why Playwright was rejected) ---
    {
      browserName: "safari",
      "bstack:options": {
        ...commonBstackOptions,
        deviceName: "iPhone 11",
        osVersion: "14",
        realMobile: true,
      },
    },
    {
      browserName: "chrome",
      "bstack:options": {
        ...commonBstackOptions,
        deviceName: "Samsung Galaxy Note 10",
        osVersion: "9.0",
        realMobile: true,
      },
    },
  ],

  services: [["static-server", { folders: [{ mount: "/", path: "./app" }], port: 4567 }]],

  baseUrl: "http://localhost:4567",

  framework: "mocha",
  reporters: ["spec"],
  mochaOpts: { ui: "bdd", timeout: 60000 },

  logLevel: "warn",
  waitforTimeout: 15000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  // Start / stop the BrowserStackLocal tunnel around the run.
  onPrepare: () =>
    new Promise<void>((resolve, reject) => {
      if (!accessKey) {
        reject(new Error("BROWSERSTACK_ACCESS_KEY is not set"));
        return;
      }
      bsLocal.start({ key: accessKey }, (error) => (error ? reject(error) : resolve()));
    }),
  onComplete: () =>
    new Promise<void>((resolve) => {
      if (bsLocal.isRunning()) {
        bsLocal.stop(() => resolve());
      } else {
        resolve();
      }
    }),
};
