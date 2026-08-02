import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

import {
  createRenderer,
  disposeObjectTree,
  formatVector,
  readCanvasSize
} from '../../assets/shared-scene.js';

/*
演示 TransformControls 的完整工作流：Raycaster 点击选中对象 -> 出现 gizmo ->
切换 translate / rotate / scale 模式拖动 -> 拖动期间禁用 OrbitControls 避免相机跟随。

输入来自 Controls 面板（mode / space / size / translationSnap / orbitBridge），
以及画布上的点击与拖动。预期结果是：
- 点击物体后，gizmo 出现在该对象上，读数显示其世界 position / rotation / scale。
- 拖动 gizmo 时 OrbitControls 暂停（orbitBridge=true）；松手后恢复。
- 关闭 orbitBridge 后，拖动 gizmo 时相机也会同时转动，体现冲突来源。
读文件时先看 createStage、selectByPointer 和 wireOrbitBridge 这三条主线。
*/
export function createTransformExample(initialArgs = {}) {
  const settings = {
    mode: 'translate',
    space: 'world',
    size: 1,
    translationSnap: 0,
    orbitBridge: true
  };

  const element = document.createElement('section');
  element.className = 'cs-stage transform-controls-stage';
  element.setAttribute('aria-label', 'TransformControls 交互范例');

  const canvas = document.createElement('canvas');
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', 'TransformControls 画布');
  element.append(canvas);

  const hintElement = document.createElement('p');
  hintElement.className = 'tc-hint';
  hintElement.textContent =
    '点击物体选中 -> 拖动 gizmo 变换；切换模式、空间和大小请用下方参数面板。';
  element.append(hintElement);

  const actionsElement = document.createElement('div');
  actionsElement.className = 'tc-actions';
  element.append(actionsElement);

  const readoutElement = document.createElement('dl');
  readoutElement.className = 'cs-readout';
  element.append(readoutElement);

  const renderer = createRenderer(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e8f0eb');

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 120);
  camera.position.set(6.5, 4.8, 7.5);
  camera.lookAt(0, 0.8, 0);

  const grid = new THREE.GridHelper(20, 20, '#789087', '#c8d6cf');
  scene.add(grid);
  scene.add(new THREE.AxesHelper(2.5));

  // 一组可被选中、可被变换的物体。Raycaster 只会拾取 pickable 数组里的对象。
  const pickable = [];
  buildLandmarks().forEach((mesh) => {
    scene.add(mesh);
    pickable.push(mesh);
  });

  const hemisphere = new THREE.HemisphereLight('#ffffff', '#6c8178', 1.1);
  const key = new THREE.DirectionalLight('#ffffff', 2.3);
  key.position.set(5, 9, 6);
  scene.add(hemisphere, key);

  // OrbitControls 负责围绕场景浏览；TransformControls 拖动 gizmo 时要暂时关掉它。
  const orbit = new OrbitControls(camera, canvas);
  orbit.target.set(0, 0.8, 0);
  orbit.minDistance = 3;
  orbit.maxDistance = 20;
  orbit.maxPolarAngle = Math.PI * 0.92;
  orbit.update();

  // TransformControls 自身不是 Object3D，r165 起必须用 getHelper() 拿到 helper 再加入场景。
  const transform = new TransformControls(camera, canvas);
  transform.size = settings.size;
  transform.setMode(settings.mode);
  transform.setSpace(settings.space);
  scene.add(transform.getHelper());

  // 选中标记：在选中对象下方画一个圆环，方便读“当前选了谁”。
  const selectionRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.03, 10, 48),
    new THREE.MeshBasicMaterial({ color: '#2f6f58', transparent: true, opacity: 0.85 })
  );
  selectionRing.rotation.x = Math.PI / 2;
  selectionRing.visible = false;
  scene.add(selectionRing);

  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();

  const state = {
    eventCounts: { change: 0, 'dragging-changed': 0, mouseDown: 0, mouseUp: 0 },
    nearViewport: false,
    disposed: false
  };
  const cleanups = [];

  function setCursor(name) {
    canvas.dataset.cursor = name;
  }

  function selectObject(object) {
    transform.attach(object);
    selectionRing.visible = object !== undefined && object !== null;
    renderFrame(0);
  }

  // 点击空白处取消选中；点击 pickable 物体则 attach。TransformControls 的内部 raycaster
  // 只检测 gizmo，不会“选中物体”，所以对象选择必须由应用层用 Raycaster 完成。
  function selectByPointer(event) {
    const rect = canvas.getBoundingClientRect();
    pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNdc, camera);
    const hits = raycaster.intersectObjects(pickable, false);
    selectObject(hits.length > 0 ? hits[0].object : null);
  }

  // 关键协调点：dragging-changed 在 gizmo 拖动开始/结束时触发，
  // 在拖动期间禁用 OrbitControls，否则两个控制器会抢同一组指针输入。
  function wireOrbitBridge(enabled) {
    if (enabled) {
      transform.addEventListener('dragging-changed', orbitBridge);
    } else {
      transform.removeEventListener('dragging-changed', orbitBridge);
    }
  }
  function orbitBridge(event) {
    orbit.enabled = !event.value;
  }

  function trackEvents() {
    ['change', 'dragging-changed', 'mouseDown', 'mouseUp'].forEach((type) => {
      transform.addEventListener(type, () => {
        state.eventCounts[type] += 1;
      });
    });
  }

  // pointerdown 同时被 OrbitControls、TransformControls 和这里的选区监听接收。
  // TransformControls 在没有悬停 gizmo时会直接返回，不会捕获指针；
  // 这里只处理“点击命中物体或空白”的选择动作，拖动相机仍由 OrbitControls 完成。
  function onCanvasPointerDown(event) {
    if (event.button !== 0) {
      return;
    }
    // axis 不为 null 表示指针正压在 gizmo 上，交给 TransformControls 处理拖动。
    if (transform.axis !== null) {
      return;
    }
    selectByPointer(event);
  }

  canvas.addEventListener('pointerdown', onCanvasPointerDown);
  cleanups.push(() => canvas.removeEventListener('pointerdown', onCanvasPointerDown));

  // dragging 状态切到 true 时把光标改成 grabbing，让读者看见“现在在拖 gizmo”。
  function onDraggingChanged(event) {
    setCursor(event.value ? 'grabbing' : '');
  }
  transform.addEventListener('dragging-changed', onDraggingChanged);
  cleanups.push(() => transform.removeEventListener('dragging-changed', onDraggingChanged));

  trackEvents();
  wireOrbitBridge(settings.orbitBridge);

  let lastReadoutPaint = 0;

  function renderFrame(delta = 0) {
    if (state.disposed) {
      return;
    }

    // 让选中标记跟着对象走：投影对象世界位置到地面，再稍微抬起避免被网格遮挡。
    if (transform.object) {
      const groundPoint = transform.object.getWorldPosition(new THREE.Vector3());
      selectionRing.position.set(groundPoint.x, 0.03, groundPoint.z);
    }

    renderer.render(scene, camera);

    const now = performance.now();
    if (now - lastReadoutPaint >= 100 || delta === 0) {
      lastReadoutPaint = now;
      paintReadout(readoutElement, readout());
    }
  }

  function readout() {
    const obj = transform.object;
    const rows = [
      ['模式', transform.getMode()],
      ['空间', transform.space],
      ['大小', transform.size.toFixed(2)],
      ['orbitBridge', settings.orbitBridge ? '启用' : '关闭'],
      ['dragging', transform.dragging ? '是' : '否'],
      ['change 事件', state.eventCounts.change],
      ['dragging-changed', state.eventCounts['dragging-changed']]
    ];

    if (obj) {
      rows.unshift(
        ['选中对象', obj.name || '(未命名)'],
        ['position', formatVector(obj.position)],
        ['rotation', formatVector(new THREE.Vector3(
          THREE.MathUtils.radToDeg(obj.rotation.x),
          THREE.MathUtils.radToDeg(obj.rotation.y),
          THREE.MathUtils.radToDeg(obj.rotation.z)
        )) + ' °'],
        ['scale', formatVector(obj.scale)]
      );
    } else {
      rows.unshift(['选中对象', '（点击物体以选中）']);
    }

    return rows;
  }

  function resize() {
    const { width, height } = readCanvasSize(canvas);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
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

  const intersectionObserver = new IntersectionObserver(
    (entries) => {
      state.nearViewport = entries[entries.length - 1].isIntersecting;
      orbit.enabled = state.nearViewport;
      transform.enabled = state.nearViewport;
      if (state.nearViewport) {
        start();
      } else {
        stop();
      }
    },
    { rootMargin: '200px 0px' }
  );
  intersectionObserver.observe(canvas);

  // 构造到首次 IntersectionObserver 回调之间，先禁用控制器避免抢占页面输入。
  orbit.enabled = false;
  transform.enabled = false;

  resize();

  const api = {
    element,
    disposed: false,
    apply(args) {
      Object.assign(settings, args);
      transform.setMode(settings.mode);
      transform.setSpace(settings.space);
      transform.size = settings.size;
      // translationSnap=0 视作“不吸附”，与 null 等价但便于 range 控件表达。
      transform.setTranslationSnap(settings.translationSnap > 0 ? settings.translationSnap : null);
      wireOrbitBridgeIfChanged(settings.orbitBridge);
      renderFrame(0);
    },
    addAction(label, action, { primary = false } = {}) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.dataset.primary = String(primary);
      button.addEventListener('click', action);
      actionsElement.append(button);
      return button;
    },
    dispose() {
      if (state.disposed) {
        return;
      }
      api.disposed = true;
      state.disposed = true;
      stop();
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      cleanups.splice(0).forEach((cleanup) => cleanup());
      transform.dispose();
      orbit.dispose();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };

  let currentBridge = settings.orbitBridge;
  function wireOrbitBridgeIfChanged(next) {
    if (next === currentBridge) {
      return;
    }
    wireOrbitBridge(false);
    if (next) {
      wireOrbitBridge(true);
    }
    currentBridge = next;
    // 重新启用 OrbitControls，避免拖动后状态遗留为 disabled。
    orbit.enabled = state.nearViewport;
  }

  // 参数面板里直接切换模式的快捷按钮，比反复打开 Controls 面板更快。
  api.addAction('平移模式', () => applyAndRender({ mode: 'translate' }), { primary: true });
  api.addAction('旋转模式', () => applyAndRender({ mode: 'rotate' }));
  api.addAction('缩放模式', () => applyAndRender({ mode: 'scale' }));
  api.addAction('切换空间', () => applyAndRender({ space: transform.space === 'world' ? 'local' : 'world' }));
  api.addAction('重置选中', () => {
    if (!transform.object) {
      return;
    }
    transform.object.position.copy(transform.object.userData.initialPosition);
    transform.object.rotation.copy(transform.object.userData.initialRotation);
    transform.object.scale.copy(transform.object.userData.initialScale);
    renderFrame(0);
  });
  api.addAction('取消选中', () => {
    transform.detach();
    selectionRing.visible = false;
    renderFrame(0);
  });

  function applyAndRender(patch) {
    api.apply({ ...settings, ...patch });
  }

  // 离开页面时主动释放 DOM 监听和 WebGL 资源。
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
  });

  api.apply(initialArgs);
  return api;
}

function buildLandmarks() {
  const specs = [
    { name: '盒子', color: '#356fd0', geo: new THREE.BoxGeometry(1.2, 1.2, 1.2), pos: [-2.6, 0.6, -2.2] },
    { name: '球体', color: '#d67a35', geo: new THREE.SphereGeometry(0.72, 28, 20), pos: [1.6, 0.72, -2.0] },
    { name: '圆锥', color: '#2b8b70', geo: new THREE.ConeGeometry(0.78, 1.6, 28), pos: [-1.4, 0.8, 1.8] },
    { name: '圆环结', color: '#8d59bd', geo: new THREE.TorusKnotGeometry(0.5, 0.18, 96, 16), pos: [2.4, 0.9, 2.0] }
  ];

  return specs.map((spec) => {
    const mesh = new THREE.Mesh(
      spec.geo,
      new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.45, metalness: 0.05 })
    );
    mesh.name = spec.name;
    mesh.position.set(...spec.pos);
    mesh.rotation.set(0, Math.PI * 0.18, 0);
    mesh.userData.initialPosition = mesh.position.clone();
    mesh.userData.initialRotation = mesh.rotation.clone();
    mesh.userData.initialScale = mesh.scale.clone();
    return mesh;
  });
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
