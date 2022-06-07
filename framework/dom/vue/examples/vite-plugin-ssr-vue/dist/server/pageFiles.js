"use strict";
Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
const pageFiles = {
  ".page": { "/renderer/_error.page.vue": () => Promise.resolve().then(function() {
    return require("./assets/_error.page.37bf6939.js");
  }), "/pages/about/index.page.vue": () => Promise.resolve().then(function() {
    return require("./assets/index.page.fe2275f3.js");
  }), "/pages/index/index.page.vue": () => Promise.resolve().then(function() {
    return require("./assets/index.page.7fcf2947.js");
  }) },
  ".page.client": { "/renderer/_default.page.client.ts": () => Promise.resolve().then(function() {
    return require("./assets/_default.page.client.5453b475.js");
  }) },
  ".page.server": { "/renderer/_default.page.server.ts": () => Promise.resolve().then(function() {
    return require("./assets/_default.page.server.a2af16b2.js");
  }) },
  ".page.route": {}
};
exports.pageFiles = pageFiles;
