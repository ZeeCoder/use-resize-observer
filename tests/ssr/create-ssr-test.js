const React = require("react");
const ReactDOMServer = require("react-dom/server");
const Test = require("./Test");
const fs = require("fs");
const path = require("path");

const testString = fs.readFileSync(
  path.join(__dirname, "ssr.template.tsx"),
  "utf8"
);
const html = ReactDOMServer.renderToString(React.createElement(Test));

fs.writeFileSync(
  path.join(__dirname, "../ssr.test.tsx"),
  testString.replace("<% GENERATED-HTML %>", html)
);
