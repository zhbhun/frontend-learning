/**
 * 范例：Babylon.js 骨骼层级如何驱动蒙皮（skinning）。
 *
 * 离线约束：真实蒙皮角色模型需要加载 glTF 才能得到写好权重的网格。本 Storybook 工作区
 *   只装了 @babylonjs/core，没有 @babylonjs/loaders，所以这里用 MeshBuilder 程序化构造一条
 *   最小骨骼链 + 一个圆柱，手工写 matricesIndices / matricesWeights（glTF 加载时由解析器
 *   自动写好的那两份顶点数据）。Skeleton / Bone / mesh.skeleton / SkeletonViewer 都是
 *   @babylonjs/core 的真实 API，与真实加载结果里的蒙皮流程完全一致；真实 glTF 加载用法见
 *   README.mdx 的代码片段和 6.1 课。
 *
 * 输入：
 *   - bendDeg：tip 骨骼绕局部 Z 轴的旋转角（度），manual 模式下直接写入 bone。
 *   - weightMode：rigid（y>=0 全归 tip，y<0 全归 root，接缝处会折角）/ smooth（在 |y|<0.6
 *     的过渡带线性混合，弯曲成连续圆弧）。
 *   - showViewer：是否叠加 SkeletonViewer，画出骨骼连线。
 *
 * 主要操作：
 *   1) buildSkeleton 建一条两根骨骼的链：root 在圆柱底部（y=-2），tip 是 root 的子级，
 *      局部平移 (0,2,0)，绝对位置落在圆柱中点 y=0——这个中点就是"关节"。
 *   2) applySkinWeights 按顶点 y 写 matricesIndices（4 通道整数索引，以 float 存储）+
 *      matricesWeights（4 通道权重）。glTF 加载时由解析器自动写这两份；这里手工演示。
 *   3) mesh.skeleton = skeleton 把骨架挂到网格，引擎在 scene.render() 内部用骨骼变换
 *      驱动顶点着色器做蒙皮。
 *   4) update 里用 tipBone.setYawPitchRoll(0, 0, angle, Space.LOCAL) 写局部旋转——
 *      注意必须走 setter（或 setYawPitchRoll / setRotationQuaternion），
 *      直接 bone.rotation.z = x 是字段改值，不会触发骨骼重算矩阵。
 *
 * 预期结果：
 *   - bendDeg=0：圆柱笔直，骨骼链沿 Y 轴竖直。
 *   - bendDeg 增大：圆柱上半段绕 y=0 关节弯曲；rigid 在接缝处出现尖角，smooth 呈圆弧。
 *   - 切 weightMode：同一角度下弯曲形态从折角变成圆弧（或反之）。
 *   - showViewer：骨骼连线随 tip 旋转，证明画面里的弯曲来自 bone 的变换。
 *
 * 阅读主线：先看 buildSkeleton 的骨骼层级与局部矩阵，再看 applySkinWeights 的权重写入，
 *   最后看 setup 如何把骨架挂到 mesh、update 如何把角度写成 bone 旋转。
 */
import {
  ArcRotateCamera,
  HemisphericLight,
  type Mesh,
  MeshBuilder,
  Matrix,
  Scene,
  Skeleton,
  SkeletonViewer,
  Space,
  Color3,
  Color4,
  StandardMaterial,
  Vector3,
  VertexBuffer,
  Bone,
  DirectionalLight,
} from '@babylonjs/core';
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';

export type WeightMode = 'rigid' | 'smooth';

export interface SkeletonDemoOptions {
  bendDeg: number;
  weightMode: WeightMode;
  showViewer: boolean;
}

export interface SkeletonDemoSnapshot {
  boneCount: number;
  jointDeg: string;
  weightMode: string;
  viewerOn: string;
  fps: number;
}

export interface SkeletonDemoInstance {
  update(options: SkeletonDemoOptions): void;
  dispose(): void;
}

