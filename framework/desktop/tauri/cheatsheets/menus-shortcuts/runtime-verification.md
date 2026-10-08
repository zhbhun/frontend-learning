# 本机最小验证:菜单与快捷键的真实运行行为

Storybook 里的 Canvas 是浏览器模拟,不运行 Tauri。本文件给出在本机用真实 Tauri 运行时核对课程结论的最小步骤,基于[第一个应用](?path=/docs/first-app--docs)生成的 React 工程,按课程「快速上手」安装应用菜单并 `npm run tauri add global-shortcut`(capabilities 里已补 `global-shortcut:allow-register`)。桌面环境为 macOS(Apple Silicon);菜单与全局快捷键均为桌面能力。

## 1 应用菜单:替换默认菜单与 action 通道

把课程「快速上手」的 `installMenu()` 接入 `main.tsx` 后运行 `npm run tauri dev`,预期:

- 菜单栏从默认菜单(App / Edit / View / Window / Help)变成只剩「文件」;点「打开…」,控制台打印 `action: open`——`action` 收到的参数就是定义时的 `id`。
- 把「文件」子菜单的 items 换成平铺的 `{ id: 'open', text: '打开…' }`(不包 `Submenu` 直接放进 `Menu.new`),重启后菜单栏为空,点击无反应——macOS 顶层只允许 Submenu,与课程「菜单结构」的规则一致。
- 调用 `await Menu.default().then((m) => m.setAsAppMenu())` 可随时换回默认菜单,用于对照。

## 2 CheckMenuItem 与运行时修改

```ts
import { CheckMenuItem, Menu, Submenu } from '@tauri-apps/api/menu';

const autoSave = await CheckMenuItem.new({
  id: 'auto-save',
  text: '自动保存',
  checked: true,
});
const view = await Submenu.new({ text: '视图', items: [autoSave] });
const menu = await Menu.new({ items: [view] });
await menu.setAsAppMenu();
```

预期:点「自动保存」一次,勾选标记消失再点恢复——点击自动翻转,无需手写切换;在 item 上再调 `await autoSave.isChecked()` 能读到最新状态。把 `await menu.get('auto-save')` 的结果 `setEnabled(false)` 后,该项变灰且点击不再产生事件。

## 3 上下文菜单:popup 接管右键

```ts
import { Menu } from '@tauri-apps/api/menu';

const menu = await Menu.new({
  items: [
    { item: 'Copy' },
    { item: 'Separator' },
    { id: 'open-link', text: '打开链接', action: (id) => console.log(id) },
  ],
});

document.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  void menu.popup();
});
```

预期:页面任意位置右键弹出自定义菜单;点「打开链接」打印 `open-link`;注释掉 `preventDefault()` 后,右键恢复 WebView 默认菜单,popup 不再执行——三步缺一不可,与课程「上下文菜单」一致。

## 4 全局快捷键:焦点与占用

按课程「快速上手」注册 `CommandOrControl+Shift+P` 后:

1. 应用聚焦时按下,控制台打印 `全局触发: CommandOrControl+Shift+P`。
2. 点别的应用让它抢到前台,再按同一组合,仍然打印——全局快捷键不依赖焦点;此时按 `Cmd+O`(加速键)不会触发 `action`。
3. 新建第二个工程注册同一个组合键:两个 handler 中只有先注册者继续触发(后注册者被占用不触发),对照「占用」边界;`isRegistered('CommandOrControl+Shift+P')` 在注册方返回 `true`、在未注册方返回 `false`——它只查本应用。
4. `await unregister('CommandOrControl+Shift+P')` 后再按,无输出;`unregisterAll()` 后全部失效。

## 5 accelerator 解析失败被静默忽略

把「打开…」的 `accelerator` 故意写成 `CmdOrCtrl+Shift+OO`(不存在的键):

```ts
{ id: 'open', text: '打开…', accelerator: 'CmdOrCtrl+Shift+OO', action: console.log }
```

预期:菜单项正常创建、可以点击,但项上**不显示任何快捷键**,也没有报错——无法解析的 accelerator 被静默忽略,与课程「定义应用菜单」的边界一致。改回 `CmdOrCtrl+O` 后快捷键标签恢复。
