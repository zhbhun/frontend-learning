/**
 * 范例介绍：演示 Babylon.js 两种实例化方式如何用同一份几何 + 材质渲染大量重复物体，
 * 并与等量普通 Mesh 对照 draw call、场景网格数与 FPS。
 * 输入：
 *   - mode：instanced（mesh.createInstance，独立对象）/ thin（thinInstanceSetBuffer，矩阵缓冲）/ individual（独立 Mesh，仅作对照）
 *   - count：实例数（100→5000）
 * 主要操作：
 *   - rebuild() 按模式重建实例集合，切换时先清理上一组（dispose 实例、清空 thin buffer、dispose 独立 Mesh）。
 *   - instanced 模式 source.isVisible=false，实例独立渲染；thin 模式 source.isVisible=true，
 *     thin 实例机制接管后源几何不绘制；individual 模式 source.isVisible=false，单独建 N 个 Mesh。
 * 预期结果：instanced 与 thin 的 draw calls 接近 1；individual 的 draw calls 与数量 1:1 攀升。
 * 阅读主线：buildLayout（布局）→ rebuild（三种分支）→ onBeforeRenderObservable（帧边界重建）+ onAfterRenderObservable（派生读数）。
 */
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';
import {
  ArcRotateCamera,
  Color3,
  Color4,
  HemisphericLight,
  Matrix,
  Mesh,
  MeshBuilder,
  Scene,
  SceneInstrumentation,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';

export type InstanceMode = 'instanced' | 'thin' | 'individual';

export interface InstancesOptions {
  mode: InstanceMode;
  count: number;
}

export interface InstancesSnapshot {
  modeLabel: string;
  count: number;
  drawCalls: number;
  sceneMeshes: number;
  fps: number;
}

export interface InstancesInstance {
  update(options: InstancesOptions): void;
  dispose(): void;
}

const PILLAR_HEIGHT = 2;
const PILLAR_DIAMETER = 0.5;
const SPACING = 1.1;

// 把 count 个柱子排成居中方阵，每个矩阵把柱子立在地面上（base 贴 y=0）。
// 用方阵而非随机分布：切换模式时实例位置逐一对齐，画面不会整体跳变。
function buildLayout(count: number): Matrix[] {
  const side = Math.max(1, Math.ceil(Math.sqrt(count)));
  const offset = (side - 1) / 2;
  const matrices: Matrix[] = [];
  for (let i = 0; i < count; i++) {
    const gx = i % side;
    const gz = Math.floor(i / side);
    matrices.push(
      Matrix.Translation(
        (gx - offset) * SPACING,
        PILLAR_HEIGHT / 2,
        (gz - offset) * SPACING,
      ),
    );
  }
  return matrices;
}

export function createInstancesExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: InstancesSnapshot) => void,
): InstancesInstance {
  // current 由 update() 写入；applied 记录上一次真正 rebuild 时的 options。
  // rebuild 在 onBeforeRenderObservable 里、检测到差异时执行，保证场景变更发生在帧边界。
  let current: InstancesOptions = { mode: 'instanced', count: 400 };
  let applied: InstancesOptions | null = null;

  // individual 模式创建的独立 Mesh，切换模式时统一 dispose。
  let individualMeshes: Mesh[] = [];

  const runtime = createBabylonRuntime(canvas, (engine) => {
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.93, 0.95, 0.94, 1);

    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2.2,
      Math.PI / 2.6,
      24,
      new Vector3(0, 0.6, 0),
      scene,
    );
    camera.minZ = 0.1;
    camera.attachControl(canvas, true);

    new HemisphericLight('hemi', new Vector3(0.4, 1, 0.3), scene);

    // 共享几何与材质：三种模式用同一份资源，对照才公平。
    const source = MeshBuilder.CreateCylinder(
      'pillar',
      { height: PILLAR_HEIGHT, diameter: PILLAR_DIAMETER },
      scene,
    );
    const material = new StandardMaterial('pillarMat', scene);
    material.diffuseColor = new Color3(0.24, 0.45, 0.85);
    material.backFaceCulling = false;
    source.material = material;

    // draw calls 计数：SceneInstrumentation 的构造函数会订阅 onBeforeAnimationsObservable，
    // 每帧调用 engine._drawCalls.fetchNewFrame() 把计数归零；渲染期间引擎按 draw call 累加。
    // 因此只需 new 出来，drawCallsCounter.current 就是每帧的 draw call 总数。
    const instrumentation = new SceneInstrumentation(scene);

    function rebuild(options: InstancesOptions) {
      // 1. 清理上一轮 InstancedMesh 实例：每个都是 scene.meshes 里的独立对象，逐个 dispose。
      for (const inst of source.instances.slice()) {
        inst.dispose();
      }
      // 2. 清理 individual 模式创建的独立 Mesh。
      for (const m of individualMeshes) {
        m.dispose();
      }
      individualMeshes = [];
      // 3. 清理 thin instances：把显示数量归零，下一次再 setBuffer 会覆盖旧缓冲。
      source.thinInstanceCount = 0;

      const layout = buildLayout(options.count);

      if (options.mode === 'instanced') {
        // createInstance 返回独立 JS 对象（InstancedMesh），可单独 position/拾取/dispose。
        // 源网格 isVisible=false，只让实例出现；实例默认 isVisible=true。
        source.isVisible = false;
        for (let i = 0; i < options.count; i++) {
          const inst = source.createInstance(`i${i}`);
          inst.position.copyFrom(layout[i].getTranslation());
        }
      } else if (options.mode === 'thin') {
        // thinInstanceSetBuffer 直接灌矩阵缓冲，无 JS 对象开销；thinInstanceCount 由 data.length/16 推出。
        // 源网格必须可见（render pass 才会跑），但 thin 机制接管后源的自身几何不绘制。
        source.isVisible = true;
        const buffer = new Float32Array(options.count * 16);
        for (let i = 0; i < options.count; i++) {
          layout[i].copyToArray(buffer, i * 16);
        }
        source.thinInstanceSetBuffer('matrix', buffer, 16);
      } else {
        // 普通 Mesh：每个对象独立参与场景，各占一次 draw call。几何/材质仍共享同一份。
        source.isVisible = false;
        for (let i = 0; i < options.count; i++) {
          const m = MeshBuilder.CreateCylinder(
            `p${i}`,
            { height: PILLAR_HEIGHT, diameter: PILLAR_DIAMETER },
            scene,
          );
          m.material = material;
          m.position.copyFrom(layout[i].getTranslation());
          individualMeshes.push(m);
        }
      }

      // 按方阵边长调整相机距离，整片柱子都在视野里；用户仍可滚轮缩放。
      const side = Math.max(1, Math.ceil(Math.sqrt(options.count)));
      camera.radius = side * SPACING * 1.4 + 4;
    }

    rebuild(current);
    applied = { ...current };

    // 帧边界重建：options 变化时在渲染前 rebuild，避免在渲染中途修改场景。
    scene.onBeforeRenderObservable.add(() => {
      if (
        !applied ||
        applied.mode !== current.mode ||
        applied.count !== current.count
      ) {
        rebuild(current);
        applied = { ...current };
      }
    });

    // 读数在 onAfterRender 里发：drawCallsCounter.current 在帧开始被 fetchNewFrame 归零、
    // 渲染期间累加，只有渲染结束后读到的才是本帧真实 draw call 数。
    scene.onAfterRenderObservable.add(() => {
      emit({
        modeLabel:
          current.mode === 'instanced'
            ? 'InstancedMesh（每实例独立对象）'
            : current.mode === 'thin'
              ? 'thin instances（矩阵缓冲，无独立对象）'
              : '普通 Mesh（每对象独立）',
        count: current.count,
        // drawCallsCounter 返回 engine._drawCalls，渲染结束后 _current 即本帧 draw call 总数。
        drawCalls: instrumentation.drawCallsCounter.current,
        // scene.meshes 含源网格 + InstancedMesh 实例 / 独立 Mesh；thin 实例只是缓冲，不进 scene.meshes。
        sceneMeshes: scene.meshes.length,
        fps: Math.round(engine.getFps()),
      });
    });

    return scene;
  });

  return {
    update(options) {
      current = options;
    },
    dispose() {
      runtime.dispose();
    },
  };
}