// 圆柱尺寸：沿 Y 轴从 -HALF 到 +HALF，骨骼的"关节"落在 y=0（圆柱中点）。
const HEIGHT = 4;
const HALF = HEIGHT / 2;
const RADIUS = 0.5;
// smooth 模式下，|y| < TRANSITION_HALF 的顶点在 root 与 tip 之间线性混合。
const TRANSITION_HALF = 0.6;

// 建一条两根骨骼的链：root（圆柱底部）+ tip（root 的子级，落在圆柱中点 = 关节）。
// 返回 skeleton、root/tip 引用。构造时传入的 localMatrix 既是局部变换，也被当作 bind/rest 姿态。
function buildSkeleton(scene: Scene): {
  skeleton: Skeleton;
  root: Bone;
  tip: Bone;
} {
  const skeleton = new Skeleton('arm', 'arm-skel', scene);

  // root：圆柱底部，世界 y = -HALF。无父级。
  const root = new Bone(
    'root',
    skeleton,
    null,
    Matrix.Translation(0, -HALF, 0),
  );

  // tip：root 的子级。相对 root 平移 (0, HALF, 0)，世界 y = -HALF + HALF = 0 = 关节。
  const tip = new Bone(
    'tip',
    skeleton,
    root,
    Matrix.Translation(0, HALF, 0),
  );

  return { skeleton, root, tip };
}

// 在圆柱顶点数据上写 matricesIndices（每顶点 4 通道整数索引）+ matricesWeights（4 通道权重）。
// glTF 加载时由 GLTFFileLoader 自动写这两份；这里手工演示权重如何决定弯曲形态。
// matricesIndices 的分量值是 skeleton.bones 数组下标（这里 root=0、tip=1），以 float 存储，
// 顶点着色器内部转成 int 取对应骨骼矩阵。
function applySkinWeights(mesh: Mesh, weightMode: WeightMode): void {
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
  if (!positions) {
    return;
  }
  const vertexCount = positions.length / 3;
  const matricesIndices = new Float32Array(vertexCount * 4);
  const matricesWeights = new Float32Array(vertexCount * 4);

  for (let i = 0; i < vertexCount; i++) {
    const y = positions[i * 3 + 1];

    let rootWeight = 0;
    let tipWeight = 0;

    if (weightMode === 'rigid') {
      // 刚硬接缝：y >= 0 完全归 tip，y < 0 完全归 root；接缝处会折成尖角。
      if (y >= 0) {
        tipWeight = 1;
      } else {
        rootWeight = 1;
      }
    } else {
      // 平滑过渡：在 |y| < TRANSITION_HALF 的带内做 root/tip 的线性混合，
      // 旋转 tip 时顶点沿一段圆弧连续切线，避免硬折角。
      if (y <= -TRANSITION_HALF) {
        rootWeight = 1;
      } else if (y >= TRANSITION_HALF) {
        tipWeight = 1;
      } else {
        const t = (y + TRANSITION_HALF) / (2 * TRANSITION_HALF);
        rootWeight = 1 - t;
        tipWeight = t;
      }
    }

    // 前 4 通道：这里只用前两根骨骼（root=0、tip=1），后两通道留 0。
    matricesIndices[i * 4 + 0] = 0; // root
    matricesIndices[i * 4 + 1] = 1; // tip
    matricesIndices[i * 4 + 2] = 0;
    matricesIndices[i * 4 + 3] = 0;

    // 权重与索引一一对应，理想情况下每顶点 4 通道之和为 1。
    matricesWeights[i * 4 + 0] = rootWeight;
    matricesWeights[i * 4 + 1] = tipWeight;
    matricesWeights[i * 4 + 2] = 0;
    matricesWeights[i * 4 + 3] = 0;
  }

  // stride=4：每顶点 4 个分量，对应每顶点最多 4 根骨骼影响。
  mesh.setVerticesData(VertexBuffer.MatricesIndicesKind, matricesIndices, false, 4);
  mesh.setVerticesData(VertexBuffer.MatricesWeightsKind, matricesWeights, false, 4);
}

