if (!self.define) {
  let e,
    s = {};
  const i = (i, n) => (
    (i = new URL(i + '.js', n).href),
    s[i] ||
      new Promise((s) => {
        if ('document' in self) {
          const e = document.createElement('script');
          (e.src = i), (e.onload = s), document.head.appendChild(e);
        } else (e = i), importScripts(i), s();
      }).then(() => {
        let e = s[i];
        if (!e) throw new Error(`Module ${i} didn’t register its module`);
        return e;
      })
  );
  self.define = (n, r) => {
    const t = e || ('document' in self ? document.currentScript.src : '') || location.href;
    if (s[t]) return;
    let o = {};
    const l = (e) => i(e, t),
      d = { module: { uri: t }, exports: o, require: l };
    s[t] = Promise.all(n.map((e) => d[e] || l(e))).then((e) => (r(...e), o));
  };
}
define(['./workbox-30e9d199'], function (e) {
  'use strict';
  self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        { url: 'assets/index-2388e1f6-3.js', revision: null },
        { url: 'assets/index-d526a0c5.css', revision: null },
        { url: 'index.html', revision: 'c7087a247781186c683ef976aad64dac-3' },
        { url: 'registerSW-1.js', revision: '1872c500de691dce40960bb85481de07' },
      ],
      {}
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(new e.NavigationRoute(e.createHandlerBoundToURL('index.html')));
});
