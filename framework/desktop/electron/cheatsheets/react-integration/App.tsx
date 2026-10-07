/**
 * 范例：消费 window.api 的最小组件（两个 hook 各接一个 IPC 方向）。
 *
 * 演示内容：useApi 拉初始应用信息（invoke，3.2）；
 * useIpcEvent 订阅主进程推送并显示计数（webContents.send，3.3）。
 * 主要观察：渲染端代码只出现 window.api 的具名能力，不出现通道名与
 * ipcRenderer——桥的纪律跨框架不变。
 * 附加：标题行文案改后保存，文字热替换而推送计数不重置（Fast Refresh）。
 */
import { useState } from 'react';

import { useApi } from './use-api';
import { useIpcEvent } from './use-ipc-event';

export function App() {
  const info = useApi(() => window.api.readAppInfo(), []);
  const [count, setCount] = useState(0);

  // window.api.onTick 是模块加载时就存在的稳定方法引用，订阅依赖不会抖动
  useIpcEvent(window.api.onTick, (payload) => setCount(payload.count));

  return (
    <main>
      {/* 改这行文案保存：文字热替换，推送计数不重置（Fast Refresh 保留 state） */}
      <h1>React 已接入渲染线</h1>
      <p>主进程推送计数：{count}</p>
      {info.loading && <p>读取应用信息中……</p>}
      {info.error && <p>读取失败：{info.error.message}</p>}
      {info.data && (
        <ul>
          <li>Electron：{info.data.electron}</li>
          <li>Node.js：{info.data.node}</li>
          <li>平台：{info.data.platform}</li>
        </ul>
      )}
    </main>
  );
}
