/**
 * 范例：PBRMaterial 金属/粗糙度与环境光照（IBL）的联动观察。
 * 输入：
 *   - albedoPreset：albedoColor 预设（gold/copper/iron/orange/white）。
 *   - metallic：写入 pbr.metallic（0=电介质 / 1=金属）。
 *   - roughness：写入 pbr.roughness（0=镜面 / 1=漫散射）。
 *   - environmentIntensity：写入 scene.environmentIntensity（默认 1，全场 IBL 强度乘数）。
 *   - envOn：是否把程序化 ReflectionProbe 的 cube texture 挂到 scene.environmentTexture。
 * 主要操作：一个受光场景（地面 + 中心 PBR 球 + 周围一圈彩色自发光"环境"球）里，
 *   原点的 ReflectionProbe 把彩色环境球渲染成 cube texture；envOn 控制它是否挂到
 *   scene.environmentTexture。中心 PBR 球响应所有控件。
 * 预期结果：envOn=off 且 metallic→1 时，金属面没有内容可反射，几乎只剩直接光的镜面
 *   高光 → 整体偏黑；envOn=on 时金属面反射彩色环境，roughness 越低反射越锐；
 *   metallic→0 时无论环境开关，都是漫反射主导的"涂装/塑料"质感；
 *   environmentIntensity 整体放大/缩小 IBL 贡献。
 * 阅读主线：先看 buildScene 里 PBRMaterial 与 ReflectionProbe 的搭建，
 *   再看 applyOptions 的属性写入，最后看 onBeforeRenderObservable 输出的 readout。
 */
import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  HemisphericLight,
  MeshBuilder,
  PBRMaterial,
  ReflectionProbe,
  RenderTargetTexture,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';

// albedoColor 预设：金属预设（gold/copper/iron）的 albedo 在 metallic=1 时是反射色调 F0；
// 电介质预设（orange/white）的 albedo 在 metallic=0 时是漫反射反照率。readout 显示真实 RGB。
const COLOR_PRESETS: Record<string, Color3> = {
  gold: new Color3(1.0, 0.71, 0.29),
  copper: new Color3(0.95, 0.64, 0.54),
  iron: new Color3(0.56, 0.57, 0.58),
  orange: new Color3(0.86, 0.4, 0.22),
  white: new Color3(0.9, 0.9, 0.9),
};

const PRESET_LABELS: Record<string, string> = {
  gold: '金 gold',
  copper: '铜 copper',
  iron: '铁 iron',
  orange: '橙 orange',
  white: '白 white',
};

// 周围一圈彩色自发光球：既在画面里可见，也被 ReflectionProbe 渲染成 cube texture，
// 作为金属面的"环境反射内容"。用 disableLighting + emissiveColor 让它们恒亮。
const ENV_COLORS: Color3[] = [
  new Color3(1.0, 0.25, 0.25), // 红
  new Color3(0.3, 1.0, 0.4), // 绿
  new Color3(0.3, 0.45, 1.0), // 蓝
  new Color3(1.0, 0.9, 0.25), // 黄
  new Color3(0.95, 0.3, 0.95), // 品红
  new Color3(0.25, 0.95, 1.0), // 青
];

export interface PbrPlaygroundOptions {
  albedoPreset: string;
  metallic: number;
  roughness: number;
  environmentIntensity: number;
  envOn: boolean;
}

export interface PbrPlaygroundSnapshot {
  albedoPreset: string;
  albedoColor: string;
  metallic: number;
  roughness: number;
  environmentIntensity: number;
  environmentTexture: string;
  metalState: string;
}

export interface PbrPlaygroundInstance {
  update(options: PbrPlaygroundOptions): void;
  dispose(): void;
}

