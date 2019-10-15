<script type='text/javascript'>
  window.BWEUM || (BWEUM = {});
  BWEUM.info = {
    "stand": true,
    "agentType": "browser",
    "agent": "browsercollector.oneapm.com/static/js/bw-send-416.7.31.js",
    "beaconUrl": "browsercollector.oneapm.com/beacon",
    "licenseKey": "yAZyM~fimaVIb6Uy",
    "applicationID": 9992026
  };

</script>
<script type="text/javascript">
  /*!OneAPM-v416.7.31 */ ! function () {
    window.BWEUM || (window.BWEUM = {});
    var a;
    window.BWEUM.require = a, window.apmFirstbyte = window.apmUserFirstbyte || (new Date).getTime(), window
      .apmBICookieUser = window.apmbicookiename || "AIPortal_Res_Account", window.apmBIUserFindLazy = window
      .apmbicookiename || "AIPortal_Res_Account", window.apmBISessionTime = 30, a = function b(c, d, e) {
        function f(h, i) {
          if (!d[h]) {
            if (!c[h]) {
              var j = "function" == typeof a && a;
              if (!i && j) return j(h, !0);
              if (g) return g(h, !0);
              var k = new Error("Cannot find module '" + h + "'");
              throw k.code = "MODULE_NOT_FOUND", k
            }
            var l = d[h] = {
              exports: {}
            };
            c[h][0].call(l.exports, function (a) {
              var b = c[h][1][a];
              return f(b ? b : a)
            }, l, l.exports, b, c, d, e)
          }
          return d[h].exports
        }
        for (var g = "function" == typeof a && a, h = 0; h < e.length; h++) f(e[h]);
        return f
      }({
        46: [function (a, b) {
          function c(a, b) {
            if (d.listeners(a).length) return !1;
            d.on(a, b);
            var c = d.q[a];
            if (c) {
              for (var e = 0; e < c.length; e++) d.emit(a, c[e]);
              delete d.q[a]
            }
            return !0
          }
          var d = a("handle").ee;
          b.exports = c
        }, {
          handle: 7
        }],
        36: [function (a, b) {
          function c(a) {
            var b = [],
              c = "";
            void 0 != a.event && b.push("event=" + a.event), void 0 != a.error && b.push("error=" + a.error);
            var d = (new Date).getTime() + 31536e6;
            c = b.join("|"), document.cookie = "oneapmbiswitch=" + c + "; path=/; expires=" + new Date(d)
              .toGMTString()
          }

          function d() {
            var a = e("oneapmbiswitch"),
              b = [];
            if (null != a) {
              b = a.split("|");
              for (var c = 0; c < b.length; c++) {
                var d = b[c].split("=");
                window.BWEUM.rateflag[d[0]] = d[1]
              }
            }
          }
          var e = a("cookie");
          window.BWEUM.rateflag = {}, b.exports = {
            setflag: c,
            getflag: d
          }
        }, {
          cookie: 3
        }],
        14: [function (a, b) {
          function c(a) {
            return a.length > 500 && (a = a.slice(0, 500)), a
          }
          b.exports = c
        }, {}],
        9: [function (a, b) {
          function c(a, b, c) {
            b || (b = 0), "undefined" == typeof c && (c = a ? a.length : 0);
            for (var d = -1, e = c - b || 0, f = new Array(0 > e ? 0 : e); ++d < e;) f[d] = a[b + d];
            return f
          }
          b.exports = c
        }, {}],
        23: [function (a, b) {
          function c() {
            var a = (new Date).getTime() + 31536e6,
              b = g();
            document.cookie = h + "=" + b() + "; path=/; expires=" + new Date(a).toGMTString()
          }

          function d() {
            var a = f(h);
            return null == a && (a = ""), a
          }

          function e() {
            var a = d();
            "" == a && c()
          }
          var f = a("cookie"),
            g = a("uuid"),
            h = "oneapmclientid";
          b.exports = {
            checkUuid: e,
            getUuid: d
          }
        }, {
          cookie: 3,
          uuid: 15
        }],
        15: [function (a, b) {
          function c() {
            var a = window.navigator.userAgent,
              b = function () {
                for (var a = Number(new Date), b = 0; a === Number(new Date);) b++;
                return a.toString(16) + b.toString(16)
              },
              c = function () {
                return Math.random().toString(16).replace(".", "")
              },
              d = function () {
                function b(a, b) {
                  var c, d = 0;
                  for (c = 0; c < b.length; c++) d |= f[c] << 8 * c;
                  return a ^ d
                }
                var c, d, e = a,
                  f = [],
                  g = 0;
                for (c = 0; c < e.length; c++) d = e.charCodeAt(c), f.unshift(255 & d), f.length >= 4 && (g = b(g,
                  f), f = []);
                return f.length > 0 && (g = b(g, f)), g.toString(16)
              };
            return function () {
              var a = (screen.height * screen.width).toString(16);
              return b() + "-" + c() + "-" + d() + "-" + a + "-" + b()
            }
          }
          b.exports = c
        }, {}],
        55: [function (a, b) {
          function c() {
            var a = m.info = window.BWEUM.info;
            if (a && a.agent && a.licenseKey && a.applicationID && i && i.body && (m.proto = "https" === l.split(
                ":")[0] || a.sslForHttp ? "https://" : "http://", !window.BWEUM.haveLoad)) {
              window.BWEUM.haveLoad = !0, g("mark", ["onload", f()]);
              var b = i.createElement("script");
              b.src = 0 == a.agent.indexOf("//") ? a.agent : m.proto + a.agent, b.src += "?v=416.7.31 ", i.body
                .appendChild(b)
            }
          }

          function d() {
            "complete" === i.readyState && e()
          }

          function e() {
            1 != o && (g("mark", ["domContent", f()]), o = !0)
          }

          function f() {
            return (new Date).getTime()
          }
          var g = a("handle"),
            h = window,
            i = h.document,
            j = "addEventListener",
            k = "attachEvent",
            l = ("" + location).split("?")[0],
            m = b.exports = {
              offset: window.apmFirstbyte || f(),
              origin: l,
              features: {},
              infoself: {}
            };
          g("mark", ["firstbyte", window.apmFirstbyte || f()]), "complete" === document.readyState ? (e(), c()) :
            i[j] ? (i[j]("DOMContentLoaded", e, !1), h[j]("load", c, !1)) : (i[k]("onreadystatechange", d), h[k](
              "onload", c));
          var n = !1,
            o = !1;
          try {
            n = null == window.frameElement && document.documentElement
          } catch (m) {}
          n && n.doScroll && ! function p() {
            if (!o) {
              try {
                n.doScroll("left")
              } catch (a) {
                return setTimeout(p, 50)
              }
              e()
            }
          }()
        }, {
          handle: 7
        }],
        7: [function (a, b) {
          function c(a, b, c) {
            return d.listeners(a).length ? d.emit(a, b, c) : (e[a] || (e[a] = []), void e[a].push(b))
          }
          var d = a("ee").create(),
            e = {};
          c.ee = d, d.q = e, b.exports = c
        }, {
          ee: 4
        }],
        4: [function (a, b) {
          function c(a, b) {
            var c = g(a, f);
            c && c.ended === !0 && (a[b] = {}, delete a[b])
          }

          function d() {
            return {}
          }

          function e(a) {
            function b(a) {
              return k[a] || []
            }

            function h(e, h, i) {
              a && a(e, h, i), i || (i = {});
              var j = b(e),
                k = j.length,
                l = {};
              try {
                l = g(i, f, d)
              } catch (m) {}
              for (var n = 0; k > n; n++) j[n].apply(l, h);
              try {
                c(i, f, d)
              } catch (m) {}
              return l
            }

            function i(a, c) {
              k[a] = b(a).concat(c)
            }

            function j() {
              return e(h)
            }
            var k = {};
            return {
              on: i,
              emit: h,
              create: j,
              listeners: b,
              _events: k
            }
          }
          var f = "bw@context",
            g = a("gos");
          b.exports = e()
        }, {
          gos: 6
        }],
        6: [function (a, b) {
          function c(a, b, c) {
            if (d.call(a, b)) return a[b];
            var e = c();
            if (Object.defineProperty && Object.keys) try {
              return Object.defineProperty(a, b, {
                value: e,
                writable: !0,
                enumerable: !1
              }), e
            } catch (f) {}
            try {
              a[b] = e
            } catch (f) {}
            return e
          }
          var d = Object.prototype.hasOwnProperty;
          b.exports = c
        }, {}],
        3: [function (a, b) {
          b.exports = function (a) {
            var b, c;
            return b = "ONEAPM_AI" === a ? window.oneapmBICookie || document.cookie : document.cookie, c = b
              .match(new RegExp("(^| )" + a + "=([^;]*)(;|$)")), null !== c ? unescape(c[2]) : null
          }
        }, {}]
      }, {}, []), a = function c(b, d, e) {
        function f(h, i) {
          if (!d[h]) {
            if (!b[h]) {
              var j = "function" == typeof a && a;
              if (!i && j) return j(h, !0);
              if (g) return g(h, !0);
              var k = new Error("Cannot find module '" + h + "'");
              throw k.code = "MODULE_NOT_FOUND", k
            }
            var l = d[h] = {
              exports: {}
            };
            b[h][0].call(l.exports, function (a) {
              var c = b[h][1][a];
              return f(c ? c : a)
            }, l, l.exports, c, b, d, e)
          }
          return d[h].exports
        }
        for (var g = "function" == typeof a && a, h = 0; h < e.length; h++) f(e[h]);
        return f
      }({
        1: [function (a) {
          a("biswitch").getflag(), a("loader"), a("errorload"), a("xhrload"), a("eventload")();
          var b = a("UserIdentifier");
          b();
          var c = a("aiPageCookie");
          c(), a("pageFirst")(), a("clientID").checkUuid(), a("wrap-fetch")
        }, {
          UserIdentifier: 21,
          aiPageCookie: 22,
          biswitch: 36,
          clientID: 23,
          errorload: 24,
          eventload: 25,
          loader: 55,
          pageFirst: 43,
          "wrap-fetch": 16,
          xhrload: 26
        }],
        43: [function (a, b) {
          function c() {
            if (!window.BWEUM.rateflag || "1" == window.BWEUM.rateflag.event) {
              {
                var a;
                window, window.document.referrer
              }
              if (window.self === window.parent) a = "";
              else try {
                a = window.parent.document.location.href
              } catch (b) {
                a = ""
              }
              a = d(decodeURI(a)), e("loadevent", [{
                start: (new Date).getTime(),
                url: {
                  PageTitle: f.getPageTitle(),
                  referrer: f.getReferrer(),
                  parenturl: f.getParenturl(),
                  pageurl: f.getPageUrl()
                }
              }])
            }
          }
          var d = (a("register-handler"), a("urlshort")),
            e = a("handle"),
            f = a("eventurl");
          b.exports = c
        }, {
          eventurl: 5,
          handle: 7,
          "register-handler": 46,
          urlshort: 14
        }],
        26: [function (a) {
          function b(a) {
            if ("string" == typeof a && a.length) return a.length;
            if ("object" != typeof a) return void 0;
            if ("undefined" != typeof ArrayBuffer && a instanceof ArrayBuffer && a.byteLength) return a
            .byteLength;
            if ("undefined" != typeof Blob && a instanceof Blob && a.size) return a.size;
            if ("undefined" != typeof FormData && a instanceof FormData) return void 0;
            try {
              return JSON.stringify(a).length
            } catch (b) {
              return void 0
            }
          }

          function c(a, b) {
            return b
          }

          function d(a) {
            var b, c = a.split("||"),
              d = 0,
              e = c.length,
              f = {};
            for (d; e > d; d++) b = c[d].split(":"), f[b[0]] = b[1];
            return f
          }

          function e(a) {
            a.send = p.wrapOld(a.send, "send-xhr-", c), a.onreadystatechange = p.wrapOld(a.onreadystatechange,
              "iexhr-onreadystatechange-", c), a.onerror = p.wrapOld(a.onerror, "iexhr-onerror-", c)
          }

          function f(a) {
            var c = this.params,
              e = this.metrics;
            if (!this.ended) {
              if (this.ended = !0, a.removeEventListener)
                for (var f = 0; n > f; f++) a.removeEventListener(m[f], this.listener, !1);
              if (!c.aborted) {
                if (e.duration = (new Date).getTime() - this.startTime, 4 === a.readyState) {
                  c.status = a.status;
                  var g, h = a.responseType,
                    i = "arraybuffer" === h || "blob" === h || "json" === h ? a.response : a.responseText,
                    k = b(i);
                  k && (e.rxSize = k), this.sameOrigin && (g = a.getResponseHeader("ONEAPM_AI")), g && (c.cat = d(
                      g), e.webTime = c.cat.applicationTime, e.queueTime = c.cat.queueTime, delete c.cat
                    .queueTime, delete c.cat.applicationTime)
                } else c.status = 0;
                e.cbTime = this.cbTime, c && c.url && c.url.indexOf("beacon/resources") < 0 && j("xhr", [c, e,
                  this.startTime, this.creatType
                ])
              }
            }
          }

          function g(a, b) {
            var c = k(b),
              d = a.params;
            d.url = c.url, d.url.length > 500 && (d.url = d.url.slice(0, 500)), a.sameOrigin = c.sameOrigin
          }
          var h = window,
            i = (h.performance, window.XMLHttpRequest);
          if (i && i.prototype && !/CriOS/.test(navigator.userAgent)) {
            a("loader").features.xhr = !0;
            var j = a("handle"),
              k = a("prase-url-original"),
              l = a("ee"),
              m = ["load", "error", "abort", "timeout"],
              n = m.length,
              o = a("loader_id"),
              p = a("wrap-function")(l);
            a("wrap-events"), a("wrap-xhr"), l.on("new-xhr", function () {
              this.totalCbs = 0, this.called = 0, this.cbTime = 0, this.end = f, this.ended = !1, this
                .xhrGuids = {}
            }), l.on("open-xhr-start", function (a) {
              this.params = {
                method: a[0]
              }, g(this, a[1]), this.metrics = {}
            }), l.on("open-xhr-end", function (a, b) {
              this.sameOrigin && b.setRequestHeader("isAjax", "true"), b.__oldie && e(b)
            }), l.on("send-xhr-start", function (a, c) {
              var d = this.metrics,
                e = a[0],
                f = this;
              if (d && e) {
                var g = b(e);
                g && (d.txSize = g)
              }
              if (this.startTime = (new Date).getTime(), this.listener = function (a) {
                  try {
                    "abort" === a.type && (f.params.aborted = !0), ("load" !== a.type || f.called === f
                      .totalCbs && (f.onloadCalled || "function" != typeof c.onload)) && f.end && f.end(c)
                  } catch (b) {
                    try {
                      l.emit("internal-error", [b])
                    } catch (d) {}
                  }
                }, c.addEventListener)
                for (var h = 0; n > h; h++) c.addEventListener(m[h], this.listener, !1)
            }), l.on("iexhr-onreadystatechange-start", function (a, b) {
              if (1 == b.readyState) {
                var d = b.onreadystatechange;
                setTimeout(function () {
                  b.onreadystatechange !== d && (b.onreadystatechange = p.wrapOld(b.onreadystatechange,
                    "iexhr-onreadystatechange-", c))
                }, 0)
              }
              4 == b.readyState && (this.xhrCbStart = (new Date).getTime())
            }), l.on("iexhr-onreadystatechange-end", function (a, b) {
              var c = this;
              this.xhrCbStart && l.emit("xhr-cb-time", [(new Date).getTime() - this.xhrCbStart, this.onload,
                b], b), 4 == b.readyState && c.end(b)
            }), l.on("xhr-cb-time", function (a, b, c) {
              this.cbTime += a, b ? this.onloadCalled = !0 : this.called += 1, this.called !== this
                .totalCbs || !this.onloadCalled && "function" == typeof c.onload || this.end(c)
            }), l.on("xhr-load-added", function (a, b) {
              var c = "" + o(a) + !!b;
              this.xhrGuids && !this.xhrGuids[c] && (this.xhrGuids[c] = !0, this.totalCbs += 1)
            }), l.on("xhr-load-removed", function (a, b) {
              var c = "" + o(a) + !!b;
              this.xhrGuids && this.xhrGuids[c] && (delete this.xhrGuids[c], this.totalCbs -= 1)
            }), l.on("addEventListener-end", function (a, b) {
              b instanceof XMLHttpRequest && "load" === a[0] && l.emit("xhr-load-added", [a[1], a[2]], b)
            }), l.on("removeEventListener-end", function (a, b) {
              b instanceof XMLHttpRequest && "load" === a[0] && l.emit("xhr-load-removed", [a[1], a[2]], b)
            }), l.on("fn-start", function (a, b, c) {
              b instanceof XMLHttpRequest && ("onload" === c && (this.onload = !0), ("load" === (a[0] && a[0]
                .type) || this.onload) && (this.xhrCbStart = (new Date).getTime()))
            }), l.on("fn-end", function (a, b) {
              this.xhrCbStart && l.emit("xhr-cb-time", [(new Date).getTime() - this.xhrCbStart, this.onload,
                b], b)
            })
          }
        }, {
          ee: 4,
          handle: 7,
          loader: 55,
          loader_id: 8,
          "prase-url-original": 12,
          "wrap-events": 52,
          "wrap-function": 56,
          "wrap-xhr": 54
        }],
        12: [function (a, b) {
          b.exports = function (a) {
            var b = document.createElement("a"),
              c = window.location,
              d = {};
            b.href = a, d.url = b.href;
            var e = b.href.indexOf("https://"),
              f = b.href.indexOf("http://"),
              g = window.location;
            return 0 > e && 0 > f && ("/" !== d.url.charAt(0) && (d.url = "/" + d.url), d.url = g.protocol +
                "//" + g.hostname + ":" + g.port + d.url), d.sameOrigin = !b.hostname || b.hostname === document
              .domain && b.port === c.port && b.protocol === c.protocol, d
          }
        }, {}],
        8: [function (a, b) {
          function c(a) {
            var b = typeof a;
            return !a || "object" !== b && "function" !== b ? -1 : a === window ? 0 : f(a, e, function () {
              return d++
            })
          }
          var d = 1,
            e = "bw@id",
            f = a("gos");
          b.exports = c
        }, {
          gos: 6
        }],
        25: [function (a, b) {
          function c(a, b) {
            return "keydown" === b && "INPUT" === a.tagName && "password" === a.type ? !0 : !1
          }

          function d(a) {
            var b = a.tagName.toLowerCase(),
              c = "",
              d = "",
              e = a.type || "",
              f = a.name || "",
              g = "";
            return a.id && (d = a.id), a.className && (c = v(a.classList).join(" ")), "input" != b &&
              "textarea" != b || "password" == e.toLowerCase() || (g = a.value), {
                tag: b,
                classN: c,
                id: d,
                type: e,
                name: f,
                value: g
              }
          }

          function e(a, b) {
            var c, e, f = "unknown",
              g = "",
              h = "",
              i = "",
              j = "",
              k = "";
            return a && "string" == typeof a.tagName && (c = d(a), h = c.value, g = c.type, i = c.name, k = c.id,
                j = c.classN, f = c.tag, "option" == f && a.parentNode && (e = d(a.parentNode))), "unknown" ===
              f && (b === document ? f = "document" : b === window && (f = "window")), {
                tag: f,
                type: g,
                value: encodeURI(z(h)),
                name: i,
                className: j,
                id: k,
                father: e
              }
          }

          function f(a, b) {
            return a && a.tagName && a.tagName.toLowerCase() === b.toLowerCase()
          }

          function g(a) {
            for (var b, c = a.length, d = 0; c > d; d++) {
              var e = a[d];
              if ("#text" === e.nodeName) {
                b = e;
                break
              }
            }
            return b
          }

          function h(a) {
            var b, c = "";
            return b = a.childNodes.length > 0 ? g(a.childNodes) : a, b && (c = b.innerText ? b.innerText : b
              .textContent || b.nodeValue), "string" == typeof c ? c : ""
          }

          function i(a) {
            var b = o(a),
              c = "";
            if (!b || f(b, "html") || f(b, "body") || 1 !== b.nodeType) return !1;
            var d = b.tagName.toLowerCase();
            switch (d) {
              case "html":
                c = "";
                break;
              case "form":
                c = "form";
                break;
              case "select":
              case "textarea":
              case "input":
                c = "password" != b.type.toLowerCase() ? b.value : "";
                break;
              case "label":
              case "button":
                c = b.innerText ? b.innerText : b.textContent;
                break;
              default:
                c = h(b)
            }
            return c
          }

          function j(a) {
            var b = {},
              c = 0;
            if (void 0 !== a.dataset)
              for (c; 10 > c; c++) a.dataset["oneapmbi-" + c] && (b["oneapmbi-" + c] = a.dataset["oneapmbi-" +
              c]);
            else
              for (c; 10 > c; c++) a.getAttribute("data-oneapmbi-" + c) && (b["oneapmbi-" + c] = a.getAttribute(
                "data-oneapmbi-" + c));
            return b
          }

          function k(a, b, c) {
            var d = {
              type: b,
              node: e(a, a),
              custom: j(a)
            };
            return "keyup" != b && "keydown" != b && (d.clickHtml = i(c, a), d.clickHtml = encodeURI(z(d
              .clickHtml))), ("keyup" === b || "click" === b) && (d.xpath = y(a, !0)), d
          }

          function l(a, b) {
            return void 0 == a ? "input" != b.node.tag && "textarea" != b.node.tag || "button" == b.node.type ? !
              0 : !1 : a.xpath != b.xpath || "input" != a.node.tag && "textarea" != b.node.tag || "button" == a
              .node.type ? !0 : !1
          }

          function m(a, b) {
            "keydown" === b || "mousedown" === b || "mouseup" === b || "touchend" === b || "touchstart" === b || (
              a.url = {
                referrer: x.getReferrer(),
                parenturl: x.getParenturl(),
                pageurl: x.getPageUrl(),
                PageTitle: x.getPageTitle()
              }, a.start = (new Date).getTime(), clearTimeout(r), l(p, a) ? (q && s("userevent", [q, !0]), s(
                "userevent", [a]), q = void 0) : (q = a, r = setTimeout(function () {
                s("userevent", [q])
              }, 2e3)), p = a)
          }

          function n(a) {
            if (!window.BWEUM.rateflag || "1" == window.BWEUM.rateflag.event) {
              var b = a;
              b || (b = window.event);
              var d, e;
              if (d = b.target ? b.target : b.srcElement, e = b.type, !c(d, e)) {
                var f = k(d, e, b);
                m(f, e)
              }
            }
          }

          function o(a) {
            var b;
            return b = void 0 === a.target ? a.srcElement : a.target, 3 === b.nodeType && (b = b.parentNode), b
          }
          var p, q, r, s = a("handle"),
            t = a("add-e-doc"),
            u = a("loader"),
            v = a("lodash._slice"),
            w = window.performance,
            x = a("eventurl"),
            y = a("xpath"),
            z = a("urlshort");
          w && w.timing && w.getEntriesByType && (u.features.stn = !0), b.exports = function () {
            t("click", n), t("keydown", n), t("keyup", n), t("mousedown", n), t("mouseup", n)
          }
        }, {
          "add-e-doc": 18,
          eventurl: 5,
          handle: 7,
          loader: 55,
          "lodash._slice": 9,
          urlshort: 14,
          xpath: 27
        }],
        27: [function (a, b) {
          var c = {
            DOMPresentationUtils: {},
            Node: {
              ElEMENT_NODE: 1,
              ATTRIBUTE_NODE: 2,
              TEXT_NODE: 3,
              CDATA_SECTION_NODE: 4,
              ENTITY_REFERENCE_NODE: 5,
              ENTITY_NODE: 6,
              PROCESSING_INSTRUCTION_NODE: 7,
              COMMENT_NODE: 8,
              DOCUMENT_NODE: 9,
              DOCUMENT_TYPE_NODE: 10,
              DOCUMENT_FRAGMENT_NODE: 11,
              NOTATION_NODE: 12
            }
          };
          c.DOMPresentationUtils.xPath = function (a, b) {
            if (a.nodeType === c.Node.DOCUMENT_NODE) return "/";
            for (var d = [], e = a; e;) {
              var f = c.DOMPresentationUtils._xPathValue(e, b);
              if (!f) break;
              if (d.push(f), f.optimized) break;
              e = e.parentNode
            }
            return d.reverse(), (d.length && d[0].optimized ? "" : "/") + d.join("/")
          }, c.DOMPresentationUtils._xPathValue = function (a, b) {
            var d, e = c.DOMPresentationUtils._xPathIndex(a);
            if (-1 === e) return null;
            switch (a.nodeType) {
              case c.Node.ElEMENT_NODE:
                if (b && a.getAttribute("id")) return new c.DOMNodePathStep('//*[@id="' + a.getAttribute("id") +
                  '"]', !0);
                d = a.nodeName.toLowerCase();
                break;
              case c.Node.DOCUMENT_NODE:
                d = "";
                break;
              default:
                d = ""
            }
            return e > 0 && (d += "[" + e + "]"), new c.DOMNodePathStep(d, a.nodeType === c.Node.DOCUMENT_NODE)
          }, c.DOMPresentationUtils._xPathIndex = function (a) {
            function b(a, b) {
              if (a === b) return !0;
              if (a.nodeType === c.Node.ElEMENT_NODE && b.nodeType === c.Node.ElEMENT_NODE) return a
                .localName === b.localName;
              if (a.nodeType === b.nodeType) return !0;
              var d = a.nodeType === c.Node.CDATA_SECTION_NODE ? c.Node.TEXT_NODE : a.nodeType,
                e = b.nodeType === c.Node.CDATA_SECTION_NODE ? c.Node.TEXT_NODE : b.nodeType;
              return d === e
            }
            var d = a.parentNode ? a.parentNode.children : null;
            if (!d) return 0;
            for (var e, f = 0; f < d.length; ++f)
              if (b(a, d[f]) && d[f] !== a) {
                e = !0;
                break
              } if (!e) return 0;
            for (var g = 1, f = 0; f < d.length; ++f)
              if (b(a, d[f])) {
                if (d[f] === a) return g;
                ++g
              } return -1
          }, c.DOMNodePathStep = function (a, b) {
            this.value = a, this.optimized = b || !1, this.toString = function () {
              return this.value
            }
          }, b.exports = c.DOMPresentationUtils.xPath
        }, {}],
        18: [function (a, b) {
          var c = window.document;
          b.exports = function (a, b) {
            return "addEventListener" in c ? c.addEventListener(a, b, !1) : "attachEvent" in c ? c.attachEvent(
              "on" + a, b) : void 0
          }
        }, {}],
        5: [function (a, b) {
          function c() {
            return window.document.referrer
          }

          function d() {
            var a;
            if (window.self === window.parent) a = "";
            else try {
              a = window.parent.document.location.href
            } catch (b) {
              a = ""
            }
            return a
          }

          function e() {
            return window.location.href
          }

          function f() {
            return encodeURI(g(window.document.title))
          }
          var g = a("urlshort");
          b.exports = {
            getReferrer: g(c),
            getParenturl: g(d),
            getPageUrl: g(e),
            getPageTitle: f
          }
        }, {
          urlshort: 14
        }],
        24: [function (a) {
          function b(a, b, d, g, i) {
            try {
              j ? j -= 1 : e("err", [i || new c(a, b, d)])
            } catch (k) {
              try {
                e("ierr", [k, (new Date).getTime(), !0])
              } catch (l) {}
            }
            return "function" == typeof h ? h.apply(this, f(arguments)) : !1
          }

          function c(a, b, c) {
            this.message = a || "Uncaught error with no additional information", this.sourceURL = b, this.line = c
          }

          function d(a) {
            e("err", [a, (new Date).getTime()])
          }
          var e = a("handle"),
            f = a("lodash._slice"),
            g = a("ee"),
            h = window.onerror,
            i = !1,
            j = 0;
          a("loader").features.err = !0, window.onerror = b, window.BWEUM.noticeError = d;
          var k = window.XMLHttpRequest;
          try {
            throw new Error
          } catch (l) {
            "stack" in l && (a("wrap-timer"), "addEventListener" in window && a("wrap-events"), k && k
              .prototype && k.prototype.addEventListener && a("wrap-xhr"), i = !0)
          }
          g.on("fn-start", function () {
            i && (j += 1)
          }), g.on("fn-err", function (a, b, c) {
            i && (this.thrown = !0, d(c))
          }), g.on("fn-end", function () {
            i && !this.thrown && j > 0 && (j -= 1)
          }), g.on("internal-error", function (a) {
            e("ierr", [a, (new Date).getTime(), !0])
          })
        }, {
          ee: 4,
          handle: 7,
          loader: 55,
          "lodash._slice": 9,
          "wrap-events": 52,
          "wrap-timer": 53,
          "wrap-xhr": 54
        }],
        54: [function (a, b) {
          function c() {
            j.inPlace(this, m, "fn-")
          }

          function d(a, b) {
            j.inPlace(b, ["onreadystatechange"], "fn-")
          }

          function e(a) {
            a.open = j.wrapOld(a.open, "open-xhr-", f)
          }

          function f(a, b) {
            return b
          }
          var g = a("ee").create(),
            h = a("wrap-events"),
            i = a("wrap-function"),
            j = i(g),
            k = i(h),
            l = window.XMLHttpRequest,
            m = ["onload", "onerror", "onabort", "onloadstart", "onloadend", "onprogress", "ontimeout"];
          b.exports = g, window._ApmXMLHttpRequest = window.XMLHttpRequest, window.XMLHttpRequest = function (a) {
            var b = new l(a);
            try {
              g.emit("new-xhr", [], b), l.prototype.addEventListener ? (k.inPlace(b, ["addEventListener",
                "removeEventListener"
              ], "-", function (a, b) {
                return b
              }), b.addEventListener("readystatechange", c, !1)) : (b.__oldie = !0, e(b))
            } catch (d) {
              try {
                g.emit("internal-error", [d])
              } catch (f) {}
            }
            return b
          }, window.XMLHttpRequest.prototype = l.prototype, j.inPlace(XMLHttpRequest.prototype, ["open",
            "send"], "-xhr-", f), g.on("send-xhr-start", d), g.on("open-xhr-start", d)
        }, {
          ee: 4,
          "wrap-events": 52,
          "wrap-function": 56
        }],
        53: [function (a, b) {
          function c(a, b, c) {
            var d = a[0];
            "string" == typeof d && (d = new Function(d)), a[0] = e(d, "fn-", null, c)
          }
          var d = (a("lodash._slice"), a("ee").create()),
            e = a("wrap-function")(d);
          b.exports = d, e.inPlace(window, ["setTimeout", "setInterval", "setImmediate"], "setTimer-"), d.on(
            "setTimer-start", c)
        }, {
          ee: 4,
          "lodash._slice": 9,
          "wrap-function": 56
        }],
        52: [function (a, b) {
          function c(a) {
            f.inPlace(a, ["addEventListener", "removeEventListener"], "-", d)
          }

          function d(a) {
            return a[1]
          }
          var e = (a("lodash._slice"), a("ee").create()),
            f = a("wrap-function")(e),
            g = a("gos");
          if (b.exports = e, c(window), "getPrototypeOf" in Object) {
            for (var h = document; h && !h.hasOwnProperty("addEventListener");) h = Object.getPrototypeOf(h);
            h && c(h);
            for (var i = XMLHttpRequest.prototype; i && !i.hasOwnProperty("addEventListener");) i = Object
              .getPrototypeOf(i);
            i && c(i)
          } else Object.prototype.hasOwnProperty.call(XMLHttpRequest, "addEventListener") && c(XMLHttpRequest
            .prototype);
          e.on("addEventListener-start", function (a) {
            if (a[1]) {
              var b = a[1];
              "function" == typeof b ? this.wrapped = a[1] = g(b, "bw@wrapped", function () {
                return f(b, "fn-", null, b.name || "anonymous")
              }) : "function" == typeof b.handleEvent && f.inPlace(b, ["handleEvent"], "fn-")
            }
          }), e.on("removeEventListener-start", function (a) {
            var b = this.wrapped;
            b && (a[1] = b)
          })
        }, {
          ee: 4,
          gos: 6,
          "lodash._slice": 9,
          "wrap-function": 56
        }],
        56: [function (a, b) {
          function c(a) {
            return !(a && "function" == typeof a && a.apply && !a[f])
          }
          var d = a("ee"),
            e = a("lodash._slice"),
            f = "bw@wrapper",
            g = Object.prototype.hasOwnProperty;
          b.exports = function (a) {
            function b(a, b, d, g, i) {
              function j() {
                var c = this;
                return h(a, b, c, e(arguments), d, g, i)
              }
              if (c(a)) return a;
              b || (b = "");
              try {
                j[f] = !0
              } catch (k) {}
              return l(a, j), j
            }

            function h(a, b, c, d, e, f) {
              var d, c, g, h, i;
              try {
                g = e && e(d, c) || {}
              } catch (j) {
                m([j, "", [d, c, f], g])
              }
              i = a.name || "", k(b + "start", [d, c, f, i], g);
              try {
                return h = a.apply(c, d)
              } catch (l) {
                var n = window.console;
                throw void 0 != n && n.error && n.log && void 0 != l.stack && (n.log("OneAPM catch error"), n
                  .error(l.stack)), k(b + "err", [d, c, l], g), l
              } finally {
                k(b + "end", [d, c, h, i], g)
              }
            }

            function i(a, b, c) {
              var a = a || function () {},
                b = b || "-";
              return function () {
                var d = this;
                return h(a, b, d, e(arguments), c)
              }
            }

            function j(a, d, e, f) {
              e || (e = "");
              var g, h, i, j = "-" === e.charAt(0);
              for (i = 0; i < d.length; i++) h = d[i], g = a[h], c(g) || (a[h] = b(g, j ? h + e : e, f, h, a))
            }

            function k(b, c, d) {
              try {
                a.emit(b, c, d)
              } catch (e) {
                m([e, b, c, d])
              }
            }

            function l(a, b) {
              if (Object.defineProperty && Object.keys) try {
                var c = Object.keys(a);
                return c.forEach(function (c) {
                  Object.defineProperty(b, c, {
                    get: function () {
                      return a[c]
                    },
                    set: function (b) {
                      return a[c] = b, b
                    }
                  })
                }), b
              } catch (d) {
                m([d])
              }
              for (var e in a) g.call(a, e) && (b[e] = a[e]);
              return b
            }

            function m(b) {
              try {
                a.emit("internal-error", b)
              } catch (c) {}
            }
            return a || (a = d), b.inPlace = j, b.flag = f, b.wrapOld = i, b
          }
        }, {
          ee: 4,
          "lodash._slice": 9
        }],
        22: [function (a, b) {
          {
            var c = a("cookie");
            a("loader")
          }
          b.exports = function () {
            var a, b = c("ONEAPM_AI"),
              d = [],
              e = [],
              f = 0,
              g = {
                applicationID: "",
                applicationTime: "",
                queueTime: "",
                licenseKey: "",
                transactionName: "",
                ttGuid: "",
                tierName: ""
              };
            if (null != b)
              for (d = b.split("||"), a = d.length, f; a > f; f++)
                if (void 0 != d[f]) switch (e = d[f].split(":"), e[0]) {
                  case "applicationID":
                    g.applicationID = e[1];
                    break;
                  case "applicationTime":
                    g.applicationTime = e[1];
                    break;
                  case "queueTime":
                    g.queueTime = e[1];
                    break;
                  case "licenseKey":
                    g.licenseKey = e[1];
                    break;
                  case "transactionName":
                    g.transactionName = e[1];
                    break;
                  case "ttGuid":
                    g.ttGuid = e[1];
                    break;
                  case "tierName":
                    g.tierName = e[1]
                }
            window.BWEUM.aicookie = g
          }
        }, {
          cookie: 3,
          loader: 55
        }],
        21: [function (a, b) {
          var c = a("cookie");
          b.exports = function () {
            if ("" != window.apmBICookieUser) {
              var a = c(window.apmBICookieUser);
              null != a && (window.apmBiUser = a, window.apmBiUser += "")
            }
          }
        }, {
          cookie: 3
        }],
        16: [function () {}, {}]
      }, {}, [1]), window.BWEUM.require = a
  }();

</script>
