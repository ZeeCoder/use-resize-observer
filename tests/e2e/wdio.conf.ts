/// <reference types="webdriverio" />
import { fileURLToPath } from "node:url";

// Disable the BrowserStack SDK "TestHub" features (Test Observability /
// Accessibility / Percy). We only want plain Automate session reporting, which
// is what populates the dashboard so sessions can be viewed / signed into. Those
// features download a separate CLI binary and add auth surface we don't use
// (it errors with "Invalid auth token" but is non-fatal). Set as env vars before
// the service loads, since the service options alone don't fully suppress it.
process.env.BROWSERSTACK_OBSERVABILITY = "false";
process.env.BROWSERSTACK_ACCESSIBILITY = "false";
process.env.BROWSERSTACK_PERCY = "false";

// Absolute path to the built static page. Resolved relative to THIS config file,
// not the process cwd (wdio is launched from the repo root), so the static server
// serves tests/e2e/app rather than a non-existent <root>/app.
const appDir = fileURLToPath(new URL("app", import.meta.url));

// Real-browser / real-device coverage on BrowserStack. This keeps Playwright out
// of the picture: BrowserStack's Playwright support is desktop-only, and v10 must
// keep testing real iOS/Android devices.
//
// The @wdio/browserstack-service handles the BrowserStackLocal tunnel, session
// naming + pass/fail status, and dashboard reporting. Its TestHub SDK bootstrap
// logs an "Invalid auth token" warning for the disabled observability/accessibility
// features — that is expected and non-fatal (the Automate sessions still report).
//
// The capability matrix is ported from the old karma.conf.js, minus the dropped
// `legacy` group (IE 11 / iOS 11). React 19 only — doubling the device matrix to
// re-catch a React-version bug the Vitest suite already covers is spend without
// signal (see migration plan 2.5). Device names / OS versions get retired over
// time; verify against the live list (`automate/browsers.json` — see CONTRIBUTING).
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

// Unique per run, so BrowserStack shows each run as its own build instead of
// collapsing every "local" run into a single, perpetually-open build.
const buildName = process.env.GITHUB_RUN_ID
  ? `ci-${process.env.GITHUB_RUN_ID}`
  : `local ${new Date().toISOString()}`;

// With Test Observability disabled, the service doesn't mark sessions
// passed/failed, so the dashboard leaves them "unmarked" and the build lingers
// "running". Mark status explicitly via BrowserStack's JS executor (independent
// of observability). Track the first failure for a useful reason.
let firstFailureReason = "";

const commonBstackOptions = {
  local: true,
  projectName: "use-resize-observer",
  buildName,
  seleniumVersion: "4.20.0",
  // Disable the accessibility scan at the capability level (the service reads it
  // from here, not just the service options), which silences the repeated
  // "Accessibility Automation will run only on Chrome browsers" warning.
  accessibility: false,
};

export const config: WebdriverIO.Config = {
  runner: "local",
  tsConfigPath: "./tsconfig.json",

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

  services: [
    // Manages the BrowserStackLocal tunnel + session naming/status + dashboard
    // reporting. TestHub features are disabled (see the env vars above).
    [
      "browserstack",
      {
        browserstackLocal: true,
        testObservability: false,
        accessibility: false,
        percy: false,
      },
    ],
    ["static-server", { folders: [{ mount: "/", path: appDir }], port: 4567 }],
  ],

  baseUrl: "http://localhost:4567",

  framework: "mocha",
  reporters: ["spec"],
  mochaOpts: { ui: "bdd", timeout: 60000 },

  logLevel: "warn",
  // Silence the browserstack-service's own warnings — on this account they're all
  // non-fatal noise (the server-side accessibility notice and the disabled-TestHub
  // "Invalid auth token" bootstrap line), and the client-side options don't
  // suppress them. Errors are still shown. Everything else stays at "warn".
  logLevels: { "@wdio/browserstack-service": "error" },
  waitforTimeout: 15000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  // Capture the first failure so we can report a useful reason on the session.
  afterTest: (_test, _context, result) => {
    if (!result.passed && !firstFailureReason) {
      firstFailureReason = result.error?.message ?? "Test failed";
    }
  },
  // Mark the session passed/failed via BrowserStack's JS executor, so the
  // dashboard shows a status instead of "unmarked". Best-effort — a marking
  // failure must never fail the run.
  after: async (exitCode) => {
    const passed = exitCode === 0;
    try {
      await browser.executeScript(
        `browserstack_executor: ${JSON.stringify({
          action: "setSessionStatus",
          arguments: {
            status: passed ? "passed" : "failed",
            reason: passed ? "All specs passed" : firstFailureReason || "One or more specs failed",
          },
        })}`,
        [],
      );
    } catch {
      // ignore
    }
  },
};
