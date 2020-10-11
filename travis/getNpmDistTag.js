#!/usr/bin/env node

const version = require("../package.json").version;

// Extracting the dist tag, assuming that it would look something like this:
// `1.2.3-alpha.1`
const matches = version.match(/^[^-]*-([^.]+).*$/);

// "latest" is default.
// See: https://docs.npmjs.com/adding-dist-tags-to-packages
const distTag = matches ? matches[1] : "latest";

process.stdout.write(distTag);
