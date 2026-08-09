/**
 * 范例：演示一个最小可用的 Babylon.js 查看器——把 Engine、Scene、ArcRotateCamera、光照、
 * 环境、模型加载、加载状态反馈、resize 与 dispose 组合起来。
 *
 * 离线约束：本 Storybook 工作区只装了 @babylonjs/core，没有 @babylonjs/loaders（glTF 解析器），
 *   因此无法在 Canvas 里真正 SceneLoader.AppendAsync 一个 .glb/.gltf。这里改用 MeshBuilder
 *   程序化构造一个"占位模型"（一台风力涡轮机：塔杆 + 机舱 + 三叶旋转叶片），并用 setTimeout
 *   模拟加载延迟，演示真实查看器会经历的三条状态路径：loading → loaded、loading → error。
 *
 *   关键是：getHierarchyBoundingVectors（自动构图）、engine.resize（resize）、HemisphericLight +
 *   DirectionalLight（光照预设）、scene.dispose/engine.dispose（卸载）都是 @babylonjs/core 的真实
 *   API，和真实加载后操作模型的代码完全一致。真实 SceneLoader.AppendAsync 用法见 README.mdx。
 *
 * 输入：
 *   - source：'ok'（成功路径，构造占位模型并自动构图）/ 'missing'（错误路径，模拟 404）。
 *   - lighting：'studio'（HemisphericLight + DirectionalLight）/ 'ambient'（仅 HemisphericLight）。
 *   - frameCamera：加载成功后是否用 getHierarchyBoundingVectors 把相机对准模型中心。
 *
 * 主要操作：
 *   1) applyLoad(source)：进入 loading 态，清空旧模型；setTimeout(600ms) 模拟异步；ok 时构建
 *      占位模型并（按 frameCamera）自动构图，loaded；missing 时进入 error 态。
 *   2) applyLighting(lighting)：studio 时补一盏方向光，ambient 时把它 dispose。
 *   3) frame()：用 modelRoot.getHierarchyBoundingVectors(true) 算世界包围盒，写 camera.target
 *      与 camera.radius，让模型完整进入视锥。
 *
 * 预期结果：
 *   - source=ok：先显示「加载中」0.6s，然后模型出现、相机自动对准；readout 给出 loaded、
 *     相机距离、mesh 数、FPS。
 *   - source=missing：先「加载中」0.6s，然后进入 error 态，画面只剩环境（地面 + 天空色）。
 *   - 切换 lighting：方向光开关，模型明暗对比变化。
 *
 * 阅读主线：createViewer → setup（场景骨架）→ buildPlaceholderModel（占位加载结果）→
 *   applyLoad（状态机）→ frame（自动构图）。
 */
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';
import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  HemisphericLight,
  MeshBuilder,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core';

export interface ViewerOptions {
  source: 'ok' | 'missing';
  lighting: 'studio' | 'ambient';
  frameCamera: boolean;
}

export interface ViewerSnapshot {
  state: string;
  source: string;
  rootName: string;
  radius: number;
  meshCount: number;
  fps: number;
}

export interface ViewerInstance {
  update(options: ViewerOptions): void;
  dispose(): void;
}

