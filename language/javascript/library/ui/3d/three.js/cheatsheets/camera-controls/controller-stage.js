import * as THREE from 'three';

import {
  createRenderer,
  disposeObjectTree,
  formatVector,
  readCanvasSize
} from '../../assets/shared-scene.js';

const READOUT_INTERVAL = 100;

/*
相机控制器课程的共享舞台。

输入是控制器工厂、相机初始状态和每帧更新函数；舞台负责尺寸、读数、资源清理，
以及多 Canvas 页面最重要的运行边界：进入视口前后 200px 才启动，离屏暂停并保留最后一帧。
核心控制器文件只留下本课机制，场景、灯光和 Storybook DOM 外壳集中在这里。
*/
export function createControllerStage({
  title,
  hint,
  cameraPosition = [6, 4, 8],
  cameraUp = [0, 1, 0],
  targetPosition = [0, 0.8, 0],
  activation = 'visible',
  createControls,
  onFrame,
  onResize,
  onVisibilityChange,
  readout
}) {
  const element = document.createElement('section');
  element.className = 'cs-stage camera-controls-stage';
  element.setAttribute('aria-label', `${title} 交互范例`);

  const canvas = document.createElement('canvas');
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', `${title} 画布`);
  element.append(canvas);

  const hintElement = document.createElement('p');
  hintElement.className = 'camera-controls-hint';
  hintElement.textContent = hint;
  element.append(hintElement);

  const actionsElement = document.createElement('div');
  actionsElement.className = 'camera-controls-actions';
  element.append(actionsElement);

  const readoutElement = document.createElement('dl');
  readoutElement.className = 'cs-readout';
  element.append(readoutElement);

  const renderer = createRenderer(canvas);
  const target = new THREE.Vector3(...targetPosition);
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 120);
  camera.position.set(...cameraPosition);
  camera.up.set(...cameraUp).normalize();
  camera.lookAt(target);

  const world = createNavigationWorld(target);
  const state = {
    eventCounts: { change: 0, start: 0, end: 0, lock: 0, unlock: 0 },
    nearViewport: false,
    disposed: false
  };
  const cleanups = [];

  const context = {
    element,
    canvas,
    renderer,
    scene: world.scene,
    camera,
    target,
    world,
    state,
    controls: null,
    setHint(text) {
      hintElement.textContent = text;
    },
    addAction(label, action, { primary = false } = {}) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.dataset.primary = String(primary);
      button.addEventListener('click', action);
      actionsElement.append(button);
      cleanups.push(() => button.removeEventListener('click', action));
      return button;
    },
    onCleanup(cleanup) {
      cleanups.push(cleanup);
    }
  };

  context.controls = createControls(context);
  trackControlEvents(context.controls, state.eventCounts);

  let lastReadoutPaint = 0;

  function renderFrame(delta = 0) {
    if (state.disposed) {
      return;
    }

    onFrame?.(context, delta);
    renderer.render(world.scene, camera);

    const now = performance.now();
    if (now - lastReadoutPaint >= READOUT_INTERVAL || delta === 0) {
      lastReadoutPaint = now;
      paintReadout(readoutElement, readout(context));
    }
  }

  function resize() {
    const { width, height } = readCanvasSize(canvas);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    onResize?.(context);
    renderFrame(0);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(element);

  let animationId = 0;
  let lastTime = 0;
  let running = false;

  function tick(time) {
    const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0;
    lastTime = time;
    renderFrame(delta);
    animationId = window.requestAnimationFrame(tick);
  }

  function start() {
    if (running || state.disposed) {
      return;
    }

    running = true;
    lastTime = 0;
    animationId = window.requestAnimationFrame(tick);
  }

  function stop() {
    if (!running) {
      return;
    }

    running = false;
    window.cancelAnimationFrame(animationId);
  }

  function syncActivation() {
    if (activation === 'visible') {
      context.controls.enabled = state.nearViewport;
    } else if (activation === 'focus') {
      context.controls.enabled = state.nearViewport && document.activeElement === canvas;
    }
  }

  const intersectionObserver = new IntersectionObserver(
    (entries) => {
      state.nearViewport = entries[entries.length - 1].isIntersecting;
      syncActivation();
      onVisibilityChange?.(context, state.nearViewport);

      if (state.nearViewport) {
        start();
      } else {
        stop();
      }
    },
    { rootMargin: '200px 0px' }
  );
  intersectionObserver.observe(canvas);

  function handleFocusChange() {
    syncActivation();
    renderFrame(0);
  }

  canvas.addEventListener('focus', handleFocusChange);
  canvas.addEventListener('blur', handleFocusChange);
  canvas.addEventListener('pointerdown', () => {
    if (activation === 'focus') {
      canvas.focus();
    }
  });

  // 构造到首次 IntersectionObserver 回调之间不让键盘型控制器抢占输入。
  if (activation !== 'manual') {
    context.controls.enabled = false;
  }

  resize();

  const api = {
    element,
    context,
    apply() {},
    get disposed() {
      return state.disposed;
    },
    renderOnce() {
      renderFrame(0);
    },
    addAction(label, action, options) {
      return context.addAction(label, action, options);
    },
    dispose() {
      if (state.disposed) {
        return;
      }

      state.disposed = true;
      stop();
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      canvas.removeEventListener('focus', handleFocusChange);
      canvas.removeEventListener('blur', handleFocusChange);
      context.controls.dispose();
      cleanups.splice(0).forEach((cleanup) => cleanup());
      disposeObjectTree(world.scene);
      renderer.dispose();
    }
  };

  // Storybook 切换页面后主动释放控制器监听和 WebGL 资源。
  window.requestAnimationFrame(() => {
    if (!element.isConnected) {
      return;
    }

    const removalObserver = new MutationObserver(() => {
      if (!element.isConnected) {
        removalObserver.disconnect();
        api.dispose();
      }
    });
    removalObserver.observe(document.body, { childList: true, subtree: true });
    cleanups.push(() => removalObserver.disconnect());
  });

  return api;
}

