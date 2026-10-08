# 本机最小验证:四个插件的系统响应

Storybook 里的 Canvas 是浏览器模拟,不运行 Tauri。本文件给出在本机用真实 Tauri 运行时核对课程结论的最小步骤,基于[第一个应用](?path=/docs/first-app--docs)生成的 React 工程,按课程「快速上手」用 `tauri add` 装齐四个插件,并在 capabilities 里补 `clipboard-manager:allow-write-text`。桌面环境为 macOS(Apple Silicon);Windows 通知的差异需要单独的打包验证,见第 5 节。

## 1 dialog:返回值由用户操作决定

```tsx
import { open, save } from '@tauri-apps/plugin-dialog';

const file = await open({ multiple: false }); // 单选
const files = await open({ multiple: true }); // 多选
const target = await save({ title: '导出报告' });
console.log(file, files, target);
```

预期:单选返回路径字符串,多选返回数组;两个对话框点「取消」都返回 `null`——与课程「文件选择」的返回值矩阵一致。再把 `open` 加上 `directory: true`,macOS 弹出的是文件夹选择面板。

## 2 notification:两层授权

```tsx
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';

let granted = await isPermissionGranted();
if (!granted) {
  granted = (await requestPermission()) === 'granted';
}
if (granted) {
  await sendNotification({ title: '验证', body: '本机通知可达' });
}
```

预期:macOS 首次发送时系统弹出通知授权询问;允许后横幅出现。若在系统设置里关掉应用的通知权限,`isPermissionGranted()` 返回 `false`,走请求分支——与课程「两层授权」的结论一致。

## 3 opener:default 覆盖面

```tsx
import { openPath, openUrl, revealItemInDir } from '@tauri-apps/plugin-opener';

await openUrl('https://tauri.app');          // 正常:default 含 open-url
await revealItemInDir('/Users/me/Downloads'); // 正常:default 含 reveal-item-in-dir
await openPath('/Users/me/Downloads/report.pdf'); // 拒绝:default 不含 open-path
```

预期:前两条调用分别打开默认浏览器与访达;第三条在 dev 控制台收到 `opener.open_path not allowed…`。在 capabilities 加 `opener:allow-open-path`(可用对象形式配 path scope)后恢复,与课程「授权是 opener 的重点」一致。

## 4 clipboard:空 default 集

1. 暂时从 capabilities 删掉 `clipboard-manager:allow-write-text`,等重编译后调用 `writeText`,预期报 not allowed——空 default 集不授权任何命令。
2. 把权限加回后重试,`writeText('Tauri is awesome!')` 成功,`readText()` 读回同一字符串(读需要另外声明 `allow-read-text`)。

## 5 通知的打包差异(Windows)

Windows 上 dev 模式的通知挂 powershell 名称与图标,且只有已安装应用才有完整通知行为。核对方式:`npm run tauri build` 生成安装包并安装后重复第 2 节流程,通知横幅应显示应用名称与图标——与课程「通知的验收放在打包之后」一致。
