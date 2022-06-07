"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
var vue = require("vue");
var pluginVue_exportHelper = require("./plugin-vue_export-helper.db096aab.js");
var index_page_vue_vue_type_style_index_0_lang = /* @__PURE__ */ (() => "\nh1,\np {\n  color: green;\n}\n")();
const _sfc_main = {};
function _sfc_ssrRender(_ctx, _push, _parent, _attrs) {
  _push(`<!--[--><h1>About</h1><p>A colored page.</p><!--]-->`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = vue.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/about/index.page.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var index_page = /* @__PURE__ */ pluginVue_exportHelper._export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
exports["default"] = index_page;
