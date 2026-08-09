/**
 * 范例：用 VertexData 手工搭一个波浪网格，演示自定义几何的完整流程与运行时顶点更新。
 * 输入：
 *   - amplitude：波浪幅度（缩放 y 位移）。拖动时每帧通过 updateVerticesData 重传 positions，不重建几何。
 *   - subdivisions：每条边的分段数。改变会整体重建 VertexData 并 applyToMesh（顶点数变化）。
 *   - computeNormals：是否用 VertexData.ComputeNormals 生成法线。关闭后顶点数据不含 normals，
 *     受光 StandardMaterial 明显变暗、平面化——验证法线缺失这一常见坑。
 * 主要操作：
 *   - buildWaveGrid 生成 positions / indices / uvs；applyToMesh(mesh, true) 以 updatable 写入。
 *   - onBeforeRenderObservable 用时间推进波浪，updateVerticesData 重传 positions；computeNormals 开时
 *     同步重算并重传 normals，让光照跟随起伏。
 * 预期结果：网格起伏随时间流动；切换「计算法线」在明暗之间明显切换；改细分时顶点/三角形读数变化。
 * 阅读主线：buildWaveGrid（拓扑生成）→ applyToMesh（写入 Geometry）→ onBeforeRenderObservable（运行时更新）。
 */
import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  HemisphericLight,
  Mesh,
  Scene,
  StandardMaterial,
  Vector3,
  VertexBuffer,
  VertexData,
} from '@babylonjs/core';
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';

export interface CustomGeometryOptions {
  amplitude: number;
  subdivisions: number;
  computeNormals: boolean;
}

export interface CustomGeometrySnapshot {
  vertexCount: number;
  triangleCount: number;
  normalsStatus: string;
  fps: number;
}

export interface CustomGeometryInstance {
  update(options: CustomGeometryOptions): void;
  dispose(): void;
}

const GRID_SIZE = 8; // 网格在世界单位的边长（X 与 Z 方向各 8）

/**
 * 生成一份细分网格的 positions / indices / uvs。
 * 每条边分段数为 subdivisions；顶点数为 (sub+1)^2，三角形数为 sub*sub*2。
 */
function buildWaveGrid(subdivisions: number): {
  positions: Float32Array;
  indices: Uint32Array;
  uvs: Float32Array;
} {
  const sub = Math.max(1, Math.floor(subdivisions));
  const lineCount = sub + 1;
  const vertexCount = lineCount * lineCount;

  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);

  // 按行优先铺顶点；y 先填 0，每帧由波浪函数更新。
  for (let j = 0; j < lineCount; j++) {
    for (let i = 0; i < lineCount; i++) {
      const index = j * lineCount + i;
      const x = (i / sub - 0.5) * GRID_SIZE;
      const z = (j / sub - 0.5) * GRID_SIZE;
      positions[index * 3 + 0] = x;
      positions[index * 3 + 1] = 0;
      positions[index * 3 + 2] = z;
      uvs[index * 2 + 0] = i / sub;
      uvs[index * 2 + 1] = j / sub;
    }
  }

  // 每个格子拆成 2 个三角形；索引复用顶点，是 indices 的核心价值。
  const indices = new Uint32Array(sub * sub * 2 * 3);
  let cursor = 0;
  for (let j = 0; j < sub; j++) {
    for (let i = 0; i < sub; i++) {
      const a = j * lineCount + i;
      const b = a + 1;
      const c = a + lineCount;
      const d = c + 1;
      indices[cursor++] = a;
      indices[cursor++] = c;
      indices[cursor++] = b;
      indices[cursor++] = b;
      indices[cursor++] = c;
      indices[cursor++] = d;
    }
  }

  return { positions, indices, uvs };
}

// 波浪函数：用 x、z 与时间生成 y。两个频率叠加避免单一正弦感。
function waveHeight(x: number, z: number, time: number, amplitude: number): number {
  return (
    amplitude *
    (Math.sin(x * 0.9 + time) * 0.6 + Math.cos(z * 0.7 + time * 0.8) * 0.4)
  );
}

