# 本机最小验证:CSP 与暴露面开关的真实运行时

Storybook 里的 Canvas 是浏览器模拟,不运行 Tauri。本文件给出在本机用真实 Tauri 运行时核对课程结论的最小步骤,基于[第一个应用](?path=/docs/first-app--docs)生成的 React 工程。关键前提:**CSP 的验证必须用构建产物**——`npm run tauri build -- --debug` 后运行产物(dev 页面来自 devUrl,不经 Tauri 的自定义协议,CSP 注入不发生)。调试构建默认可开 devtools(macOS 上在 WebView 里右键 → Inspect)。

## 1 CSP 拦截注入脚本与外域请求

1. 把课程「快速上手」的 `csp` 写进 `tauri.conf.json`,构建并运行调试产物。
2. 在 devtools console 执行课程第 3 步的注入代码段(`document.createElement('script')` + `textContent`)。

预期:console 报 `Refused to execute inline script because it violates the following Content Security Policy directive: "script-src …"`——打包脚本靠自动注入的 nonce/hash 正常运行,无 nonce 的内联脚本被拦。再执行 `fetch('https://example.com')`:目标不在 `connect-src` 白名单里,同样报 CSP violation——把合法来源加进对应指令,而不是关掉自动注入。

## 2 withGlobalTauri 的暴露面

1. 默认配置(不设 `withGlobalTauri`)下,在产物 console 执行 `window.__TAURI__`。

预期:`undefined`——API 不挂全局对象;但 `window.__TAURI_INTERNALS__` 存在,IPC 桥对页面开放,ACL 才是真正的门(这正是课程「withGlobalTauri 的意义是不主动降低利用门槛」的含义)。

2. `tauri.conf.json` 里加 `"withGlobalTauri": true`,重新构建运行,再执行 `window.__TAURI__.core.invoke('greet', { name: 'x' })`。

预期:调用成功(模板的 `greet` 是应用自建命令,默认不经 ACL)——全套 API 挂上全局对象后,页面里的任何脚本都能一步拿到它。

## 3 freezePrototype 的行为

1. `app.security` 里加 `"freezePrototype": true`,重新构建运行。
2. console 执行:

```js
Object.prototype.polluted = 1;
console.log(Object.prototype.polluted); // 期望 undefined
```

预期:赋值无效,读回 `undefined`——原型链已被冻结;脚本无法借原型链污染篡改对象。验证完恢复 `false`,并回归前端依赖(扩展内置原型的库会在这里坏掉)。

## 4 远程页面的默认拒绝(可选)

1. 在 `src-tauri/src/lib.rs` 的 `setup` 里建一个加载远程页面的窗口:

```rust
use tauri::{WebviewUrl, WebviewWindowBuilder};

.setup(|app| {
    WebviewWindowBuilder::new(
        app,
        "remote-demo",
        WebviewUrl::External("https://example.com".parse()?),
    )
    .build()?;
    Ok(())
})
```

2. dev 下(`npm run tauri dev`)打开该窗口,在其 devtools console 执行 `window.__TAURI_INTERNALS__.invoke('plugin:app|version')`。

预期:默认拒绝——capability 默认 `local: true`,该域不在任何 `remote.urls` 里,远程页面零授权,dev 报错指向 not allowed。再按课程「远程内容」一节加一个带 `"remote": { "urls": ["https://example.com"] }` 的 capability,等重编译后同一调用返回应用版本号(`core:default` 含 `core:app` 的 version 命令)——远程页面拿到了 capability 授权的命令。验证完删除该窗口与 capability。
