/**
 * 范例：用 MorphTargetManager 做程序化形变（膨胀 / 压扁 / 扭曲），演示 blend shape 的混合方式。
 * 输入：
 *   - influenceInflate / influenceFlatten / influenceTwist：三个 MorphTarget 的 influence（0-1）。
 *     由 Controls 写入；update() 直接把值赋给对应 target.influence，不重建几何。
 * 主要操作：
 *   - 基础球（MeshBuilder.CreateSphere）+ 3 个程序化 MorphTarget。
 *   - 每个 target 的 positions 由基础球 positions 做程序化偏移生成；normals 用
 *     VertexData.ComputeNormals 按 indices 重算，让光照跟随形变。
 *   - new MorphTargetManager() → addTarget × 3 → sphere.morphTargetManager = manager 挂载。
 *     挂载后顶点混合在 GPU 顶点着色器里完成，CPU 端 positions 缓冲恒定。
 * 预期结果：拖动 influence 在原始球与目标形状之间平滑混合；多个 influence 按公式相加叠加；
 *   读数「顶点数」不随 influence 变化（证明变形在 GPU，不是 updateVerticesData）。
 * 阅读主线：makeTarget（程序化目标生成）→ manager + addTarget + morphTargetManager（挂载）→ update（运行时改 influence）。
 */
import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  HemisphericLight,
  MeshBuilder,
  MorphTarget,
  MorphTargetManager,
  Scene,
  StandardMaterial,
  Vector3,
  VertexBuffer,
  VertexData,
} from '@babylonjs/core';
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';

export interface MorphTargetsOptions {
  influenceInflate: number;
  influenceFlatten: number;
  influenceTwist: number;
}

export interface MorphTargetsSnapshot {
  influenceInflate: number;
  influenceFlatten: number;
  influenceTwist: number;
  activeTargets: number;
  vertexCount: number;
  fps: number;
}

export interface MorphTargetsInstance {
  update(options: MorphTargetsOptions): void;
  dispose(): void;
}

const SEGMENTS = 24; // 球的细分，决定顶点数（所有 target 必须与基础网格顶点数一致）

export function createMorphTargetsExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: MorphTargetsSnapshot) => void,
): MorphTargetsInstance {
  const current: MorphTargetsOptions = {
    influenceInflate: 0,
    influenceFlatten: 0,
    influenceTwist: 0.3,
  };

  // target / manager 引用提升到外层，update() 直接改 target.influence，不必每帧重写。
  let inflateTarget: MorphTarget | null = null;
  let flattenTarget: MorphTarget | null = null;
  let twistTarget: MorphTarget | null = null;
  let manager: MorphTargetManager | null = null;
  let vertexCount = 0;

  const runtime = createBabylonRuntime(canvas, (engine) => {
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.93, 0.95, 0.94, 1);

    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2.3,
      Math.PI / 2.7,
      7,
      Vector3.Zero(),
      scene,
    );
    camera.minZ = 0.1;
    camera.attachControl(canvas, true);

    // 方向光：漫反射 = 法线 · 光向；target 缺 normals 时形变会让明暗脱节，最适合演示法线作用。
    const sun = new DirectionalLight('sun', new Vector3(-0.6, -1, -0.4), scene);
    sun.intensity = 1.0;
    const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
    ambient.intensity = 0.3;

    // 基础网格：所有 MorphTarget 必须与它顶点数一致。
    const sphere = MeshBuilder.CreateSphere(
      'sphere',
      { diameter: 2, segments: SEGMENTS },
      scene,
    );
    const material = new StandardMaterial('sphereMat', scene);
    material.diffuseColor = new Color3(0.24, 0.5, 0.78);
    sphere.material = material;

    const basePositions = sphere.getVerticesData(VertexBuffer.PositionKind)!;
    const indices = sphere.getIndices()!;
    vertexCount = basePositions.length / 3;

    /**
     * 生成一个 MorphTarget：对基础 positions 做程序化偏移，再 ComputeNormals 重算法线，
     * 让光照跟随形变。positions / normals 长度必须与基础网格一致。
     */
    function makeTarget(
      name: string,
      influence: number,
      deform: (x: number, y: number, z: number) => [number, number, number],
    ): MorphTarget {
      const positions = new Float32Array(basePositions.length);
      for (let i = 0; i < vertexCount; i++) {
        const x = basePositions[i * 3];
        const y = basePositions[i * 3 + 1];
        const z = basePositions[i * 3 + 2];
        const [nx, ny, nz] = deform(x, y, z);
        positions[i * 3] = nx;
        positions[i * 3 + 1] = ny;
        positions[i * 3 + 2] = nz;
      }
      // 按 indices 的三角形拼接反推每顶点法线；不补法线则形变后明暗会脱节。
      const normals = new Float32Array(basePositions.length);
      VertexData.ComputeNormals(positions, indices, normals);

      const target = new MorphTarget(name, influence, scene);
      target.setPositions(positions);
      target.setNormals(normals);
      return target;
    }

    // 膨胀：每顶点沿径向外推 50%。
    inflateTarget = makeTarget('膨胀', current.influenceInflate, (x, y, z) => [
      x * 1.5,
      y * 1.5,
      z * 1.5,
    ]);
    // 压扁：Y 轴缩到 0.4、X/Z 放大 15% 补偿体积，呈扁平状。
    flattenTarget = makeTarget('压扁', current.influenceFlatten, (x, y, z) => [
      x * 1.15,
      y * 0.4,
      z * 1.15,
    ]);
    // 扭曲：绕 Y 轴按高度旋转，顶部扭得多、赤道（y=0）不动。
    twistTarget = makeTarget('扭曲', current.influenceTwist, (x, y, z) => {
      const angle = y * 2.2; // y ∈ [-1,1]，最大约 ±2.2 弧度
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return [x * cos - z * sin, y, x * sin + z * cos];
    });

    // 管理器：收集 target，挂到 mesh；挂载后顶点混合在 GPU 完成，CPU positions 不变。
    manager = new MorphTargetManager(scene);
    manager.addTarget(inflateTarget);
    manager.addTarget(flattenTarget);
    manager.addTarget(twistTarget);
    sphere.morphTargetManager = manager;

    // 让球缓慢自转，便于从各角度观察形变；morph 在局部空间生效，与变换自然组合。
    scene.onBeforeRenderObservable.add(() => {
      const dt = engine.getDeltaTime() / 1000;
      sphere.rotation.y += dt * 0.3;

      emit({
        influenceInflate: inflateTarget!.influence,
        influenceFlatten: flattenTarget!.influence,
        influenceTwist: twistTarget!.influence,
        // numInfluencers：当前 influence>0 的 target 数（optimizeInfluencers=true 时跳过 0 权重）。
        activeTargets: manager!.numInfluencers,
        vertexCount,
        fps: Math.round(1000 / Math.max(engine.getDeltaTime(), 1)),
      });
    });

    return scene;
  });

  return {
    update(options) {
      current.influenceInflate = options.influenceInflate;
      current.influenceFlatten = options.influenceFlatten;
      current.influenceTwist = options.influenceTwist;
      // 直接改 influence：GPU 顶点着色器下一帧就按新权重混合，无需重建几何或重传顶点。
      if (inflateTarget) inflateTarget.influence = options.influenceInflate;
      if (flattenTarget) flattenTarget.influence = options.influenceFlatten;
      if (twistTarget) twistTarget.influence = options.influenceTwist;
    },
    dispose() {
      runtime.dispose();
    },
  };
}
