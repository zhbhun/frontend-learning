/**
 * 范例：把 invoke 请求封装成响应式状态的 useApi composable。
 *
 * 演示内容：useApi(load, watchSources) 挂载时执行 load（immediate watch），
 * watchSources 变化时重跑（内部是 window.api 的 invoke 成员，3.2），
 * 把 Promise 结果接进 data / loading / error 三个 Ref。
 * 主要观察：解构后 info 的类型就是 api.ts 里的 AppInfo——7.1 的
 * declare global 镜像让 composable 全程类型安全；重跑或作用域销毁时，
 * 过期请求的结果由 watch 的 onCleanup 丢弃，不落到组件上。
 */
import { ref, shallowRef, watch } from 'vue';
import type { Ref, WatchSource } from 'vue';

export interface ApiState<T> {
  data: Ref<T | null>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
}

export function useApi<T>(
  load: () => Promise<T>,
  watchSources: WatchSource[] = [],
): ApiState<T> {
  // IPC 载荷是过桥的普通对象：shallowRef 整体替换即可，不做深层响应化
  const data = shallowRef<T | null>(null);
  const loading = ref(true);
  const error = ref<Error | null>(null);

  watch(
    watchSources,
    (_newSources, _oldSources, onCleanup) => {
      // 过期标志：重跑或作用域销毁后，旧请求的结果不再落地
      let cancelled = false;
      onCleanup(() => {
        cancelled = true;
      });

      loading.value = true;
      error.value = null;
      load().then(
        (result) => {
          if (!cancelled) {
            data.value = result;
            loading.value = false;
          }
        },
        (err: unknown) => {
          if (!cancelled) {
            error.value = toError(err);
            loading.value = false;
          }
        },
      );
    },
    // immediate：挂载即执行首次请求（watchSources 默认为空，只跑这一次）
    { immediate: true },
  );

  return { data, loading, error };
}

// IPC 抛出的 rejection 不一定是 Error 实例，统一包一层便于展示 message
function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}
