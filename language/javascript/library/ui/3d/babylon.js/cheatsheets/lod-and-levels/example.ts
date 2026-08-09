/**
 * 范例介绍：演示 Babylon.js LOD（Level of Detail）按相机距离切换同一网格的不同细节层级。
 * 输入：cameraRadius（ArcRotateCamera 的轨道半径；mesh 放在原点，所以 radius 直接等于
 *   "相机到 mesh 包围球中心的世界距离"，与 getLOD 内部算法一致）。
 * 主要操作：
 *   - 用 MeshBuilder.CreateSphere 准备 4 档 segments=32/16/8/4 的线框球，共享同一材质。
 *   - 在源网格（segments=32）上 addLODLevel(7/13/19, midMesh/lowMesh/veryLowMesh)，
 *     再 addLODLevel(25, null) 实现"超出最远阈值不渲染"的剔除。
 *   - ArcRotateCamera 的 radius 由 Controls 直接写入；getLOD(camera) 每帧按距离挑选当前层。
 * 预期结果：readout 同步给出当前相机距离、激活层级（高/中/低/极低/剔除）、当前三角形数、
 *   以及全部层级的阈值与面数摘要。拉近自动升高精度，拉远自动降级或剔除。
 * 阅读主线：buildLodChain（建源网格 + LOD mesh 并 addLODLevel）→ onBeforeRenderObservable（emit 读数）。
 */
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';
import {
  ArcRotateCamera,
  Color3,
  Color4,
  HemisphericLight,
  type Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';

// 4 档几何：源网格用 HIGH（距离最小阈值以内显示），其余 3 档按距离依次降级。
// distance 是"相机到 mesh 包围球中心的世界距离阈值"——超过该值时改用对应 mesh。
const LEVELS = [
  { label: '高', segments: 32, distance: 0 },
  { label: '中', segments: 16, distance: 7 },
  { label: '低', segments: 8, distance: 13 },
  { label: '极低', segments: 4, distance: 19 },
] as const;

// 最远一层传 null：超过此距离后源网格整体不渲染（远处剔除）。
const NULL_THRESHOLD = 25;

const SPHERE_DIAMETER = 3;

export interface LodOptions {
  cameraRadius: number;
}

export interface LodSnapshot {
  cameraDistance: string;
  activeLabel: string;
  activeGeo: string;
  activeTriangles: string;
  allLevels: string;
}

export interface LodInstance {
  update(options: LodOptions): void;
  dispose(): void;
}

// 三角形数 = 索引数 / 3。Babylon 的 MeshBuilder.CreateSphere 生成索引几何，可直接读 getTotalIndices。
function triangleCount(mesh: Mesh): number {
  const indices = mesh.getTotalIndices();
  return indices > 0 ? Math.floor(indices / 3) : 0;
}

export function createLodExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: LodSnapshot) => void,
): LodInstance {
  let current: LodOptions = { cameraRadius: 4 };

  const runtime = createBabylonRuntime(canvas, (engine) => {
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.93, 0.95, 0.94, 1);

    // ArcRotateCamera 绕原点轨道：target=Vector3.Zero()，radius 即"相机到原点的距离"。
    // 源网格放在原点且包围球中心在局部原点，所以 camera.radius === 包围球中心到相机的世界距离。
    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2.2,
      Math.PI / 2.6,
      current.cameraRadius,
      Vector3.Zero(),
      scene,
    );
    camera.minZ = 0.1;
    camera.lowerRadiusLimit = 3;
    camera.upperRadiusLimit = 32;
    camera.attachControl(canvas, true);
    // 移除滚轮输入：让 Controls 的「相机距离」滑块成为距离的唯一来源，
    // 避免滚轮缩放后被下一帧 sync 拉回滑块值造成抖动。
    camera.inputs.removeByType('ArcRotateCameraMouseWheelInput');

    new HemisphericLight('light', new Vector3(0.4, 1, 0.3), scene);

    // 共享材质 + 线框：4 档几何外观一致，线框让 segments 差异在视觉上明显。
    const material = new StandardMaterial('lodMat', scene);
    material.diffuseColor = new Color3(0.24, 0.45, 0.85);
    material.emissiveColor = new Color3(0.08, 0.16, 0.28);
    // 关掉背面剔除：低 segments 网格在某些角度面会朝向背面，关掉避免"看不见"造成误判。
    material.backFaceCulling = false;
    material.wireframe = true;

    // 源网格：在其上调用 addLODLevel；对应"距离小于最小阈值"时显示的网格。
    const source = MeshBuilder.CreateSphere(
      'lodSource',
      { diameter: SPHERE_DIAMETER, segments: LEVELS[0].segments },
      scene,
    );
    source.material = material;

    // 3 档低细节 LOD mesh：每档 segments 减半，三角面数大约按平方下降。
    const lodMeshes: Mesh[] = [];
    for (let i = 1; i < LEVELS.length; i++) {
      const lv = LEVELS[i];
      const m = MeshBuilder.CreateSphere(
        `lod-${lv.label}`,
        { diameter: SPHERE_DIAMETER, segments: lv.segments },
        scene,
      );
      m.material = material;
      lodMeshes.push(m);
    }

    // 注册 LOD：在源网格上 addLODLevel(distance, mesh)。
    // 内部按 distance 降序排序；getLOD(camera) 找到第一个 distance < 当前相机距离的层。
    // 注意 LOD mesh 一旦被登记，_masterMesh 会被设为源网格，渲染器只通过源网格的 getLOD 渲染它，
    // 不会独立提交这些 mesh——它们也不会在画面里"多出来"。
    lodMeshes.forEach((m, i) => {
      source.addLODLevel(LEVELS[i + 1].distance, m);
    });
    // 最远一层传 null：distance >= NULL_THRESHOLD 时 getLOD 返回 null，源网格不进入渲染队列。
    source.addLODLevel(NULL_THRESHOLD, null);

    // 把每个阈值画成地面圆环，让"何时切换"在画面里可见。
    // 环的半径 = 阈值距离；相机半径接近某个环时，下一刻就会触发对应层切换。
    const ringMat = new StandardMaterial('ringMat', scene);
    ringMat.diffuseColor = new Color3(0.62, 0.34, 0.24);
    ringMat.emissiveColor = new Color3(0.32, 0.16, 0.1);
    ringMat.backFaceCulling = false;

    const nullRingMat = new StandardMaterial('nullRingMat', scene);
    nullRingMat.diffuseColor = new Color3(0.42, 0.42, 0.42);
    nullRingMat.emissiveColor = new Color3(0.22, 0.22, 0.22);
    nullRingMat.backFaceCulling = false;

    LEVELS.slice(1).forEach((lv) => {
      const ring = MeshBuilder.CreateTorus(
        `ring-${lv.distance}`,
        { diameter: lv.distance * 2, thickness: 0.05, tessellation: 96 },
        scene,
      );
      ring.position.y = -SPHERE_DIAMETER / 2;
      ring.material = ringMat;
    });
    const nullRing = MeshBuilder.CreateTorus(
      `ring-null`,
      { diameter: NULL_THRESHOLD * 2, thickness: 0.05, tessellation: 128 },
      scene,
    );
    nullRing.position.y = -SPHERE_DIAMETER / 2;
    nullRing.material = nullRingMat;

    // 一次性算出全部层级的阈值 + 三角形数摘要，readout 每帧直接读。
    const summaryParts = [
      `${LEVELS[0].label}(d<${LEVELS[1].distance},Δ${triangleCount(source)})`,
      ...LEVELS.slice(1).map((lv, i) => `${lv.label}(d=${lv.distance},Δ${triangleCount(lodMeshes[i])})`),
      `剔除(d>=${NULL_THRESHOLD})`,
    ];
    const allLevels = summaryParts.join(' / ');

    // 每帧：把 camera.radius 同步成 Controls 的值；用 source.getLOD(camera) 读出当前层并 emit。
    scene.onBeforeRenderObservable.add(() => {
      camera.radius = current.cameraRadius;

      // getLOD(camera) 是渲染器内部用来挑当前层的同一方法：
      //   - 返回 source：相机距离 < 最小阈值（用源网格本身）
      //   - 返回某档 LOD mesh：第一个 distance < 相机距离的层
      //   - 返回 null：匹配到 null 层（远处剔除，源网格不渲染）
      const active = source.getLOD(camera);
      let activeLabel: string;
      let activeGeo: string;
      let activeTriangles: string;

      if (active === source) {
        activeLabel = `${LEVELS[0].label}（源网格）`;
        activeGeo = `segments=${LEVELS[0].segments}`;
        activeTriangles = triangleCount(source).toString();
      } else if (active === null) {
        activeLabel = '剔除（null）';
        activeGeo = '不渲染';
        activeTriangles = '0';
      } else {
        const idx = lodMeshes.indexOf(active as Mesh);
        if (idx >= 0) {
          const lv = LEVELS[idx + 1];
          activeLabel = lv.label;
          activeGeo = `segments=${lv.segments}`;
          activeTriangles = triangleCount(lodMeshes[idx]).toString();
        } else {
          activeLabel = '?';
          activeGeo = '?';
          activeTriangles = '?';
        }
      }

      // 距离读数：直接用 camera.radius。源网格在原点、包围球中心 = 原点，所以
      // bSphere.centerWorld.subtract(camera.globalPosition).length() === camera.radius。
      emit({
        cameraDistance: camera.radius.toFixed(2),
        activeLabel,
        activeGeo,
        activeTriangles,
        allLevels,
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
