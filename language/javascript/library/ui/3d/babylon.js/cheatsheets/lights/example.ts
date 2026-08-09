/**
 * 范例：四种核心光源（Hemispheric / Point / Directional / Spot）的横向对比。
 * 输入：
 *   - lightType：当前唯一活动光源的类型（none / hemispheric / point / directional / spot）。
 *   - intensity：写入 light.intensity（默认 1），共用。
 * 主要操作：在一个固定的受光场景（地面 + 一组 StandardMaterial 球/盒）里，
 *   切换 lightType 时 dispose 旧光并按类型构造新光；intensity 变化只写 intensity。
 * 预期结果：切到 none 看到受光材质全黑（呼应"没光→黑"）；
 *   四种光源因形状不同呈现完全不同的明暗分布——
 *   Hemispheric 均匀天/地底色、Directional 一侧亮且全场无衰减、
 *   Point 近亮远暗（受 range 控制）、Spot 只照亮锥形区域。
 * 阅读主线：先看 buildLight 里四种光源的构造差异，再看 applyLight 的"按需重建"逻辑，
 *   最后看 onBeforeRenderObservable 输出的 readout。
 */
import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  HemisphericLight,
  Light,
  MeshBuilder,
  PointLight,
  Scene,
  SpotLight,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';

// lightType 键 → 中文标签（readout 显示用）。
const TYPE_LABELS: Record<string, string> = {
  none: '无光源',
  hemispheric: 'HemisphericLight 半球光',
  point: 'PointLight 点光',
  directional: 'DirectionalLight 平行光',
  spot: 'SpotLight 聚光',
};

// Point / Spot 的 range：给一个有限值，让 StandardMaterial 的距离衰减可见。
// DirectionalLight 本身"无限远"，不受 range 影响；HemisphericLight 没有 range 概念。
const POINT_RANGE = 14;
const SPOT_RANGE = 18;

// DirectionalLight / SpotLight 的方向（指向被照区域）。
const DIR_DIRECTION = new Vector3(-0.55, -1, -0.55).normalize();
const SPOT_POSITION = new Vector3(4, 5, 4);
// SpotLight 方向：从 position 指向原点（中心球）。
const SPOT_DIRECTION = new Vector3(0, 0, 0).subtract(SPOT_POSITION).normalize();
const SPOT_ANGLE = Math.PI / 4.5; // 锥体半角 ≈ 40°
const SPOT_EXPONENT = 2; // 沿锥轴的衰减速度

export interface LightGalleryOptions {
  lightType: string;
  intensity: number;
}

export interface LightGallerySnapshot {
  lightType: string;
  intensity: number;
  source: string; // position 或 direction 的格式化串
}

export interface LightGalleryInstance {
  update(options: LightGalleryOptions): void;
  dispose(): void;
}

