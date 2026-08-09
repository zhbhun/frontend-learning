/**
 * 范例：Babylon.js 的三种路径渲染器——CreateLines、CreateDashedLines、CreateTube。
 * 输入：
 *   - Lines：pointCount（螺旋采样点数，决定曲线密度）。
 *   - Dashed：dashSize、gap（虚线段长与间隙，相对 dashNb 的比例值）。
 *   - Tube：radius、tessellation（管道半径与环周分段）。
 * 主要操作：三个范例共用同一条 buildHelix 路径，分别交给 CreateLines（实线 LinesMesh）、
 *   CreateDashedLines（虚线 LinesMesh）和 CreateTube（沿路径挤出的管道 Mesh）。
 *   Controls 改变各自关键参数时，销毁旧网格并按新参数重建——直接看到三者形态差异。
 * 预期结果：readout 同步给出点数、线条类型与当前参数；同一螺旋在三种渲染器下分别呈现
 *   像素折线、虚线、有体积的管道。
 * 阅读主线：createLinesExample → createDashedLinesExample → createTubeExample。
 */
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';
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
import type { LinesMesh } from '@babylonjs/core';

// 相机角度：在原点斜上方观察螺旋，鼠标可拖动轨道看清 3D 结构。
const CAMERA_ALPHA = -Math.PI / 2.3;
const CAMERA_BETA = Math.PI / 2.6;
const CAMERA_RADIUS = 14;

/**
 * 沿螺旋曲线采样 pointCount 个点：在 x/z 平面绕圈、沿 y 上升。
 * lines 与 tube 共用同一条 path，让“同一组点、不同渲染器”的差异直接可见。
 * pointCount 至少为 2，避免退化成单点。
 */
function buildHelix(pointCount: number): Vector3[] {
  const n = Math.max(2, Math.round(pointCount));
  const turns = 2.5;
  const radius = 3;
  const height = 6;
  const points: Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const angle = turns * Math.PI * 2 * t;
    points.push(
      new Vector3(
        radius * Math.cos(angle),
        height * (t - 0.5),
        radius * Math.sin(angle),
      ),
    );
  }
  return points;
}

/* ---------------- 实线 CreateLines ---------------- */

export interface LinesOptions {
  pointCount: number;
}

export interface LinesSnapshot {
  pointCount: number;
  kind: string;
}

export interface LinesInstance {
  update(options: LinesOptions): void;
  dispose(): void;
}

export function createLinesExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: LinesSnapshot) => void,
): LinesInstance {
  let current: LinesOptions = { pointCount: 80 };
  // 在 setup 内创建、在 update 内销毁重建的当前网格引用。
  let linesMesh: LinesMesh | null = null;

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

    // LinesMesh 不受光照，但给一盏光不影响渲染，也与另外两个范例保持一致。
    new HemisphericLight('light', new Vector3(0.4, 1, 0.3), scene);

    // CreateLines：points 必需，返回 LinesMesh。
    // 颜色由实例 .color（Color3）决定；width 是屏幕像素宽，不在 options 里，
    // 而是创建后设在实例上（本范例固定默认，详见正文）。
    linesMesh = MeshBuilder.CreateLines(
      'lines',
      { points: buildHelix(current.pointCount) },
      scene,
    );
    linesMesh.color = Color3.FromHexString('#3d73d9');

    scene.onBeforeRenderObservable.add(() => {
      emit({
        pointCount: current.pointCount,
        kind: '实线 LinesMesh',
      });
    });

    return scene;
  });

  return {
    update(options) {
      current = options;
      // 改变点数会改变顶点数量，超出 instance 的“同点数”约束，这里直接销毁重建。
      linesMesh?.dispose();
      linesMesh = MeshBuilder.CreateLines(
        'lines',
        { points: buildHelix(options.pointCount) },
        runtime.scene,
      );
      linesMesh.color = Color3.FromHexString('#3d73d9');
    },
    dispose() {
      runtime.dispose();
    },
  };
}

/* ---------------- 虚线 CreateDashedLines ---------------- */

export interface DashedOptions {
  dashSize: number;
  gap: number;
}

