/**
 * 范例：演示 SceneLoader 加载结果的结构，以及 AssetContainer 的成组加载 / 卸载。
 *
 * 离线约束：本 Storybook 工作区只装了 @babylonjs/core，没有 @babylonjs/loaders（glTF 解析器），
 *   因此无法在 Canvas 里真正 SceneLoader.ImportMeshAsync 一个 .glb/.gltf。这里改用 MeshBuilder
 *   程序化构造一个"占位模型"——其结构与真实 glTF 加载结果一致：一个根 TransformNode、若干子
 *   Mesh、一个 AnimationGroup——让读者直观看到"加载完会拿到什么"。
 *
 *   关键是：AssetContainer / moveAllFromScene / addAllToScene / removeAllFromScene 都是
 *   @babylonjs/core 的真实 API，和真实加载后操作容器的代码完全一致。真实 SceneLoader 用法
 *   见 README.mdx 的代码片段。
 *
 * 输入：
 *   - state：loaded（container.addAllToScene 把模型挂回场景）/ unloaded（removeAllFromScene 整组摘下）。
 *   - frameCamera：加载后是否用 getHierarchyBoundingVectors 算包围盒并把相机对准模型中心。
 *
 * 主要操作：
 *   1) buildPlaceholderModel 在 scene 里构造占位模型（根 TransformNode + 子 Mesh + AnimationGroup）。
 *   2) container.moveAllFromScene(keepAssets) 把模型资产收入容器，相机 / 光 / 地面留在场景里——
 *      这一步模拟 LoadAssetContainerAsync 的结果：资产在容器中、暂未挂到场景。
 *   3) update({ state }) 用 addAllToScene / removeAllFromScene 在"已加载 / 已卸载"间切换，
 *      并启停 AnimationGroup；frameCamera 时重设 ArcRotateCamera 的 target 与 radius。
 *
 * 预期结果：
 *   - loaded：模型可见、AnimationGroup 播放、场景 meshes 数回升；
 *   - unloaded：模型消失、AnimationGroup 停止、场景 meshes 数下降；
 *   - 容器 meshes / transformNodes / animationGroups 数恒定（描述资产本身，与是否挂到场景无关）。
 *
 * 阅读主线：先看 buildPlaceholderModel 怎样搭出"加载结果"，再看 setup 里 moveAllFromScene 如何
 *   把资产装入容器，最后看 update 如何切换 addAllToScene / removeAllFromScene。
 */
