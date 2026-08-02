/*
最小查看器课程的共享舞台。

把 renderer、scene、camera、OrbitControls、Light、resize 和渲染循环集中在这里，
让范例文件只突出本课要观察的差异（加载状态、取景策略、运行时控件）。

舞台负责：
- 创建 renderer / scene / camera / OrbitControls，并装上 HemisphereLight + DirectionalLight；
- 用 ResizeObserver 同步 renderer 尺寸与相机投影，避免拉伸和模糊；
- 用 IntersectionObserver 让画布只在视口附近运行，离屏暂停并保留最后一帧；
- 把状态快照通过 emitSnapshot 推给读数面板，限速 10fps 防止读数刷新拖慢渲染；
- 暴露 fitCameraToBox 工具，让范例在加载完成后给相机和 controls.target 取景。

范例的核心实现写在各自的 *.js 文件里；这里只放共用的外壳和工具。
*/

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const READOUT_INTERVAL = 100;

export function createViewerStage(canvas, emitSnapshot, options = {}) {
  const {
    // 相机到 target 的初始距离与方向，fitCameraToBox 会按模型尺寸覆盖。
    cameraDistance = 6,
    cameraDirection = new THREE.Vector3(1, 0.55, 1).normalize(),
    target = new THREE.Vector3(0, 1, 0),
    fov = 38,
    clearColor = '#e9efe9'
  } = options;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(clearColor, 1);

  const scene = new THREE.Scene();

  // glTF 资源用 PBR 材质，没有环境光时会偏暗。
  // 这里给一组通用的"主光 + 半球填充"作为默认底，正式项目用环境贴图（见 PBR 课）。
  const hemi = new THREE.HemisphereLight('#ffffff', '#7c8a82', 1.0);
  const key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(3, 5, 4);
  scene.add(hemi, key);

  const grid = new THREE.GridHelper(8, 8, '#8ba096', '#c7d3ca');
  scene.add(grid);

  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 200);
  camera.position.copy(target).addScaledVector(cameraDirection, cameraDistance);
  camera.lookAt(target);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.update();

  // 模型容器：范例把加载到的模型挂到这里，方便整体替换和销毁。
  const modelRoot = new THREE.Group();
  scene.add(modelRoot);

  let snapshotEmitter = () => {};
  let lastTime = 0;
  let animationId = 0;
  let running = false;
  let lastReadoutPaint = 0;

  function renderFrame(delta = 0) {
    // 阻尼或 autoRotate 开启时，每帧都要推进控制器，否则松手后没有惯性。
    controls.update(delta);
    renderer.render(scene, camera);

    const now = performance.now();
    if (now - lastReadoutPaint >= READOUT_INTERVAL || delta === 0) {
      lastReadoutPaint = now;
      snapshotEmitter();
    }
  }

  function tick(time) {
    const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0;
    lastTime = time;
    renderFrame(delta);
    animationId = window.requestAnimationFrame(tick);
  }

  function start() {
    if (running) {
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

  function resize() {
    const root = canvas.parentElement;
    const width = Math.max(1, Math.floor(root.clientWidth));
    const height = Math.max(1, Math.floor(root.clientHeight));

    // resize 三件套：renderer 逻辑尺寸、drawing buffer 由 setPixelRatio 内部处理，
    // 相机 aspect 更新后还必须调用 updateProjectionMatrix，否则矩阵停在旧宽高比。
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderFrame(0);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas.parentElement);

  // 进入视口前 200px 启动循环，离屏暂停并保留最后一帧（renderer 开了 preserveDrawingBuffer）。
  const intersectionObserver = new IntersectionObserver(
    (entries) => {
      if (entries[entries.length - 1].isIntersecting) {
        start();
      } else {
        stop();
      }
    },
    { rootMargin: '200px 0px' }
  );
  intersectionObserver.observe(canvas);

  resize();
  renderFrame(0);

  return {
    scene,
    camera,
    renderer,
    controls,
    modelRoot,
    hemi,
    key,
    setSnapshotEmitter(next) {
      snapshotEmitter = next;
    },
    renderOnce() {
      renderFrame(0);
    },
    dispose() {
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      controls.dispose();
      renderer.dispose();
    }
  };
}

/*
按模型包围盒给相机和 OrbitControls.target 取景。

把 target 放到包围盒中心（Y 抬高到中心高度），再按"想要占满画面"的视角反算距离：
distance = halfSize / tan(fov/2)，并留出 fitMargin 倍余量。
调用后必须 controls.update()，让控制器内部球坐标与新 target / 距离同步。
*/
export function fitCameraToBox(camera, controls, box, {
  fov = camera.fov,
  fitMargin = 1.6,
  direction = new THREE.Vector3(1, 0.55, 1).normalize(),
  preferLargestAxis = true
} = {}) {
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  // 取最大边作为镜头距离计算基准，避免细长模型在某一方向溢出画面。
  const extent = preferLargestAxis ? Math.max(size.x, size.y, size.z) : size.length();
  const safeExtent = Math.max(extent, 0.0001);

  const halfFov = THREE.MathUtils.degToRad(fov) / 2;
  const required = safeExtent / 2 / Math.tan(halfFov);
  const distance = required * fitMargin;

  controls.target.copy(center);
  camera.position.copy(center).addScaledVector(direction, distance);
  camera.near = Math.max(distance / 1000, 0.01);
  camera.far = distance * 100;
  camera.updateProjectionMatrix();
  controls.update();

  return { center, size, distance };
}

/*
构造一个简单的多节点示例模型，导出成 GLB blob URL 喂给 GLTFLoader，
让查看器范例自包含、不依赖外部网络。和 gltf-and-gltfloader 课用同一思路。
*/
export function buildSampleModel() {
  const group = new THREE.Group();
  group.name = 'SampleModel';

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 1.4, 1.4),
    new THREE.MeshStandardMaterial({
      color: '#3d73d9',
      roughness: 0.42,
      metalness: 0.18
    })
  );
  body.name = 'Body';
  body.position.y = 0.9;
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 32, 22),
    new THREE.MeshStandardMaterial({
      color: '#d17832',
      roughness: 0.48,
      metalness: 0.06
    })
  );
  head.name = 'Head';
  head.position.y = 2.05;
  group.add(head);

  // 故意把模型偏离原点，演示"加载后必须用 Box3 重新取景"。
  // 不偏移时，原点刚好在模型中心，会掩盖漏掉 fit 这条失败路径。
  group.position.set(1.6, 0, -1.2);
  group.rotation.y = 0.6;

  return group;
}

