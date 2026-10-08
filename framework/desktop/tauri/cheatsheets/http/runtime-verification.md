# 本机最小验证:两条通道的关卡

Storybook 里的 Canvas 是浏览器模拟,不运行 Tauri。本文件给出在本机用真实 Tauri 运行时核对课程结论的最小步骤,基于[第一个应用](?path=/docs/first-app--docs)生成的 React 工程,按课程「快速上手」安装 http 插件。需要两个对照接口:任选一个不返回 `Access-Control-Allow-Origin` 头的自家接口(如 `https://httpbin.org/status/200` 配合一个无 CORS 头的本地服务均可),另一个域名不写进 scope。

## 1 插件 fetch 不受 CORS 约束

1. scope 的 `allow` 加上无 CORS 头接口的域名,`npm run tauri dev`。
2. 在组件里先用浏览器 fetch、再用 `@tauri-apps/plugin-http` 的 fetch 请求同一 URL:

```ts
await fetch(url).catch((e) => console.log('browser', e)); // TypeError: Failed to fetch
const { fetch: pluginFetch } = await import('@tauri-apps/plugin-http');
const response = await pluginFetch(url);
console.log('plugin', response.status); // 200,响应完整可用
```

预期:同一 URL,浏览器通道被 CORS 拦下,插件通道拿到响应——与课程「两条请求通道」的结论一致。

## 2 scope 拒绝的表现

1. 从 `http:default` 的 `allow` 里删掉该域名,保存后等 `tauri dev` 重编译。
2. 再执行一次插件 fetch。

预期:调用 reject,错误信息为 `url not allowed on the configured scope: <url>`;把域名加回 `allow` 后恢复 200。这正是 Canvas 中「api.other.com + 插件通道」场景对应的真实行为。

## 3 对照:重定向默认不查 scope

把白名单内一个会 302 到白名单外地址的请求走插件 fetch:默认配置下成功返回域外响应;在 `tauri.conf.json` 的 `plugins > http` 设 `"scopeRedirects": true` 后,同样请求以 `url not allowed` 失败——课程「域名权限:scope」一节的重定向结论。