export function createSkeletonDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SkeletonDemoSnapshot) => void,
): SkeletonDemoInstance {
  let current: SkeletonDemoOptions = {
    bendDeg: 0,
    weightMode: 'smooth',
    showViewer: true,
  };

  let tipBone!: Bone;
  let mesh!: Mesh;
  let viewer: SkeletonViewer | null = null;
  let lastWeightMode: WeightMode = current.weightMode;

  const runtime = createBabylonRuntime(canvas, (engine) => {
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.93, 0.95, 0.94, 1);

    // 轨道相机：从斜上方观察圆柱，让 Z 轴弯曲方向清晰可见。
    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2.2,
      Math.PI / 2.4,
      9,
      new Vector3(0, 0, 0),
      scene,
    );
    camera.minZ = 0.1;
    camera.attachControl(canvas, true);

    // 两盏光：半球光打底、方向光给明暗方向。
    new HemisphericLight('hemi', new Vector3(0.4, 1, 0.3), scene);
    const dir = new DirectionalLight('dir', new Vector3(-0.6, -1, -0.4), scene);
    dir.intensity = 0.7;

    // 圆柱：沿 Y 轴，高度 4，默认中心在原点。
    mesh = MeshBuilder.CreateCylinder(
      'arm',
      { height: HEIGHT, diameter: RADIUS * 2, tessellation: 24 },
      scene,
    );
    const mat = new StandardMaterial('armMat', scene);
    mat.diffuseColor = new Color3(0.24, 0.45, 0.85);
    mat.emissiveColor = new Color3(0.07, 0.13, 0.26);
    mesh.material = mat;

    // 建骨架并挂到 mesh：mesh.skeleton = skeleton 是蒙皮的入口。
    // 挂上后引擎在 scene.render() 内部用骨骼变换驱动该 mesh 的顶点着色器。
    const { skeleton, tip } = buildSkeleton(scene);
    tipBone = tip;
    mesh.skeleton = skeleton;

    // 写皮肤权重（glTF 加载时由解析器自动完成的一步）。
    applySkinWeights(mesh, current.weightMode);
    lastWeightMode = current.weightMode;

    // SkeletonViewer：画出骨骼连线，跟随骨骼变换实时更新。
    viewer = new SkeletonViewer(skeleton, mesh, scene);
    viewer.color = new Color3(1, 0.85, 0.2);
    viewer.isEnabled = current.showViewer;

    // 每帧读出 bendDeg → tipBone 局部 Z 旋转。
    // 必须走 setter：setYawPitchRoll 内部会先分解当前局部矩阵拿到 position / scale，
    // 再写入新的旋转四元数并触发 _markAsDirtyAndCompose。
    // 直接 tipBone.rotation.z = x 只是改返回的 Vector3 字段，不会触发骨骼重算。
    scene.onBeforeRenderObservable.add(() => {
      const rad = (current.bendDeg * Math.PI) / 180;
      tipBone.setYawPitchRoll(0, 0, rad, Space.LOCAL);

      emit({
        boneCount: skeleton.bones.length,
        jointDeg: `${current.bendDeg.toFixed(0)}°`,
        weightMode: current.weightMode === 'smooth' ? '平滑过渡' : '刚硬接缝',
        viewerOn: current.showViewer ? '开' : '关',
        fps: Math.round(1000 / Math.max(engine.getDeltaTime(), 1)),
      });
    });

    return scene;
  });

  return {
    update(options) {
      current = options;

      // 切权重模式需要重写 matricesWeights / matricesIndices（几何形状本身不变）。
      if (options.weightMode !== lastWeightMode && mesh) {
        applySkinWeights(mesh, options.weightMode);
        lastWeightMode = options.weightMode;
      }

      if (viewer) {
        viewer.isEnabled = options.showViewer;
      }
    },
    dispose() {
      viewer?.dispose();
      runtime.dispose();
    },
  };
}
