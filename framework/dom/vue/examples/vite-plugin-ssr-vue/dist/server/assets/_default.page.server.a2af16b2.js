"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
var serverRenderer$1 = require("@vue/server-renderer");
var vitePluginSsr = require("vite-plugin-ssr");
var vue = require("vue");
var serverRenderer = require("vue/server-renderer");
var pluginVue_exportHelper = require("./plugin-vue_export-helper.db096aab.js");
var logoUrl = "/assets/logo.bebe2e90.svg";
const key = Symbol();
function usePageContext() {
  const pageContext = vue.inject(key);
  if (!pageContext)
    throw new Error("setPageContext() not called in parent");
  return pageContext;
}
function setPageContext(app, pageContext) {
  app.provide(key, pageContext);
}
var Link_vue_vue_type_style_index_0_scoped_true_lang = /* @__PURE__ */ (() => "\na[data-v-9eabd926] {\n  padding: 3px 10px;\n}\na.active[data-v-9eabd926] {\n  background-color: #eee;\n}\n")();
const _sfc_main$1 = /* @__PURE__ */ vue.defineComponent({
  __name: "Link",
  __ssrInlineRender: true,
  setup(__props) {
    const pageContext = usePageContext();
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<a${serverRenderer.ssrRenderAttrs(vue.mergeProps({
        class: { active: vue.unref(pageContext).urlPathname === _ctx.$attrs.href }
      }, _attrs))} data-v-9eabd926>`);
      serverRenderer.ssrRenderSlot(_ctx.$slots, "default", {}, null, _push, _parent);
      _push(`</a>`);
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = vue.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("renderer/Link.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var Link = /* @__PURE__ */ pluginVue_exportHelper._export_sfc(_sfc_main$1, [["__scopeId", "data-v-9eabd926"]]);
var PageShell_vue_vue_type_style_index_0_lang = /* @__PURE__ */ (() => "\nbody {\n  margin: 0;\n  font-family: sans-serif;\n}\n* {\n  box-sizing: border-box;\n}\na {\n  text-decoration: none;\n}\n")();
var PageShell_vue_vue_type_style_index_1_scoped_true_lang = /* @__PURE__ */ (() => "\n.layout[data-v-b9af3f3a] {\n  display: flex;\n  max-width: 900px;\n  margin: auto;\n}\n.content[data-v-b9af3f3a] {\n  padding: 20px;\n  border-left: 2px solid #eee;\n  padding-bottom: 50px;\n  min-height: 100vh;\n}\n.navigation[data-v-b9af3f3a] {\n  padding: 20px;\n  flex-shrink: 0;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  line-height: 1.8em;\n}\n.logo[data-v-b9af3f3a] {\n  margin-top: 20px;\n  margin-bottom: 10px;\n}\n")();
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  __name: "PageShell",
  __ssrInlineRender: true,
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${serverRenderer.ssrRenderAttrs(vue.mergeProps({ class: "layout" }, _attrs))} data-v-b9af3f3a><div class="navigation" data-v-b9af3f3a><a href="/" class="logo" data-v-b9af3f3a><img${serverRenderer.ssrRenderAttr("src", logoUrl)} height="64" width="64" alt="logo" data-v-b9af3f3a></a>`);
      _push(serverRenderer.ssrRenderComponent(Link, { href: "/" }, {
        default: vue.withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`Home`);
          } else {
            return [
              vue.createTextVNode("Home")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(serverRenderer.ssrRenderComponent(Link, { href: "/about" }, {
        default: vue.withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`About`);
          } else {
            return [
              vue.createTextVNode("About")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`</div><div class="content" data-v-b9af3f3a>`);
      serverRenderer.ssrRenderSlot(_ctx.$slots, "default", {}, null, _push, _parent);
      _push(`</div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = vue.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("renderer/PageShell.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var PageShell = /* @__PURE__ */ pluginVue_exportHelper._export_sfc(_sfc_main, [["__scopeId", "data-v-b9af3f3a"]]);
function createApp(pageContext) {
  const { Page, pageProps } = pageContext;
  const PageWithLayout = vue.defineComponent({
    render() {
      return vue.h(PageShell, {}, {
        default() {
          return vue.h(Page, pageProps || {});
        }
      });
    }
  });
  const app = vue.createSSRApp(PageWithLayout);
  setPageContext(app, pageContext);
  return app;
}
const passToClient = ["pageProps", "urlPathname"];
async function render(pageContext) {
  const app = createApp(pageContext);
  const appHtml = await serverRenderer$1.renderToString(app);
  const { documentProps } = pageContext;
  const title = documentProps && documentProps.title || "Vite SSR app";
  const desc = documentProps && documentProps.description || "App using Vite + vite-plugin-ssr";
  const documentHtml = vitePluginSsr.escapeInject`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <link rel="icon" href="${logoUrl}" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="${desc}" />
        <title>${title}</title>
      </head>
      <body>
        <div id="app">${vitePluginSsr.dangerouslySkipEscape(appHtml)}</div>
      </body>
    </html>`;
  return {
    documentHtml,
    pageContext: {}
  };
}
exports.passToClient = passToClient;
exports.render = render;
