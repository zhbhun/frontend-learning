# 本机最小验证:多窗口与窗口间通信

Storybook 里的 Canvas 是浏览器模拟,不运行 Tauri。本文件给出在本机用真实 Tauri 运行时核对课程结论的最小步骤,基于[第一个应用](?path=/docs/first-app--docs)生成的 React 工程,不引入新依赖。

## 1 声明式双窗口与授权面

1. `src-tauri/tauri.conf.json` 的 `app.windows` 增加第二项:

```json
{ "label": "settings", "title": "设置", "width": 480, "height": 380 }
```

2. `src-tauri/capabilities/default.json` 的 `windows` 数组改为 `["main", "settings"]`。
3. `npm run tauri dev`。

预期:

- 应用启动出现两个窗口;`settings` 窗口里 `invoke`、`listen` 均可用。
- 把 `"settings"` 从 capability 的 `windows` 列表移除并重启:新窗口能出现,但里面任何 API 调用被拒——capability 的 `windows` 列表决定授权面。

## 2 运行时创建与 label 冲突

1. capability 的 `permissions` 增加 `"core:webview:allow-create-webview-window"`。
2. 主窗口前端执行:

```ts
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

const settings = new WebviewWindow('settings', {
  url: '/settings',
  title: '设置',
});
settings.once('tauri://created', () => console.log('created'));
settings.once('tauri://error', (e) => console.error(e));
```

预期:

- 第一次执行:打印 `created`,新窗口出现(`url` 指向的路径不存在时,dev 下 Vite 会回退到 index.html,不影响创建本身)。
- 不关新窗口再次执行:打印 `tauri://error`——同一 label 不能创建两个窗口。
- 移除 `core:webview:allow-create-webview-window` 权限后重启再执行:创建被 ACL 拒绝。

## 3 定向投递与广播

1. 两个窗口的组件里各注册一个监听,label 从 `getCurrentWebviewWindow().label` 取:

```ts
import { listen } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

const label = getCurrentWebviewWindow().label;
const unlisten = await listen('ping', (e) => console.log(label, e.payload));
```

2. 在主窗口的前端代码里分别执行(如临时按钮的回调):

```ts
await emitTo('settings', 'ping', { from: 'main' }); // 只有 settings 的控制台打印
await emit('ping', { from: 'main' });               // 两个窗口的控制台都打印
await emitTo('ghost', 'ping', { from: 'main' });    // 无人收到,也不报错
```

预期:`emitTo` 只有目标窗口收到;`emit` 广播全部收到;target 不匹配只是没有监听者,不是错误。