// 占位模型：一台风力涡轮机——底座 + 塔杆 + 机舱 + 三叶旋转叶片，全部挂在 turbineRoot 下。
// 模拟一次加载结果的结构：根 TransformNode 组织多个子 Mesh，叶片单独留一个引用用于自转。
function buildPlaceholderModel(scene: Scene): {
  root: TransformNode;
  blades: TransformNode;
} {
  const root = new TransformNode('turbineRoot', scene);

  const baseMat = new StandardMaterial('baseMat', scene);
  baseMat.diffuseColor = new Color3(0.32, 0.34, 0.38);
  const towerMat = new StandardMaterial('towerMat', scene);
  towerMat.diffuseColor = new Color3(0.92, 0.92, 0.9);
  const nacelleMat = new StandardMaterial('nacelleMat', scene);
  nacelleMat.diffuseColor = new Color3(0.78, 0.8, 0.82);
  const bladeMat = new StandardMaterial('bladeMat', scene);
  bladeMat.diffuseColor = new Color3(0.95, 0.95, 0.97);

  // 底座：矮圆柱，放在地面。
  const base = MeshBuilder.CreateCylinder(
    'base',
    { height: 0.4, diameter: 2.4 },
    scene,
  );
  base.material = baseMat;
  base.parent = root;
  base.position.y = 0.2;

  // 塔杆：细长圆柱，从底座向上。
  const tower = MeshBuilder.CreateCylinder(
    'tower',
    { height: 4.4, diameterTop: 0.45, diameterBottom: 0.7 },
    scene,
  );
  tower.material = towerMat;
  tower.parent = root;
  tower.position.y = 0.4 + 4.4 / 2;

  // 机舱：塔杆顶端的水平短箱。
  const nacelle = MeshBuilder.CreateBox(
    'nacelle',
    { width: 1.2, height: 0.7, depth: 0.6 },
    scene,
  );
  nacelle.material = nacelleMat;
  nacelle.parent = root;
  nacelle.position.set(0, 0.4 + 4.4 + 0.1, 0);

  // 叶片挂载点：放在机舱 +X 端（机舱宽 1.2，半宽 0.6，叶片 hub 离机舱中心 0.65）。
  // 它作为三片叶片的共同父节点，单独绕 Y 轴自转，让"加载完成"在视觉上立即可辨。
  const blades = new TransformNode('blades', scene);
  blades.parent = root;
  blades.position.set(0.65, 0.4 + 4.4 + 0.1, 0);

  // 三片叶片：每片先挂一个 pivot（绕 hub 的 Y 轴隔 120°），再把叶片几何放到 pivot 的 +X 方向
  // bladeLen/2 处——这样叶片根部贴在 hub、叶尖向外延伸 bladeLen，整体绕 hub 辐射分布。
  const bladeLen = 2.0;
  for (let i = 0; i < 3; i++) {
    const pivot = new TransformNode(`bladePivot${i}`, scene);
    pivot.parent = blades;
    pivot.rotation.y = (i * Math.PI * 2) / 3;

    const blade = MeshBuilder.CreateBox(
      `blade${i}`,
      { width: bladeLen, height: 0.12, depth: 0.4 },
      scene,
    );
    blade.material = bladeMat;
    blade.parent = pivot;
    blade.position.x = bladeLen / 2;
  }

  return { root, blades };
}

