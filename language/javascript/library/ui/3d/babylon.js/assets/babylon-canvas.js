/* Babylon 场景接入 Storybook Canvas 的等价生命周期：
   按视口可见性启停 engine.runRenderLoop（保留 Babylon 引擎时序，保证 Animation 等
   引擎内部计时正确），随容器 resize 调 engine.resize()，离开当前 Docs 页时释放
   Engine/Scene。命令式交互课统一复用本 helper，不自造渲染循环。 */
import { createResizeObserver } from './canvas-runtime.js';
import { Engine } from '@babylonjs/core';

/**
 * @param {HTMLCanvasElement} canvas
 * @param {(engine: import('@babylonjs/core').Engine) => import('@babylonjs/core').Scene} setup
 *   在新建的 engine 上创建 Scene、相机、光源、网格，并用
 *   scene.onBeforeRenderObservable 做每帧业务更新与 emit 派生读数；返回该 Scene。
 * @param {{ rootMargin?: string }} [options]
 * @returns {{
 *   engine: import('@babylonjs/core').Engine,
 *   scene: import('@babylonjs/core').Scene,
 *   renderOnce(): void,
 *   dispose(): void,
 * }}
 */
export function createBabylonRuntime(canvas, setup, options = {}) {
  const rootMargin = options.rootMargin ?? '200px 0px';
  const engine = new Engine(
    canvas,
    true,
    { stencil: true, preserveDrawingBuffer: true },
    true,
  );
  const scene = setup(engine);

  const doc = canvas.ownerDocument ?? globalThis.document;
  const win = doc?.defaultView ?? globalThis.window;
  const IntersectionObserverClass =
    win?.IntersectionObserver ?? globalThis.IntersectionObserver;
  let nearViewport = false;
  let running = false;

  function sync() {
    const should =
      nearViewport && doc?.visibilityState !== 'hidden';
    if (should && !running) {
      engine.runRenderLoop(() => scene.render());
      running = true;
    } else if (!should && running) {
      engine.stopRenderLoop();
      running = false;
    }
  }

  const observer = new IntersectionObserverClass(
    (entries) => {
      nearViewport = entries.at(-1)?.isIntersecting ?? false;
      sync();
    },
    { rootMargin },
  );
  observer.observe(canvas);
  doc?.addEventListener?.('visibilitychange', sync);

  const resizer = createResizeObserver(canvas, () => engine.resize());

  return {
    engine,
    scene,
    renderOnce() {
      scene.render();
    },
    dispose() {
      engine.stopRenderLoop();
      observer.disconnect();
      doc?.removeEventListener?.('visibilitychange', sync);
      resizer.disconnect();
      scene.dispose();
      engine.dispose();
    },
  };
}
