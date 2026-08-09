/**
 * 范例：在一个场景里同时演示 AxesViewer 与性能计数两条调试渠道。
 * 输入：
 *   - showAxes / axesScale：AxesViewer 开关与线长（scaleLines）。
 *   - overlayMode：调试覆盖层，无 / 包围盒（showBoundingBox）/ 线框（material.wireframe）。
 *   - objectCount：环形排列的对象数，用来观察 draw calls 与三角形数的响应。
 * 主要操作：
 *   - createBabylonRuntime 创建 Engine/Scene/相机/光/对象；按 Controls 增减对象、切换覆盖层、
 *     重建 AxesViewer。
 *   - SceneInstrumentation 读 drawCallsCounter；engine.getFps() 读帧率；手算三角形数（过滤 LinesMesh）。
 * 预期结果：readout 同步给出坐标轴状态、Draw calls、三角形数、FPS 和 Mesh 数。
 * 阅读主线：先看 setup 里的对象创建与 AxesViewer，再看 onAfterRenderObservable 里的计数器读取。
 */
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';
import {
  ArcRotateCamera,
  AxesViewer,
  Color3,
  Color4,
  HemisphericLight,
  LinesMesh,
  Mesh,
  MeshBuilder,
  Scene,
  SceneInstrumentation,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';

export interface DebugOptions {
  showAxes: boolean;
  axesScale: number;
  overlayMode: 'none' | 'boundingBox' | 'wireframe';
  objectCount: number;
}

export interface DebugSnapshot {
  axesLabel: string;
  drawCalls: number;
  triangles: number;
  fps: number;
  meshCount: number;
}

export interface DebugInstance {
  update(options: DebugOptions): void;
  dispose(): void;
}

// 相机角度：原点斜上方观察，+X 偏右、+Y 朝上、+Z 朝画面深处（默认左手系）。
const CAMERA_ALPHA = -Math.PI / 2.2;
const CAMERA_BETA = Math.PI / 2.7;
const CAMERA_RADIUS = 11;

export function createDebugExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DebugSnapshot) => void,
): DebugInstance {
  let current: DebugOptions = {
    showAxes: true,
    axesScale: 2,
    overlayMode: 'none',
    objectCount: 6,
  };
  let axesViewer: AxesViewer | null = null;
  let tracked: { mesh: Mesh; material: StandardMaterial }[] = [];

  const runtime = createBabylonRuntime(canvas, (engine) => {
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.93, 0.95, 0.94, 1);

    const camera = new ArcRotateCamera(
      'camera',
      CAMERA_ALPHA,
      CAMERA_BETA,
      CAMERA_RADIUS,
      Vector3.Zero(),
      scene,
    );
    camera.minZ = 0.1;
    camera.attachControl(canvas, true);

    new HemisphericLight('light', new Vector3(0.4, 1, 0.3), scene);

    rebuildObjects(scene, current.objectCount);

    // AxesViewer：原点三色世界轴——X 红、Y 绿、Z 蓝。内部用 LinesMesh 画线，
    // 会进入 scene.meshes，因此"开关坐标轴"会影响 Mesh 数与 draw calls 读数。
    if (current.showAxes) {
      axesViewer = new AxesViewer(scene, current.axesScale);
    }

    // SceneInstrumentation：drawCallsCounter 始终可用，无需 capture 标志；
    // 时间类计数器（frameTime / renderTime 等）另需对应 capture* = true。
    const instrumentation = new SceneInstrumentation(scene);

    // 计数器在每帧开头重置，onAfterRenderObservable 在 scene.render() 之后触发，
    // 此时 drawCallsCounter.current 是刚结束这一帧的值——是读 draw calls 的正确时机。
    scene.onAfterRenderObservable.add(() => {
      // 三角形数：各 mesh 索引数之和 / 3；AxesViewer 注入的 LinesMesh 不是三角形，需过滤。
      let triangles = 0;
      for (const m of scene.meshes) {
        if (!(m instanceof LinesMesh)) {
          triangles += m.getTotalIndices() / 3;
        }
      }

      emit({
        axesLabel: axesViewer
          ? `显示（scale ${current.axesScale}）`
          : '隐藏',
        drawCalls: instrumentation.drawCallsCounter.current,
        triangles,
        fps: Math.round(engine.getFps()),
        meshCount: scene.meshes.length,
      });
    });

    return scene;
  });

  // 在原点周围环形排列 count 个对象（box 与 sphere 交替），便于观察 draw calls 随数量变化。
  function rebuildObjects(scene: Scene, count: number) {
    for (const t of tracked) {
      t.mesh.dispose();
      t.material.dispose();
    }
    tracked = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / Math.max(1, count)) * Math.PI * 2;
      const radius = 4;
      const shape =
        i % 2 === 0
          ? MeshBuilder.CreateBox(`obj${i}`, { size: 0.8 }, scene)
          : MeshBuilder.CreateSphere(`obj${i}`, { diameter: 0.9 }, scene);
      shape.position.set(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius,
      );

      const material = new StandardMaterial(`mat${i}`, scene);
      material.diffuseColor = Color3.FromHSV((i * 55) % 360, 0.45, 0.9);
      shape.material = material;

      tracked.push({ mesh: shape, material });
    }

    applyOverlayMode(current.overlayMode);
  }

  // 切换调试覆盖层：包围盒（AABB，mesh.showBoundingBox）或线框（material.wireframe）。
  function applyOverlayMode(mode: DebugOptions['overlayMode']) {
    for (const t of tracked) {
      t.mesh.showBoundingBox = mode === 'boundingBox';
      t.material.wireframe = mode === 'wireframe';
    }
  }

  return {
    update(options) {
      const prev = current;
      current = options;
      const scene = runtime.scene;

      // 对象数量变化时重建整组；否则只切覆盖层。
      if (options.objectCount !== prev.objectCount) {
        rebuildObjects(scene, options.objectCount);
      } else if (options.overlayMode !== prev.overlayMode) {
        applyOverlayMode(options.overlayMode);
      }

      // AxesViewer 开关或线长变化时 dispose + 重新创建，避免旧实例残留。
      if (
        options.showAxes !== prev.showAxes ||
        options.axesScale !== prev.axesScale
      ) {
        if (axesViewer) {
          axesViewer.dispose();
          axesViewer = null;
        }
        if (options.showAxes) {
          axesViewer = new AxesViewer(scene, options.axesScale);
        }
      }
    },
    dispose() {
      runtime.dispose();
    },
  };
}