export function createLightGallery(
  canvas: HTMLCanvasElement,
  emit: (snapshot: LightGallerySnapshot) => void,
): LightGalleryInstance {
  let current: LightGalleryOptions = {
    lightType: 'hemispheric',
    intensity: 1,
  };
  let light: Light | null = null;
  let scene: Scene;

  // 按类型构造一盏新光。每盏光都传 scene，自动登记进 scene.lights 集合。
  function buildLight(type: string): Light | null {
    switch (type) {
      case 'hemispheric': {
        // direction 是"反射方向"（朝上的天顶方向），不是光的入射方向。
        const l = new HemisphericLight(
          'light',
          new Vector3(0.3, 1, 0.3),
          scene,
        );
        l.groundColor = new Color3(0.16, 0.14, 0.12); // 朝下方向的地面色
        return l;
      }
      case 'point': {
        // position 决定发光点；range 决定 StandardMaterial 的衰减上限。
        const l = new PointLight('light', new Vector3(4, 4, 4), scene);
        l.range = POINT_RANGE;
        return l;
      }
      case 'directional': {
        // direction 决定平行光方向；位置无意义，range 不影响（无限远）。
        const l = new DirectionalLight('light', DIR_DIRECTION.clone(), scene);
        return l;
      }
      case 'spot': {
        // position + direction + angle（锥半角）+ exponent（衰减速度）。
        const l = new SpotLight(
          'light',
          SPOT_POSITION.clone(),
          SPOT_DIRECTION.clone(),
          SPOT_ANGLE,
          SPOT_EXPONENT,
          scene,
        );
        l.range = SPOT_RANGE;
        return l;
      }
      default:
        return null; // none：不建光，让受光材质变全黑。
    }
  }

  // 切换类型时 dispose 旧光再重建；只改 intensity 时复用现有光。
  function applyLight(options: LightGalleryOptions) {
    const currentKey = light ? lightKey(light) : 'none';
    if (currentKey !== options.lightType) {
      light?.dispose();
      light = buildLight(options.lightType);
    }
    if (light) {
      light.intensity = options.intensity;
    }
  }

  const runtime = createBabylonRuntime(canvas, (engine) => {
    scene = new Scene(engine);
    // 深灰舞台底：当切到 none 时，黑色受光材质作为剪影仍可辨认。
    scene.clearColor = new Color4(0.12, 0.13, 0.16, 1);

    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2.3,
      Math.PI / 2.6,
      14,
      new Vector3(0, 0.7, 0),
      scene,
    );
    camera.minZ = 0.1;
    camera.attachControl(canvas, true);

    // 地面：受光后才可见，用来读出明暗分布。
    const ground = MeshBuilder.CreateGround('ground', { width: 16, height: 16 }, scene);
    const groundMat = new StandardMaterial('groundMat', scene);
    groundMat.diffuseColor = new Color3(0.54, 0.56, 0.6);
    ground.material = groundMat;

    // 一组受光物体：StandardMaterial，分布在不同距离，便于观察衰减与方向。
    const objMat = new StandardMaterial('objMat', scene);
    objMat.diffuseColor = new Color3(0.86, 0.4, 0.22);
    // 让 specular 高光更明显，便于 SpotLight / PointLight 的高光位置差异可读。
    objMat.specularColor = new Color3(0.9, 0.9, 0.9);
    objMat.specularPower = 48;

    // 中心大球。
    const center = MeshBuilder.CreateSphere('center', { diameter: 1.6 }, scene);
    center.material = objMat;
    center.position.y = 0.8;

    // 四角球（距中心不同，距离衰减可见）。
    const corners = [
      { x: -3.5, z: -3.5 },
      { x: 3.5, z: -3.5 },
      { x: -3.5, z: 3.5 },
      { x: 3.5, z: 3.5 },
    ];
    corners.forEach((p, i) => {
      const s = MeshBuilder.CreateSphere(`corner${i}`, { diameter: 1 }, scene);
      s.material = objMat;
      s.position.set(p.x, 0.5, p.z);
    });

    // 前后两枚远球，进一步拉开距离梯度。
    [-5.5, 5.5].forEach((z, i) => {
      const s = MeshBuilder.CreateSphere(`far${i}`, { diameter: 0.9 }, scene);
      s.material = objMat;
      s.position.set(0, 0.45, z);
    });

    // 中央两侧的盒子，给方向光 / 聚光一个明确的侧面。
    [-1, 1].forEach((sx, i) => {
      const b = MeshBuilder.CreateBox(`box${i}`, { size: 1 }, scene);
      b.material = objMat;
      b.position.set(sx * 1.9, 0.5, 0);
    });

    // 建立初始光源（默认 hemispheric），随后由 update 切换。
    applyLight(current);

    scene.onBeforeRenderObservable.add(() => {
      emit({
        lightType: TYPE_LABELS[current.lightType] ?? current.lightType,
        intensity: current.intensity,
        source: describeLight(light),
      });
    });

    return scene;
  });

  return {
    update(options) {
      current = options;
      applyLight(options);
    },
    dispose() {
      runtime.dispose();
    },
  };
}

// 从实例反查类型键，用于判断是否需要重建光源。
function lightKey(l: Light): string {
  if (l instanceof HemisphericLight) return 'hemispheric';
  if (l instanceof PointLight) return 'point';
  if (l instanceof DirectionalLight) return 'directional';
  if (l instanceof SpotLight) return 'spot';
  return '';
}

// 把光源的位置或方向格式化成 readout 可读串：
// Hemispheric / Directional 读 direction；Point / Spot 读 position。
function describeLight(l: Light | null): string {
  if (!l) return '—（场景无光源）';
  if (l instanceof HemisphericLight || l instanceof DirectionalLight) {
    const d = l.direction;
    return `direction (${d.x.toFixed(2)}, ${d.y.toFixed(2)}, ${d.z.toFixed(2)})`;
  }
  if (l instanceof PointLight || l instanceof SpotLight) {
    const p = l.position;
    return `position (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`;
  }
  return '';
}