// 把世界坐标系下的包围盒画成线框，作为取景对照的视觉证据。
// 调用方在移除 lines 时负责 boxHelper.geometry.dispose() 与 boxHelper.material.dispose()。
export function createBoxHelper(box, color = '#3aa9a4') {
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  // BoxGeometry 只用来喂给 EdgesGeometry 生成线段顶点；生成完即可释放，
  // 但 EdgesGeometry（edges）是 lines 实际使用的几何，必须留给它，由调用方卸载时释放。
  const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
  const edges = new THREE.EdgesGeometry(geometry);
  const material = new THREE.LineBasicMaterial({ color });
  const lines = new THREE.LineSegments(edges, material);
  lines.position.copy(center);

  geometry.dispose();

  return lines;
}

// 遍历子树收集 geometry / material / texture，去重后返回三类 Set。
// scene.remove 不会释放这些 GPU 资源，需要按收集结果分别 dispose。
export function collectResources(object) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();

  object.traverse((child) => {
    if (child.geometry) {
      geometries.add(child.geometry);
    }

    const material = child.material;
    if (Array.isArray(material)) {
      material.forEach((entry) => materials.add(entry));
    } else if (material) {
      materials.add(material);
    }
  });

  materials.forEach((material) => {
    for (const value of Object.values(material)) {
      if (value && value.isTexture) {
        textures.add(value);
      }
    }
  });

  return { geometries, materials, textures };
}

export function disposeCollected({ geometries, materials, textures }) {
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
}

export function formatVector(vector) {
  return `${vector.x.toFixed(2)}, ${vector.y.toFixed(2)}, ${vector.z.toFixed(2)}`;
}
