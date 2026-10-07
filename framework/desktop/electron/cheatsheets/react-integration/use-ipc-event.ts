/**
 * 范例：把推送订阅封装成 useIpcEvent hook。
 *
 * 演示内容：useIpcEvent(subscribe, handler) 挂载时订阅、卸载时退订，
 * 正好把 3.3 的桥惯例（listener 进、取消订阅函数出）接进
 * useEffect 的 cleanup 语义。
 * 主要观察：订阅只建立一次（subscribe 是 window.api 上的稳定方法引用），
 * handler 每帧更新只进 ref——回调永远调用最新一帧的 handler；
 * React StrictMode 开发期的双执行（订阅 → 退订 → 订阅）也对称安全。
 */
import { useEffect, useRef } from 'react';

export function useIpcEvent<P>(
  subscribe: (listener: (payload: P) => void) => () => void,
  handler: (payload: P) => void,
): void {
  // 最新 handler 存 ref：避免把 handler 写进依赖导致每帧重订阅
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    // 返回值就是 3.3 约定的取消订阅函数：React 把它当 cleanup，卸载时调用
    return subscribe((payload) => handlerRef.current(payload));
  }, [subscribe]);
}
