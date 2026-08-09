/**
 * 范例：Babylon.js 图层与高亮——HighlightLayer 描边选中、GlowLayer emissive 发光。
 * 输入：
 *   - mode：'off' | 'highlight' | 'glow' —— 切换三种状态：关、HighlightLayer 描边、GlowLayer 发光。
 *     读者通过它直接对比 Layer 与"什么都不开"的差异，以及描边与发光两种选中反馈。
 *   - target：'box' | 'sphere' | 'torus' —— 选中的目标 mesh，模拟 5.2 拾取给出的 pickedMesh。
 *     本课聚焦 Layer 本身，不重新接拾取；真实代码里 target 来自 pickInfo.pickedMesh。
 *   - blurSize：number —— HighlightLayer 的 blurHorizontalSize 与 blurVerticalSize（描边模糊核，默认 1.0）。
 *   - intensity：number —— GlowLayer 的 intensity（全局发光强度，默认 1.0）。
 * 主要操作：
 *   - buildStage 搭 box / sphere / torus，每个材质都给非零 emissiveColor，让 GlowLayer 有可放大的自发光；
 *     没有 emissive 的纯 diffuse mesh 在 GlowLayer 下不发光，这是 GlowLayer 与 HighlightLayer 的根本差别。
 *   - 同时创建 HighlightLayer 与 GlowLayer（一次创建、复用），用 layer.isEnabled 切换活跃层，不重复构造。
 *   - applyMode 按 mode 同步两层：
 *       highlight = removeAllMeshes + addMesh(target, 黄)；
 *       glow = 用 addIncludedOnlyMesh 把"只有 target"放进白名单（默认 GlowLayer 让所有 emissive mesh 发光）；
 *       off = 两层 isEnabled=false。
 *   - onBeforeRenderObservable 里 emit 派生读数（mode / 活跃层 / target / 描边色 / blur / intensity / target 的 emissive 值）。
 * 预期结果：
 *   - mode=highlight：目标 mesh 出现黄色描边；调 blurSize 描边变粗变散（blur 核放大）。
 *   - mode=glow：只有目标 mesh 发光（其他 emissive mesh 不发光，因为 addIncludedOnlyMesh）；
 *     调 intensity 光晕变强变弱。
 *   - mode=off：两层都禁用，画面回到基础渲染。
 *   - ArcRotateCamera 已 attachControl：拖拽可旋转观察描边/发光随视角的变化。
 * 阅读主线：buildStage（场景与材质）→ 创建两层 → applyMode（按 mode 同步）→ emit（readout 字段）。
 */
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';
import {
  ArcRotateCamera,
  Color3,
  Color4,
  GlowLayer,
  HighlightLayer,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';

export type LayerMode = 'off' | 'highlight' | 'glow';
export type LayerTarget = 'box' | 'sphere' | 'torus';

export interface LayerExampleOptions {
  mode: LayerMode;
  target: LayerTarget;
  blurSize: number;
  intensity: number;
}

export interface LayerExampleSnapshot {
  mode: string;
  activeLayer: string;
  target: string;
  highlightColor: string;
  blurSize: number;
  intensity: number;
  targetEmissive: string;
}

export interface LayerExampleInstance {
  update(options: LayerExampleOptions): void;
  dispose(): void;
}

// 描边色固定为黄色（选中态常用色）；GlowLayer 的颜色来自材质 emissive，不在这里给。
const HIGHLIGHT_COLOR = new Color3(1.0, 0.82, 0.2);

export function createHighlightGlowExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: LayerExampleSnapshot) => void,
): LayerExampleInstance {
  let current: LayerExampleOptions = {
    mode: 'highlight',
    target: 'box',
    blurSize: 1.0,
    intensity: 1.0,
  };

  // 目标 mesh 表：target 名 → Mesh。setup 期间填入。
  const meshes = new Map<LayerTarget, Mesh>();
  // Layer 是昂贵资源，一次创建、跨 update 复用；通过 isEnabled 与 addMesh/removeMesh 切状态。
  let highlightLayer!: HighlightLayer;
  let glowLayer!: GlowLayer;
  // GlowLayer 白名单当前纳入的 mesh：切 target 时用它做 swap，避免对未列入的 mesh 调 remove。
  let currentIncluded: Mesh | null = null;
  let activeScene!: Scene;

  const runtime = createBabylonRuntime(canvas, (engine) => {
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.07, 0.08, 0.1, 1);
    activeScene = scene;

    const camera = new ArcRotateCamera(
      'cam',
      -Math.PI / 2.2,
      Math.PI / 2.6,
      9,
      new Vector3(0, 0.4, 0),
      scene,
    );
    camera.minZ = 0.1;
    camera.lowerRadiusLimit = 5;
    camera.attachControl(canvas, true);

    new HemisphericLight('hemi', new Vector3(0.4, 1, 0.3), scene);

    // 地面仅作视觉参照。
    const ground = MeshBuilder.CreateGround('ground', { width: 14, height: 9 }, scene);
    const groundMat = new StandardMaterial('groundMat', scene);
    groundMat.diffuseColor = new Color3(0.18, 0.19, 0.22);
    groundMat.emissiveColor = new Color3(0.04, 0.04, 0.05);
    ground.material = groundMat;

    // 三个目标 mesh：材质都给非零 emissiveColor，让 GlowLayer 有可放大的自发光。
    // 真实场景里 emissive 通常更弱（仅自发光点缀）；这里调高让读者一眼看出 glow 的放大效果。
    const box = MeshBuilder.CreateBox('box', { size: 1.4 }, scene);
    box.position.set(-2.6, 0.7, 0);
    const boxMat = new StandardMaterial('boxMat', scene);
    boxMat.diffuseColor = new Color3(0.24, 0.45, 0.85);
    boxMat.emissiveColor = new Color3(0.18, 0.33, 0.62);
    box.material = boxMat;
    meshes.set('box', box);

    const sphere = MeshBuilder.CreateSphere('sphere', { diameter: 1.6 }, scene);
    sphere.position.set(0, 0.8, 0);
    const sphereMat = new StandardMaterial('sphereMat', scene);
    sphereMat.diffuseColor = new Color3(0.3, 0.7, 0.36);
    sphereMat.emissiveColor = new Color3(0.22, 0.52, 0.28);
    sphere.material = sphereMat;
    meshes.set('sphere', sphere);

    const torus = MeshBuilder.CreateTorus(
      'torus',
      { diameter: 1.8, thickness: 0.5, tessellation: 32 },
      scene,
    );
    torus.position.set(2.6, 0.4, 0);
    const torusMat = new StandardMaterial('torusMat', scene);
    torusMat.diffuseColor = new Color3(0.92, 0.45, 0.2);
    torusMat.emissiveColor = new Color3(0.66, 0.32, 0.14);
    torus.material = torusMat;
    meshes.set('torus', torus);

    // Layer 是独立渲染层：把指定 mesh 单独画到离屏纹理、blur 后混合回主画面。
    // 与 7.1 DefaultRenderingPipeline 后处理不同——后处理是全屏 pass，Layer 针对特定 mesh。
    highlightLayer = new HighlightLayer('highlight', scene);
    highlightLayer.blurHorizontalSize = current.blurSize;
    highlightLayer.blurVerticalSize = current.blurSize;

    glowLayer = new GlowLayer('glow', scene);
    glowLayer.intensity = current.intensity;

    // 初始按 current 同步一次，让首帧就处于 mode=highlight / target=box 的状态。
    applyMode(current);

    scene.onBeforeRenderObservable.add(() => {
      const targetMesh = meshes.get(current.target);
      const mat = targetMesh?.material;
      const emissive =
        mat instanceof StandardMaterial ? mat.emissiveColor : null;
      emit({
        mode: current.mode,
        activeLayer:
          current.mode === 'highlight'
            ? 'HighlightLayer'
            : current.mode === 'glow'
              ? 'GlowLayer'
              : '（关）',
        target: current.target,
        highlightColor: `rgb(${(HIGHLIGHT_COLOR.r * 255).toFixed(0)}, ${(HIGHLIGHT_COLOR.g * 255).toFixed(0)}, ${(HIGHLIGHT_COLOR.b * 255).toFixed(0)})`,
        blurSize: highlightLayer.blurHorizontalSize,
        intensity: glowLayer.intensity,
        targetEmissive: emissive
          ? `(${emissive.r.toFixed(2)}, ${emissive.g.toFixed(2)}, ${emissive.b.toFixed(2)})`
          : '—',
      });
    });

    return scene;
  });

  // applyMode 是函数声明（提升）：在 setup 里首次调用时，highlightLayer / glowLayer 已赋值。
  function applyMode(options: LayerExampleOptions) {
    const targetMesh = options.target ? meshes.get(options.target) ?? null : null;

    // HighlightLayer：通过 addMesh / removeAllMeshes 控制描边目标；isEnabled 切整层开关。
    // blurHorizontalSize / blurVerticalSize 是运行时 get/set 属性，下一帧即生效。
    highlightLayer.blurHorizontalSize = options.blurSize;
    highlightLayer.blurVerticalSize = options.blurSize;
    highlightLayer.removeAllMeshes();
    if (options.mode === 'highlight' && targetMesh) {
      highlightLayer.addMesh(targetMesh, HIGHLIGHT_COLOR);
      highlightLayer.isEnabled = true;
    } else {
      highlightLayer.isEnabled = false;
    }

    // GlowLayer：用 addIncludedOnlyMesh 做"只让 target 发光"的白名单。
    // 默认 GlowLayer 让所有 emissive mesh 都发光；白名单一旦非空，未列入的 mesh 不发光。
    if (currentIncluded && currentIncluded !== targetMesh) {
      glowLayer.removeIncludedOnlyMesh(currentIncluded);
      currentIncluded = null;
    }
    if (options.mode === 'glow' && targetMesh) {
      if (currentIncluded !== targetMesh) {
        glowLayer.addIncludedOnlyMesh(targetMesh);
        currentIncluded = targetMesh;
      }
      glowLayer.isEnabled = true;
    } else {
      if (currentIncluded) {
        glowLayer.removeIncludedOnlyMesh(currentIncluded);
        currentIncluded = null;
      }
      glowLayer.isEnabled = false;
    }
    glowLayer.intensity = options.intensity;
  }

  return {
    update(options) {
      current = options;
      if (activeScene) applyMode(options);
    },
    dispose() {
      // Layer 在 scene.dispose 时会一并释放；这里显式 dispose 满足"dispose 时释放 layer"，
      // 并停掉业务 observable，再让 runtime 释放 Engine / Scene。
      activeScene?.onBeforeRenderObservable.clear();
      highlightLayer?.dispose();
      glowLayer?.dispose();
      runtime.dispose();
    },
  };
}
