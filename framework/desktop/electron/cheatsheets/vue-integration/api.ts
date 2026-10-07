/**
 * 范例：window.api 暴露面的类型真源（沿用 7.1 的三点一线，本课补一个推送订阅成员）。
 *
 * 演示内容：桥的类型定义只写这一处。Vue 接入不改变它的位置与角色，
 * 改变的只是渲染端消费它的方式（composable，见 use-api.ts / use-ipc-event.ts）。
 * 相对 7.1 的演进：新增 onTick 订阅成员，演示推送方向的封装（对应 3.3）。
 * 主要观察：preload 用 satisfies 对账，实现与真源不一致时 typecheck 报错；
 * 渲染端 composable 经 api.d.ts 的 declare global 拿到完整类型。
 */
export interface AppInfo {
  electron: string;
  node: string;
  platform: string;
}

/** 主进程定时推送的载荷：只放普通对象，过桥走结构化克隆（3.3） */
export interface TickPayload {
  count: number;
  at: number;
}

export interface Api {
  // invoke 方向：请求响应（3.2）
  readAppInfo(): Promise<AppInfo>;
  ping(message: string): Promise<string>;
  // 推送方向：listener 进、取消订阅函数出（3.3 的桥惯例）
  onTick(listener: (payload: TickPayload) => void): () => void;
}