export function createPbrPlayground(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PbrPlaygroundSnapshot) => void,
): PbrPlaygroundInstance {
  let current: PbrPlaygroundOptions = {
    albedoPreset: 'gold',
    metallic: 1,
    roughness: 0.3,
    environmentIntensity: 1,
    envOn: true,
  };
  let mat: PBRMaterial;
  let scene: Scene;
  let probe: ReflectionProbe;

  function colorOf(preset: string): Color3 {
    return COLOR_PRESETS[preset] ?? COLOR_PRESETS.gold;
  }

  // 参数 → 材质与场景属性。envOn 在"程序化 cube texture"与 null 间切 scene.environmentTexture。
  function applyOptions(options: PbrPlaygroundOptions) {
    mat.albedoColor = colorOf(options.albedoPreset);
    mat.metallic = options.metallic;
    mat.roughness = options.roughness;
    scene.environmentIntensity = options.environmentIntensity;
    scene.environmentTexture = options.envOn ? probe.cubeTexture : null;
  }

  const runtime = createBabylonRuntime(canvas, (engine) => {
    scene = new Scene(engine);
    scene.clearColor = new Color4(0.1, 0.11, 0.14, 1);

    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2.2,
      Math.PI / 2.4,
      6.5,
      new Vector3(0, 0.9, 0),
      scene,
    );
    camera.minZ = 0.1;
    camera.attachControl(canvas, true);

    // 直接光：PBR 也响应 scene.lights。HemisphericLight 抬底色，DirectionalLight 给方向与高光。
    // envOn=off 时金属面只剩这些直接光的镜面高光 → 整体偏黑，是本课的关键证据。
    const fill = new HemisphericLight('fill', new Vector3(0.3, 1, 0.3), scene);
    fill.intensity = 1.0;
    fill.groundColor = new Color3(0.16, 0.14, 0.12);

    const sun = new DirectionalLight('sun', new Vector3(-0.55, -1, -0.45).normalize(), scene);
    sun.intensity = 2.5;
    sun.diffuse = new Color3(1.0, 0.96, 0.88);

    // 地面：固定灰 StandardMaterial，作为明暗与反射的参照；不跟随控件变化。
    const ground = MeshBuilder.CreateGround('ground', { width: 14, height: 14 }, scene);
    const groundMat = new StandardMaterial('groundMat', scene);
    groundMat.diffuseColor = new Color3(0.38, 0.4, 0.44);
    groundMat.specularColor = new Color3(0.04, 0.04, 0.04);
    ground.material = groundMat;

    // 程序化环境：原点的 ReflectionProbe 把周围彩色环境球渲染成 cube texture。
    // 不依赖任何远程 HDR 文件——这就是离线生成 IBL 反射内容的做法。
    probe = new ReflectionProbe('envProbe', 256, scene);
    // 静态环境内容用每帧渲染保证可靠；perf 开销可忽略（256px × 6 面 × 几个小球）。
    probe.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYFRAME;

    ENV_COLORS.forEach((c, i) => {
      const angle = (i / ENV_COLORS.length) * Math.PI * 2;
      const radius = 4.6;
      const height = 1.3 + (i % 2) * 1.9; // 高低交错，让反射分布更可读
      const sphere = MeshBuilder.CreateSphere(`env${i}`, { diameter: 0.85, segments: 12 }, scene);
      sphere.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
      const m = new StandardMaterial(`envMat${i}`, scene);
      m.disableLighting = true; // 纯自发光，恒亮，不参与直接光照计算
      m.emissiveColor = c;
      m.alpha = 1;
      sphere.material = m;
      (probe.renderList ??= []).push(sphere); // 让 probe 把它渲染进 cube texture
    });

    // 玩家操作的主材质：中心 PBR 球。控件直接写 metallic/roughness/albedoColor。
    // 显式设 metallic + roughness 才会进入金属/粗糙度工作流（否则回落到 spec/gloss）。
    mat = new PBRMaterial('pbr', scene);
    const sphere = MeshBuilder.CreateSphere('pbrSphere', { diameter: 1.9, segments: 32 }, scene);
    sphere.material = mat;
    sphere.position.set(0, 0.95, 0);

    applyOptions(current);

    scene.onBeforeRenderObservable.add(() => {
      const c = mat.albedoColor;
      const dark = current.metallic > 0.5 && !current.envOn;
      emit({
        albedoPreset: PRESET_LABELS[current.albedoPreset] ?? current.albedoPreset,
        albedoColor: `(${c.r.toFixed(2)}, ${c.g.toFixed(2)}, ${c.b.toFixed(2)})`,
        metallic: current.metallic,
        roughness: current.roughness,
        environmentIntensity: current.environmentIntensity,
        environmentTexture: current.envOn
          ? 'ReflectionProbe cube（程序化）'
          : 'null（无环境）',
        metalState: dark
          ? '无环境可反射 → 偏黑'
          : current.metallic > 0.5
            ? '反射环境'
            : '漫反射为主',
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
