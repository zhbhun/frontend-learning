# 本机最小验证:自定义协议与 asset 协议的真实运行行为

Storybook 里的 Canvas 是浏览器模拟,不运行 Tauri。本文件给出在本机用真实 Tauri 运行时核对课程结论的最小步骤,基于[第一个应用](?path=/docs/first-app--docs)生成的 React 工程,并按课程「快速上手」完成 `bundle.resources` 与 `assetProtocol` 配置。桌面环境为 macOS(Apple Silicon);自定义协议与 asset 协议均为桌面与移动通用的机制,Windows 上的 URL 形态差异以课程「路径转 URL」的表格为准。

## 1 asset 协议:显示打包资源

放一张 `src-tauri/assets/logo.png`,按课程配置 `bundle.resources` 与 `assetProtocol` 后运行 `npm run tauri dev`,预期:

- 界面显示图片;在 WebView 开发者工具的 Network 面板里,这张图的请求 URL 形如 `asset://localhost/%2FUsers%2F…%2Ftarget%2Fdebug%2Fassets%2Flogo.png`(macOS 形态)——路径整条被编码,斜杠是 `%2F`。
- 开发期资源目录是 `src-tauri/target/debug`(tauri-build 把声明的 resources 拷在 dev 可执行文件旁边),与课程「快速上手」的说明一致。
- 把 `assetProtocol.enable` 改回 `false` 重启:asset 协议被整体关闭(tauri CLI 不再启用 `protocol-asset` Cargo feature,handler 不注册),请求无法加载——这与 403 不同:403 是「协议在、scope 拒绝」,加载失败是「协议不在」。
- 只把 scope 删空(`enable` 保持 `true`)重启:请求返回 403——默认空 scope 不放行任何路径。

## 2 scope 判定:403 与 404 的分界

- scope 保持 `["$RESOURCE/assets/*"]`:请求 `assets/logo.png` 是 200;把文件真放进 `src-tauri/assets/fonts/Inter.ttf` 后请求 `fonts/Inter.ttf` 是 403(`assets/*` 是单层模式,放不下别的目录);请求 `assets/nope.png`(scope 内、文件不存在)是 404——403 与 404 的分界与课程「内置 asset 协议」的回查表一致。
- 在 Unix 主目录放一个 `.cache/test.png` 并把 scope 设为 `["$HOME/**/*"]`、请求它:403;scope 显式写字面量段 `["$HOME/.cache/*"]`:200——通配不匹配 `.` 开头段,字面量可以。
- scope 用对象形式 `{ "allow": ["$HOME/**/*"], "deny": ["$HOME/secrets/**"] }` 请求 `secrets/key.pem`:403——deny 命中优先于 allow。

## 3 自定义协议:注册、path 解码与 Content-Type

把课程「注册自定义协议」的 `register_uri_scheme_protocol("myproto", …)` 加进 `src-tauri/src/lib.rs` 的 Builder 链后:

```ts
// src/App.tsx
import { convertFileSrc } from '@tauri-apps/api/core';

const url = convertFileSrc('构建通过', 'myproto');
console.log(url); // myproto://localhost/%E6%9E%84%E5%BB%BA%E9%80%9A%E8%BF%87
// <img src={url}> 渲染出写有「构建通过」的蓝色徽章
```

预期:

- URL 是 `myproto://localhost/…`(macOS);把平台换到 Windows 验证时才是 `http://myproto.localhost/…`。
- handler 里 `request.uri().path()` 拿到的是**编码原样**的 `/构建通过`(percent-encoded),`trim_start_matches('/')` 后直接用于 SVG:非 ASCII 内容需要自己 percent-decode 才能得到原文——验证方法:徽章文字显示的是编码串还是原文,取决于是否解码。
- 注释掉 `.header(CONTENT_TYPE, "image/svg+xml")` 后重启:图片不渲染或按纯文本显示——Content-Type 必须自己写。
- 把注册代码从 Builder 链移除再访问同一 URL:请求直接失败(无 handler),对照「handler 没被调用」的排查项。

## 4 同步 handler 的阻塞感(可选)

在同步 handler 里 `std::thread::sleep(Duration::from_secs(2))` 模拟慢工作:页面上同一 `<img>` 的加载等待约 2 秒,期间界面其他部分照常,但**该请求本身**被拖住;换成 `register_asynchronous_uri_scheme_protocol` + 线程 + `UriSchemeResponder` 后,handler 立即返回、2 秒后图片补上——两种注册方式的取舍与课程「同步与异步 handler」一致。

## 5 Origin 与 CORS(可选)

在 `myproto://localhost` 页面里用浏览器 fetch 请求一个不回 CORS 头的接口:`TypeError: Failed to fetch`——协议页面的 origin(`myproto://localhost`)不被服务器认识,与课程「Origin 与 CORS」一致;对照方案见[网络请求](?path=/docs/http--docs)的插件 fetch。