export function createViewer(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ViewerSnapshot) => void,
): ViewerInstance {
  let current: ViewerOptions = {
    source: 'ok',
    lighting: 'studio',
    frameCamera: true,
  };

  // 加载状态机：idle（未触发）→ loading → loaded | error。切 source 会重新进入 loading。
  let loadState: 'idle' | 'loading' | 'loaded' | 'error' = 'idle';
  let loadTimer: ReturnType<typeof setTimeout> | null = null;

  let scene: Scene;
  let camera: ArcRotateCamera;
  let hemi: HemisphericLight;
  let dir: DirectionalLight | null = null;
  let modelRoot: TransformNode | null = null;
  let blades: TransformNode | null = null;

  const runtime = createBabylonRuntime(canvas, (engine) => {
    scene = new Scene(engine);
    scene.clearColor = new Color4(0.9, 0.92, 0.94, 1);

    // ArcRotateCamera：默认看向原点，半径给一个能容纳涡轮机的距离；lowerRadiusLimit 防止滚轮穿进去。
    camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2.4,
      Math.PI / 2.8,
      12,
      new Vector3(0, 2.4, 0),
      scene,
    );
    camera.minZ = 0.05;
    camera.lowerRadiusLimit = 3;
    camera.upperRadiusLimit = 30;
    camera.wheelDeltaPercentage = 0.02;
    camera.attachControl(canvas, true);

    // 半球光打底（ambient 预设只有这一盏）。
    hemi = new HemisphericLight('hemi', new Vector3(0.3, 1, 0.4), scene);
    hemi.intensity = 0.9;
    hemi.diffuse = new Color3(1, 0.98, 0.94);
    hemi.groundColor = new Color3(0.35, 0.38, 0.42);

    // 方向光给阴影方向的明暗（studio 预设补这一盏；ambient 时为 null）。
    dir = new DirectionalLight('dir', new Vector3(-0.55, -1, -0.45), scene);
    dir.intensity = 0.8;

    // 地面：留在场景里，作为环境参照，不进入"模型"计数。
    const ground = MeshBuilder.CreateGround(
      'ground',
      { width: 40, height: 40 },
      scene,
    );
    const groundMat = new StandardMaterial('groundMat', scene);
    groundMat.diffuseColor = new Color3(0.74, 0.76, 0.74);
    ground.material = groundMat;

    // 每帧驱动叶片自转 + emit 派生读数。叶片自转让"加载完成"在视觉上立即可辨。
    scene.onBeforeRenderObservable.add(() => {
      const dt = engine.getDeltaTime() / 1000;
      if (blades && loadState === 'loaded') {
        blades.rotation.y += dt * 1.2;
      }

      emit({
        state:
          loadState === 'loading'
            ? '加载中'
            : loadState === 'loaded'
              ? '已加载'
              : loadState === 'error'
                ? '加载失败'
                : '空闲',
        source: current.source,
        rootName: modelRoot?.name ?? '—',
        radius: Math.round(camera.radius * 10) / 10,
        // 减掉地面，让读者直接看到"模型本身包含几个 mesh"。
        meshCount: Math.max(0, scene.meshes.length - 1),
        fps: Math.round(1000 / Math.max(engine.getDeltaTime(), 1)),
      });
    });

    return scene;
  });

  // 用 modelRoot 的世界包围盒把相机 target 设到中心、radius 设到刚好包住。
  // 这是真实查看器"加载完成后自动构图"的核心——不假设模型以原点为中心或单位已知。
  function frame(): void {
    if (!modelRoot) return;
    const { min, max } = modelRoot.getHierarchyBoundingVectors(true);
    const center = min.add(max).scale(0.5);
    const size = max.subtract(min);
    const extent = Math.max(size.x, size.y, size.z);
    camera.setTarget(center);
    // 1.6 倍余量 + 兜底 2，保证模型完整入画并留出边距。
    camera.radius = extent * 1.6 + 2;
  }

  // 清空当前模型：把整组从场景摘下并释放几何 / 材质，避免每次重载累积显存。
  function clearModel(): void {
    if (modelRoot) {
      modelRoot.dispose(false, true);
      modelRoot = null;
      blades = null;
    }
  }

  // 状态机：source 变化时重新进入 loading，模拟异步解析，最终落到 loaded 或 error。
  function applyLoad(options: ViewerOptions): void {
    if (loadTimer) {
      clearTimeout(loadTimer);
      loadTimer = null;
    }
    clearModel();
    loadState = 'loading';

    // 真实查看器里这一步是 await SceneLoader.AppendAsync(rootUrl, file, scene)。
    // 这里用 setTimeout 模拟网络/解析延迟，让 loading 态在 readout 上可观察。
    loadTimer = setTimeout(() => {
      loadTimer = null;
      if (current.source === 'ok') {
        const model = buildPlaceholderModel(scene);
        modelRoot = model.root;
        blades = model.blades;
        loadState = 'loaded';
        if (current.frameCamera) {
          frame();
        }
      } else {
        // missing：模拟 404 / 加载失败，进入 error 态。真实代码由 try/catch 接住。
        loadState = 'error';
      }
    }, 600);
  }

  function applyLighting(options: ViewerOptions): void {
    if (!dir) return;
    // studio 预设：方向光强度 0.8；ambient 预设：方向光归零（仅留半球光）。
    dir.intensity = options.lighting === 'studio' ? 0.8 : 0;
    dir.setEnabled(options.lighting === 'studio');
  }

  function applyAll(options: ViewerOptions): void {
    const sourceChanged = options.source !== current.source;
    const lightingChanged = options.lighting !== current.lighting;
    const frameToggled =
      options.frameCamera !== current.frameCamera && options.source === 'ok';

    current = options;

    // source 切换：重新加载。其它变化只在已加载模型上做局部更新，避免重置加载状态。
    if (sourceChanged || loadState === 'idle') {
      applyLoad(options);
    } else if (frameToggled && loadState === 'loaded' && options.frameCamera) {
      frame();
    }

    if (lightingChanged || loadState === 'idle') {
      applyLighting(options);
    }
  }

  // apply 在 create 之后会立即被 canvasStory 调一次，把默认 args 同步到实例并触发首次加载。
  applyAll(current);

  return {
    update(options) {
      applyAll(options);
    },
    dispose() {
      if (loadTimer) {
        clearTimeout(loadTimer);
        loadTimer = null;
      }
      runtime.dispose();
    },
  };
}
