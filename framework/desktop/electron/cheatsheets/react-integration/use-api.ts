/**
 * 范例：把 invoke 请求封装成组件状态的 useApi hook。
 *
 * 演示内容：useApi(load, deps) 在挂载与 deps 变化时调用 load
 * （内部是 window.api 的 invoke 成员，3.2），把 Promise 结果接进
 * { data, loading, error } 三态。
 * 主要观察：info.data 的类型就是 api.ts 里的 AppInfo——7.1 的
 * declare global 镜像让 hook 全程类型安全；组件卸载或 deps 再变时，
 * 过期请求的结果用 cancelled 标志丢弃，不落到组件上。
 */
import { useEffect, useState } from 'react';
import type { DependencyList } from 'react';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useApi<T>(
  load: () => Promise<T>,
  deps: DependencyList,
): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // 过期标志：卸载或 deps 再变后，旧请求的结果不再落地
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    load().then(
      (data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      },
      (err: unknown) => {
        if (!cancelled) setState({ data: null, loading: false, error: toError(err) });
      },
    );

    return () => {
      cancelled = true;
    };
    // load 由调用方以内联箭头或 useCallback 给出，重跑时机完全由 deps 决定
  }, deps);

  return state;
}

// IPC 抛出的 rejection 不一定是 Error 实例，统一包一层便于展示 message
function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}
