/*
多个几何范例共用的 WebGL 舞台：渲染器、相机、灯光、网格、视口循环。

本页 Canvas 很多。浏览器每个标签页的 WebGL 上下文有上限（常见约 8–16 个），
若全部常驻创建，后创建的实例会拿不到上下文，看起来像“渲不出来”。

因此这里按视口懒挂载：
- 进入视口附近才 createRenderer
- 离开后把最后一帧冻到舞台背景，再 dispose / loseContext，并换新 canvas
- 再次进入时在新 canvas 上重建渲染器

成员文件只在 build / apply / readout 里写本课几何机制；本文件不进入 Docs Show code。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  disposeObjectTree,
  readCanvasSize
} from '../../assets/shared-scene.js';

export function createGeometryExampleFrame({
  canvas: initialCanvas,
  emitSnapshot,
  cameraPosition = [4.6, 3.2, 5.8],
  lookAt = [0, 0.7, 0],
  cameraFov = 45,
  withGroundGrid = true,
  build,
  readSnapshot,
  animate
}) {
  let canvas = initialCanvas;
  let renderer = null;
  let resizeObserver = null;
  let animationId = 0;
  let lastTime = 0;
  let running = false;
  let live = false;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#edf3ef');

  const camera = new THREE.PerspectiveCamera(cameraFov, 1, 0.1, 80);
  camera.position.fromArray(cameraPosition);
  camera.lookAt(lookAt[0], lookAt[1], lookAt[2]);

  scene.add(new THREE.HemisphereLight('#ffffff', '#7c8d83', 0.75));
  const key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(3.8, 6.2, 4.4);
  scene.add(key);

  if (withGroundGrid) {
    scene.add(new THREE.GridHelper(10, 10, '#8ba096', '#d3ded7'));
  }

  const built = build({ scene, camera, renderer: null }) ?? {};
  const runtime = {
    scene,
    camera,
    get renderer() {
      return renderer;
    },
    ...built
  };

  function emit() {
    if (!renderer) {
      return;
    }

    const snapshot = { scene, camera, renderer };
    for (const [keyName, value] of Object.entries(runtime)) {
      if (typeof value !== 'function' && keyName !== 'renderer') {
        snapshot[keyName] = value;
      }
    }
    snapshot.renderer = renderer;
    Object.assign(snapshot, readSnapshot?.(runtime) ?? {});
    emitSnapshot(snapshot);
  }

  function frame(delta) {
    if (!renderer) {
      return;
    }
    animate?.(runtime, delta);
    renderer.render(scene, camera);
    emit();
  }

  function resize() {
    if (!renderer || !canvas.parentElement) {
      return;
    }
    const { width, height } = readCanvasSize(canvas);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function tick(time) {
    if (!running) {
      return;
    }
    const delta = lastTime ? (time - lastTime) / 1000 : 0;
    lastTime = time;
    frame(delta);
    animationId = window.requestAnimationFrame(tick);
  }

  function startLoop() {
    if (running) {
      return;
    }
    running = true;
    lastTime = 0;
    animationId = window.requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (!running) {
      return;
    }
    running = false;
    window.cancelAnimationFrame(animationId);
  }

  function clearFreeze() {
    const stage = canvas.parentElement;
    if (!stage) {
      return;
    }
    stage.style.backgroundImage = '';
    stage.style.backgroundSize = '';
    canvas.style.visibility = '';
  }

  function freezeLastFrame() {
    const stage = canvas.parentElement;
    if (!stage || !renderer) {
      return;
    }
    try {
      renderer.render(scene, camera);
      const url = canvas.toDataURL('image/png');
      stage.style.backgroundImage = `url(${url})`;
      stage.style.backgroundSize = '100% 100%';
      canvas.style.visibility = 'hidden';
    } catch {
      // toDataURL 在上下文已丢失时会失败，忽略即可。
    }
  }

  function replaceCanvas() {
    const stage = canvas.parentElement;
    if (!stage) {
      return;
    }
    const next = document.createElement('canvas');
    stage.insertBefore(next, canvas);
    stage.removeChild(canvas);
    canvas = next;
  }

  function releaseLive() {
    if (!live) {
      return;
    }

    stopLoop();
    freezeLastFrame();

    resizeObserver?.disconnect();
    resizeObserver = null;

    renderer?.dispose();
    renderer = null;

    try {
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      // 上下文可能已不可用。
    }

    // loseContext 之后同一 canvas 往往无法再拿到 WebGL，换新节点供下次挂载。
    intersection.unobserve(canvas);
    replaceCanvas();
    intersection.observe(canvas);
    live = false;
  }

  function ensureLive() {
    if (live) {
      return;
    }

    clearFreeze();
    renderer = createRenderer(canvas);
    live = true;

    resizeObserver = createResizeObserver(canvas, () => {
      resize();
      frame(0);
    });
    resize();
    frame(0);
  }

  const intersection = new IntersectionObserver(
    (entries) => {
      if (entries[entries.length - 1].isIntersecting) {
        ensureLive();
        startLoop();
      } else {
        // 先停循环并冻帧，再释放上下文，给仍在视口内的实例腾额度。
        stopLoop();
        releaseLive();
      }
    },
    { rootMargin: '200px 0px' }
  );

  // canvas 稍后才会被 Storybook 挂进 DOM；挂上后再 observe。
  requestAnimationFrame(() => {
    if (canvas.isConnected) {
      intersection.observe(canvas);
    } else {
      const parent = canvas.parentElement;
      if (!parent) {
        return;
      }
      const mountWatcher = new MutationObserver(() => {
        if (canvas.isConnected) {
          mountWatcher.disconnect();
          intersection.observe(canvas);
        }
      });
      mountWatcher.observe(parent, { childList: true, subtree: true });
      // stage 自己被插入 DOM 时 parent 的父级变化也能覆盖：
      requestAnimationFrame(() => {
        if (canvas.isConnected) {
          mountWatcher.disconnect();
          intersection.observe(canvas);
        }
      });
    }
  });

  runtime.render = () => {
    // 仅在已挂载为 live 时画一帧；未进视口时只更新场景图，等进入再显示。
    if (!live) {
      return;
    }
    resize();
    frame(0);
  };

  runtime.dispose = () => {
    intersection.disconnect();
    stopLoop();
    resizeObserver?.disconnect();
    if (live) {
      renderer?.dispose();
      try {
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        gl?.getExtension('WEBGL_lose_context')?.loseContext();
      } catch {
        // ignore
      }
      live = false;
      renderer = null;
    }
    disposeObjectTree(scene);
  };

  return runtime;
}

export function geometryStats(geometry) {
  const position = geometry.getAttribute('position');
  return {
    positionCount: position?.count ?? 0,
    indexCount: geometry.index?.count ?? null,
    hasNormal: geometry.hasAttribute('normal'),
    hasUv: geometry.hasAttribute('uv')
  };
}

export function replaceMeshGeometry(mesh, nextGeometry) {
  const previous = mesh.geometry;
  mesh.geometry = nextGeometry;
  if (previous && previous !== nextGeometry) {
    previous.dispose();
  }
}
