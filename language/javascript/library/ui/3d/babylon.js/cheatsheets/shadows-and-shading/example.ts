/**
 * 范例：Babylon.js 阴影类型与质量的横向对比。
 * 输入：
 *   - filterType：当前阴影过滤模式（none / poisson / esm / bluresm / pcf），互斥。
 *   - mapSize：shadow map 边长（512 / 1024 / 2048），构造时确定。
 *   - darkness：阴影暗度（0 最暗，1 等于无阴影）。
 * 主要操作：在一个固定场景（方向光 + 受光地面 + 三个投射物）里，
 *   切换 filterType 时改 ShadowGenerator 的四个布尔开关（互斥）；
 *   mapSize 变化时 dispose 重建 ShadowGenerator 并重新登记投射物、重应用 filter / darkness；
 *   darkness 变化时直接写 shadowGenerator.darkness。
 * 预期结果：none 边缘锐利但有锯齿；poisson / esm 边缘变软；
 *   bluresm 最糊；pcf 在 WebGL2 上平滑且性能可控。
 *   mapSize 越大边缘越细，但纹理内存与重绘成本上升。
 * 阅读主线：先看 buildShadowGenerator 里"构造 + 登记投射物 + 默认参"，
 *   再看 applyFilter 的"互斥开关"与 applyShadow 的"按需重建"逻辑。
 */
import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  ShadowGenerator,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';

// filterType 键 → 中文标签（readout 显示用）。
const FILTER_LABELS: Record<string, string> = {
  none: '硬边（无过滤）',
  poisson: 'Poisson 采样',
  esm: 'ESM 指数',
  bluresm: 'Blur ESM 模糊指数',
  pcf: 'PCF 百分比渐近',
};

// DirectionalLight 的方向（指向被照区域）。阴影相机视锥沿这个方向建立。
const SUN_DIRECTION = new Vector3(-0.6, -1, -0.45).normalize();
// 阴影覆盖范围：固定 DirectionalLight 正交视锥的半边长，
// 避免 autoUpdateExtends 在物体移动时把阴影视锥缩到边缘裁影。
const SUN_SHADOW_FRUSTUM = 8;

export interface ShadowGalleryOptions {
  filterType: string;
  mapSize: number;
  darkness: number;
}

export interface ShadowGallerySnapshot {
  filterType: string;
  mapSize: number;
  casterCount: number;
  receiverCount: number;
}

export interface ShadowGalleryInstance {
  update(options: ShadowGalleryOptions): void;
  dispose(): void;
}