import {
  Animation,
  AnimationGroup,
  ArcRotateCamera,
  AssetContainer,
  Color3,
  Color4,
  DirectionalLight,
  HemisphericLight,
  KeepAssets,
  MeshBuilder,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';

export interface LoaderOptions {
  state: 'loaded' | 'unloaded';
  frameCamera: boolean;
}

export interface LoaderSnapshot {
  state: string;
  rootName: string;
  containerMeshes: number;
  containerTransformNodes: number;
  containerAnimationGroups: number;
  sceneMeshes: number;
  loadMs: number;
  fps: number;
}

export interface LoaderInstance {
  update(options: LoaderOptions): void;
  dispose(): void;
}

// 占位模型像一个简易推车：底盘 + 货箱 + 四个轮子，全部挂在 modelRoot 下。
// 它模拟一次 glTF 加载结果的结构：根 TransformNode、子 Mesh、AnimationGroup。
function buildPlaceholderModel(scene: Scene): {
  root: TransformNode;
  spin: AnimationGroup;
} {
  const root = new TransformNode('modelRoot', scene);

  const chassisMat = new StandardMaterial('chassisMat', scene);
  chassisMat.diffuseColor = new Color3(0.18, 0.45, 0.74);
  const cargoMat = new StandardMaterial('cargoMat', scene);
  cargoMat.diffuseColor = new Color3(0.82, 0.62, 0.24);
  const wheelMat = new StandardMaterial('wheelMat', scene);
  wheelMat.diffuseColor = new Color3(0.12, 0.12, 0.14);

  // 底盘：长方体，y=0.8 让轮子露出地面。
  const chassis = MeshBuilder.CreateBox(
    'chassis',
    { width: 2.4, height: 0.7, depth: 3.6 },
    scene,
  );
  chassis.material = chassisMat;
  chassis.parent = root;
  chassis.position.y = 0.95;

  // 货箱：堆在底盘上方，作为第二个子 Mesh。
  const cargo = MeshBuilder.CreateBox(
    'cargo',
    { width: 1.8, height: 1.1, depth: 2.0 },
    scene,
  );
  cargo.material = cargoMat;
  cargo.parent = root;
  cargo.position.set(0, 1.85, -0.3);

  // 四个轮子：圆柱绕 Z 轴转 90°，让圆面朝外；父节点都是 root，便于整体旋转。
  const wheelPositions: Array<[string, Vector3]> = [
    ['wheelFL', new Vector3(1.1, 0.4, 1.2)],
    ['wheelFR', new Vector3(-1.1, 0.4, 1.2)],
    ['wheelBL', new Vector3(1.1, 0.4, -1.2)],
    ['wheelBR', new Vector3(-1.1, 0.4, -1.2)],
  ];
  for (const [name, pos] of wheelPositions) {
    const wheel = MeshBuilder.CreateCylinder(
      name,
      { height: 0.3, diameter: 0.8 },
      scene,
    );
    wheel.material = wheelMat;
    wheel.parent = root;
    wheel.position = pos;
    wheel.rotation.z = Math.PI / 2; // 圆面朝向 X 方向
  }

  // AnimationGroup：让 modelRoot 绕 Y 轴匀速转一圈，循环。模拟 glTF 里导出的动画剪辑。
  const spin = new AnimationGroup('cartSpin', scene);
  const rotY = new Animation(
    'rotY',
    'rotation.y',
    30,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CYCLE,
  );
  rotY.setKeys([
    { frame: 0, value: 0 },
    { frame: 30, value: Math.PI * 2 },
  ]);
  spin.addTargetedAnimation(rotY, root);
  spin.normalize(0, 30);

  return { root, spin };
}

export function createLoaderExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: LoaderSnapshot) => void,
): LoaderInstance {
  let current: LoaderOptions = { state: 'loaded', frameCamera: true };
  // isLoaded 跟踪容器当前是否挂到了场景，避免每次 apply 都重复 addAllToScene / 重测耗时。
  let isLoaded = false;
  let container: AssetContainer;
  let spinGroup: AnimationGroup;
  let modelRoot: TransformNode;
  let camera: ArcRotateCamera;
  let lastLoadMs = 0;

  const runtime = createBabylonRuntime(canvas, (engine) => {
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.93, 0.95, 0.94, 1);

    // ArcRotateCamera：默认看向原点，radius 给一个能容纳模型的距离。
    camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2.2,
      Math.PI / 2.4,
      9,
      new Vector3(0, 1, 0),
      scene,
    );
    camera.minZ = 0.1;
    camera.attachControl(canvas, true);

    // 两盏光：半球光打底、方向光给阴影方向的明暗。
    new HemisphericLight('hemi', new Vector3(0.4, 1, 0.3), scene);
    const dir = new DirectionalLight('dir', new Vector3(-0.6, -1, -0.4), scene);
    dir.intensity = 0.7;

    // 地面：留在场景里，不进入容器，帮视觉感受模型是否被挂上场景。
    const ground = MeshBuilder.CreateGround('ground', { width: 28, height: 28 }, scene);
    const groundMat = new StandardMaterial('groundMat', scene);
    groundMat.diffuseColor = new Color3(0.78, 0.8, 0.82);
    ground.material = groundMat;

    // 构造占位"加载结果"。
    const model = buildPlaceholderModel(scene);
    modelRoot = model.root;
    spinGroup = model.spin;

    // 把模型资产收入 AssetContainer：相机 / 光 / 地面留下，其余（根节点 + 子 Mesh + 动画组）
    // 进入容器。这一步模拟 SceneLoader.LoadAssetContainerAsync 的结果——资产已解析、在容器里，
    // 但尚未挂到场景，所以此时画面看不到模型。
    container = new AssetContainer(scene);
    const keep = new KeepAssets();
    keep.cameras.push(camera);
    keep.lights.push(...scene.lights);
    keep.meshes.push(ground);
    container.moveAllFromScene(keep);

    // 每帧把"容器资产结构 + 场景状态"读出来，让读者看到 AssetContainer 持有什么、
    // addAllToScene / removeAllFromScene 改变的又是什么。
    scene.onBeforeRenderObservable.add(() => {
      emit({
        state: current.state === 'loaded' ? '已加载' : '已卸载',
        rootName: modelRoot.name,
        containerMeshes: container.meshes.length,
        containerTransformNodes: container.transformNodes.length,
        containerAnimationGroups: container.animationGroups.length,
        sceneMeshes: scene.meshes.length,
        loadMs: lastLoadMs,
        fps: Math.round(1000 / Math.max(engine.getDeltaTime(), 1)),
      });
    });

    return scene;
  });

  // 用 modelRoot 的世界包围盒把相机 target 设到中心、radius 设到刚好包住。
  // 真实项目里对 SceneLoader 加载结果做同样的事，避免模型偏移或单位过大超出视锥。
  function frameOnModel() {
    const { min, max } = modelRoot.getHierarchyBoundingVectors(true);
    const center = min.add(max).scale(0.5);
    const size = max.subtract(min);
    const radius = Math.max(size.x, size.y, size.z) * 1.6 + 2;
    camera.setTarget(center);
    camera.radius = radius;
  }

  function applyState(options: LoaderOptions) {
    const wantLoaded = options.state === 'loaded';

    // 只在状态真正切换时调用 addAll / removeAll，避免每次 apply（如只改 frameCamera）重复操作。
    if (wantLoaded && !isLoaded) {
      const t0 = performance.now();
      // 把容器里的资产整组挂回场景：meshes / transformNodes / animationGroups 一并就位。
      container.addAllToScene();
      lastLoadMs = performance.now() - t0;
      spinGroup.start(true, 1.0); // 循环播放
      isLoaded = true;
    } else if (!wantLoaded && isLoaded) {
      spinGroup.stop();
      // 整组摘下：画面里模型消失，但容器里的资产计数不变。
      container.removeAllFromScene();
      isLoaded = false;
    }

    // 构图可在任何时刻刷新：只要当前已加载且勾选了"对准模型"，就重新算包围盒。
    if (wantLoaded && options.frameCamera) {
      frameOnModel();
    }
  }

  // 注意：apply 在 create 之后会立即被 canvasStory 调一次，把默认 args 同步到实例。
  return {
    update(options) {
      current = options;
      applyState(options);
    },
    dispose() {
      runtime.dispose();
    },
  };
}
