/*
本示例演示 canvas 放进普通页面布局时，CSS 尺寸如何同步到 renderer 和 camera。
读代码先看 ResizeObserver 和 renderFrame()：容器变化只改 CSS，渲染尺寸在 syncRendererSize() 里统一同步。
页面控件对应 API：容器宽度 / aspect-ratio 改 CSS；像素比上限写入 renderer.setPixelRatio()；尺寸变化后更新 camera.aspect。
预期观察：容器变窄或比例变化时，CSS 尺寸、drawing buffer 和相机比例一起变化，立方体不会被拉伸。
*/

import {
  addBaseLights,
  addReferenceGrid,
  createHeroMesh,
  createCamera,
  createRenderer,
  createScene,
  disposeObjectTree,
  startRenderLoop,
  syncRendererSize
} from '../shared-stage.js';

export function createResponsiveContainerScene({ canvas, container, onSnapshot }) {
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const scene = createScene();
  const mesh = createHeroMesh('#28747c');

  let pixelRatioLimit = 2;
  let lastTime = 0;
  let reason = '初始化';

  addBaseLights(scene);
  addReferenceGrid(scene);
  scene.add(mesh);

  const resizeObserver = 'ResizeObserver' in window
    ? new ResizeObserver(() => {
        reason = 'ResizeObserver';
      })
    : null;
  resizeObserver?.observe(container);

  const stop = startRenderLoop((time) => {
    const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
    lastTime = time;

    mesh.rotation.x += delta * 0.26;
    mesh.rotation.y += delta * 0.72;

    // 容器是尺寸真源；renderer 和 camera 每帧只同步当前真实尺寸。
    const size = syncRendererSize({
      renderer,
      camera,
      element: container,
      pixelRatioLimit
    });

    renderer.render(scene, camera);
    publish(size, size.sizeChanged ? reason : '动画帧');

    if (reason !== '动画帧') {
      reason = '动画帧';
    }
  });

  function publish(size, snapshotReason) {
    onSnapshot?.({
      ...size,
      reason: snapshotReason
    });
  }

  return {
    setContainerWidth(value) {
      container.style.width = `${value}%`;
      reason = 'CSS width';
    },
    setAspectRatio(value) {
      container.style.aspectRatio = value;
      reason = 'CSS aspect-ratio';
    },
    setPixelRatioLimit(value) {
      pixelRatioLimit = value;
      reason = 'renderer.setPixelRatio';
    },
    dispose() {
      stop();
      resizeObserver?.disconnect();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