export function createShadowGallery(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ShadowGallerySnapshot) => void,
): ShadowGalleryInstance {
  let current: ShadowGalleryOptions = {
    filterType: 'pcf',
    mapSize: 1024,
    darkness: 0,
  };

  let scene: Scene;
  let sun: DirectionalLight;
  let shadowGenerator: ShadowGenerator | null = null;
  let currentMapSize = -1;
  const casters: Mesh[] = [];
  const receivers: Mesh[] = [];

  // 重建 ShadowGenerator：mapSize 只在构造时确定，运行时改尺寸必须 dispose 重建。
  // 重建后要重新登记所有投射物、重应用当前 filter 与 darkness。
  function buildShadowGenerator(mapSize: number) {
    shadowGenerator?.dispose();
    shadowGenerator = new ShadowGenerator(mapSize, sun);
    // bias / normalBias 略高于默认（0.00005 / 0），缓解地面浅角条纹（acne）；
    // 过大会让阴影与物体脱开（peter-panning），见 README「深度偏差与暗度」。
    shadowGenerator.bias = 0.0001;
    shadowGenerator.normalBias = 0.02;
    for (const m of casters) {
      shadowGenerator.addShadowCaster(m);
    }
    applyFilter(current.filterType);
    shadowGenerator.darkness = current.darkness;
    currentMapSize = mapSize;
  }

  // 四个布尔开关互斥：ShadowGenerator 内部用单一 _filter 字段记录当前模式，
  // 给某个开关赋 true 会切到对应模式；给"当前活动"的开关赋 false 会回退到 FILTER_NONE。
  // 因此切换类型时直接按目标 filter 给四个开关赋 boolean 即可。
  function applyFilter(filterType: string) {
    if (!shadowGenerator) {
      return;
    }
    shadowGenerator.usePoissonSampling = filterType === 'poisson';
    shadowGenerator.useExponentialShadowMap = filterType === 'esm';
    shadowGenerator.useBlurExponentialShadowMap = filterType === 'bluresm';
    shadowGenerator.usePercentageCloserFiltering = filterType === 'pcf';
    // 'none' 时四个开关都为 false，回退到 FILTER_NONE 硬边。
  }

  // 主入口：mapSize 变 → dispose 重建；只改 filter / darkness → 复用现有 generator。
  function applyShadow(options: ShadowGalleryOptions) {
    if (options.mapSize !== currentMapSize) {
      buildShadowGenerator(options.mapSize);
    }
    applyFilter(options.filterType);
    if (shadowGenerator) {
      shadowGenerator.darkness = options.darkness;
    }
  }

  const runtime = createBabylonRuntime(canvas, (engine) => {
    scene = new Scene(engine);
    scene.clearColor = new Color4(0.14, 0.16, 0.2, 1);

    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2.4,
      Math.PI / 2.7,
      12,
      new Vector3(0, 0.6, 0),
      scene,
    );
    camera.minZ = 0.1;
    camera.attachControl(canvas, true);

    // 填充光：不投影，只抬背光面，避免阴影区像素归零看不出形状。
    const fill = new HemisphericLight('fill', new Vector3(0.3, 1, 0.3), scene);
    fill.intensity = 0.35;
    fill.groundColor = new Color3(0.1, 0.09, 0.08);

    // 主光 / 投影光源：方向光，全场覆盖、不衰减。
    sun = new DirectionalLight('sun', SUN_DIRECTION.clone(), scene);
    sun.intensity = 1.2;
    sun.diffuse = new Color3(1.0, 0.95, 0.86);
    sun.shadowFrustumSize = SUN_SHADOW_FRUSTUM;

    // 地面：受光 StandardMaterial，receiveShadows = true 才会采样 shadow map。
    const ground = MeshBuilder.CreateGround('ground', { width: 14, height: 14 }, scene);
    const groundMat = new StandardMaterial('groundMat', scene);
    groundMat.diffuseColor = new Color3(0.55, 0.57, 0.62);
    ground.material = groundMat;
    ground.receiveShadows = true;
    receivers.push(ground);

    // 投射物组：分布开，便于看不同位置 / 角度的阴影边缘软硬。
    const objMat = new StandardMaterial('objMat', scene);
    objMat.diffuseColor = new Color3(0.88, 0.42, 0.24);
    objMat.specularColor = new Color3(0.85, 0.85, 0.85);
    objMat.specularPower = 48;

    const box = MeshBuilder.CreateBox('box', { size: 1.4 }, scene);
    box.material = objMat;
    box.position.set(-2.2, 0.7, 0.6);
    casters.push(box);

    const sphere = MeshBuilder.CreateSphere('sphere', { diameter: 1.6 }, scene);
    sphere.material = objMat;
    sphere.position.set(0.4, 0.8, -0.8);
    casters.push(sphere);

    const torus = MeshBuilder.CreateTorus('torus', {
      diameter: 2,
      thickness: 0.5,
      tessellation: 32,
    });
    torus.material = objMat;
    torus.position.set(2.4, 0.3, 1.2);
    casters.push(torus);

    // 建立初始 ShadowGenerator，随后由 update 切换 filter / mapSize / darkness。
    buildShadowGenerator(current.mapSize);

    scene.onBeforeRenderObservable.add(() => {
      emit({
        filterType: FILTER_LABELS[current.filterType] ?? current.filterType,
        mapSize: current.mapSize,
        casterCount: casters.length,
        receiverCount: receivers.length,
      });
    });

    return scene;
  });

  return {
    update(options) {
      current = options;
      applyShadow(options);
    },
    dispose() {
      runtime.dispose();
    },
  };
}
