/**
 * React 视图与 Electrobun RPC 的粘合层参考实现（不可在 Storybook 内运行，
 * 真实窗口行为以桌面工程为准）。假设的契约（schema 写法见「自定义 RPC」课）：
 *
 *   // src/shared/rpc-schema.ts（两侧共享，只含类型）
 *   export type AppRPC = {
 *     bun: RPCSchema<{ requests: { greet: { params: { name: string }; response: { text: string } } } }>;
 *     webview: RPCSchema<{ messages: { pushNotice: { text: string } } }>;
 *   };
 *
 * 分三段：rpc 单例模块、组件 hooks、入口接线。实际工程按注释拆成
 * view-rpc.ts / hooks / main.tsx 三个文件；合并展示便于对照阅读。
 * 运行条件：Vite 形态的 Electrobun 工程（见「Vite 集成与 HMR」课），本文件
 * 放 src/mainview/ 下由 Vite 构建；主进程侧接线沿用 rpc 课的 custom-rpc 工程。
 */

// ---- 1) src/mainview/view-rpc.ts：进程内唯一的 rpc 单例 ----

import { Electroview } from "electrobun/view";
import type { AppRPC } from "../shared/rpc-schema";

// 模块级单例：组件、hooks 都从这里导入同一个实例。
// 放在组件里创建的话，StrictMode 双挂载 / Fast Refresh 都会造出第二个实例。
export const rpc = Electroview.defineRPC<AppRPC>({
  handlers: {
    // messages: {
    //   // 不依赖组件生命周期的全局逻辑可以写在这里（配置式）；
    //   // 组件私有状态放 hooks 的运行时监听（见下）。
    // },
  },
});

// Electroview 接线只允许入口执行一次：构造函数立即 setTransport 接上通道，
// 重复 new 会重复接线。组件与 hooks 永远不调用它。
let wired = false;
export function connectRpc() {
  if (wired) return;
  wired = true;
  new Electroview({ rpc });
}

// ---- 2) src/mainview/hooks.ts：把 rpc 接进组件生命周期 ----

import { useEffect, useState } from "react";

// 订阅主进程 → 视图方向的消息：挂载注册、卸载清理，状态由回调里的 setState 驱动。
export function useNotices() {
  const [notices, setNotices] = useState<string[]>([]);

  useEffect(() => {
    const onNotice = (payload: { text: string }) => {
      setNotices((prev) => [...prev, payload.text]);
    };
    rpc.addMessageListener("pushNotice", onNotice);
    // 关键一步：返回清理函数。没有它，组件卸载后 listener 仍留在注册表里，
    // 主进程继续推送时会触发幽灵 setState（见正文 Canvas 示意）。
    return () => {
      rpc.removeMessageListener("pushNotice", onNotice);
    };
  }, []);

  return notices;
}

// 一次性请求：请求本身随 effect 发出，结果落地前组件卸载则丢弃（cancelled）。
export function useGreeting(name: string) {
  const [greeting, setGreeting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    rpc.request.greet({ name }).then(({ text }) => {
      if (!cancelled) setGreeting(text);
    });
    return () => {
      cancelled = true;
    };
  }, [name]);

  return greeting;
}

// ---- 3) src/mainview/main.tsx：入口挂载 + 一次接线 ----

// import { StrictMode } from "react";
// import { createRoot } from "react-dom/client";
// import "./index.css";
// import App from "./App";
// import { connectRpc } from "./view-rpc";
//
// connectRpc(); // 与 render 的先后都行；只执行一次是硬要求
// createRoot(document.getElementById("root")!).render(
//   <StrictMode>
//     <App />
//   </StrictMode>,
// );

// ---- 组件用法：hooks 消费，组件不直接碰通道 ----

export function App() {
  const notices = useNotices();
  const greeting = useGreeting("Electrobun");

  return (
    <main>
      <h1>{greeting ?? "…"}</h1>
      <ul>
        {notices.map((text, index) => (
          <li key={index}>{text}</li>
        ))}
      </ul>
    </main>
  );
}

// 主进程侧的对应物（src/bun/index.ts，完整接线见「自定义 RPC」课）：
//   const rpc = BrowserView.defineRPC<AppRPC>({ handlers: { requests: { greet: ... } } });
//   const win = new BrowserWindow({ url, rpc });
//   win.webview.on("dom-ready", () => {
//     win.webview.rpc.send.pushNotice({ text: "主进程已就绪" }); // 等 dom-ready 再发
//   });
