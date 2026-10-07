/**
 * 范例：把推送订阅封装成 useIpcEvent composable。
 *
 * 演示内容：useIpcEvent(subscribe, handler) 在 setup 里立即订阅，
 * 作用域销毁（组件卸载）时退订，正好把 3.3 的桥惯例
 * （listener 进、取消订阅函数出）接进 onScopeDispose。
 * 主要观察：与 React 版（9.2）不同，Vue 的 setup 只执行一次，handler
 * 不存在「每帧重建」问题，也就不需要 ref 保活技巧——没有 StrictMode
 * 双执行，订阅天然只建立一次，两行就是完整实现。
 */
import { onScopeDispose } from 'vue';

export function useIpcEvent<P>(
  subscribe: (listener: (payload: P) => void) => () => void,
  handler: (payload: P) => void,
): void {
  // 订阅即时生效（不等 onMounted，早于首次挂载的推送也不会漏）；
  // 返回值就是 3.3 约定的取消订阅函数
  const unsubscribe = subscribe(handler);
  // 组件 setup 上下文中，作用域销毁（卸载）时退订；
  // 离开组件上下文调用时挂不上清理——composable 必须在 setup 里用
  onScopeDispose(unsubscribe);
}
