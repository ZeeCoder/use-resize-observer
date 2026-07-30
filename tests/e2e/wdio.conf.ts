/// <reference types="webdriverio" />
import { fileURLToPath } from "node:url";
import { Local } from "browserstack-local";

// Absolute path to the built static page. Resolved relative to THIS config file,
// not the process cwd (wdio is launched from the repo root), so the static server
// serves tests/e2e/app rather than a non-existent <root>/app.
const appDir = fileURLToPath(new URL("app", import.meta.url));

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

// Fail fast (before spawning workers) if the credentials aren't visible to node.
// A common gotcha: they're set as shell variables but not `export`ed, so `echo`
// sees them but child processes don't.
if (!userName || !accessKey) {
  throw new Error(
    "BrowserStack credentials are not visible to node. Make sure BROWSERSTACK_USERNAME " +
      "and BROWSERSTACK_ACCESS_KEY are exported in this shell (verify with: " +
      '`node -e "console.log(process.env.BROWSERSTACK_USERNAME)"`).',
  );
}

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

// Remember the first failure so we can report a useful reason on BrowserStack.
let firstFailureReason = "";

// Send a BrowserStack JS-executor command (session naming / status). Best-effort:
// a marking failure must never fail the actual test run.
const bstackExec = async (payload: object) => {
  try {
    await browser.executeScript(`browserstack_executor: ${JSON.stringify(payload)}`, []);
  } catch {
    // ignore
  }
};

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
    // Device names / OS versions get retired over time; verify against the live
    // list (`automate/browsers.json` — see CONTRIBUTING) and adjust as needed.
    {
      browserName: "safari",
      "bstack:options": {
        ...commonBstackOptions,
        deviceName: "iPhone 15",
        osVersion: "17",
        realMobile: true,
      },
    },
    {
      browserName: "chrome",
      "bstack:options": {
        ...commonBstackOptions,
        deviceName: "Samsung Galaxy S23",
        osVersion: "13.0",
        realMobile: true,
      },
    },
  ],

  services: [["static-server", { folders: [{ mount: "/", path: appDir }], port: 4567 }]],

  baseUrl: "http://localhost:4567",

  framework: "mocha",
  reporters: ["spec"],
  mochaOpts: { ui: "bdd", timeout: 60000 },

  logLevel: "warn",
  waitforTimeout: 15000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  // --- Session labelling on BrowserStack (the useful part of the dropped SDK) ---
  // Name the session and print its dashboard link, so runs are easy to find.
  beforeSuite: async (suite) => {
    await bstackExec({ action: "setSessionName", arguments: { name: suite.title } });
    try {
      const raw = await browser.executeScript(
        'browserstack_executor: {"action": "getSessionDetails"}',
        [],
      );
      const details = JSON.parse(raw as string);
      console.log(`🔗 BrowserStack session: ${details.public_url ?? details.browser_url}`);
    } catch {
      // non-fatal
    }
  },
  // Capture the first failure reason to report on the session.
  afterTest: (_test, _context, result) => {
    if (!result.passed && !firstFailureReason) {
      firstFailureReason = result.error?.message ?? "Test failed";
    }
  },
  // Mark the session passed/failed so the dashboard shows red/green with a reason.
  after: async (exitCode) => {
    await bstackExec({
      action: "setSessionStatus",
      arguments: {
        status: exitCode === 0 ? "passed" : "failed",
        reason:
          exitCode === 0 ? "All specs passed" : firstFailureReason || "One or more specs failed",
      },
    });
  },

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
