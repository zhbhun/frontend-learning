/**
 * 范例：StandardMaterial 核心属性（颜色 / 透明 / 形态）的联动观察。
 * 输入：
 *   - diffusePreset：漫反射色预设（orange/teal/gold/lavender/white）。
 *   - alpha：写入 material.alpha（默认 1）；配合默认 alphaMode = ALPHA_COMBINE 看到透明。
 *   - specularPower：写入 material.specularPower（默认 64），控制高光锐利度。
 *   - wireframe：写入 material.wireframe（底层 fillMode 在 Triangle/WireFrame 间切）。
 *   - backFaceCulling：写入 material.backFaceCulling（默认 true）。
 * 主要操作：一个固定受光场景（地面 + 球 + 盒子）里，球与盒子共享同一个 StandardMaterial；
 *   参数变化直接写入该材质实例。地面用单独的固定灰材质做透明度衬底，不跟随控件变化。
 * 预期结果：调色看表面主色变；alpha < 1 透过球看见地面与盒子；
 *   wireframe 开启看到三角形网格；backFaceCulling 关闭后绕到物体背面/内部能看到内壁；
 *   specularPower 拉低看到高光变宽、拉高变锐。
 * 阅读主线：先看 buildScene 里 StandardMaterial 的默认赋值，再看 applyOptions 的属性写入，
 *   最后看 onBeforeRenderObservable 输出的 readout。
 */
import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  HemisphericLight,
  Material,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';

// 漫反射色预设：用 select 切换得到可复现的离散颜色；readout 显示真实 RGB。
const COLOR_PRESETS: Record<string, Color3> = {
  orange: new Color3(0.86, 0.4, 0.22),
  teal: new Color3(0.18, 0.55, 0.58),
  gold: new Color3(0.92, 0.74, 0.26),
  lavender: new Color3(0.62, 0.52, 0.86),
  white: new Color3(0.92, 0.92, 0.92),
};

// readout 显示用的中文标签。
const PRESET_LABELS: Record<string, string> = {
  orange: '橙 orange',
  teal: '青 teal',
  gold: '金 gold',
  lavender: '紫 lavender',
  white: '白 white',
};

export interface MaterialPlaygroundOptions {
  diffusePreset: string;
  alpha: number;
  specularPower: number;
  wireframe: boolean;
  backFaceCulling: boolean;
}

export interface MaterialPlaygroundSnapshot {
  diffusePreset: string;
  diffuseColor: string;
  alpha: number;
  specularPower: number;
  wireframe: boolean;
  backFaceCulling: boolean;
  fillMode: string;
  alphaMode: string;
}

export interface MaterialPlaygroundInstance {
  update(options: MaterialPlaygroundOptions): void;
  dispose(): void;
}

export function createMaterialPlayground(
  canvas: HTMLCanvasElement,
  emit: (snapshot: MaterialPlaygroundSnapshot) => void,
): MaterialPlaygroundInstance {
  let current: MaterialPlaygroundOptions = {
    diffusePreset: 'orange',
    alpha: 1,
    specularPower: 64,
    wireframe: false,
    backFaceCulling: true,
  };
  let mat: StandardMaterial;
  let scene: Scene;

  function colorOf(preset: string): Color3 {
    return COLOR_PRESETS[preset] ?? COLOR_PRESETS.orange;
  }

  // fillMode 是底层枚举：wireframe / pointsCloud 这两个布尔属性只是它的快捷开关。
  function fillModeLabel(mode: number): string {
    switch (mode) {
      case Material.WireFrameFillMode:
        return 'WireFrameFillMode（线框）';
      case Material.PointFillMode:
        return 'PointFillMode（点云）';
      default:
        return 'TriangleFillMode（实心）';
    }
  }

  // 参数 → 材质实例属性。改 alpha 不改 alphaMode（默认 ALPHA_COMBINE 就是标准透明）。
  function applyOptions(options: MaterialPlaygroundOptions) {
    mat.diffuseColor = colorOf(options.diffusePreset);
    mat.alpha = options.alpha;
    mat.specularPower = options.specularPower;
    mat.wireframe = options.wireframe;
    mat.backFaceCulling = options.backFaceCulling;
  }

  const runtime = createBabylonRuntime(canvas, (engine) => {
    scene = new Scene(engine);
    scene.clearColor = new Color4(0.12, 0.13, 0.16, 1);

    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2.2,
      Math.PI / 2.5,
      8,
      new Vector3(0, 0.8, 0),
      scene,
    );
    camera.minZ = 0.1;
    camera.attachControl(canvas, true);

    // 受光环境：HemisphericLight 抬底色 + DirectionalLight 给方向与高光（呼应 2.9 光源课）。
    // 没光时 StandardMaterial 渲染成全黑——这里给足光，确保调色/高光可见。
    const fill = new HemisphericLight('fill', new Vector3(0.3, 1, 0.3), scene);
    fill.intensity = 0.55;
    fill.groundColor = new Color3(0.16, 0.14, 0.12);

    const sun = new DirectionalLight('sun', new Vector3(-0.6, -1, -0.45).normalize(), scene);
    sun.intensity = 1.1;
    sun.diffuse = new Color3(1.0, 0.95, 0.88);

    // 地面：固定灰 StandardMaterial，作为透明的衬底与明暗参照；不跟随控件变化。
    const ground = MeshBuilder.CreateGround('ground', { width: 14, height: 14 }, scene);
    const groundMat = new StandardMaterial('groundMat', scene);
    groundMat.diffuseColor = new Color3(0.42, 0.44, 0.48);
    groundMat.specularColor = new Color3(0.08, 0.08, 0.08); // 地面压低高光，避免抢戏
    ground.material = groundMat;

    // 玩家操作的主材质：球与盒子共享，一处控件改一处属性，两个形状同时反映。
    mat = new StandardMaterial('playMat', scene);
    // specularColor 保留默认白：高光颜色由它决定，锐利度由 specularPower 决定。
    // emissiveColor / ambientColor 保留默认黑（无贡献），让 diffuse 与高光是唯一可见项。

    const sphere = MeshBuilder.CreateSphere('sphere', { diameter: 1.8, segments: 16 }, scene);
    sphere.material = mat;
    sphere.position.set(-1, 0.9, 0);

    const box = MeshBuilder.CreateBox('box', { size: 1.4 }, scene);
    box.material = mat;
    box.position.set(1.3, 0.7, 0.4);

    applyOptions(current);

    scene.onBeforeRenderObservable.add(() => {
      const c = mat.diffuseColor;
      emit({
        diffusePreset: PRESET_LABELS[current.diffusePreset] ?? current.diffusePreset,
        diffuseColor: `(${c.r.toFixed(2)}, ${c.g.toFixed(2)}, ${c.b.toFixed(2)})`,
        alpha: current.alpha,
        specularPower: current.specularPower,
        wireframe: current.wireframe,
        backFaceCulling: current.backFaceCulling,
        fillMode: fillModeLabel(mat.fillMode),
        // 默认 alphaMode = ALPHA_COMBINE（= 2，标准 src-alpha 混合），本范例不切换它。
        alphaMode: 'ALPHA_COMBINE (2)',
      });
    });

    return scene;
  });

  return {
    update(options) {
      current = options;
      if (mat) {
        applyOptions(options);
      }
    },
    dispose() {
      runtime.dispose();
    },
  };
}
