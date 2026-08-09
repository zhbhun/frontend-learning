/**
 * 范例：Scene 作为中枢容器——把背景清色、雾、activeCamera 和对象集合的状态
 * 实时呈现给读者。
 * 输入：
 *   - clearColor：背景清色预设（default / light / black / transparent）。
 *   - fogMode：雾模式（NONE / EXP / EXP2 / LINEAR）。
 *   - fogDensity：EXP / EXP2 的浓度（对 LINEAR 无效）。
 * 主要操作：把三个输入写入 scene.clearColor / scene.fogMode / scene.fogDensity，
 *   并在 onBeforeRenderObservable 里 emit 当前 scene 的状态读数。
 * 预期结果：切 clearColor 改背景；切雾模式 + 调密度让远近不同的支柱逐渐溶入雾色；
 *   readout 实时反映 clearColor / fogMode / fogDensity / activeCamera / 网格数，
 *   让读者看到 Scene 作为状态容器持有什么。
 * 阅读主线：先看 setup 里创建的对象（它们自动登记进 scene 的集合），
 *   再看 applyState 怎样把共享状态写回 scene，最后看 onBeforeRenderObservable 的读数。
 */
import {
  ArcRotateCamera,
  Color3,
  Color4,
  HemisphericLight,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';

// clearColor 预设：键 → Color4。transparent 把 alpha 设为 0，画布变透明。
const CLEAR_COLOR_PRESETS: Record<string, Color4> = {
  default: new Color4(0.2, 0.2, 0.3, 1.0),
  light: new Color4(0.93, 0.95, 0.94, 1.0),
  black: new Color4(0, 0, 0, 1.0),
  transparent: new Color4(0.2, 0.2, 0.3, 0.0),
};

// fogMode 键 → 显示标签（读取展示用）。
const FOG_MODE_LABELS: Record<string, string> = {
  NONE: '无（默认）',
  EXP: 'EXP 指数',
  EXP2: 'EXP2 指数平方',
  LINEAR: 'LINEAR 线性',
};

export interface SceneStateOptions {
  clearColor: string;
  fogMode: string;
  fogDensity: number;
}

export interface SceneStateSnapshot {
  clearColor: string;
  fogMode: string;
  fogDensity: number;
  activeCamera: string;
  meshCount: number;
}

export interface SceneStateInstance {
  update(options: SceneStateOptions): void;
  dispose(): void;
}

export function createSceneStateExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SceneStateSnapshot) => void,
): SceneStateInstance {
  let current: SceneStateOptions = {
    clearColor: 'light',
    fogMode: 'NONE',
    fogDensity: 0.05,
  };

  // fogColor 固定为浅冷灰——与 clearColor 独立，便于观察"雾色 ≠ 背景色"。
  const FOG_COLOR = new Color3(0.85, 0.88, 0.9);

  // 把共享状态写回 scene。clearColor / fogMode / fogDensity 都是 scene 直接持有的属性。
  function applyState(scene: Scene, options: SceneStateOptions) {
    scene.clearColor = CLEAR_COLOR_PRESETS[options.clearColor] ?? CLEAR_COLOR_PRESETS.default;
    scene.fogMode = fogConstant(options.fogMode);
    scene.fogDensity = options.fogDensity;
  }

  const runtime = createBabylonRuntime(canvas, (engine) => {
    const scene = new Scene(engine);

    // ArcRotateCamera：把目标放在支柱队列中段，让远近都进入画面。
    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2,
      Math.PI / 2.4,
      18,
      new Vector3(0, 1, -5),
      scene,
    );
    camera.minZ = 0.1;
    camera.attachControl(canvas, true);

    // 半球光：给支柱基础明暗；默认 StandardMaterial 受光才可见。
    new HemisphericLight('light', new Vector3(0.4, 1, 0.3), scene);

    // 一排支柱：沿 -Z 等距排列，距相机远近不同 → 雾浓度差异可见。
    // 构造时传入 scene，支柱会自动登记进 scene.meshes 集合。
    const pillarMat = new StandardMaterial('pillarMat', scene);
    pillarMat.diffuseColor = new Color3(0.62, 0.66, 0.72);
    const ZS = [2, 0, -2, -4, -6, -8, -10, -12];
    ZS.forEach((z, i) => {
      const pillar = MeshBuilder.CreateBox(
        `pillar${i}`,
        { width: 1, depth: 1, height: 2 },
        scene,
      );
      pillar.material = pillarMat;
      pillar.position.set(0, 1, z);
    });

    // 地面：帮视觉感受深度与距离，也计入 scene.meshes。
    const ground = MeshBuilder.CreateGround('ground', { width: 24, height: 32 }, scene);
    const groundMat = new StandardMaterial('groundMat', scene);
    groundMat.diffuseColor = new Color3(0.78, 0.8, 0.82);
    ground.material = groundMat;

    // fogColor 固定；fogStart/fogEnd 给 LINEAR 一个合理范围（密度对 LINEAR 无效）。
    scene.fogColor = FOG_COLOR;
    scene.fogStart = 8;
    scene.fogEnd = 32;

    // 先把初始共享状态写一次，避免开场读到 Babylon 默认深蓝。
    applyState(scene, current);

    // 每帧把当前 scene 状态读出来——证明 Scene 持有 clearColor / fog / activeCamera / 网格集合。
    scene.onBeforeRenderObservable.add(() => {
      const cc = scene.clearColor;
      emit({
        clearColor: `Color4(${cc.r.toFixed(2)}, ${cc.g.toFixed(2)}, ${cc.b.toFixed(2)}, ${cc.a.toFixed(2)})`,
        fogMode: FOG_MODE_LABELS[current.fogMode] ?? current.fogMode,
        fogDensity: scene.fogDensity,
        activeCamera: scene.activeCamera
          ? `${scene.activeCamera.getClassName()} '${scene.activeCamera.name}'`
          : '(无)',
        meshCount: scene.meshes.length,
      });
    });

    return scene;
  });

  return {
    update(options) {
      current = options;
      applyState(runtime.scene, options);
    },
    dispose() {
      runtime.dispose();
    },
  };
}

// fogMode 键 → Scene 常量。
function fogConstant(key: string): number {
  switch (key) {
    case 'EXP':
      return Scene.FOGMODE_EXP;
    case 'EXP2':
      return Scene.FOGMODE_EXP2;
    case 'LINEAR':
      return Scene.FOGMODE_LINEAR;
    default:
      return Scene.FOGMODE_NONE;
  }
}
