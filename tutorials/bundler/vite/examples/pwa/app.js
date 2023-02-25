import path from 'path';
import express from 'express';
const app = express();
const port = 3000;

app.get('/h5/projects/36a3ccc8beea4fcfb2c8b5308cd917b0', (req, res) => {
  res.sendFile(
    '/Users/zhanghuabin/Project/learning/frontend/tutorials/bundler/vite/examples/pwa/temp/h5/projects/36a3ccc8beea4fcfb2c8b5308cd917b0.html'
  );
});

// app.get('/sw.js', (req, res) => {
//   console.log('>>', Date.now());
//   res.set('Cache-Control', 'public, max-age=0');
//   res.set('Content-Type', 'application/javascript; charset=utf-8');
//   res.send(`
// console.log(Date.now(), typeof window, typeof importScripts, 1);
// if (!self.define) {
//   let e,
//     s = {};
//   const i = (i, n) => (
//     (i = new URL(i + '.js', n).href),
//     s[i] ||
//       new Promise((s) => {
//         if ('document' in self) {
//           const e = document.createElement('script');
//           (e.src = i), (e.onload = s), document.head.appendChild(e);
//         } else (e = i), importScripts(i), s();
//       }).then(() => {
//         let e = s[i];
//         if (!e) throw new Error('Module i didn’t register its module');
//         return e;
//       })
//   );
//   self.define = (n, r) => {
//     const t = e || ('document' in self ? document.currentScript.src : '') || location.href;
//     if (s[t]) return;
//     let o = {};
//     const l = (e) => i(e, t),
//       d = { module: { uri: t }, exports: o, require: l };
//     s[t] = Promise.all(n.map((e) => d[e] || l(e))).then((e) => (r(...e), o));
//   };
// }
// define(['./workbox-30e9d199'], function (e) {
//   'use strict';
//   self.skipWaiting(),
//     e.clientsClaim(),
//     e.precacheAndRoute(
//       [
//         // { url: 'assets/index-2388e1f6.js', revision: null },
//         // { url: 'assets/index-d526a0c5.css', revision: null },
//         {
//           url: 'https://static.fe.pixocial.com/h5-batman.pixocial.com/assets/index.681a5c0d.js',
//           revision: null,
//         },
//         {
//           url: 'https://static.fe.pixocial.com/h5-batman.pixocial.com/assets/index.379c3f90.css',
//           revision: null,
//         },
//         {
//           url: '/h5/projects/36a3ccc8beea4fcfb2c8b5308cd917b0',
//           revision: 'c7087a247781186c683ef976aad64da21-3',
//         },
//         { url: 'registerSW.js', revision: '1872c500de691dce40960bb85481de07-3' },
//       ],
//       {}
//     ),
//     e.cleanupOutdatedCaches(),
//     e.registerRoute(
//       new e.NavigationRoute(
//         e.createHandlerBoundToURL('/h5/projects/36a3ccc8beea4fcfb2c8b5308cd917b0')
//       )
//     );
// });`);
// });

app.use(express.static('temp'));

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