export function createCustomGeometryExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CustomGeometrySnapshot) => void,
): CustomGeometryInstance {
  let current: CustomGeometryOptions = {
    amplitude: 0.8,
    subdivisions: 12,
    computeNormals: true,
  };

  // 闭包持有当前几何的 typed array 引用：rebuild 重建，每帧 observable 直接改写后重传。
  let positions: Float32Array = new Float32Array();
  let normals: Float32Array = new Float32Array();
  let indices: Uint32Array = new Uint32Array();
  let vertexCount = 0;
  let needsRebuild = true;

  const runtime = createBabylonRuntime(canvas, (engine) => {
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.93, 0.95, 0.94, 1);

    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2.3,
      Math.PI / 2.7,
      14,
      new Vector3(0, 0.5, 0),
      scene,
    );
    camera.minZ = 0.1;
    camera.attachControl(canvas, true);

    // 方向光：漫反射 = 法线 · 光向，法线一旦缺失或错误，明暗立即异常，最适合演示法线作用。
    const sun = new DirectionalLight('sun', new Vector3(-0.6, -1, -0.4), scene);
    sun.intensity = 1.05;
    // 补一档环境光，避免背光面完全死黑、看不出网格形状。
    const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
    ambient.intensity = 0.25;

    // new Mesh 创建无几何的空壳；形状由下面的 VertexData.applyToMesh 注入。
    const mesh = new Mesh('wave', scene);
    const material = new StandardMaterial('waveMat', scene);
    material.diffuseColor = new Color3(0.24, 0.5, 0.78);
    mesh.material = material;

    // 重建几何：把当前 subdivisions/computeNormals 写成一份新的 VertexData 并 applyToMesh。
    function rebuild() {
      const { positions: pos, indices: idx, uvs } = buildWaveGrid(current.subdivisions);
      positions = pos;
      indices = idx;
      vertexCount = pos.length / 3;

      const vertexData = new VertexData();
      vertexData.positions = pos;
      vertexData.indices = idx;
      vertexData.uvs = uvs;
      if (current.computeNormals) {
        normals = new Float32Array(pos.length);
        // ComputeNormals 按 indices 的三角形拼接关系，把法线原地填进 normals。
        VertexData.ComputeNormals(pos, idx, normals);
        vertexData.normals = normals;
      } else {
        normals = new Float32Array(0);
      }
      // updatable=true：后续可 updateVerticesData 重传，无需重建几何。
      vertexData.applyToMesh(mesh, true);
    }

    scene.onBeforeRenderObservable.add(() => {
      if (needsRebuild) {
        rebuild();
        needsRebuild = false;
      }

      // 运行时变形：直接改 positions 并 updateVerticesData 重传，体现 updatable buffer。
      const time = performance.now() / 1000;
      for (let v = 0; v < vertexCount; v++) {
        const x = positions[v * 3 + 0];
        const z = positions[v * 3 + 2];
        positions[v * 3 + 1] = waveHeight(x, z, time, current.amplitude);
      }
      // updateExtends=false：不重算包围盒（网格尺寸基本不变，省一次开销）。
      mesh.updateVerticesData(VertexBuffer.PositionKind, positions, false, false);

      // 法线随表面变形重算，光照才能跟踪起伏；跳过这一步是常见的"光照不跟形状变"坑。
      if (current.computeNormals && normals.length > 0) {
        VertexData.ComputeNormals(positions, indices, normals);
        mesh.updateVerticesData(VertexBuffer.NormalKind, normals, false, false);
      }

      emit({
        vertexCount,
        triangleCount: indices.length / 3,
        normalsStatus: current.computeNormals ? '已计算' : '未计算',
        fps: Math.round(1000 / Math.max(engine.getDeltaTime(), 1)),
      });
    });

    return scene;
  });

  return {
    update(options) {
      const prevSub = current.subdivisions;
      const prevNormals = current.computeNormals;
      current = options;
      // 顶点数（细分）或法线开关变化需要重建几何；幅度只影响每帧 positions，不必重建。
      if (options.subdivisions !== prevSub || options.computeNormals !== prevNormals) {
        needsRebuild = true;
      }
    },
    dispose() {
      runtime.dispose();
    },
  };
}
