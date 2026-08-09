/**
 * 范例：用 MeshBuilder 切换内置形状，对比顶点数与面数。
 * 输入：shape（box/sphere/cylinder/torus/plane/ground）、detail（细分参数）。
 * 主要操作：dirty 时 dispose 旧 mesh，按当前形状与 detail 重建，复用同一份 StandardMaterial。
 *   detail 映射到 sphere.segments、cylinder/torus.tessellation、ground.subdivisions；
 *   box 与 plane 没有细分，调整 detail 时顶点/面数保持不变——这也是可观察证据。
 * 预期结果：readout 同步显示当前形状名（CreateXxx）、顶点数（getTotalVertices）、面数（getTotalIndices / 3）。
 * 阅读主线：createBabylonRuntime 的 setup → SHAPE_BUILDERS 的工厂表 → onBeforeRenderObservable 的 dirty 重建。
 */
import {
  ArcRotateCamera,
  Color3,
  Color4,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';

export type ShapeKind = 'box' | 'sphere' | 'cylinder' | 'torus' | 'plane' | 'ground';

export interface MeshBuilderArgs {
  shape: ShapeKind;
  detail: number;
}

export interface MeshBuilderSnapshot {
  shape: string;
  vertices: number;
  faces: number;
}

export interface MeshBuilderInstance {
  update(args: MeshBuilderArgs): void;
  dispose(): void;
}

// readout 用工厂方法名，让“当前形状”与“哪个 CreateXxx”直观对应。
const SHAPE_LABEL: Record<ShapeKind, string> = {
  box: 'CreateBox',
  sphere: 'CreateSphere',
  cylinder: 'CreateCylinder',
  torus: 'CreateTorus',
  plane: 'CreatePlane',
  ground: 'CreateGround',
};

// 统一基础尺寸，切换形状时画面尺度接近，方便把注意力放在顶点/面数对比上。
const BASE = 3;

// Record<ShapeKind, ...> 强制每个形状都有构建器：少一个成员 TS 就会报错。
const SHAPE_BUILDERS: Record<ShapeKind, (detail: number, scene: Scene) => Mesh> = {
  // CreateBox 没有 segments 参数，detail 对它无效——调整 detail 时顶点/面数恒定。
  box: (_detail, scene) => MeshBuilder.CreateBox('shape', { size: BASE }, scene),
  sphere: (detail, scene) =>
    MeshBuilder.CreateSphere('shape', { diameter: BASE, segments: detail }, scene),
  cylinder: (detail, scene) =>
    MeshBuilder.CreateCylinder('shape', { height: BASE, diameter: BASE, tessellation: detail }, scene),
  torus: (detail, scene) =>
    MeshBuilder.CreateTorus('shape', { diameter: BASE, thickness: BASE * 0.25, tessellation: detail }, scene),
  // CreatePlane 是单面四边形，本身没有细分；detail 对它无效。
  plane: (_detail, scene) => MeshBuilder.CreatePlane('shape', { size: BASE }, scene),
  // CreateGround 水平铺面，subdivisions 控制网格密度。
  ground: (detail, scene) =>
    MeshBuilder.CreateGround('shape', { width: BASE + 1, height: BASE + 1, subdivisions: detail }, scene),
};

function buildShape(shape: ShapeKind, detail: number, scene: Scene): Mesh {
  // segments / tessellation / subdivisions 至少 3，避免退化几何。
  return SHAPE_BUILDERS[shape](Math.max(3, Math.round(detail)), scene);
}

export function createMeshBuilderExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: MeshBuilderSnapshot) => void,
): MeshBuilderInstance {
  let current: MeshBuilderArgs = { shape: 'box', detail: 16 };
  // dirty 标志避免每帧重建：update 只置标志，onBeforeRenderObservable 里才真正 rebuild。
  let dirty = true;

  const runtime = createBabylonRuntime(canvas, (engine) => {
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.93, 0.95, 0.94, 1);

    const camera = new ArcRotateCamera(
      'cam',
      -Math.PI / 2.2,
      Math.PI / 2.4,
      BASE + 5,
      Vector3.Zero(),
      scene,
    );
    camera.minZ = 0.1;
    camera.attachControl(canvas, true);

    new HemisphericLight('light', new Vector3(0.4, 1, 0.3), scene);

    // 共享一份材质：切换形状时旧 mesh 被 dispose，但 material 不释放（默认
    // disposeMaterialAndTextures=false），新 mesh 继续使用它——直接演示 geometry 与
    // material 的独立性。详见正文“几何与材质的组合”。
    const sharedMat = new StandardMaterial('sharedMat', scene);
    sharedMat.diffuseColor = new Color3(0.24, 0.45, 0.85);
    sharedMat.backFaceCulling = false;

    let mesh: Mesh | null = null;

    function rebuild() {
      // dispose 旧 mesh 释放其 geometry；共享 material 不受影响。
      mesh?.dispose();
      mesh = buildShape(current.shape, current.detail, scene);
      mesh.material = sharedMat;
    }

    function emitStats() {
      if (!mesh) return;
      // 面数按索引数 / 3 估算：MeshBuilder 生成的形状都有索引缓冲。
      const indices = mesh.getTotalIndices();
      emit({
        shape: SHAPE_LABEL[current.shape],
        vertices: mesh.getTotalVertices(),
        faces: Math.floor(indices / 3),
      });
    }

    scene.onBeforeRenderObservable.add(() => {
      const dt = engine.getDeltaTime() / 1000;
      if (dirty) {
        rebuild();
        dirty = false;
        emitStats();
      }
      // 缓慢自转，方便从各角度观察形状体积；不影响 readout。
      if (mesh) {
        mesh.rotation.y += dt * 0.25;
      }
    });

    return scene;
  });

  return {
    update(args) {
      current = args;
      dirty = true;
    },
    dispose() {
      runtime.dispose();
    },
  };
}
