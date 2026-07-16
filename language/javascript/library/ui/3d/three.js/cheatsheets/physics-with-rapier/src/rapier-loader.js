import RAPIER from '@dimforge/rapier3d-compat';
import { hideLoadingState, setLoadingState } from './shared-ui.js';

let rapierReady = null;

export function loadRapier() {
  if (!rapierReady) {
    rapierReady = RAPIER.init().then(() => RAPIER);
  }

  return rapierReady;
}

export async function mountRapierLesson(canvas, createLesson) {
  let cleanup = null;

  try {
    setLoadingState('正在加载 Rapier WASM...', 'loading');
    const Rapier = await loadRapier();
    setLoadingState('Rapier 已就绪，正在创建物理世界...', 'ready');
    cleanup = createLesson(canvas, Rapier);
    window.setTimeout(hideLoadingState, 420);
  } catch (error) {
    console.error(error);
    setLoadingState(`初始化失败：${error instanceof Error ? error.message : String(error)}`, 'error');
  }

  window.addEventListener(
    'beforeunload',
    () => {
      cleanup?.();
    },
    { once: true }
  );
}
