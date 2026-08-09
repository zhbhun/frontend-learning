/**
 * 范例：在一个有较多物体的场景里同时演示度量读数与各优化手段的影响。
 * 输入：
 *   - instanceCount：独立 Mesh 数量（方阵排列），用来把 draw calls 与每帧 CPU 工作量顶上来。
 *   - freezeWorldMatrix：mesh.freezeWorldMatrix() / unfreezeWorldMatrix()——冻结静态网格的世界矩阵。
 *   - freezeActiveMeshes：scene.freezeActiveMeshes() / unfreezeActiveMeshes()——冻结活跃网格列表，跳过每帧评估。
 *   - hardwareScaling：engine.setHardwareScalingLevel(level)——>1 降分辨率换 GPU 性能。
 *   - optimizerEnabled：SceneOptimizer + HardwareScalingOptimization——按 FPS 自动调硬件缩放。
 * 主要操作：
 *   - createBabylonRuntime 创建 Engine/Scene/相机/光/共享材质/方阵；Controls 改参数后由
 *     onBeforeRenderObservable 在帧边界 diff 应用（rebuild / freeze / setHardwareScalingLevel / start|stop 优化器）。
 *   - SceneInstrumentation.drawCallsCounter 读 draw calls；手算三角形数；engine.getFps() 读帧率；
 *     EngineInstrumentation.gpuFrameTimeCounter 读 GPU 帧时间（纳秒，/1e6 转 ms）。
 * 预期结果：readout 同步给出 Draw calls、三角形数、FPS、GPU 帧时间、当前硬件缩放、优化器状态。
 * 阅读主线：setup 里的对象与计数器创建 → rebuildGrid（数量/冻结）→ applyDiff（各手段）→ onAfterRenderObservable（读数）。
 */
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';
import {
  ArcRotateCamera,
  Color3,
  Color4,
  type Engine,
  EngineInstrumentation,
  HardwareScalingOptimization,
  HemisphericLight,
  type Mesh,
  MeshBuilder,
  Scene,
  SceneInstrumentation,
  SceneOptimizer,
  SceneOptimizerOptions,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';

export interface PerformanceOptions {
  instanceCount: number;
  freezeWorldMatrix: boolean;
  freezeActiveMeshes: boolean;
  hardwareScaling: number;
  optimizerEnabled: boolean;
}

export interface PerformanceSnapshot {
  drawCalls: number;
  triangles: number;
  fps: number;
  gpuFrameMs: string;
  hardwareScaling: string;
  optimizerState: string;
}

export interface PerformanceInstance {
  update(options: PerformanceOptions): void;
  dispose(): void;
}

const BOX_SIZE = 0.6;
const SPACING = 1.2;

// 把 count 个立方体排成居中方阵，每个网格 box 旋转一个角度，让世界矩阵非平凡。
function buildGrid(
  count: number,
  scene: Scene,
  material: StandardMaterial,
): Mesh[] {
  const side = Math.max(1, Math.ceil(Math.sqrt(count)));
  const offset = (side - 1) / 2;
  const boxes: Mesh[] = [];
  for (let i = 0; i < count; i++) {
    const gx = i % side;
    const gz = Math.floor(i / side);
    const box = MeshBuilder.CreateBox(`box${i}`, { size: BOX_SIZE }, scene);
    box.material = material;
    box.position.set(
      (gx - offset) * SPACING,
      BOX_SIZE / 2,
      (gz - offset) * SPACING,
    );
    box.rotation.y = (i % 9) * 0.12; // 每个网格略微旋转，世界矩阵不是单位阵
    boxes.push(box);
  }
  return boxes;
}

export function createPerformanceExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PerformanceSnapshot) => void,
): PerformanceInstance {
  let current: PerformanceOptions = {
    instanceCount: 800,
    freezeWorldMatrix: false,
    freezeActiveMeshes: false,
    hardwareScaling: 1,
    optimizerEnabled: false,
  };
  let applied: PerformanceOptions | null = null;

  let boxes: Mesh[] = [];
  let material: StandardMaterial;
  let camera: ArcRotateCamera;
  let instrumentation: SceneInstrumentation;
  let engineInstrumentation: EngineInstrumentation;

  let optimizer: SceneOptimizer | null = null;
  let optimizerAppliedCount = 0;
  let optimizerSucceeded = false;
  let gpuEverMeasured = false;

  // 重建后需要补冻结的标志：重建当帧先解冻并重算活跃网格，下一帧再 freeze，
  // 保证新增的 box 已经进入活跃网格列表（freeze 才会捕获到它们）。
  let pendingFreezeActiveMeshes = false;

  const runtime = createBabylonRuntime(canvas, (engine) => {
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.93, 0.95, 0.94, 1);

    camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2.2,
      Math.PI / 2.7,
      22,
      new Vector3(0, 0.4, 0),
      scene,
    );
    camera.minZ = 0.1;
    camera.attachControl(canvas, true);

    new HemisphericLight('light', new Vector3(0.4, 1, 0.3), scene);

    // 共享材质：N 个 box 用同一份 material，让对照更纯粹——draw call 数 ≈ box 数。
    material = new StandardMaterial('boxMat', scene);
    material.diffuseColor = new Color3(0.26, 0.52, 0.84);
    material.emissiveColor = new Color3(0.05, 0.09, 0.16);

    // draw calls 计数器始终可用（无需 capture 标志）。
    instrumentation = new SceneInstrumentation(scene);
    // GPU 帧时间：依赖 EXT_DISJOINT_TIMER_QUERY，部分浏览器不可用；不可用时计数器恒为 0。
    engineInstrumentation = new EngineInstrumentation(engine);
    engineInstrumentation.captureGPUFrameTime = true;

    rebuildGrid(scene, current.instanceCount, current.freezeWorldMatrix);
    // 初始硬件缩放：按 Controls 的初始值。
    engine.setHardwareScalingLevel(current.hardwareScaling);

    applied = { ...current };

    // 帧边界：先补上一帧重建遗留的 freeze，再 diff 应用新 options。
    scene.onBeforeRenderObservable.add(() => {
      if (pendingFreezeActiveMeshes) {
        scene.freezeActiveMeshes();
        pendingFreezeActiveMeshes = false;
      }
      if (applied && !optionsEqual(applied, current)) {
        applyDiff(scene, engine, applied, current);
        applied = { ...current };
      }
    });

    // 计数器在每帧开头重置，onAfterRenderObservable 在 scene.render() 之后触发，
    // 此时 drawCallsCounter.current 是刚结束这一帧的真实值。
    scene.onAfterRenderObservable.add(() => {
      let triangles = 0;
      for (const m of scene.meshes) {
        triangles += m.getTotalIndices() / 3;
      }
      const gpuNs = engineInstrumentation.gpuFrameTimeCounter.lastSecAverage;
      if (gpuNs > 0) gpuEverMeasured = true;

      emit({
        drawCalls: instrumentation.drawCallsCounter.current,
        triangles,
        fps: Math.round(engine.getFps()),
        // GPU 帧时间计数器单位是纳秒，/1e6 转 ms；扩展不可用时恒为 0。
        gpuFrameMs: gpuEverMeasured
          ? (gpuNs / 1e6).toFixed(2)
          : '不可用',
        hardwareScaling: engine.getHardwareScalingLevel().toFixed(2),
        optimizerState: optimizerSucceeded
          ? '已达成目标 FPS'
          : optimizer
            ? `运行中（已应用 ${optimizerAppliedCount} 次）`
            : '关闭',
      });
    });

    return scene;
  });

  function rebuildGrid(
    scene: Scene,
    count: number,
    freezeWorldMatrix: boolean,
  ) {
    // 重建前先解冻活跃网格列表：否则冻结的旧列表会引用已 dispose 的 mesh。
    scene.unfreezeActiveMeshes();
    for (const b of boxes) b.dispose();
    boxes = buildGrid(count, scene, material);
    if (freezeWorldMatrix) {
      for (const b of boxes) b.freezeWorldMatrix();
    }
    // 让方阵整体在视野内；用户仍可滚轮缩放。
    const side = Math.max(1, Math.ceil(Math.sqrt(count)));
    camera.radius = side * SPACING * 1.3 + 6;
  }

  function applyDiff(
    scene: Scene,
    engine: Engine,
    prev: PerformanceOptions,
    next: PerformanceOptions,
  ) {
    // 1. 数量变化：解冻 → 重建 → 下一帧补 freeze（如开启）。
    if (prev.instanceCount !== next.instanceCount) {
      rebuildGrid(scene, next.instanceCount, next.freezeWorldMatrix);
      pendingFreezeActiveMeshes = next.freezeActiveMeshes;
    } else {
      // 2. 世界矩阵冻结切换：逐个 mesh freeze / unfreeze。
      if (prev.freezeWorldMatrix !== next.freezeWorldMatrix) {
        for (const b of boxes) {
          if (next.freezeWorldMatrix) b.freezeWorldMatrix();
          else b.unfreezeWorldMatrix();
        }
      }
      // 3. 活跃网格冻结切换：开启时延迟一帧再 freeze（等活跃列表更新）。
      if (prev.freezeActiveMeshes !== next.freezeActiveMeshes) {
        if (next.freezeActiveMeshes) {
          pendingFreezeActiveMeshes = true;
        } else {
          scene.unfreezeActiveMeshes();
          pendingFreezeActiveMeshes = false;
        }
      }
    }

    // 4. 硬件缩放：优化器关闭时由滑块直接控制。
    if (
      prev.hardwareScaling !== next.hardwareScaling &&
      !next.optimizerEnabled
    ) {
      engine.setHardwareScalingLevel(next.hardwareScaling);
    }

    // 5. SceneOptimizer 开关：开启时由它接管硬件缩放；关闭时停掉并复位回滑块值
    //    （优化器降级是单向的，不会自动回升，关闭时显式复位让范例可重复）。
    if (prev.optimizerEnabled !== next.optimizerEnabled) {
      if (next.optimizerEnabled) {
        startOptimizer(scene, next.hardwareScaling);
      } else {
        stopOptimizer();
        engine.setHardwareScalingLevel(next.hardwareScaling);
      }
    }
  }

  function startOptimizer(scene: Scene, baselineScaling: number) {
    stopOptimizer();
    // 先复位到滑块基线，让优化器从已知状态开始降级。
    runtime.engine.setHardwareScalingLevel(baselineScaling);

    // 目标 58 FPS（接近 60）、每 1000ms 检查一次；HardwareScalingOptimization
    // 每次把硬件缩放 +0.5，直到 maximumScale=3。
    const options = new SceneOptimizerOptions(58, 1000);
    options.addOptimization(new HardwareScalingOptimization(0, 3, 0.5));
    optimizer = new SceneOptimizer(scene, options);
    optimizerAppliedCount = 0;
    optimizerSucceeded = false;
    optimizer.onNewOptimizationAppliedObservable.add(() => {
      optimizerAppliedCount++;
    });
    optimizer.onSuccessObservable.add(() => {
      optimizerSucceeded = true;
    });
    optimizer.start();
  }

  function stopOptimizer() {
    if (optimizer) {
      optimizer.stop();
      optimizer.dispose();
      optimizer = null;
    }
    optimizerAppliedCount = 0;
    optimizerSucceeded = false;
  }

  return {
    update(options) {
      current = options;
    },
    dispose() {
      stopOptimizer();
      runtime.dispose();
    },
  };
}

// 浅比较两个 options，决定是否需要在帧边界应用变更。
function optionsEqual(a: PerformanceOptions, b: PerformanceOptions): boolean {
  return (
    a.instanceCount === b.instanceCount &&
    a.freezeWorldMatrix === b.freezeWorldMatrix &&
    a.freezeActiveMeshes === b.freezeActiveMeshes &&
    a.hardwareScaling === b.hardwareScaling &&
    a.optimizerEnabled === b.optimizerEnabled
  );
}
