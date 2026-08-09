/**
 * 范例：Babylon.js 后处理——DefaultRenderingPipeline 的 bloom / FXAA / 景深，以及独立的 SSAO2RenderingPipeline。
 * 输入：
 *   - bloom：boolean —— DefaultRenderingPipeline.bloomEnabled（默认 true）。
 *   - bloomThreshold：number —— pipeline.bloomThreshold（luma 阈值，默认 0.9）。
 *   - bloomWeight：number —— pipeline.bloomWeight（光晕叠加强度，默认 0.15）。
 *   - fxaa：boolean —— pipeline.fxaaEnabled（默认 false）。
 *   - depthOfField：boolean —— pipeline.depthOfFieldEnabled（默认 false）。
 *   - focusDistance：number —— pipeline.depthOfField.focusDistance，按「场景单位」暴露，
 *     内部 ×1000 换算成毫米（focusDistance 的真实单位是 scene units / 1000）。
 *   - ssao：boolean —— 切换独立的 SSAO2RenderingPipeline（不在 DefaultRenderingPipeline 上）。
 * 主要操作：
 *   - buildStage 搭地面、一个强 emissive 的「灯泡」球（bloom 源）、几个不同景深的盒子（景深证据）、
 *     一个自发光圆环（bloom 第二源）。强 emissiveColor > 1.0 配合 HDR，让默认 threshold=0.9 下也能 bloom。
 *   - 创建一个 DefaultRenderingPipeline（一次创建、复用），通过 bloomEnabled / fxaaEnabled / depthOfFieldEnabled
 *     等运行时属性切效果；DoF 参数 focalLength/fStop/focusDistance 挂在 pipeline.depthOfField 子对象上。
 *   - SSAO 是独立管线：懒创建 SSAO2RenderingPipeline（构造时自动 addPipeline + attachCameras），
 *     关闭时 dispose（自动 removePipeline + 释放 geometry buffer）。这条「独立」事实是本课与 5.4 Layer、
 *     与 three.js EffectComposer 的关键差别。
 *   - onBeforeRenderObservable 里 emit 派生读数（各效果开关、参数、SSAO 所属管线、FPS）。
 * 预期结果：
 *   - bloom=true：灯泡与圆环出现光晕；调 bloomThreshold 下移让中等亮度的盒子也 bloom；
 *     bloomWeight 越大光晕越亮。
 *   - fxaa=true：斜边/球体边缘锯齿减弱（小画布下仍可观察到边缘变柔）。
 *   - depthOfField=true：调 focusDistance，不在焦平面上的物体被虚化（近处盒子 / 远处盒子交替模糊）。
 *   - ssao=true：盒子与地面接触处出现接触阴影变暗（readout 显示 SSAO2RenderingPipeline 已挂载）。
 *   - ArcRotateCamera 已 attachControl：拖拽可从不同角度观察效果。
 * 阅读主线：buildStage（场景与材质）→ 创建 DefaultRenderingPipeline → applyPipeline（同步开关与参数）
 *   → applySSAO（独立 SSAO2 管线懒创建/释放）→ emit（readout 字段）。
 */
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';
import {
  ArcRotateCamera,
  Color3,
  Color4,
  DefaultRenderingPipeline,
  DepthOfFieldEffectBlurLevel,
  DirectionalLight,
  HemisphericLight,
  MeshBuilder,
  Scene,
  SSAO2RenderingPipeline,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';

export interface PostProcessingOptions {
  bloom: boolean;
  bloomThreshold: number;
  bloomWeight: number;
  fxaa: boolean;
  depthOfField: boolean;
  focusDistance: number; // 场景单位；内部 ×1000 换算成 focusDistance 的毫米
  ssao: boolean;
}

export interface PostProcessingSnapshot {
  bloom: boolean;
  bloomThreshold: number;
  bloomWeight: number;
  fxaa: boolean;
  depthOfField: boolean;
  focusDistance: number; // 显示场景单位
  ssao: boolean;
  ssaoPipeline: string;
  msaa: number;
  fps: number;
}

export interface PostProcessingInstance {
  update(options: PostProcessingOptions): void;
  dispose(): void;
}

export function createPostProcessingExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PostProcessingSnapshot) => void,
): PostProcessingInstance {
  let current: PostProcessingOptions = {
    bloom: true,
    bloomThreshold: 0.9,
    bloomWeight: 0.3,
    fxaa: true,
    depthOfField: false,
    focusDistance: 8,
    ssao: false,
  };

  let pipeline!: DefaultRenderingPipeline;
  // SSAO2 是独立 PostProcessRenderPipeline：构造时自动 addPipeline + attachCameras，
  // dispose 时自动 removePipeline + disableGeometryBuffer。懒创建，关闭即释放。
  let ssaoPipeline: SSAO2RenderingPipeline | null = null;
  let ssaoPipelineName = '';
  let camera!: ArcRotateCamera;
  let activeScene!: Scene;

  const runtime = createBabylonRuntime(canvas, (engine) => {
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.04, 0.05, 0.07, 1);
    activeScene = scene;

    camera = new ArcRotateCamera(
      'cam',
      -Math.PI / 2.15,
      Math.PI / 2.5,
      9,
      new Vector3(0, 0.6, 0),
      scene,
    );
    camera.minZ = 0.1;
    camera.lowerRadiusLimit = 5;
    camera.upperRadiusLimit = 18;
    camera.attachControl(canvas, true);

    // 半球光打底 + 方向光给 SSAO/景深提供清晰的几何深度变化。
    new HemisphericLight('hemi', new Vector3(0.3, 1, 0.25), scene);
    const dir = new DirectionalLight('dir', new Vector3(-0.6, -1, 0.4), scene);
    dir.intensity = 0.7;

    // 地面：SSAO 接触阴影的载体，景深远端虚化的参考。
    const ground = MeshBuilder.CreateGround('ground', { width: 18, height: 12 }, scene);
    const groundMat = new StandardMaterial('groundMat', scene);
    groundMat.diffuseColor = new Color3(0.32, 0.33, 0.36);
    groundMat.specularColor = new Color3(0.05, 0.05, 0.05);
    ground.material = groundMat;

    // 强 emissive 的「灯泡」球：emissiveColor > 1.0 配合 HDR，让默认 threshold=0.9 下也能 bloom。
    const bulb = MeshBuilder.CreateSphere('bulb', { diameter: 1.0, segments: 24 }, scene);
    bulb.position.set(-3.0, 1.0, 0);
    const bulbMat = new StandardMaterial('bulbMat', scene);
    bulbMat.diffuseColor = new Color3(0.0, 0.0, 0.0);
    bulbMat.emissiveColor = new Color3(1.4, 1.15, 0.45);
    bulb.material = bulbMat;

    // 自发光圆环：第二个 bloom 源，颜色不同便于观察 threshold 与 weight 的连带影响。
    const ring = MeshBuilder.CreateTorus(
      'ring',
      { diameter: 1.6, thickness: 0.28, tessellation: 40 },
      scene,
    );
    ring.position.set(3.0, 0.6, 0);
    const ringMat = new StandardMaterial('ringMat', scene);
    ringMat.diffuseColor = new Color3(0.0, 0.0, 0.0);
    ringMat.emissiveColor = new Color3(0.35, 0.7, 1.5);
    ring.material = ringMat;

    // 一排不同景深的盒子：调 focusDistance 时近 / 远盒子交替虚化，是景深的可观察证据。
    // 盒子 emissive 较弱（不参与 bloom），用于隔离「景深」这一变量。
    const boxDepths = [-5.5, -2.5, 2.5, 5.5];
    boxDepths.forEach((z, i) => {
      const box = MeshBuilder.CreateBox(`box${i}`, { size: 0.9 }, scene);
      box.position.set(0, 0.45, z);
      const mat = new StandardMaterial(`boxMat${i}`, scene);
      mat.diffuseColor = new Color3(0.55, 0.5, 0.45);
      mat.emissiveColor = new Color3(0.18, 0.16, 0.14);
      box.material = mat;
    });

    // DefaultRenderingPipeline 是后处理的统一入口：构造时自动 addPipeline 到 scene。
    // hdr=true（也是默认值）保留 >1 的亮度，是 bloom 正常工作的前提。
    pipeline = new DefaultRenderingPipeline('default', true, scene, [camera]);
    pipeline.samples = 2; // MSAA（硬件多采样），与 FXAA 互补
    pipeline.imageProcessingEnabled = true; // tone mapping / contrast / exposure 出口
    pipeline.imageProcessing.toneMappingEnabled = false; // 保持颜色直观，tone mapping 见正文
    // 景深参数 focalLength / fStop / focusDistance 挂在 pipeline.depthOfField 子对象上。
    pipeline.depthOfFieldBlurLevel = DepthOfFieldEffectBlurLevel.Medium;
    pipeline.depthOfField.fStop = 1.4;
    pipeline.depthOfField.focalLength = 50;

    applyPipeline(current);
    applySSAO(current, scene, camera);

    scene.onBeforeRenderObservable.add(() => {
      emit({
        bloom: pipeline.bloomEnabled,
        bloomThreshold: pipeline.bloomThreshold,
        bloomWeight: pipeline.bloomWeight,
        fxaa: pipeline.fxaaEnabled,
        depthOfField: pipeline.depthOfFieldEnabled,
        focusDistance: pipeline.depthOfField.focusDistance / 1000,
        ssao: ssaoPipeline !== null,
        ssaoPipeline: ssaoPipeline ? 'SSAO2RenderingPipeline' : '（未挂载）',
        msaa: pipeline.samples,
        fps: Math.round(1000 / Math.max(engine.getDeltaTime(), 1)),
      });
    });

    return scene;
  });

  // 同步 DefaultRenderingPipeline 的开关与参数。这些都是运行时 get/set，下一帧即生效。
  function applyPipeline(options: PostProcessingOptions) {
    pipeline.bloomEnabled = options.bloom;
    pipeline.bloomThreshold = options.bloomThreshold;
    pipeline.bloomWeight = options.bloomWeight;
    pipeline.fxaaEnabled = options.fxaa;
    pipeline.depthOfFieldEnabled = options.depthOfField;
    // focusDistance 的真实单位是 scene units / 1000（毫米）：把「场景单位」换算过去。
    pipeline.depthOfField.focusDistance = options.focusDistance * 1000;
  }

  // SSAO2 是独立 PostProcessRenderPipeline，不在 DefaultRenderingPipeline 上。
  // 开 = new（自动 addPipeline + attachCameras + 启用 geometry/prePass 取深度法线）；
  // 关 = dispose（自动 removePipeline + disableGeometryBuffer），而不是只切一个布尔位。
  function applySSAO(options: PostProcessingOptions, scene: Scene, cam: ArcRotateCamera) {
    if (options.ssao && !ssaoPipeline) {
      ssaoPipelineName = `ssao2-${Date.now()}`;
      ssaoPipeline = new SSAO2RenderingPipeline(ssaoPipelineName, scene, 1.0, [cam]);
    } else if (!options.ssao && ssaoPipeline) {
      ssaoPipeline.dispose();
      ssaoPipeline = null;
      ssaoPipelineName = '';
    }
  }

  return {
    update(options) {
      current = options;
      if (pipeline) applyPipeline(options);
      if (activeScene && camera) applySSAO(options, activeScene, camera);
    },
    dispose() {
      // 先释放两个 pipeline（DoF 内部会启用的 depth renderer 由 scene.dispose 收尾；
      // SSAO2 的 geometry buffer 由其自身 dispose 释放），再停业务 observable，最后释放 Engine/Scene。
      activeScene?.onBeforeRenderObservable.clear();
      ssaoPipeline?.dispose();
      ssaoPipeline = null;
      pipeline?.dispose();
      runtime.dispose();
    },
  };
}