export interface DashedSnapshot {
  dashSize: number;
  gap: number;
  kind: string;
}

export interface DashedInstance {
  update(options: DashedOptions): void;
  dispose(): void;
}

export function createDashedLinesExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DashedSnapshot) => void,
): DashedInstance {
  // 虚线的点数固定，让 dashSize/gap 成为唯一变量。
  const POINT_COUNT = 80;
  let current: DashedOptions = { dashSize: 3, gap: 1 };
  let dashedMesh: LinesMesh | null = null;

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

    // CreateDashedLines：在 points 基础上多 dashSize/gapSize/dashNb；
    // dashSize:gapSize 决定虚实比，dashNb 决定总分段数。返回的同样是 LinesMesh。
    dashedMesh = MeshBuilder.CreateDashedLines(
      'dashed',
      {
        points: buildHelix(POINT_COUNT),
        dashSize: current.dashSize,
        gapSize: current.gap,
      },
      scene,
    );
    dashedMesh.color = Color3.FromHexString('#d17832');

    scene.onBeforeRenderObservable.add(() => {
      emit({
        dashSize: current.dashSize,
        gap: current.gap,
        kind: '虚线 LinesMesh',
      });
    });

    return scene;
  });

  return {
    update(options) {
      current = options;
      dashedMesh?.dispose();
      dashedMesh = MeshBuilder.CreateDashedLines(
        'dashed',
        {
          points: buildHelix(POINT_COUNT),
          dashSize: options.dashSize,
          gapSize: options.gap,
        },
        runtime.scene,
      );
      dashedMesh.color = Color3.FromHexString('#d17832');
    },
    dispose() {
      runtime.dispose();
    },
  };
}

/* ---------------- 管道 CreateTube ---------------- */

export interface TubeOptions {
  radius: number;
  tessellation: number;
}

export interface TubeSnapshot {
  radius: number;
  tessellation: number;
  kind: string;
}

export interface TubeInstance {
  update(options: TubeOptions): void;
  dispose(): void;
}

export function createTubeExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TubeSnapshot) => void,
): TubeInstance {
  const POINT_COUNT = 80;
  let current: TubeOptions = { radius: 0.3, tessellation: 16 };
  let tubeMesh: Mesh | null = null;

  // 管道材质：受光，颜色与背面剔除配置在重建时复用。
  function makeTubeMaterial(scene: Scene): StandardMaterial {
    const mat = new StandardMaterial('tubeMat', scene);
    mat.diffuseColor = Color3.FromHexString('#2f8f7a');
    // 默认 NO_CAP 时两端开口，关掉背面剔除避免开口处面被剔除造成“看不见”的误判。
    mat.backFaceCulling = false;
    return mat;
  }

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

    // 管道是真实 3D 几何（Mesh），受光，需要给一盏方向光让明暗可见。
    new HemisphericLight('light', new Vector3(0.4, 1, 0.3), scene);

    // CreateTube：沿 path 挤出环周管道，返回 Mesh（不是 LinesMesh）。
    // radius 控制粗细，tessellation 控制环周分段（低值是棱柱，高值趋近圆管）。
    tubeMesh = MeshBuilder.CreateTube(
      'tube',
      {
        path: buildHelix(POINT_COUNT),
        radius: current.radius,
        tessellation: current.tessellation,
      },
      scene,
    );
    tubeMesh.material = makeTubeMaterial(scene);

    scene.onBeforeRenderObservable.add(() => {
      emit({
        radius: current.radius,
        tessellation: current.tessellation,
        kind: '管道 Mesh',
      });
    });

    return scene;
  });

  return {
    update(options) {
      current = options;
      tubeMesh?.dispose();
      tubeMesh = MeshBuilder.CreateTube(
        'tube',
        {
          path: buildHelix(POINT_COUNT),
          radius: options.radius,
          tessellation: options.tessellation,
        },
        runtime.scene,
      );
      tubeMesh.material = makeTubeMaterial(runtime.scene);
    },
    dispose() {
      runtime.dispose();
    },
  };
}
