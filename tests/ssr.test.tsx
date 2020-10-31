import ReactDOM from "react-dom";
import React from "react";
import delay from "./utils/delay";
// opting out from ts checks
const Test = require("./ssr/Test");

// This is replaced with the "server-generated" string before the tests are run.
const html = `<div style="width:100px;height:200px" data-reactroot="">1x2</div>`;

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

    // For some reason headless Firefox takes a bit long here sometimes.
    await delay(100);

    expect(app.textContent).toBe(`100x200`);
  });
});
