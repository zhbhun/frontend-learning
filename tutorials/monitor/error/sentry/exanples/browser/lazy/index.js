(function(c, u, v, n, p, e, z, A, w) {
  function k(a) {
      if (!x) {
          x = !0;
          var l = u.getElementsByTagName(v)[0]
            , d = u.createElement(v);
          d.src = A;
          d.crossorigin = "anonymous";
          d.addEventListener("load", function() {
              try {
                  c[n] = r;
                  c[p] = t;
                  var b = c[e]
                    , d = b.init;
                  b.init = function(a) {
                      for (var b in a)
                          Object.prototype.hasOwnProperty.call(a, b) && (w[b] = a[b]);
                      d(w)
                  }
                  ;
                  B(a, b)
              } catch (g) {
                  console.error(g)
              }
          });
          l.parentNode.insertBefore(d, l)
      }
  }
  function B(a, l) {
      try {
          for (var d = m.data, b = 0; b < a.length; b++)
              if ("function" === typeof a[b])
                  a[b]();
          var e = !1
            , g = c.__SENTRY__;
          "undefined" !== typeof g && g.hub && g.hub.getClient() && (e = !0);
          g = !1;
          for (b = 0; b < d.length; b++)
              if (d[b].f) {
                  g = !0;
                  var f = d[b];
                  !1 === e && "init" !== f.f && l.init();
                  e = !0;
                  l[f.f].apply(l, f.a)
              }
          !1 === e && !1 === g && l.init();
          var h = c[n]
            , k = c[p];
          for (b = 0; b < d.length; b++)
              d[b].e && h ? h.apply(c, d[b].e) : d[b].p && k && k.apply(c, [d[b].p])
      } catch (C) {
          console.error(C)
      }
  }
  for (var f = !0, y = !1, q = 0; q < document.scripts.length; q++)
      if (-1 < document.scripts[q].src.indexOf(z)) {
          f = "no" !== document.scripts[q].getAttribute("data-lazy");
          break
      }
  var x = !1
    , h = []
    , m = function(a) {
      (a.e || a.p || a.f && -1 < a.f.indexOf("capture") || a.f && -1 < a.f.indexOf("showReportDialog")) && f && k(h);
      m.data.push(a)
  };
  m.data = [];
  c[e] = c[e] || {};
  c[e].onLoad = function(a) {
      h.push(a);
      f && !y || k(h)
  }
  ;
  c[e].forceLoad = function() {
      y = !0;
      f && setTimeout(function() {
          k(h)
      })
  }
  ;
  "init addBreadcrumb captureMessage captureException captureEvent configureScope withScope showReportDialog".split(" ").forEach(function(a) {
      c[e][a] = function() {
          m({
              f: a,
              a: arguments
          })
      }
  });
  var r = c[n];
  c[n] = function(a, e, d, b, f) {
      m({
          e: [].slice.call(arguments)
      });
      r && r.apply(c, arguments)
  }
  ;
  var t = c[p];
  c[p] = function(a) {
      m({
          p: a.reason
      });
      t && t.apply(c, arguments)
  }
  ;
  f || setTimeout(function() {
      k(h)
  })
}
)(window, document, "script", "onerror", "onunhandledrejection", "Sentry", "1e43dc7e11074d058704fa7e4b898771", "https://browser.sentry-cdn.com/5.7.1/bundle.js", {
  "dsn": "https://1e43dc7e11074d058704fa7e4b898771@sentry.io/1471902"
});