export function resetCamera(context, position, target = context.target) {
  context.camera.position.set(...position);
  context.camera.up.set(0, 1, 0);
  context.camera.lookAt(target);
  context.camera.updateMatrixWorld();
}

export function cameraDirection(camera) {
  return camera.getWorldDirection(new THREE.Vector3());
}

export function degrees(radians) {
  return `${THREE.MathUtils.radToDeg(radians).toFixed(1)}°`;
}

export { formatVector };

function trackControlEvents(controls, eventCounts) {
  Object.keys(eventCounts).forEach((type) => {
    controls.addEventListener(type, () => {
      eventCounts[type] += 1;
    });
  });
}

function createNavigationWorld(target) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e8f0eb');

  const grid = new THREE.GridHelper(24, 24, '#789087', '#c8d6cf');
  scene.add(grid);
  scene.add(new THREE.AxesHelper(2.5));

  const pads = [
    [-4, -4, '#d7e8df'],
    [-2, 1.5, '#d9e5f0'],
    [1.5, -2.5, '#f0dfd1'],
    [3.5, 2.8, '#e7daed']
  ];
  const geometries = [
    new THREE.BoxGeometry(1.3, 1.3, 1.3),
    new THREE.CylinderGeometry(0.7, 0.9, 1.8, 20),
    new THREE.ConeGeometry(0.9, 1.9, 24),
    new THREE.TorusKnotGeometry(0.58, 0.2, 64, 12)
  ];
  const colors = ['#356fd0', '#d67a35', '#2b8b70', '#8d59bd'];

  pads.forEach(([x, z, padColor], index) => {
    const pad = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 2.2),
      new THREE.MeshBasicMaterial({ color: padColor, side: THREE.DoubleSide })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(x, 0.015, z);
    scene.add(pad);

    const landmark = new THREE.Mesh(
      geometries[index],
      new THREE.MeshStandardMaterial({ color: colors[index], roughness: 0.48 })
    );
    landmark.position.set(x, index === 3 ? 1.05 : 0.9, z);
    scene.add(landmark);
  });

  const targetMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 18, 12),
    new THREE.MeshBasicMaterial({ color: '#a34537' })
  );
  targetMarker.position.copy(target);
  scene.add(targetMarker);

  const targetRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.48, 0.025, 8, 40),
    new THREE.MeshBasicMaterial({ color: '#a34537' })
  );
  targetRing.rotation.x = Math.PI / 2;
  targetRing.position.copy(target);
  scene.add(targetRing);

  const hemisphere = new THREE.HemisphereLight('#ffffff', '#6c8178', 1.15);
  const key = new THREE.DirectionalLight('#ffffff', 2.4);
  key.position.set(5, 9, 6);
  scene.add(hemisphere, key);

  return { scene, targetMarker, targetRing };
}

function paintReadout(root, entries) {
  if (root.childElementCount !== entries.length * 2) {
    root.replaceChildren();

    for (const [label] of entries) {
      const term = document.createElement('dt');
      const value = document.createElement('dd');
      term.textContent = label;
      root.append(term, value);
    }
  }

  const terms = root.querySelectorAll('dt');
  const values = root.querySelectorAll('dd');

  entries.forEach(([label, value], index) => {
    terms[index].textContent = label;
    values[index].textContent = String(value);
  });
}
