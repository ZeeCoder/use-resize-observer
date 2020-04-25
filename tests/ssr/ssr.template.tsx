import ReactDOM from "react-dom";
import React from "react";
// opting out from ts checks
const Test = require("./ssr/Test");

const waitForNextFrame = () =>
  new Promise((resolve) => setTimeout(resolve, 1000 / 60));

// This is replaced with the "server-generated" string before the tests are run.
const html = `<% GENERATED-HTML %>`;

describe("SSR", () => {
  it("should render with the defaults first, then hydrate properly", async () => {
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<div id="app">${html}</div>`
    );

    const app = document.getElementById("app");
    if (app === null) {
      throw new Error("#app not found");
    }

    ReactDOM.hydrate(<Test />, app);

    expect(app.textContent).toBe(`1x2`);

    await waitForNextFrame();

    expect(app.textContent).toBe(`100x200`);
  });
});
