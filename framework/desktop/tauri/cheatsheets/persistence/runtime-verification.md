# 本机最小验证:fs 与 store 的真实运行时

Storybook 里的 Canvas 是浏览器模拟,不运行 Tauri。本文件给出在本机用真实 Tauri 运行时核对课程结论的最小步骤,基于[第一个应用](?path=/docs/first-app--docs)生成的 React 工程,插件用 `tauri add` 安装。

## 1 store:落盘位置、重启持久与优雅退出

1. 按课程「快速上手」`npm run tauri add store` 并替换 `App.tsx`,点按钮切到 dark。
2. 等约 1 秒,看磁盘文件(`identifier` 见 `tauri.conf.json`):

```bash
cat ~/Library/Application\ Support/<identifier>/settings.json
```

预期:内容为 `{"theme":"dark"}`;完全退出再启动应用,主题保持 dark——重启持久。

3. 把单例改为 `new LazyStore('settings.json', { autoSave: false })`,点按钮后立即 `cat` 文件。

预期:内容仍是 `{"theme":"light"}`——关闭 autoSave 后不自动写盘;`Cmd+Q` 优雅退出后再 `cat`,内容已更新为 dark——优雅退出的兜底保存。用 `kill -9` 强杀进程对照:文件停在旧值,强杀窗口内的修改丢失。

## 2 fs:not allowed → forbidden path → 放行

1. `npm run tauri add fs`。默认 capabilities 只有 `fs:default`。在 `App.tsx` 加一个按钮:

```tsx
import { BaseDirectory, writeTextFile } from '@tauri-apps/plugin-fs';

<button
  onClick={() =>
    writeTextFile('demo.txt', 'hello', { baseDir: BaseDirectory.AppData })
      .then(() => console.log('写入成功'))
      .catch((e) => console.error('rejected:', e))
  }
>
  写文件
</button>
```

2. `tauri dev` 点按钮,看前端控制台。

预期:reject,报错带 not allowed 字样——`fs:default` 不含写命令(与课程「权限与 scope」小节的两种拒绝之一对应)。

3. 在 `src-tauri/capabilities/default.json` 的 permissions 里补 `"fs:allow-write-text-file"`,保存等重编译,再点按钮。

预期:仍 reject,报错带 forbidden path 字样——命令放行了,但路径不在 scope 内(权限 ≠ scope)。

4. 再补 scope(与课程示例一致):

```json
{
  "identifier": "fs:scope",
  "allow": ["$APPDATA/**"]
}
```

预期:控制台「写入成功」;`cat ~/Library/Application\ Support/<identifier>/demo.txt` 得到 hello——命令 × 路径两维齐备。

## 3 fs:父目录与递归删除

1. 把上一步的目标路径换成 `'logs/demo.txt'` 直接写。

预期:reject 报 `No such file or directory (os error 2)`——不自动创建父目录。

2. 写之前先 `await mkdir('logs', { baseDir: BaseDirectory.AppData, recursive: true })`,再写,成功。多写一条 `logs/app.log`,然后 `remove('logs', { baseDir: BaseDirectory.AppData })`。

预期:remove reject 报 `Directory not empty (os error 66)`(macOS);加 `recursive: true` 后删除成功。

## 4 路径解析随平台与 identifier 变化

1. 在任意命令或前端打印 `await path.appDataDir()`、`await path.appLogDir()`(需要 `import * as path from '@tauri-apps/api/path'`)。

预期:macOS 分别为 `~/Library/Application Support/<identifier>` 与 `~/Library/Logs/<identifier>`,与课程目录表一致;把 `tauri.conf.json` 的 `identifier` 改掉重跑,目录随之变化——这就是路径不写死、交给 BaseDirectory 的意义。
